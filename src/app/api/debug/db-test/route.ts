import { NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase-server'

export async function GET() {
  try {
    // 檢查環境變數
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    if (!supabaseUrl || supabaseUrl === 'https://placeholder.supabase.co') {
      return NextResponse.json({
        success: false,
        error: 'NEXT_PUBLIC_SUPABASE_URL not configured',
        details: 'Please set NEXT_PUBLIC_SUPABASE_URL in Vercel environment variables'
      }, { status: 500 })
    }
    
    if (!supabaseAnonKey || supabaseAnonKey === 'placeholder-key') {
      return NextResponse.json({
        success: false,
        error: 'NEXT_PUBLIC_SUPABASE_ANON_KEY not configured',
        details: 'Please set NEXT_PUBLIC_SUPABASE_ANON_KEY in Vercel environment variables'
      }, { status: 500 })
    }

    // 嘗試創建 Supabase 客戶端
    const supabase = await createSupabaseServer()
    
    // 測試資料庫連接
    const { data: testData, error: testError } = await supabase
      .from('users')
      .select('count')
      .limit(1)
    
    if (testError) {
      return NextResponse.json({
        success: false,
        error: 'Database connection failed',
        details: testError.message,
        supabaseError: testError
      }, { status: 500 })
    }

    // 測試表格是否存在
    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('*')
      .limit(5)

    if (usersError) {
      return NextResponse.json({
        success: false,
        error: 'Users table access failed',
        details: usersError.message,
        hint: 'Please run the database/setup.sql script in Supabase SQL Editor'
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Database connection successful',
      data: {
        usersCount: usersData?.length || 0,
        sampleUsers: usersData?.map(u => ({
          line_id: u.line_id,
          display_name: u.display_name,
          created_at: u.created_at
        })) || []
      }
    })

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Unexpected error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
