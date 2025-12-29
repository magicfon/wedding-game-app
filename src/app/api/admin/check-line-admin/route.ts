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
      .select('line_id, display_name, is_active, admin_level')
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

    // 簡化版本：只返回管理員狀態，不做額外的資料庫操作
    // 這可以避免因為 users 表格或 admin_actions 表格問題導致的超時

    return NextResponse.json({
      isAdmin,
      adminInfo: isAdmin ? {
        lineId: adminCheck.line_id,
        displayName: adminCheck.display_name,
        adminLevel: adminCheck.admin_level || 'event' // 預設為活動管理員
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
