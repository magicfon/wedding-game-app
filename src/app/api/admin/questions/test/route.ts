import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase-admin'

export async function POST(request: NextRequest) {
  try {
    console.log('Testing question creation...')
    
    const body = await request.json()
    console.log('Received body:', body)

    const supabase = createSupabaseAdmin()

    // 1. 測試基本連接
    console.log('Testing basic connection...')
    const { data: testConnection, error: connectionError } = await supabase
      .from('questions')
      .select('*', { count: 'exact', head: true })

    if (connectionError) {
      console.error('Connection error:', connectionError)
      return NextResponse.json({ 
        success: false, 
        error: 'Database connection failed',
        details: connectionError
      }, { status: 500 })
    }

    console.log('Connection test passed:', testConnection)

    // 2. 檢查表格結構
    console.log('Checking table structure...')
    const { data: tableInfo, error: tableError } = await supabase
      .from('questions')
      .select('*')
      .limit(1)

    if (tableError) {
      console.error('Table structure error:', tableError)
      return NextResponse.json({ 
        success: false, 
        error: 'Table structure check failed',
        details: tableError
      }, { status: 500 })
    }

    console.log('Table structure check passed, sample row:', tableInfo?.[0])

    // 3. 嘗試插入最小資料
    console.log('Testing minimal insert...')
    const minimalData = {
      question_text: 'Test Question',
      option_a: 'Option A',
      option_b: 'Option B', 
      option_c: 'Option C',
      option_d: 'Option D',
      correct_answer: 'A',
      points: 10
    }

    const { data: minimalInsert, error: minimalError } = await supabase
      .from('questions')
      .insert(minimalData)
      .select()

    if (minimalError) {
      console.error('Minimal insert error:', minimalError)
      return NextResponse.json({ 
        success: false, 
        error: 'Minimal insert failed',
        details: minimalError,
        attempted_data: minimalData
      }, { status: 500 })
    }

    console.log('Minimal insert successful:', minimalInsert)

    // 4. 嘗試插入完整資料
    console.log('Testing full insert...')
    const {
      question_text,
      option_a,
      option_b,
      option_c,
      option_d,
      correct_answer,
      points = 10,
      time_limit = 30,
      penalty_enabled = false,
      penalty_score = 0,
      timeout_penalty_enabled = false,
      timeout_penalty_score = 0,
      speed_bonus_enabled = true,
      max_bonus_points = 5,
      created_by
    } = body

    const fullData = {
      question_text,
      option_a,
      option_b,
      option_c,
      option_d,
      correct_answer,
      points,
      time_limit,
      penalty_enabled,
      penalty_score,
      timeout_penalty_enabled,
      timeout_penalty_score,
      speed_bonus_enabled,
      max_bonus_points,
      created_by
    }

    console.log('Attempting full insert with data:', fullData)

    const { data: fullInsert, error: fullError } = await supabase
      .from('questions')
      .insert(fullData)
      .select()

    if (fullError) {
      console.error('Full insert error:', fullError)
      return NextResponse.json({ 
        success: false, 
        error: 'Full insert failed',
        details: fullError,
        attempted_data: fullData
      }, { status: 500 })
    }

    console.log('Full insert successful:', fullInsert)

    return NextResponse.json({ 
      success: true, 
      message: 'All tests passed',
      results: {
        connection: testConnection,
        tableStructure: tableInfo?.[0],
        minimalInsert,
        fullInsert
      }
    })

  } catch (error) {
    console.error('Test API error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
