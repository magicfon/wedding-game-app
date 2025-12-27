import { NextRequest, NextResponse } from 'next/server'
import { Client } from '@line/bot-sdk'
import { createSupabaseAdmin } from '@/lib/supabase-admin'

// 獲取 LINE Channel Access Token
function getLineChannelAccessToken(): string | null {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN
  if (!token) {
    console.error('LINE_CHANNEL_ACCESS_TOKEN not configured')
    return null
  }
  return token
}

// 初始化 LINE Client
function getLineClient(): Client | null {
  const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN
  if (!channelAccessToken) {
    console.error('LINE_CHANNEL_ACCESS_TOKEN not configured')
    return null
  }
  return new Client({ channelAccessToken })
}

// 驗證圖片尺寸
function validateImageDimensions(
  width: number,
  height: number
): boolean {
  return width === 2500 && height === 1686
}

// POST: 上傳 Rich Menu 圖片
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('image') as File
    const menuType = formData.get('menuType') as string

    // 驗證輸入
    if (!file) {
      return NextResponse.json(
        { error: 'Image file is required' },
        { status: 400 }
      )
    }

    if (!menuType || !['venue_info', 'activity', 'unavailable'].includes(menuType)) {
      return NextResponse.json(
        { error: 'Invalid menu type' },
        { status: 400 }
      )
    }

    // 驗證檔案類型
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'File must be an image' },
        { status: 400 }
      )
    }

    const supabase = createSupabaseAdmin()

    // 從資料庫獲取 Rich Menu ID
    const { data: registryData, error: registryError } = await supabase
      .from('line_richmenu_registry')
      .select('richmenu_id')
      .eq('menu_type', menuType)
      .single()

    if (registryError || !registryData) {
      return NextResponse.json(
        { error: 'Rich menu not found for this menu type' },
        { status: 404 }
      )
    }

    const richMenuId = registryData.richmenu_id

    // 驗證圖片尺寸
    const imageBuffer = await file.arrayBuffer()
    
    // 使用 sharp 來驗證圖片尺寸
    let imageWidth = 0
    let imageHeight = 0
    
    try {
      // 嘗試使用 sharp 來獲取圖片尺寸
      const sharp = (await import('sharp')).default
      const metadata = await sharp(Buffer.from(imageBuffer)).metadata()
      imageWidth = metadata.width || 0
      imageHeight = metadata.height || 0
      console.log('📐 Image dimensions:', imageWidth, 'x', imageHeight)
    } catch (sharpError) {
      console.warn('⚠️ Sharp not available, skipping dimension check:', sharpError)
    }

    // 如果無法獲取尺寸，讓 LINE API 來驗證
    if (imageWidth > 0 && imageHeight > 0) {
      if (!validateImageDimensions(imageWidth, imageHeight)) {
        return NextResponse.json(
          { error: `Image dimensions must be 2500x1686px, got ${imageWidth}x${imageHeight}px` },
          { status: 400 }
        )
      }
    }

    const lineClient = getLineClient()
    if (!lineClient) {
      return NextResponse.json(
        { error: 'LINE client configuration error' },
        { status: 500 }
      )
    }

    console.log('📤 Uploading image to rich menu:', richMenuId, '(menu type:', menuType + ')')
    console.log('📊 Image size:', imageBuffer.byteLength, 'bytes')
    console.log('📊 Image type:', file.type)

    // 上傳圖片到 Rich Menu
    try {
      // 使用 LINE Bot SDK 的 setRichMenuImage 方法
      // 根據 LINE Bot SDK 文檔，該方法接受 richMenuId, body, contentType
      const imageBufferData = Buffer.from(imageBuffer)
      console.log('📤 Image buffer size:', imageBufferData.length, 'bytes')
      console.log('📤 Image buffer type:', imageBufferData.constructor.name)
      console.log('📤 Content-Type:', file.type)
      console.log('📤 Rich Menu ID:', richMenuId)
      console.log('📤 API endpoint:', `/richmenu/${richMenuId}/content`)
      
      // 使用 setRichMenuImage 方法上傳圖片
      // 該方法接受三個參數：richMenuId, body, contentType
      console.log('📤 Calling setRichMenuImage with:')
      console.log('  - richMenuId:', richMenuId)
      console.log('  - body length:', imageBufferData.length)
      console.log('  - contentType:', file.type)
      
      await (lineClient as any).setRichMenuImage(
        richMenuId,
        imageBufferData,
        file.type
      )
      console.log('✅ Image uploaded successfully')
    } catch (uploadError: any) {
      console.error('❌ Error uploading image to LINE:', uploadError)
      console.error('❌ Error name:', uploadError.name)
      console.error('❌ Error message:', uploadError.message)
      console.error('❌ Error code:', uploadError.code)
      
      // 提取 LINE API 的錯誤細節
      if (uploadError.response) {
        console.error('❌ Response status:', uploadError.response.status)
        console.error('❌ Response statusText:', uploadError.response.statusText)
        console.error('❌ Response data:', JSON.stringify(uploadError.response.data, null, 2))
        
        const errorData = uploadError.response.data
        
        // 嘗試從不同的可能位置提取錯誤信息
        let lineErrorMessage = 'Unknown LINE API error'
        if (typeof errorData === 'string') {
          lineErrorMessage = errorData
        } else if (errorData.message) {
          lineErrorMessage = errorData.message
        } else if (errorData.error) {
          lineErrorMessage = errorData.error
        } else if (errorData.error?.message) {
          lineErrorMessage = errorData.error.message
        } else if (typeof errorData === 'object' && Object.keys(errorData).length === 0) {
          lineErrorMessage = 'No error details provided'
        } else {
          lineErrorMessage = JSON.stringify(errorData)
        }
        
        throw new Error(`LINE API error (${uploadError.response.status}): ${lineErrorMessage}`)
      }
      
      throw uploadError
    }
    
    // 更新資料庫中的 has_image 狀態
    const { error: updateError } = await supabase
      .from('line_richmenu_registry')
      .update({
        has_image: true,
        updated_at: new Date().toISOString()
      })
      .eq('menu_type', menuType)

    if (updateError) {
      console.error('Error updating has_image status:', updateError)
    }

    return NextResponse.json({
      success: true,
      message: 'Rich menu image uploaded successfully',
      richMenuId,
      menuType
    })

  } catch (error) {
    console.error('Error in POST /api/admin/richmenu/upload-image:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// GET: 獲取 Rich Menu 圖片上傳狀態
export async function GET(request: NextRequest) {
  try {
    const menuType = 'venue_info' // 固定使用 venue_info

    const supabase = createSupabaseAdmin()

    // 獲取 Rich Menu 註冊資訊
    const { data, error } = await supabase
      .from('line_richmenu_registry')
      .select('*')
      .eq('menu_type', menuType)
      .single()

    if (error) {
      console.error('Error fetching rich menu registry:', error)
      return NextResponse.json(
        { error: 'Failed to fetch rich menu registry' },
        { status: 500 }
      )
    }

    if (!data) {
      return NextResponse.json({
        hasImage: false,
        message: 'No rich menu found'
      })
    }

    // 根據 has_image 欄位判斷是否已上傳圖片
    return NextResponse.json({
      hasImage: data.has_image || false,
      richMenuId: data.richmenu_id,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    })

  } catch (error) {
    console.error('Error in GET /api/admin/richmenu/upload-image:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
