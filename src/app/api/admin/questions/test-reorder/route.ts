import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    const supabase = createSupabaseAdmin()
    const { questionIds } = await request.json()
    
    console.log('🧪 測試重新排序功能...')
    console.log('題目 IDs:', questionIds)
    
    if (!questionIds || !Array.isArray(questionIds) || questionIds.length === 0) {
      return NextResponse.json({
        error: '無效的題目 ID 陣列'
      }, { status: 400 })
    }
    
    // 1. 檢查所有題目是否存在
    console.log('📝 步驟 1: 檢查題目是否存在...')
    const { data: existingQuestions, error: fetchError } = await supabase
      .from('questions')
      .select('id, question_text, display_order')
      .in('id', questionIds)
    
    if (fetchError) {
      console.error('❌ 檢查題目失敗:', fetchError)
      return NextResponse.json({
        error: '檢查題目失敗',
        details: fetchError.message
      }, { status: 500 })
    }
    
    const existingIds = existingQuestions?.map(q => q.id) || []
    const missingIds = questionIds.filter(id => !existingIds.includes(id))
    
    if (missingIds.length > 0) {
      return NextResponse.json({
        error: '包含不存在的題目 ID',
        missing_ids: missingIds,
        existing_ids: existingIds
      }, { status: 400 })
    }
    
    // 2. 逐一更新排序
    console.log('📝 步驟 2: 逐一更新排序...')
    const results = []
    
    for (let i = 0; i < questionIds.length; i++) {
      const questionId = questionIds[i]
      const newOrder = i + 1
      
      console.log(`更新題目 ${questionId} 排序為 ${newOrder}`)
      
      const { data: updateResult, error: updateError } = await supabase
        .from('questions')
        .update({ display_order: newOrder })
        .eq('id', questionId)
        .select('id, question_text, display_order')
      
      if (updateError) {
        console.error(`❌ 更新題目 ${questionId} 失敗:`, updateError)
        results.push({
          id: questionId,
          success: false,
          error: updateError.message
        })
      } else {
        console.log(`✅ 更新題目 ${questionId} 成功`)
        results.push({
          id: questionId,
          success: true,
          data: updateResult?.[0]
        })
      }
    }
    
    // 3. 統計結果
    const successCount = results.filter(r => r.success).length
    const failCount = results.filter(r => !r.success).length
    
    console.log(`📊 更新結果: ${successCount} 成功, ${failCount} 失敗`)
    
    // 4. 獲取最終排序狀態
    console.log('📝 步驟 3: 獲取最終排序狀態...')
    const { data: finalQuestions, error: finalError } = await supabase
      .from('questions')
      .select('id, question_text, display_order')
      .order('display_order', { ascending: true })
    
    if (finalError) {
      console.error('⚠️ 獲取最終狀態失敗:', finalError)
    }
    
    return NextResponse.json({
      success: failCount === 0,
      message: failCount === 0 
        ? `✅ 成功重新排序 ${successCount} 個題目` 
        : `⚠️ 部分成功：${successCount} 成功，${failCount} 失敗`,
      total_questions: questionIds.length,
      success_count: successCount,
      fail_count: failCount,
      update_results: results,
      final_questions: finalQuestions?.map(q => ({
        id: q.id,
        question_text: q.question_text?.substring(0, 50) + '...',
        display_order: q.display_order
      }))
    })
    
  } catch (error) {
    console.error('❌ 測試重新排序錯誤:', error)
    return NextResponse.json({
      error: '測試失敗',
      details: error instanceof Error ? error.message : '未知錯誤'
    }, { status: 500 })
  }
}

// 獲取當前排序狀態
export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseAdmin()
    
    console.log('📊 獲取當前排序狀態...')
    
    const { data: questions, error } = await supabase
      .from('questions')
      .select('id, question_text, display_order')
      .order('display_order', { ascending: true })
    
    if (error) {
      console.error('❌ 獲取排序狀態失敗:', error)
      return NextResponse.json({
        error: '獲取排序狀態失敗',
        details: error.message
      }, { status: 500 })
    }
    
    return NextResponse.json({
      success: true,
      message: '獲取排序狀態成功',
      questions: questions?.map(q => ({
        id: q.id,
        question_text: q.question_text?.substring(0, 50) + '...',
        display_order: q.display_order
      })),
      total_count: questions?.length || 0
    })
    
  } catch (error) {
    console.error('❌ 獲取排序狀態錯誤:', error)
    return NextResponse.json({
      error: '獲取失敗',
      details: error instanceof Error ? error.message : '未知錯誤'
    }, { status: 500 })
  }
}
