import { NextResponse } from 'next/server'
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

// 獲取 LIFF ID
function getLiffId(): string {
  const liffId = process.env.NEXT_PUBLIC_LIFF_ID
  if (!liffId) {
    throw new Error('NEXT_PUBLIC_LIFF_ID not configured')
  }
  return liffId
}

// 創建會場資訊分頁 Rich Menu
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

// 創建現場活動分頁 Rich Menu
function createActivityRichMenu(liffId: string) {
  return {
    size: {
      width: 2500,
      height: 1686
    },
    selected: false,
    name: "婚禮遊戲 - 現場活動",
    chatBarText: "現場活動",
    areas: [
      {
        bounds: { x: 0, y: 0, width: 1250, height: 843 },
        action: {
          type: "uri" as const,
          uri: `https://liff.line.me/${liffId}/photo-upload`,
          label: "照片上傳"
        }
      },
      {
        bounds: { x: 1250, y: 0, width: 1250, height: 843 },
        action: {
          type: "uri" as const,
          uri: `https://liff.line.me/${liffId}/photo-wall`,
          label: "祝福照片牆"
        }
      },
      {
        bounds: { x: 0, y: 843, width: 1250, height: 843 },
        action: {
          type: "uri" as const,
          uri: `https://liff.line.me/${liffId}/quiz`,
          label: "快問快答"
        }
      },
      {
        bounds: { x: 1250, y: 843, width: 1250, height: 843 },
        action: {
          type: "postback" as const,
          data: "switch_tab:venue_info",
          label: "進入會場資訊分頁"
        }
      }
    ]
  }
}

// 創建未開放分頁 Rich Menu
function createUnavailableRichMenu() {
  return {
    size: {
      width: 2500,
      height: 1686
    },
    selected: false,
    name: "婚禮遊戲 - 未開放",
    chatBarText: "未開放",
    areas: [] // 無按鈕
  }
}

// 註冊 Rich Menu ID 到資料庫
async function registerRichMenu(
  supabase: any,
  menuType: string,
  richMenuId: string
): Promise<boolean> {
  const { error } = await supabase
    .from('line_richmenu_registry')
    .upsert({
      menu_type: menuType,
      richmenu_id: richMenuId,
      has_image: false, // 創建時尚未上傳圖片
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'menu_type'
    })

  if (error) {
    console.error(`Error registering rich menu ${menuType}:`, error)
    return false
  }

  return true
}

// POST: 設置 Rich Menu
export async function POST(request: Request) {
  try {
    const lineClient = getLineClient()
    const supabase = createSupabaseAdmin()

    if (!lineClient) {
      return NextResponse.json(
        { error: 'Service configuration error' },
        { status: 500 }
      )
    }

    const liffId = getLiffId()

    console.log('🔍 Starting Rich Menu creation process...')
    console.log('📋 LIFF ID:', liffId)

    // 只創建一個 Rich Menu（會場資訊）
    try {
      console.log('🏗️ Creating rich menu...')
      const menu = createVenueInfoRichMenu(liffId)
      console.log('📝 Menu config:', JSON.stringify(menu, null, 2))
      const richMenuId = await lineClient.createRichMenu(menu)
      console.log('✅ Rich menu created:', richMenuId)
      const registered = await registerRichMenu(supabase, 'venue_info', richMenuId)
      console.log('📝 Rich menu registered to database:', registered)

      // 設置為預設 Rich Menu
      try {
        console.log('🎯 Setting default rich menu...')
        await lineClient.setDefaultRichMenu(richMenuId)
        console.log('✅ Default rich menu set:', richMenuId)
      } catch (error) {
        console.error('❌ Error setting default rich menu:', error)
      }

      // 嘗試獲取並顯示當前 Rich Menu 列表
      try {
        console.log('📋 Fetching current rich menu list...')
        const richMenuList = await lineClient.getRichMenuList()
        console.log('📋 Current rich menu list:', JSON.stringify(richMenuList, null, 2))
      } catch (error) {
        console.error('❌ Error fetching rich menu list:', error)
      }

      return NextResponse.json({
        success: true,
        message: 'Rich menu created successfully',
        richMenuId,
        registered,
        nextSteps: [
          'Please upload an image for the rich menu using the upload-image API',
          'After uploading the image, you can check the LINE Developers Console to see the created rich menu',
          'The rich menu has been set as default'
        ]
      })
    } catch (error) {
      console.error('❌ Error creating rich menu:', error)
      return NextResponse.json(
        { error: 'Failed to create rich menu', details: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('Error in POST /api/line/setup-richmenu:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// GET: 獲取 Rich Menu 設置狀態
export async function GET() {
  try {
    const lineClient = getLineClient()
    const supabase = createSupabaseAdmin()

    if (!lineClient) {
      return NextResponse.json(
        { error: 'Service configuration error' },
        { status: 500 }
      )
    }

    // 獲取 LINE Platform 上的 Rich Menu 列表
    const richMenus = await lineClient.getRichMenuList()

    // 獲取資料庫中的註冊資訊
    const { data: registry, error } = await supabase
      .from('line_richmenu_registry')
      .select('*')

    if (error) {
      console.error('Error fetching rich menu registry:', error)
      return NextResponse.json(
        { error: 'Failed to fetch rich menu registry' },
        { status: 500 }
      )
    }

    // 構建狀態報告
    const statusReport = {
      linePlatform: {
        total: richMenus.length,
        menus: richMenus
      },
      database: {
        total: registry.length,
        menus: registry
      }
    }

    return NextResponse.json({
      success: true,
      status: statusReport
    })

  } catch (error) {
    console.error('Error in GET /api/line/setup-richmenu:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
