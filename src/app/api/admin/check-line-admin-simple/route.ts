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

    // 檢查環境變數
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    if (!supabaseUrl || supabaseUrl === 'https://placeholder.supabase.co') {
      return NextResponse.json({
        error: 'Supabase URL not configured',
        isAdmin: false
      }, { status: 500 })
    }

    if (!supabaseKey || supabaseKey === 'placeholder-key') {
      return NextResponse.json({
        error: 'Supabase key not configured', 
        isAdmin: false
      }, { status: 500 })
    }

    const supabase = await createSupabaseServer()

    // 只檢查是否為管理員，不做其他操作
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
