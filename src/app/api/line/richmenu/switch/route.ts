import { NextRequest, NextResponse } from 'next/server'
import { Client } from '@line/bot-sdk'
import { createClient } from '@supabase/supabase-js'

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

// 獲取 Rich Menu ID
async function getRichMenuId(
  supabase: any,
  menuType: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from('line_richmenu_registry')
    .select('richmenu_id')
    .eq('menu_type', menuType)
    .single()

  if (error || !data) {
    console.error(`Error fetching rich menu ID for ${menuType}:`, error)
    return null
  }

  return data.richmenu_id
}

// 獲取 Rich Menu 設定
async function getRichMenuSettings(supabase: any): Promise<any> {
  const { data, error } = await supabase
    .from('line_richmenu_settings')
    .select('*')
    .single()

  if (error || !data) {
    console.error('Error fetching rich menu settings:', error)
    return null
  }

  return data
}

// 更新用戶 Rich Menu 狀態
async function updateUserRichMenuState(
  supabase: any,
  lineId: string,
  currentTab: string
): Promise<boolean> {
  const { error } = await supabase
    .from('line_richmenu_user_states')
    .upsert({
      line_id: lineId,
      current_tab: currentTab,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'line_id'
    })

  if (error) {
    console.error('Error updating user rich menu state:', error)
    return false
  }

  return true
}

// POST: 切換用戶 Rich Menu 分頁
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { lineId, targetTab } = body

    // 驗證輸入
    if (!lineId) {
      return NextResponse.json(
        { error: 'lineId is required' },
        { status: 400 }
      )
    }

    if (!targetTab || !['venue_info', 'activity'].includes(targetTab)) {
      return NextResponse.json(
        { error: 'Invalid target tab' },
        { status: 400 }
      )
    }

    const lineClient = getLineClient()
    const supabase = getSupabaseClient()

    if (!lineClient || !supabase) {
      return NextResponse.json(
        { error: 'Service configuration error' },
        { status: 500 }
      )
    }

    // 獲取 Rich Menu 設定
    const settings = await getRichMenuSettings(supabase)
    if (!settings) {
      return NextResponse.json(
        { error: 'Failed to fetch rich menu settings' },
        { status: 500 }
      )
    }

    // 檢查目標分頁是否啟用
    if (targetTab === 'venue_info' && !settings.venue_tab_enabled) {
      // 會場資訊分頁停用，切換到未開放分頁
      const unavailableRichMenuId = await getRichMenuId(supabase, 'unavailable')
      if (!unavailableRichMenuId) {
        return NextResponse.json(
          { error: 'Unavailable rich menu not configured' },
          { status: 500 }
        )
      }

      await (lineClient as any).setUserRichMenu(lineId, unavailableRichMenuId)
      return NextResponse.json({
        success: true,
        message: 'Venue info tab is disabled',
        currentTab: 'unavailable'
      })
    }

    if (targetTab === 'activity' && !settings.activity_tab_enabled) {
      // 現場活動分頁停用，切換到未開放分頁
      const unavailableRichMenuId = await getRichMenuId(supabase, 'unavailable')
      if (!unavailableRichMenuId) {
        return NextResponse.json(
          { error: 'Unavailable rich menu not configured' },
          { status: 500 }
        )
      }

      await (lineClient as any).setUserRichMenu(lineId, unavailableRichMenuId)
      return NextResponse.json({
        success: true,
        message: 'Activity tab is disabled',
        currentTab: 'unavailable'
      })
    }

    // 獲取目標分頁的 Rich Menu ID
    const targetRichMenuId = await getRichMenuId(supabase, targetTab)
    if (!targetRichMenuId) {
      return NextResponse.json(
        { error: `Rich menu for ${targetTab} not configured` },
        { status: 500 }
      )
    }

    // 切換用戶的 Rich Menu
    await (lineClient as any).setUserRichMenu(lineId, targetRichMenuId)

    // 更新用戶 Rich Menu 狀態
    await updateUserRichMenuState(supabase, lineId, targetTab)

    return NextResponse.json({
      success: true,
      message: `Rich menu switched to ${targetTab} tab`,
      currentTab: targetTab
    })

  } catch (error) {
    console.error('Error in POST /api/line/richmenu/switch:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET: 獲取用戶當前 Rich Menu 分頁
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const lineId = searchParams.get('lineId')

    if (!lineId) {
      return NextResponse.json(
        { error: 'lineId is required' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseClient()
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database configuration error' },
        { status: 500 }
      )
    }

    // 獲取用戶當前分頁
    const { data, error } = await supabase
      .from('line_richmenu_user_states')
      .select('current_tab')
      .eq('line_id', lineId)
      .single()

    if (error) {
      console.error('Error fetching user rich menu state:', error)
      return NextResponse.json(
        { error: 'Failed to fetch user rich menu state' },
        { status: 500 }
      )
    }

    // 如果用戶沒有狀態記錄，返回預設分頁
    if (!data) {
      const settings = await getRichMenuSettings(supabase)
      return NextResponse.json({
        currentTab: settings?.default_tab || 'venue_info',
        isNewUser: true
      })
    }

    return NextResponse.json({
      currentTab: data.current_tab,
      isNewUser: false
    })

  } catch (error) {
    console.error('Error in GET /api/line/richmenu/switch:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
