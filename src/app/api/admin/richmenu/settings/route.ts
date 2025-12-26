import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase-admin'

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

    return NextResponse.json({
      success: true,
      message: 'Rich menu settings updated successfully',
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
