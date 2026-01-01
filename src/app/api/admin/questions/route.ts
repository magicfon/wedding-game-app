import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase-admin'

// GET - 獲取所有問題
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const activeOnly = searchParams.get('active') === 'true'
    const category = searchParams.get('category')

    const supabase = createSupabaseAdmin()

    let query = supabase
      .from('questions')
      .select('*')
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: true })

    if (activeOnly) {
      query = query.eq('is_active', true)
    }

    if (category) {
      query = query.eq('category', category)
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
      created_by,
      // 媒體支援欄位
      media_type = 'text',
      media_url,
      media_thumbnail_url,
      media_alt_text,
      media_duration,
      // 分類
      category = 'formal'
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

    // 獲取目前該分類的最大 display_order
    const { data: maxOrderData } = await supabase
      .from('questions')
      .select('display_order')
      .eq('category', category)
      .order('display_order', { ascending: false })
      .limit(1)
      .single()

    const nextOrder = (maxOrderData?.display_order || 0) + 1

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
        created_by,
        // 媒體支援欄位
        media_type,
        media_url,
        media_thumbnail_url,
        media_alt_text,
        media_duration,
        // 分類與排序
        category,
        display_order: nextOrder
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

    console.log('📝 Updating question:', { id, updateData })

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

    console.log('✅ Question updated successfully:', question)

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

// DELETE - 刪除問題（永久刪除）
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const deleted_by = searchParams.get('deleted_by')

    if (!id) {
      return NextResponse.json({ error: 'Question ID is required' }, { status: 400 })
    }

    const supabase = createSupabaseAdmin()

    // 先獲取題目資訊（用於日誌記錄）
    const { data: questionData } = await supabase
      .from('questions')
      .select('question_text')
      .eq('id', id)
      .single()

    // 永久刪除題目
    const { error } = await supabase
      .from('questions')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting question:', error)
      return NextResponse.json({ error: 'Failed to delete question' }, { status: 500 })
    }

    console.log(`🗑️ Question ${id} permanently deleted by ${deleted_by || 'unknown'}`)

    return NextResponse.json({ success: true, message: 'Question deleted successfully' })

  } catch (error) {
    console.error('Delete question error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
