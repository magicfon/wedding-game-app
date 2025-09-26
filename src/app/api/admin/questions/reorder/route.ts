import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase-server'

interface ReorderRequest {
  questionIds: number[]  // 按新順序排列的題目 ID 陣列
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createSupabaseAdmin()
    const { questionIds }: ReorderRequest = await request.json()
    
    if (!questionIds || !Array.isArray(questionIds) || questionIds.length === 0) {
      return NextResponse.json({
        error: '無效的題目 ID 陣列'
      }, { status: 400 })
    }
    
    console.log('🔄 開始重新排序題目:', questionIds)
    
    // 驗證所有 ID 都是有效的題目
    const { data: existingQuestions, error: fetchError } = await supabase
      .from('questions')
      .select('id')
      .in('id', questionIds)
    
    if (fetchError) {
      console.error('❌ 驗證題目 ID 失敗:', fetchError)
      return NextResponse.json({
        error: '驗證題目失敗',
        details: fetchError.message
      }, { status: 500 })
    }
    
    const existingIds = existingQuestions?.map(q => q.id) || []
    const invalidIds = questionIds.filter(id => !existingIds.includes(id))
    
    if (invalidIds.length > 0) {
      return NextResponse.json({
        error: '包含無效的題目 ID',
        invalid_ids: invalidIds
      }, { status: 400 })
    }
    
    // 批量更新題目順序
    const updates = questionIds.map((questionId, index) => ({
      id: questionId,
      display_order: index + 1  // 從 1 開始排序
    }))
    
    console.log('📝 更新排序:', updates)
    
    // 使用 upsert 批量更新
    const { data: updatedQuestions, error: updateError } = await supabase
      .from('questions')
      .upsert(
        updates.map(update => ({
          id: update.id,
          display_order: update.display_order
        })),
        { 
          onConflict: 'id',
          ignoreDuplicates: false 
        }
      )
      .select('id, question_text, display_order')
    
    if (updateError) {
      console.error('❌ 更新排序失敗:', updateError)
      return NextResponse.json({
        error: '更新排序失敗',
        details: updateError.message
      }, { status: 500 })
    }
    
    console.log('✅ 排序更新成功:', updatedQuestions)
    
    // 獲取所有題目的最新排序狀態
    const { data: allQuestions, error: allQuestionsError } = await supabase
      .from('questions')
      .select('id, question_text, display_order, media_type, is_active')
      .order('display_order', { ascending: true })
    
    if (allQuestionsError) {
      console.error('❌ 獲取更新後題目列表失敗:', allQuestionsError)
      return NextResponse.json({
        error: '獲取更新後題目列表失敗',
        details: allQuestionsError.message
      }, { status: 500 })
    }
    
    return NextResponse.json({
      success: true,
      message: `成功重新排序 ${questionIds.length} 個題目`,
      updated_count: questionIds.length,
      updated_questions: updatedQuestions,
      all_questions: allQuestions?.map(q => ({
        id: q.id,
        question_text: q.question_text,
        display_order: q.display_order,
        media_type: q.media_type,
        is_active: q.is_active
      }))
    })
    
  } catch (error) {
    console.error('❌ 題目重新排序錯誤:', error)
    return NextResponse.json({
      error: '重新排序失敗',
      details: error instanceof Error ? error.message : '未知錯誤'
    }, { status: 500 })
  }
}

// 獲取當前題目順序
export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseAdmin()
    
    const { data: questions, error } = await supabase
      .from('questions')
      .select('id, question_text, display_order, media_type, is_active, created_at')
      .order('display_order', { ascending: true })
    
    if (error) {
      console.error('❌ 獲取題目順序失敗:', error)
      return NextResponse.json({
        error: '獲取題目順序失敗',
        details: error.message
      }, { status: 500 })
    }
    
    return NextResponse.json({
      success: true,
      questions: questions?.map(q => ({
        id: q.id,
        question_text: q.question_text,
        display_order: q.display_order,
        media_type: q.media_type,
        is_active: q.is_active,
        created_at: q.created_at
      })),
      total_count: questions?.length || 0
    })
    
  } catch (error) {
    console.error('❌ 獲取題目順序錯誤:', error)
    return NextResponse.json({
      error: '獲取失敗',
      details: error instanceof Error ? error.message : '未知錯誤'
    }, { status: 500 })
  }
}
