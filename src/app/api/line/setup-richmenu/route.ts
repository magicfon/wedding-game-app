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

    const results: any[] = []

    console.log('🔍 Starting Rich Menu creation process...')
    console.log('📋 LIFF ID:', liffId)

    // 創建會場資訊分頁
    try {
      console.log('🏗️ Creating venue_info rich menu...')
      const venueInfoMenu = createVenueInfoRichMenu(liffId)
      console.log('📝 Venue info menu config:', JSON.stringify(venueInfoMenu, null, 2))
      const venueInfoId = await lineClient.createRichMenu(venueInfoMenu)
      console.log('✅ Venue info rich menu created:', venueInfoId)
      const registered = await registerRichMenu(supabase, 'venue_info', venueInfoId)
      console.log('📝 Venue info registered to database:', registered)

      results.push({
        menuType: 'venue_info',
        richMenuId: venueInfoId,
        registered
      })
    } catch (error) {
      console.error('❌ Error creating venue info rich menu:', error)
      results.push({
        menuType: 'venue_info',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }

    // 創建現場活動分頁
    try {
      console.log('🏗️ Creating activity rich menu...')
      const activityMenu = createActivityRichMenu(liffId)
      console.log('📝 Activity menu config:', JSON.stringify(activityMenu, null, 2))
      const activityId = await lineClient.createRichMenu(activityMenu)
      console.log('✅ Activity rich menu created:', activityId)
      const registered = await registerRichMenu(supabase, 'activity', activityId)
      console.log('📝 Activity registered to database:', registered)

      results.push({
        menuType: 'activity',
        richMenuId: activityId,
        registered
      })
    } catch (error) {
      console.error('❌ Error creating activity rich menu:', error)
      results.push({
        menuType: 'activity',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }

    // 創建未開放分頁
    try {
      console.log('🏗️ Creating unavailable rich menu...')
      const unavailableMenu = createUnavailableRichMenu()
      console.log('📝 Unavailable menu config:', JSON.stringify(unavailableMenu, null, 2))
      const unavailableId = await lineClient.createRichMenu(unavailableMenu)
      console.log('✅ Unavailable rich menu created:', unavailableId)
      const registered = await registerRichMenu(supabase, 'unavailable', unavailableId)
      console.log('📝 Unavailable registered to database:', registered)

      results.push({
        menuType: 'unavailable',
        richMenuId: unavailableId,
        registered
      })
    } catch (error) {
      console.error('❌ Error creating unavailable rich menu:', error)
      results.push({
        menuType: 'unavailable',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }

    console.log('📊 Rich Menu creation results:', JSON.stringify(results, null, 2))
    
    return NextResponse.json({
      success: true,
      message: 'Rich menus created successfully',
      results,
      nextSteps: [
        'Please upload images for each rich menu using the upload-image API',
        'After uploading images, you can check the LINE Developers Console to see the created rich menus'
      ]
    })

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
