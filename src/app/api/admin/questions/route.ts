import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase-admin'

// GET - 獲取所有問題
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
    console.error('Questions API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - 創建新問題
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
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

    // 驗證必填欄位
    if (!question_text || !option_a || !option_b || !option_c || !option_d || !correct_answer) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // 驗證正確答案
    if (!['A', 'B', 'C', 'D'].includes(correct_answer)) {
      return NextResponse.json({ error: 'Invalid correct answer' }, { status: 400 })
    }

    const supabase = createSupabaseAdmin()

    const { data: question, error } = await supabase
      .from('questions')
      .insert({
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
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating question:', error)
      return NextResponse.json({ error: 'Failed to create question' }, { status: 500 })
    }

    // 記錄管理員操作（暫時註解，等 admin_actions 表格創建後再啟用）
    // await supabase
    //   .from('admin_actions')
    //   .insert({
    //     admin_line_id: created_by || 'unknown',
    //     action_type: 'create_question',
    //     target_type: 'question',
    //     target_id: question.id.toString(),
    //     details: { question_text }
    //   })

    return NextResponse.json({ success: true, question })

  } catch (error) {
    console.error('Create question error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT - 更新問題
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, updated_by, ...updateData } = body

    if (!id) {
      return NextResponse.json({ error: 'Question ID is required' }, { status: 400 })
    }

    const supabase = createSupabaseAdmin()

    const { data: question, error } = await supabase
      .from('questions')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating question:', error)
      return NextResponse.json({ error: 'Failed to update question' }, { status: 500 })
    }

    // 記錄管理員操作（暫時註解，等 admin_actions 表格創建後再啟用）
    // await supabase
    //   .from('admin_actions')
    //   .insert({
    //     admin_line_id: updated_by || 'unknown',
    //     action_type: 'update_question',
    //     target_type: 'question',
    //     target_id: id.toString(),
    //     details: updateData
    //   })

    return NextResponse.json({ success: true, question })

  } catch (error) {
    console.error('Update question error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - 刪除問題（軟刪除，設為 inactive）
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const deleted_by = searchParams.get('deleted_by')

    if (!id) {
      return NextResponse.json({ error: 'Question ID is required' }, { status: 400 })
    }

    const supabase = createSupabaseAdmin()

    const { data: question, error } = await supabase
      .from('questions')
      .update({ is_active: false })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error deleting question:', error)
      return NextResponse.json({ error: 'Failed to delete question' }, { status: 500 })
    }

    // 記錄管理員操作（暫時註解，等 admin_actions 表格創建後再啟用）
    // await supabase
    //   .from('admin_actions')
    //   .insert({
    //     admin_line_id: deleted_by || 'unknown',
    //     action_type: 'delete_question',
    //     target_type: 'question',
    //     target_id: id,
    //     details: { question_text: question.question_text }
    //   })

    return NextResponse.json({ success: true, message: 'Question deleted successfully' })

  } catch (error) {
    console.error('Delete question error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
