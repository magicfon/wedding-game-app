import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 Admin check debug API called')
    
    const { lineId } = await request.json()
    console.log('📋 Received lineId:', lineId)
    
    if (!lineId) {
      return NextResponse.json(
        { 
          error: 'Line ID is required', 
          isAdmin: false,
          debug: 'No lineId provided'
        },
        { status: 400 }
      )
    }

    // 檢查環境變數
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    console.log('🔧 Environment check:')
    console.log('- Supabase URL:', supabaseUrl ? 'Set' : 'Missing')
    console.log('- Supabase Key:', supabaseKey ? 'Set' : 'Missing')
    
    if (!supabaseUrl || supabaseUrl === 'https://placeholder.supabase.co') {
      return NextResponse.json({
        error: 'Supabase URL not configured',
        isAdmin: false,
        debug: {
          supabaseUrl: supabaseUrl || 'undefined',
          step: 'env_check'
        }
      }, { status: 500 })
    }

    if (!supabaseKey || supabaseKey === 'placeholder-key') {
      return NextResponse.json({
        error: 'Supabase key not configured', 
        isAdmin: false,
        debug: {
          supabaseKey: supabaseKey ? 'set' : 'undefined',
          step: 'env_check'
        }
      }, { status: 500 })
    }

    console.log('🔌 Creating Supabase client...')
    const supabase = await createSupabaseServer()
    console.log('✅ Supabase client created')

    // 首先測試基本連接
    console.log('🧪 Testing basic connection...')
    const { data: testData, error: testError } = await supabase
      .from('users')
      .select('count(*)')
      .limit(1)

    if (testError) {
      console.error('❌ Basic connection test failed:', testError)
      return NextResponse.json({
        error: 'Database connection failed',
        isAdmin: false,
        debug: {
          testError: testError.message,
          code: testError.code,
          step: 'connection_test'
        }
      }, { status: 500 })
    }

    console.log('✅ Basic connection test passed:', testData)

    // 檢查 admin_line_ids 表格是否存在
    console.log('🔍 Checking admin_line_ids table...')
    const { data: adminTableTest, error: adminTableError } = await supabase
      .from('admin_line_ids')
      .select('count(*)')
      .limit(1)

    if (adminTableError) {
      console.error('❌ admin_line_ids table test failed:', adminTableError)
      return NextResponse.json({
        error: 'admin_line_ids table not found',
        isAdmin: false,
        debug: {
          adminTableError: adminTableError.message,
          code: adminTableError.code,
          step: 'admin_table_test',
          hint: 'Please run database/add-line-admin.sql in Supabase SQL Editor'
        }
      }, { status: 500 })
    }

    console.log('✅ admin_line_ids table exists:', adminTableTest)

    // 檢查是否為管理員
    console.log('🔍 Checking admin status for lineId:', lineId)
    const { data: adminCheck, error: adminError } = await supabase
      .from('admin_line_ids')
      .select('line_id, display_name, is_active')
      .eq('line_id', lineId)
      .eq('is_active', true)
      .single()

    console.log('📊 Admin check result:', { adminCheck, adminError })

    if (adminError && adminError.code !== 'PGRST116') {
      console.error('❌ Admin check failed:', adminError)
      return NextResponse.json({
        error: 'Admin check failed',
        isAdmin: false,
        debug: {
          adminError: adminError.message,
          code: adminError.code,
          step: 'admin_check'
        }
      }, { status: 500 })
    }

    const isAdmin = !!adminCheck
    console.log('🎯 Final result - isAdmin:', isAdmin)

    return NextResponse.json({
      isAdmin,
      adminInfo: isAdmin ? {
        lineId: adminCheck.line_id,
        displayName: adminCheck.display_name
      } : null,
      debug: {
        step: 'success',
        adminCheck: adminCheck || 'no_admin_found',
        lineId
      }
    })

  } catch (error) {
    console.error('💥 Unexpected error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      isAdmin: false,
      debug: {
        error: error instanceof Error ? error.message : 'Unknown error',
        step: 'catch_block'
      }
    }, { status: 500 })
  }
}
