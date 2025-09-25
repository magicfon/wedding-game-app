import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase-server'

// 批量更新題目設定
export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServer()
    const body = await request.json()
    
    const { 
      update_type,
      timeout_penalty_enabled,
      timeout_penalty_score,
      question_ids // 可選：指定特定題目ID，如果為空則更新所有題目
    } = body

    // 驗證參數
    if (update_type !== 'timeout_penalty') {
      return NextResponse.json({ 
        error: '目前只支援 timeout_penalty 批量更新' 
      }, { status: 400 })
    }

    // 構建更新條件
    let query = supabase.from('questions')

    // 如果指定了特定題目ID，只更新這些題目
    if (question_ids && Array.isArray(question_ids) && question_ids.length > 0) {
      query = query.update({
        timeout_penalty_enabled,
        timeout_penalty_score,
        updated_at: new Date().toISOString()
      }).in('id', question_ids)
    } else {
      // 更新所有題目
      query = query.update({
        timeout_penalty_enabled,
        timeout_penalty_score,
        updated_at: new Date().toISOString()
      }).neq('id', 0) // 更新所有ID不為0的題目（即所有題目）
    }

    const { data: updatedQuestions, error: updateError } = await query.select()

    if (updateError) {
      console.error('批量更新題目失敗:', updateError)
      return NextResponse.json({ 
        error: '批量更新失敗',
        details: updateError.message 
      }, { status: 500 })
    }

    console.log(`✅ 批量更新完成，共更新 ${updatedQuestions?.length || 0} 個題目`)

    return NextResponse.json({
      success: true,
      message: `成功更新 ${updatedQuestions?.length || 0} 個題目的超時扣分設定`,
      updated_questions: updatedQuestions?.length || 0,
      settings: {
        timeout_penalty_enabled,
        timeout_penalty_score
      }
    })

  } catch (error) {
    console.error('批量更新題目錯誤:', error)
    return NextResponse.json({ 
      error: '批量更新失敗',
      details: error instanceof Error ? error.message : '未知錯誤'
    }, { status: 500 })
  }
}

// 獲取批量更新的預覽
export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServer()
    
    // 獲取所有題目的當前超時設定
    const { data: questions, error } = await supabase
      .from('questions')
      .select('id, question_text, timeout_penalty_enabled, timeout_penalty_score')
      .order('id')

    if (error) {
      return NextResponse.json({ error: '獲取題目失敗' }, { status: 500 })
    }

    const summary = {
      total_questions: questions?.length || 0,
      timeout_enabled_count: questions?.filter(q => q.timeout_penalty_enabled).length || 0,
      timeout_disabled_count: questions?.filter(q => !q.timeout_penalty_enabled).length || 0,
      average_penalty_score: questions?.length ? 
        questions.reduce((sum, q) => sum + (q.timeout_penalty_score || 0), 0) / questions.length : 0
    }

    return NextResponse.json({
      success: true,
      questions,
      summary
    })

  } catch (error) {
    console.error('獲取題目預覽錯誤:', error)
    return NextResponse.json({ 
      error: '獲取預覽失敗',
      details: error instanceof Error ? error.message : '未知錯誤'
    }, { status: 500 })
  }
}
