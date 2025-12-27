import { NextRequest, NextResponse } from 'next/server'
import { Client } from '@line/bot-sdk'
import { createSupabaseAdmin } from '@/lib/supabase-admin'

// GET: 測試 Rich Menu 圖片上傳
export async function GET(request: NextRequest) {
  try {
    const menuType = 'venue_info'
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
    const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN

    if (!channelAccessToken) {
      return NextResponse.json(
        { error: 'LINE_CHANNEL_ACCESS_TOKEN not configured' },
        { status: 500 }
      )
    }

    // 測試 LINE API 連接
    console.log('🔍 Testing LINE API connection...')
    console.log('🔍 Rich Menu ID:', richMenuId)
    console.log('🔍 Channel Access Token:', channelAccessToken.substring(0, 20) + '...')

    // 嘗試獲取 Rich Menu 信息
    const lineClient = new Client({ channelAccessToken })
    
    try {
      const richMenu = await (lineClient as any).getRichMenu(richMenuId)
      console.log('✅ Rich menu found:', richMenu)
      
      return NextResponse.json({
        success: true,
        message: 'Rich menu found',
        richMenuId,
        richMenu
      })
    } catch (getError: any) {
      console.error('❌ Error getting rich menu:', getError)
      console.error('❌ Error details:', JSON.stringify(getError, null, 2))
      
      return NextResponse.json({
        success: false,
        error: 'Failed to get rich menu',
        richMenuId,
        details: getError.message
      })
    }

  } catch (error) {
    console.error('Error in GET /api/admin/richmenu/debug-upload:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// POST: 測試上傳簡單圖片
export async function POST(request: NextRequest) {
  try {
    const menuType = 'venue_info'
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
    const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN

    if (!channelAccessToken) {
      return NextResponse.json(
        { error: 'LINE_CHANNEL_ACCESS_TOKEN not configured' },
        { status: 500 }
      )
    }

    // 創建一個簡單的測試圖片（1x1 像素的 PNG）
    const testImageData = Buffer.from([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
      0x00, 0x00, 0x00, 0x0D, // IHDR length
      0x49, 0x48, 0x44, 0x52, // IHDR type
      0x00, 0x00, 0x00, 0x01, // width: 1
      0x00, 0x00, 0x00, 0x01, // height: 1
      0x08, 0x02, 0x00, 0x00, 0x00, // bit depth: 8, color type: 2 (RGB), compression: 0, filter: 0, interlace: 0
      0x90, 0x77, 0x53, 0xDE, // CRC
      0x00, 0x00, 0x00, 0x0C, // IDAT length
      0x49, 0x44, 0x41, 0x54, // IDAT type
      0x08, 0xD7, 0x63, 0xF8, 0xCF, 0xC0, 0x00, 0x00, 0x03, 0x00, 0x01, 0x00, // IDAT data
      0x18, 0xDD, 0x8D, 0xB4, // CRC
      0x00, 0x00, 0x00, 0x00, // IEND length
      0x49, 0x45, 0x4E, 0x44, // IEND type
      0xAE, 0x42, 0x60, 0x82  // CRC
    ])

    console.log('🔍 Testing image upload...')
    console.log('🔍 Rich Menu ID:', richMenuId)
    console.log('🔍 Test image size:', testImageData.length, 'bytes')
    console.log('🔍 Test image type:', 'image/png')

    const lineClient = new Client({ channelAccessToken })

    try {
      // 嘗試使用 setRichMenuImage 方法
      console.log('📤 Trying setRichMenuImage method...')
      await (lineClient as any).setRichMenuImage(
        richMenuId,
        testImageData,
        'image/png'
      )
      console.log('✅ Image uploaded successfully using setRichMenuImage')
      
      return NextResponse.json({
        success: true,
        message: 'Test image uploaded successfully',
        method: 'setRichMenuImage',
        richMenuId
      })
    } catch (setRichMenuImageError: any) {
      console.error('❌ setRichMenuImage failed:', setRichMenuImageError)
      
      return NextResponse.json({
        success: false,
        error: 'Failed to upload test image',
        richMenuId,
        details: setRichMenuImageError.message
      })
    }

  } catch (error) {
    console.error('Error in POST /api/admin/richmenu/debug-upload:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
