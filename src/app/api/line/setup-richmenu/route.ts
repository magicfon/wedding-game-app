import { NextResponse } from 'next/server'
import { Client } from '@line/bot-sdk'
import { createClient } from '@supabase/supabase-js'

// 驗證管理員權限
async function verifyAdmin(request: Request): Promise<boolean> {
  const authHeader = request.headers.get('authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return false
  }

  const token = authHeader.substring(7)
  const adminPassword = process.env.ADMIN_PASSWORD

  if (!adminPassword) {
    console.error('ADMIN_PASSWORD not configured')
    return false
  }

  return token === adminPassword
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

// 初始化 Supabase Client
function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Supabase configuration missing')
    return null
  }

  return createClient(supabaseUrl, supabaseServiceKey)
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
    // 驗證管理員權限
    const isAdmin = await verifyAdmin(request)
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const lineClient = getLineClient()
    const supabase = getSupabaseClient()

    if (!lineClient || !supabase) {
      return NextResponse.json(
        { error: 'Service configuration error' },
        { status: 500 }
      )
    }

    const liffId = getLiffId()

    const results: any[] = []

    // 創建會場資訊分頁
    try {
      const venueInfoMenu = createVenueInfoRichMenu(liffId)
      const venueInfoId = await lineClient.createRichMenu(venueInfoMenu)
      const registered = await registerRichMenu(supabase, 'venue_info', venueInfoId)

      results.push({
        menuType: 'venue_info',
        richMenuId: venueInfoId,
        registered
      })
    } catch (error) {
      console.error('Error creating venue info rich menu:', error)
      results.push({
        menuType: 'venue_info',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }

    // 創建現場活動分頁
    try {
      const activityMenu = createActivityRichMenu(liffId)
      const activityId = await lineClient.createRichMenu(activityMenu)
      const registered = await registerRichMenu(supabase, 'activity', activityId)

      results.push({
        menuType: 'activity',
        richMenuId: activityId,
        registered
      })
    } catch (error) {
      console.error('Error creating activity rich menu:', error)
      results.push({
        menuType: 'activity',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }

    // 創建未開放分頁
    try {
      const unavailableMenu = createUnavailableRichMenu()
      const unavailableId = await lineClient.createRichMenu(unavailableMenu)
      const registered = await registerRichMenu(supabase, 'unavailable', unavailableId)

      results.push({
        menuType: 'unavailable',
        richMenuId: unavailableId,
        registered
      })
    } catch (error) {
      console.error('Error creating unavailable rich menu:', error)
      results.push({
        menuType: 'unavailable',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Rich menus created successfully',
      results,
      nextSteps: [
        'Please upload images for each rich menu using the upload-image API',
        'After uploading images, you can set the default rich menu for users'
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
    const supabase = getSupabaseClient()

    if (!lineClient || !supabase) {
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
