import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    const { lineId } = await request.json()
    
    if (!lineId) {
      return NextResponse.json(
        { error: 'Line ID is required', isAdmin: false },
        { status: 400 }
      )
    }

    const supabase = await createSupabaseServer()

    // 檢查是否為管理員
    const { data: adminCheck, error: adminError } = await supabase
      .from('admin_line_ids')
      .select('line_id, display_name, is_active')
      .eq('line_id', lineId)
      .eq('is_active', true)
      .single()

    if (adminError && adminError.code !== 'PGRST116') {
      console.error('Admin check error:', adminError)
      return NextResponse.json(
        { error: 'Database error', isAdmin: false },
        { status: 500 }
      )
    }

    const isAdmin = !!adminCheck

    // 如果是管理員，更新用戶表格中的 is_admin 狀態
    if (isAdmin) {
      const { error: updateError } = await supabase
        .from('users')
        .update({ is_admin: true, updated_at: new Date().toISOString() })
        .eq('line_id', lineId)

      if (updateError) {
        console.error('Error updating user admin status:', updateError)
      }

      // 記錄管理員登入
      await supabase
        .from('admin_actions')
        .insert({
          admin_line_id: lineId,
          action: 'admin_login',
          details: { timestamp: new Date().toISOString() }
        })
    }

    return NextResponse.json({
      isAdmin,
      adminInfo: isAdmin ? {
        lineId: adminCheck.line_id,
        displayName: adminCheck.display_name
      } : null
    })

  } catch (error) {
    console.error('Check admin error:', error)
    return NextResponse.json(
      { error: 'Internal server error', isAdmin: false },
      { status: 500 }
    )
  }
}
