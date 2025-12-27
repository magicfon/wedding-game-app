import { NextRequest, NextResponse } from 'next/server'
import { messagingApi } from '@line/bot-sdk'
import { createSupabaseAdmin } from '@/lib/supabase-admin'

const { MessagingApiBlobClient, MessagingApiClient } = messagingApi

// 初始化 LINE Blob Client (用於圖片上傳)
function getLineBlobClient(): InstanceType<typeof MessagingApiBlobClient> | null {
  const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN
  if (!channelAccessToken) {
    console.error('LINE_CHANNEL_ACCESS_TOKEN not configured')
    return null
  }
  return new MessagingApiBlobClient({ channelAccessToken })
}

// 初始化 LINE Messaging API Client (用於 Rich Menu 管理)
function getLineApiClient(): InstanceType<typeof MessagingApiClient> | null {
  const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN
  if (!channelAccessToken) {
    console.error('LINE_CHANNEL_ACCESS_TOKEN not configured')
    return null
  }
  return new MessagingApiClient({ channelAccessToken })
}

// 獲取 LIFF ID
function getLiffId(): string {
  const liffId = process.env.NEXT_PUBLIC_LIFF_ID
  if (!liffId) {
    throw new Error('NEXT_PUBLIC_LIFF_ID not configured')
  }
  return liffId
}

// 創建會場資訊分頁 Rich Menu 配置
function createVenueInfoRichMenu(liffId: string) {
  return {
    size: {
      width: 2500,
      height: 1686
    },
    selected: false,
    name: "婚禮遊戲 - 會場資訊",
    chatBarText: "會場資訊",
    areas: [
      {
        bounds: { x: 0, y: 0, width: 1250, height: 843 },
        action: {
          type: "uri" as const,
          uri: `https://liff.line.me/${liffId}/venue-info/transport`,
          label: "交通資訊"
        }
      },
      {
        bounds: { x: 1250, y: 0, width: 1250, height: 843 },
        action: {
          type: "uri" as const,
          uri: `https://liff.line.me/${liffId}/venue-info/menu`,
          label: "菜單"
        }
      },
      {
        bounds: { x: 0, y: 843, width: 1250, height: 843 },
        action: {
          type: "uri" as const,
          uri: `https://liff.line.me/${liffId}/venue-info/table`,
          label: "桌次"
        }
      },
      {
        bounds: { x: 1250, y: 843, width: 1250, height: 843 },
        action: {
          type: "postback" as const,
          data: "switch_tab:activity",
          label: "進入遊戲分頁"
        }
      }
    ]
  }
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
      .select('richmenu_id, has_image')
      .eq('menu_type', menuType)
      .single()

    if (registryError || !registryData) {
      return NextResponse.json(
        { error: 'Rich menu not found for this menu type' },
        { status: 404 }
      )
    }

    let richMenuId = registryData.richmenu_id

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

    const blobClient = getLineBlobClient()
    const apiClient = getLineApiClient()

    if (!blobClient || !apiClient) {
      return NextResponse.json(
        { error: 'LINE client configuration error' },
        { status: 500 }
      )
    }

    console.log('📤 Uploading image to rich menu:', richMenuId, '(menu type:', menuType + ')')
    console.log('📊 Image size:', imageBuffer.byteLength, 'bytes')
    console.log('📊 Image type:', file.type)
    console.log('📊 Has existing image:', registryData.has_image)

    // 準備圖片 Blob
    const imageBlob = new Blob([imageBuffer], { type: file.type })

    // 上傳圖片到 Rich Menu
    try {
      console.log('📤 Calling setRichMenuImage with MessagingApiBlobClient:')
      console.log('  - richMenuId:', richMenuId)
      console.log('  - blob size:', imageBlob.size)
      console.log('  - blob type:', imageBlob.type)

      await blobClient.setRichMenuImage(richMenuId, imageBlob)
      console.log('✅ Image uploaded successfully')
    } catch (uploadError: any) {
      console.error('❌ Error uploading image to LINE:', uploadError)

      // 檢查是否是「圖片已存在」錯誤
      const errorBody = uploadError?.body || ''
      const isImageAlreadyExists =
        errorBody.includes('An image has already been uploaded') ||
        (uploadError.status === 400 && registryData.has_image)

      if (isImageAlreadyExists) {
        console.log('🔄 Rich menu already has an image. Recreating rich menu...')

        try {
          const liffId = getLiffId()

          // 1. 刪除舊的 Rich Menu
          console.log('🗑️ Deleting old rich menu:', richMenuId)
          await apiClient.deleteRichMenu(richMenuId)
          console.log('✅ Old rich menu deleted')

          // 2. 創建新的 Rich Menu
          console.log('🏗️ Creating new rich menu...')
          const menuConfig = createVenueInfoRichMenu(liffId)
          const newRichMenuResponse = await apiClient.createRichMenu(menuConfig)
          const newRichMenuId = newRichMenuResponse.richMenuId
          console.log('✅ New rich menu created:', newRichMenuId)

          // 3. 上傳圖片到新的 Rich Menu
          console.log('📤 Uploading image to new rich menu...')
          await blobClient.setRichMenuImage(newRichMenuId, imageBlob)
          console.log('✅ Image uploaded to new rich menu')

          // 4. 設置為預設 Rich Menu
          console.log('🎯 Setting as default rich menu...')
          await apiClient.setDefaultRichMenu(newRichMenuId)
          console.log('✅ Set as default rich menu')

          // 5. 更新資料庫
          const { error: updateError } = await supabase
            .from('line_richmenu_registry')
            .update({
              richmenu_id: newRichMenuId,
              has_image: true,
              updated_at: new Date().toISOString()
            })
            .eq('menu_type', menuType)

          if (updateError) {
            console.error('Error updating registry:', updateError)
          }

          richMenuId = newRichMenuId

          return NextResponse.json({
            success: true,
            message: 'Rich menu recreated and image uploaded successfully',
            richMenuId: newRichMenuId,
            menuType,
            recreated: true
          })

        } catch (recreateError: any) {
          console.error('❌ Error recreating rich menu:', recreateError)
          throw new Error(`Failed to recreate rich menu: ${recreateError.message || recreateError}`)
        }
      }

      // 其他錯誤，直接拋出
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
