import { NextRequest, NextResponse } from 'next/server'
import { Client } from '@line/bot-sdk'
import { createSupabaseAdmin } from '@/lib/supabase-admin'

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
    const richMenuId = formData.get('richMenuId') as string

    // 驗證輸入
    if (!file) {
      return NextResponse.json(
        { error: 'Image file is required' },
        { status: 400 }
      )
    }

    if (!richMenuId) {
      return NextResponse.json(
        { error: 'Rich Menu ID is required' },
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

    // 驗證圖片尺寸 (LINE API 會在實際上傳時驗證)
    const imageBuffer = await file.arrayBuffer()
    // 注意：由於 canvas 套件在 Vercel 環境可能有相容性問題，
    // 我們讓 LINE API 來驗證圖片尺寸
    // 如果需要在本機驗證，可以安裝 canvas 套件並取消註解以下程式碼：
    // const { createCanvas, loadImage } = await import('canvas')
    // const image = await loadImage(Buffer.from(imageBuffer))
    // if (!validateImageDimensions(image.width, image.height)) {
    //   return NextResponse.json(
    //     { error: 'Image dimensions must be 2500x1686px' },
    //     { status: 400 }
    //   )
    // }

    const lineClient = getLineClient()
    if (!lineClient) {
      return NextResponse.json(
        { error: 'LINE client configuration error' },
        { status: 500 }
      )
    }

    const supabase = createSupabaseAdmin()

    console.log('📤 Uploading image to rich menu:', richMenuId)
    console.log('📊 Image size:', imageBuffer.byteLength, 'bytes')
    console.log('📊 Image type:', file.type)

    // 上傳圖片到 Rich Menu
    try {
      await (lineClient.setRichMenuImage as any)(richMenuId, Buffer.from(imageBuffer), file.type)
      console.log('✅ Image uploaded successfully')
    } catch (uploadError) {
      console.error('❌ Error uploading image to LINE:', uploadError)
      throw uploadError
    }
    
    // 更新資料庫中的 has_image 狀態
    const { error } = await supabase
      .from('line_richmenu_registry')
      .update({
        has_image: true,
        updated_at: new Date().toISOString()
      })
      .eq('richmenu_id', richMenuId)

    if (error) {
      console.error('Error updating has_image status:', error)
    }

    return NextResponse.json({
      success: true,
      message: 'Rich menu image uploaded successfully',
      richMenuId
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
