import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseAdmin()
    
    console.log('🔍 檢查 display_order 欄位狀態...')
    
    // 1. 檢查 questions 表結構
    const { data: tableInfo, error: tableError } = await supabase
      .rpc('get_table_columns', { table_name: 'questions' })
      .select('*')
    
    if (tableError) {
      console.log('⚠️ 無法使用 RPC 檢查表結構，嘗試直接查詢...')
    }
    
    // 2. 嘗試查詢 questions 表，檢查 display_order 欄位
    const { data: questions, error: questionsError } = await supabase
      .from('questions')
      .select('id, question_text, display_order, created_at')
      .limit(3)
    
    if (questionsError) {
      console.error('❌ 查詢 questions 表失敗:', questionsError)
      return NextResponse.json({
        error: 'questions 表查詢失敗',
        details: questionsError.message,
        code: questionsError.code,
        hint: questionsError.hint
      }, { status: 500 })
    }
    
    // 3. 檢查是否有 display_order 欄位
    const hasDisplayOrder = questions && questions.length > 0 && 
      questions[0].hasOwnProperty('display_order')
    
    // 4. 統計 display_order 狀態
    const orderStats = {
      total_questions: questions?.length || 0,
      has_display_order_field: hasDisplayOrder,
      questions_with_order: questions?.filter(q => q.display_order != null).length || 0,
      questions_without_order: questions?.filter(q => q.display_order == null).length || 0
    }
    
    // 5. 嘗試更新一個測試記錄
    let updateTest = null
    if (questions && questions.length > 0) {
      const testQuestion = questions[0]
      const { data: updateData, error: updateError } = await supabase
        .from('questions')
        .update({ display_order: testQuestion.id })
        .eq('id', testQuestion.id)
        .select('id, display_order')
      
      updateTest = {
        success: !updateError,
        error: updateError?.message,
        updated_data: updateData
      }
    }
    
    console.log('✅ display_order 檢查完成')
    
    return NextResponse.json({
      success: true,
      message: 'display_order 欄位檢查完成',
      table_info: tableInfo,
      order_stats: orderStats,
      sample_questions: questions?.map(q => ({
        id: q.id,
        question_text: q.question_text?.substring(0, 50) + '...',
        display_order: q.display_order,
        created_at: q.created_at
      })),
      update_test: updateTest
    })
    
  } catch (error) {
    console.error('❌ 檢查 display_order 錯誤:', error)
    return NextResponse.json({
      error: '檢查失敗',
      details: error instanceof Error ? error.message : '未知錯誤'
    }, { status: 500 })
  }
}

// 修復 display_order 欄位
export async function POST(request: NextRequest) {
  try {
    const supabase = createSupabaseAdmin()
    
    console.log('🔧 開始修復 display_order 欄位...')
    
    // 1. 獲取所有題目
    const { data: questions, error: fetchError } = await supabase
      .from('questions')
      .select('id, question_text, display_order, created_at')
      .order('id', { ascending: true })
    
    if (fetchError) {
      console.error('❌ 獲取題目失敗:', fetchError)
      return NextResponse.json({
        error: '獲取題目失敗',
        details: fetchError.message
      }, { status: 500 })
    }
    
    if (!questions || questions.length === 0) {
      return NextResponse.json({
        success: true,
        message: '沒有題目需要修復'
      })
    }
    
    // 2. 為沒有 display_order 的題目設定順序
    const updates = questions.map((question, index) => ({
      id: question.id,
      display_order: question.display_order || (index + 1)
    }))
    
    console.log('📝 準備更新:', updates)
    
    // 3. 批量更新
    const { data: updatedQuestions, error: updateError } = await supabase
      .from('questions')
      .upsert(
        updates,
        { 
          onConflict: 'id',
          ignoreDuplicates: false 
        }
      )
      .select('id, display_order')
    
    if (updateError) {
      console.error('❌ 批量更新失敗:', updateError)
      return NextResponse.json({
        error: '批量更新失敗',
        details: updateError.message,
        code: updateError.code,
        hint: updateError.hint
      }, { status: 500 })
    }
    
    console.log('✅ display_order 修復完成')
    
    return NextResponse.json({
      success: true,
      message: `成功修復 ${questions.length} 個題目的 display_order`,
      updated_count: updatedQuestions?.length || 0,
      updated_questions: updatedQuestions
    })
    
  } catch (error) {
    console.error('❌ 修復 display_order 錯誤:', error)
    return NextResponse.json({
      error: '修復失敗',
      details: error instanceof Error ? error.message : '未知錯誤'
    }, { status: 500 })
  }
}
