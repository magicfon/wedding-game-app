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

// POST: 設置 Rich Menu（創建全部 3 種類型）
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

    // 定義所有要創建的 Rich Menu 類型
    const menuTypes = [
      { type: 'venue_info', name: '會場資訊', createFn: () => createVenueInfoRichMenu(liffId) },
      { type: 'activity', name: '現場活動', createFn: () => createActivityRichMenu(liffId) },
      { type: 'unavailable', name: '未開放', createFn: () => createUnavailableRichMenu() }
    ]

    const results: Array<{ type: string; richMenuId: string; registered: boolean }> = []
    let defaultRichMenuId: string | null = null

    // 創建所有 3 種 Rich Menu
    for (const menuConfig of menuTypes) {
      try {
        console.log(`🏗️ Creating ${menuConfig.name} rich menu...`)
        const menu = menuConfig.createFn()
        console.log(`📝 ${menuConfig.name} config created`)

        const richMenuResponse = await lineClient.createRichMenu(menu)
        const richMenuId = richMenuResponse.richMenuId
        console.log(`✅ ${menuConfig.name} rich menu created:`, richMenuId)

        const registered = await registerRichMenu(supabase, menuConfig.type, richMenuId)
        console.log(`📝 ${menuConfig.name} registered to database:`, registered)

        results.push({ type: menuConfig.type, richMenuId, registered })

        // 設定 venue_info 為預設 Rich Menu
        if (menuConfig.type === 'venue_info') {
          defaultRichMenuId = richMenuId
        }
      } catch (error) {
        console.error(`❌ Error creating ${menuConfig.name} rich menu:`, error)
        results.push({ type: menuConfig.type, richMenuId: '', registered: false })
      }
    }

    // 創建 Rich Menu Aliases（用於分頁切換）
    const aliasConfigs = [
      { aliasId: 'richmenu-alias-venue-info', menuType: 'venue_info' },
      { aliasId: 'richmenu-alias-activity', menuType: 'activity' }
    ]

    for (const aliasConfig of aliasConfigs) {
      const menuResult = results.find(r => r.type === aliasConfig.menuType)
      if (menuResult?.richMenuId) {
        try {
          console.log(`🔗 Creating alias ${aliasConfig.aliasId} for ${aliasConfig.menuType}...`)

          // 先嘗試刪除舊的 alias（如果存在）
          try {
            await lineClient.deleteRichMenuAlias(aliasConfig.aliasId)
            console.log(`🗑️ Deleted existing alias: ${aliasConfig.aliasId}`)
          } catch (deleteError: any) {
            // 忽略 alias 不存在的錯誤
            if (!deleteError?.message?.includes('not found')) {
              console.log(`⚠️ No existing alias to delete: ${aliasConfig.aliasId}`)
            }
          }

          // 創建新的 alias
          await lineClient.createRichMenuAlias({
            richMenuAliasId: aliasConfig.aliasId,
            richMenuId: menuResult.richMenuId
          })
          console.log(`✅ Created alias: ${aliasConfig.aliasId} -> ${menuResult.richMenuId}`)
        } catch (aliasError) {
          console.error(`❌ Error creating alias ${aliasConfig.aliasId}:`, aliasError)
        }
      }
    }

    // 設置預設 Rich Menu
    if (defaultRichMenuId) {
      try {
        console.log('🎯 Setting default rich menu...')
        await lineClient.setDefaultRichMenu(defaultRichMenuId)
        console.log('✅ Default rich menu set:', defaultRichMenuId)
      } catch (error) {
        console.error('❌ Error setting default rich menu:', error)
      }
    }

    // 獲取並顯示當前 Rich Menu 列表
    try {
      console.log('📋 Fetching current rich menu list...')
      const richMenuListResponse = await lineClient.getRichMenuList()
      console.log('📋 Current rich menu list count:', richMenuListResponse.richmenus?.length || 0)
    } catch (error) {
      console.error('❌ Error fetching rich menu list:', error)
    }

    const successCount = results.filter(r => r.richMenuId).length

    return NextResponse.json({
      success: successCount > 0,
      message: `Created ${successCount}/3 rich menus successfully`,
      results,
      defaultRichMenuId,
      nextSteps: [
        'Please upload images for each rich menu using the upload-image API',
        'After uploading images, rich menus will be visible to users',
        `venue_info (${defaultRichMenuId}) has been set as default`
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
