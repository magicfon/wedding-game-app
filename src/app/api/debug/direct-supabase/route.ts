import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Direct Supabase test started')
    
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

    console.log('🔌 Creating direct Supabase client...')
    
    // 使用直接的 Supabase 客戶端，不依賴 SSR
    const supabase = createClient(supabaseUrl, supabaseKey)
    console.log('✅ Direct Supabase client created')

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

    // 測試插入一個簡單問題
    console.log('🧪 Testing question insert...')
    const testQuestion = {
      question_text: 'API Test Question - ' + Date.now(),
      option_a: 'Test A',
      option_b: 'Test B', 
      option_c: 'Test C',
      option_d: 'Test D',
      correct_answer: 'A',
      points: 10,
      is_active: true
    }

    const { data: insertTest, error: insertError } = await supabase
      .from('questions')
      .insert(testQuestion)
      .select()
      .single()

    if (insertError) {
      console.error('❌ Insert test failed:', insertError)
      return NextResponse.json({
        success: false,
        error: 'Insert test failed',
        details: insertError,
        testQuestion
      }, { status: 500 })
    }

    console.log('✅ Insert test successful:', insertTest)

    return NextResponse.json({
      success: true,
      message: 'Direct Supabase test successful',
      results: {
        usersTest,
        questionsTest: questionsTest?.length > 0 ? questionsTest[0] : 'no questions found',
        insertTest
      }
    })

  } catch (error) {
    console.error('💥 Direct Supabase test failed:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
