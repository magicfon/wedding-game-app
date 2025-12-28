import { NextResponse } from 'next/server'
import { messagingApi } from '@line/bot-sdk'
import { createSupabaseAdmin } from '@/lib/supabase-admin'

const { MessagingApiClient } = messagingApi

export const dynamic = 'force-dynamic'


// 初始化 LINE Messaging API Client
function getLineClient(): InstanceType<typeof MessagingApiClient> | null {
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

// 創建會場資訊分頁 Rich Menu
function createVenueInfoRichMenu(liffId: string) {
  return {
    size: {
      width: 2500,
      height: 1686
    },
    selected: true,
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
          type: "richmenuswitch" as const,
          richMenuAliasId: "richmenu-alias-activity",
          data: "switch_tab:activity"
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
    selected: true,
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
          type: "richmenuswitch" as const,
          richMenuAliasId: "richmenu-alias-venue-info",
          data: "switch_tab:venue_info"
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
    selected: true,
    name: "婚禮遊戲 - 未開放",
    chatBarText: "未開放",
    areas: [
      {
        bounds: { x: 1250, y: 843, width: 1250, height: 843 },
        action: {
          type: "richmenuswitch" as const,
          richMenuAliasId: "richmenu-alias-venue-info",
          data: "switch_tab:venue_info"
        }
      }
    ]
  }
}

// 註冊 Rich Menu ID 到資料庫
async function registerRichMenu(
  supabase: any,
  richMenuId: string,
  name: string
): Promise<boolean> {
  const { error } = await supabase
    .from('line_richmenu_registry')
    .upsert({
      richmenu_id: richMenuId,
      name: name,
      menu_type: null, // 預設不指定類型
      has_image: false, // 創建時尚未上傳圖片
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'richmenu_id'
    })

  if (error) {
    console.error(`Error registering rich menu ${richMenuId}:`, error)
    return false
  }

  return true
}

// POST: 創建一個新的 Rich Menu（不指定類型）
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

    // 嘗試從 request body 獲取自訂配置
    let customConfig: any = null
    try {
      const body = await request.json()
      customConfig = body
    } catch {
      // 沒有 body，使用預設配置
    }

    const liffId = getLiffId()
    console.log('🔍 Starting Rich Menu creation process...')
    console.log('📋 LIFF ID:', liffId)

    // 使用自訂配置或預設（空白 Rich Menu）
    const menuConfig = customConfig?.config || {
      size: {
        width: 2500,
        height: 1686
      },
      selected: true,
      name: customConfig?.name || `Rich Menu ${new Date().toLocaleDateString('zh-TW')}`,
      chatBarText: customConfig?.chatBarText || '選單',
      areas: customConfig?.areas || []
    }

    console.log('🏗️ Creating rich menu...')
    console.log('📝 Config:', JSON.stringify(menuConfig, null, 2))

    const richMenuResponse = await lineClient.createRichMenu(menuConfig)
    const richMenuId = richMenuResponse.richMenuId
    console.log('✅ Rich menu created:', richMenuId)

    // 註冊到資料庫（不指定 menu_type）
    const registered = await registerRichMenu(supabase, richMenuId, menuConfig.name)
    console.log('📝 Registered to database:', registered)

    return NextResponse.json({
      success: true,
      message: 'Rich menu created successfully',
      richMenuId,
      name: menuConfig.name,
      registered,
      nextSteps: [
        'Upload an image using the upload-image API',
        'Assign a menu_type (venue_info/activity/unavailable) if needed',
        'Set as default if required'
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
    const richMenuListResponse = await lineClient.getRichMenuList()
    const richMenus = richMenuListResponse.richmenus || []

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

    // 獲取當前預設 Rich Menu
    let defaultRichMenuId: string | null = null
    try {
      const defaultResponse = await lineClient.getDefaultRichMenuId()
      defaultRichMenuId = defaultResponse.richMenuId || null
      console.log('📌 Current default rich menu:', defaultRichMenuId)
    } catch (error) {
      console.log('⚠️ No default rich menu set or error fetching:', error)
    }

    // DEBUG: Log registry comparison
    console.log('🔎 Debugging rich menu registry:')
    richMenus.forEach(menu => {
      const regEntry = registry?.find(r => r.richmenu_id === menu.richMenuId)
      console.log(`  - LINE ID: ${menu.richMenuId} (${menu.name})`)
      console.log(`    -> Database Match: ${regEntry ? '✅ Found' : '❌ Not Found'}`)
      if (regEntry) {
        console.log(`    -> Has Image: ${regEntry.has_image}`)
      }
    })
    // End DEBUG

    // 構建狀態報告
    const statusReport = {
      linePlatform: {
        total: richMenus.length,
        menus: richMenus,
        defaultRichMenuId: defaultRichMenuId
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
