import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Testing Supabase connection...')
    
    // 檢查環境變數
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    console.log('Environment check:')
    console.log('- Supabase URL:', supabaseUrl ? 'Set' : 'Missing')
    console.log('- Supabase Key:', supabaseKey ? 'Set' : 'Missing')
    
    if (!supabaseUrl || supabaseUrl === 'https://placeholder.supabase.co') {
      return NextResponse.json({
        success: false,
        error: 'NEXT_PUBLIC_SUPABASE_URL not configured',
        supabaseUrl: supabaseUrl || 'undefined'
      }, { status: 500 })
    }
    
    if (!supabaseKey || supabaseKey === 'placeholder-key') {
      return NextResponse.json({
        success: false,
        error: 'NEXT_PUBLIC_SUPABASE_ANON_KEY not configured',
        supabaseKey: supabaseKey ? 'set' : 'undefined'
      }, { status: 500 })
    }

    console.log('🔌 Creating Supabase client...')
    const supabase = await createSupabaseServer()
    console.log('✅ Supabase client created')

    // 測試基本查詢
    console.log('🧪 Testing basic query...')
    const { data: usersTest, error: usersError } = await supabase
      .from('users')
      .select('count(*)')
      .limit(1)

    if (usersError) {
      console.error('❌ Users table query failed:', usersError)
      return NextResponse.json({
        success: false,
        error: 'Users table query failed',
        details: usersError
      }, { status: 500 })
    }

    console.log('✅ Users table query successful:', usersTest)

    // 測試問題表格查詢
    console.log('🧪 Testing questions table...')
    const { data: questionsTest, error: questionsError } = await supabase
      .from('questions')
      .select('*')
      .limit(1)

    if (questionsError) {
      console.error('❌ Questions table query failed:', questionsError)
      return NextResponse.json({
        success: false,
        error: 'Questions table query failed',
        details: questionsError,
        usersTest: usersTest
      }, { status: 500 })
    }

    console.log('✅ Questions table query successful:', questionsTest)

    // 檢查問題表格結構
    console.log('🔍 Checking questions table structure...')
    const sampleQuestion = questionsTest?.[0]
    const availableFields = sampleQuestion ? Object.keys(sampleQuestion) : []
    
    const requiredFields = [
      'question_text', 'option_a', 'option_b', 'option_c', 'option_d', 
      'correct_answer', 'points', 'time_limit', 'penalty_enabled', 
      'penalty_score', 'timeout_penalty_enabled', 'timeout_penalty_score',
      'speed_bonus_enabled', 'max_bonus_points', 'created_by'
    ]
    
    const missingFields = requiredFields.filter(field => !availableFields.includes(field))
    
    console.log('Available fields:', availableFields)
    console.log('Missing fields:', missingFields)

    return NextResponse.json({
      success: true,
      message: 'Supabase connection successful',
      results: {
        environment: {
          supabaseUrl: supabaseUrl.substring(0, 30) + '...',
          supabaseKey: 'configured'
        },
        usersTest,
        questionsTest: questionsTest?.length > 0 ? questionsTest[0] : 'no questions found',
        tableStructure: {
          availableFields,
          missingFields,
          needsUpdate: missingFields.length > 0
        }
      }
    })

  } catch (error) {
    console.error('💥 Supabase test failed:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
