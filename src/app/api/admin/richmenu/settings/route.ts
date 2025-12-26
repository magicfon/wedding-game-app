import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// 驗證管理員權限
async function verifyAdmin(request: NextRequest): Promise<boolean> {
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

// GET: 獲取 Rich Menu 設定
export async function GET(request: NextRequest) {
  try {
    // 驗證管理員權限
    const isAdmin = await verifyAdmin(request)
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Database configuration missing' },
        { status: 500 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

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
    // 驗證管理員權限
    const isAdmin = await verifyAdmin(request)
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

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

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Database configuration missing' },
        { status: 500 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

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
