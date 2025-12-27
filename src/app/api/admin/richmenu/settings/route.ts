import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase-admin'
import { messagingApi } from '@line/bot-sdk'

const { MessagingApiClient } = messagingApi

// 初始化 LINE Messaging API Client
function getLineClient(): InstanceType<typeof MessagingApiClient> | null {
  const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN
  if (!channelAccessToken) {
    console.error('LINE_CHANNEL_ACCESS_TOKEN not configured')
    return null
  }
  return new MessagingApiClient({ channelAccessToken })
}

// GET: 獲取 Rich Menu 設定
export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseAdmin()

    // 獲取 Rich Menu 設定
    const { data: settings, error: settingsError } = await supabase
      .from('line_richmenu_settings')
      .select('*')
      .single()

    if (settingsError) {
      console.error('Error fetching rich menu settings:', settingsError)
      return NextResponse.json(
        { error: 'Failed to fetch rich menu settings' },
        { status: 500 }
      )
    }

    // 獲取 Rich Menu 註冊資訊
    const { data: registry, error: registryError } = await supabase
      .from('line_richmenu_registry')
      .select('*')

    if (registryError) {
      console.error('Error fetching rich menu registry:', registryError)
      return NextResponse.json(
        { error: 'Failed to fetch rich menu registry' },
        { status: 500 }
      )
    }

    // 將 registry 轉換為物件格式
    const richMenuIds: Record<string, string> = {}
    registry.forEach(item => {
      richMenuIds[item.menu_type] = item.richmenu_id
    })

    return NextResponse.json({
      defaultTab: settings.default_tab,
      venueTabEnabled: settings.venue_tab_enabled,
      activityTabEnabled: settings.activity_tab_enabled,
      richMenuIds,
      updatedAt: settings.updated_at
    })

  } catch (error) {
    console.error('Error in GET /api/admin/richmenu/settings:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST: 更新 Rich Menu 設定
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { defaultTab, venueTabEnabled, activityTabEnabled } = body

    // 驗證輸入
    if (defaultTab && !['venue_info', 'activity'].includes(defaultTab)) {
      return NextResponse.json(
        { error: 'Invalid default tab value' },
        { status: 400 }
      )
    }

    if (venueTabEnabled !== undefined && typeof venueTabEnabled !== 'boolean') {
      return NextResponse.json(
        { error: 'Invalid venueTabEnabled value' },
        { status: 400 }
      )
    }

    if (activityTabEnabled !== undefined && typeof activityTabEnabled !== 'boolean') {
      return NextResponse.json(
        { error: 'Invalid activityTabEnabled value' },
        { status: 400 }
      )
    }

    const supabase = createSupabaseAdmin()

    // 構建更新物件
    const updateData: Record<string, any> = {}
    if (defaultTab !== undefined) updateData.default_tab = defaultTab
    if (venueTabEnabled !== undefined) updateData.venue_tab_enabled = venueTabEnabled
    if (activityTabEnabled !== undefined) updateData.activity_tab_enabled = activityTabEnabled

    // 更新設定
    const { data: settings, error: updateError } = await supabase
      .from('line_richmenu_settings')
      .update(updateData)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating rich menu settings:', updateError)
      return NextResponse.json(
        { error: 'Failed to update rich menu settings' },
        { status: 500 }
      )
    }

    // 如果 activityTabEnabled 設定有改變，更新 richmenu-alias-activity 的指向
    let aliasUpdated = false
    if (activityTabEnabled !== undefined) {
      const lineClient = getLineClient()

      if (lineClient) {
        // 獲取目標 menu ID
        const targetMenuType = activityTabEnabled ? 'activity' : 'unavailable'
        const { data: targetMenu, error: menuError } = await supabase
          .from('line_richmenu_registry')
          .select('richmenu_id')
          .eq('menu_type', targetMenuType)
          .single()

        if (!menuError && targetMenu?.richmenu_id) {
          try {
            console.log(`🔗 Updating richmenu-alias-activity to ${targetMenuType}...`)

            // 先刪除舊的 alias
            try {
              await lineClient.deleteRichMenuAlias('richmenu-alias-activity')
              console.log('🗑️ Deleted existing alias: richmenu-alias-activity')
            } catch (deleteErr: any) {
              console.log('⚠️ No existing alias to delete')
            }

            // 創建新的 alias
            await lineClient.createRichMenuAlias({
              richMenuAliasId: 'richmenu-alias-activity',
              richMenuId: targetMenu.richmenu_id
            })
            console.log(`✅ Updated alias: richmenu-alias-activity -> ${targetMenu.richmenu_id} (${targetMenuType})`)
            aliasUpdated = true
          } catch (aliasError: any) {
            console.error('❌ Error updating alias:', aliasError)
          }
        } else {
          console.warn(`⚠️ Could not find ${targetMenuType} rich menu in registry`)
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Rich menu settings updated successfully',
      aliasUpdated,
      settings: {
        defaultTab: settings.default_tab,
        venueTabEnabled: settings.venue_tab_enabled,
        activityTabEnabled: settings.activity_tab_enabled,
        updatedAt: settings.updated_at
      }
    })

  } catch (error) {
    console.error('Error in POST /api/admin/richmenu/settings:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
