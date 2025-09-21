import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase-admin'

// POST - 創建新問題（安全版本，只使用基本欄位）
export async function POST(request: NextRequest) {
  try {
    console.log('🔍 Safe question creation API called')
    
    const body = await request.json()
    console.log('📋 Received data:', body)
    
    const {
      question_text,
      option_a,
      option_b,
      option_c,
      option_d,
      correct_answer,
      points = 10,
      created_by
    } = body

    // 驗證必填欄位
    if (!question_text || !option_a || !option_b || !option_c || !option_d || !correct_answer) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // 驗證正確答案
    if (!['A', 'B', 'C', 'D'].includes(correct_answer)) {
      return NextResponse.json({ error: 'Invalid correct answer' }, { status: 400 })
    }

    console.log('🔌 Creating Supabase admin client...')
    const supabase = createSupabaseAdmin()

    // 只插入基本欄位，避免欄位不存在的錯誤
    const basicData = {
      question_text,
      option_a,
      option_b,
      option_c,
      option_d,
      correct_answer,
      points,
      is_active: true
    }

    console.log('💾 Attempting to insert basic data:', basicData)

    const { data: question, error } = await supabase
      .from('questions')
      .insert(basicData)
      .select()
      .single()

    if (error) {
      console.error('❌ Insert error:', error)
      return NextResponse.json({ 
        error: 'Failed to create question', 
        details: error.message,
        code: error.code
      }, { status: 500 })
    }

    console.log('✅ Question created successfully:', question)

    // 記錄管理員操作（暫時註解，等 admin_actions 表格創建後再啟用）
    // try {
    //   await supabase
    //     .from('admin_actions')
    //     .insert({
    //       admin_line_id: created_by || 'unknown',
    //       action_type: 'create_question',
    //       target_type: 'question',
    //       target_id: question.id.toString(),
    //       details: { question_text }
    //     })
    //   console.log('✅ Admin action logged')
    // } catch (logError) {
    //   console.warn('⚠️ Failed to log admin action:', logError)
    //   // 不影響主要功能
    // }

    return NextResponse.json({ success: true, question })

  } catch (error) {
    console.error('💥 Safe question creation error:', error)
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// GET - 獲取所有問題（安全版本）
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const activeOnly = searchParams.get('active') === 'true'
    
    const supabase = createSupabaseAdmin()

    let query = supabase
      .from('questions')
      .select('*')
      .order('created_at', { ascending: true })

    if (activeOnly) {
      query = query.eq('is_active', true)
    }

    const { data: questions, error } = await query

    if (error) {
      console.error('Error fetching questions:', error)
      return NextResponse.json({ error: 'Failed to fetch questions' }, { status: 500 })
    }

    return NextResponse.json({ success: true, questions })

  } catch (error) {
    console.error('Questions GET API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
