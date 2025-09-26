import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase-server'

// 手動同步分數的 API
export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServer()
    
    console.log('🔄 開始手動同步所有用戶分數...')
    
    // 獲取所有用戶
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('line_id, display_name, total_score')
    
    if (usersError) {
      throw usersError
    }
    
    const syncResults = []
    
    for (const user of users || []) {
      // 計算用戶應該有的分數
      const { data: userAnswers, error: answerError } = await supabase
        .from('answer_records')
        .select('earned_score, question_id, is_correct, created_at')
        .eq('user_line_id', user.line_id)
        .order('created_at', { ascending: true })
      
      if (answerError) {
        console.error(`❌ 獲取用戶 ${user.display_name} 答題記錄失敗:`, answerError)
        syncResults.push({
          user: user.display_name,
          success: false,
          error: answerError.message
        })
        continue
      }
      
      // 計算總分
      const calculatedScore = userAnswers?.reduce((sum, answer) => sum + (answer.earned_score || 0), 0) || 0
      
      // 獲取分數調整記錄
      const { data: adjustments, error: adjustmentError } = await supabase
        .from('score_adjustments')
        .select('adjustment_score')
        .eq('user_line_id', user.line_id)
      
      const adjustmentScore = adjustments?.reduce((sum, adj) => sum + (adj.adjustment_score || 0), 0) || 0
      const finalScore = calculatedScore + adjustmentScore
      
      // 更新分數
      const { error: updateError } = await supabase
        .from('users')
        .update({ total_score: finalScore })
        .eq('line_id', user.line_id)
      
      if (updateError) {
        console.error(`❌ 更新用戶 ${user.display_name} 分數失敗:`, updateError)
        syncResults.push({
          user: user.display_name,
          success: false,
          error: updateError.message
        })
      } else {
        console.log(`✅ 已更新用戶 ${user.display_name} 分數: ${user.total_score} → ${finalScore}`)
        syncResults.push({
          user: user.display_name,
          success: true,
          old_score: user.total_score,
          calculated_score: calculatedScore,
          adjustment_score: adjustmentScore,
          new_score: finalScore,
          answer_count: userAnswers?.length || 0,
          answers: userAnswers?.map(a => ({
            question_id: a.question_id,
            earned_score: a.earned_score,
            is_correct: a.is_correct,
            created_at: a.created_at
          })) || []
        })
      }
    }
    
    return NextResponse.json({
      success: true,
      message: `已同步 ${users?.length || 0} 個用戶的分數`,
      results: syncResults
    })
    
  } catch (error) {
    console.error('❌ 同步分數失敗:', error)
    return NextResponse.json({
      success: false,
      error: '同步分數失敗',
      details: error instanceof Error ? error.message : '未知錯誤'
    }, { status: 500 })
  }
}

// 檢查分數狀態
export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServer()
    
    // 獲取所有用戶和答題記錄
    const { data: users } = await supabase
      .from('users')
      .select('line_id, display_name, total_score')
    
    const { data: answers } = await supabase
      .from('answer_records')
      .select('user_line_id, earned_score, question_id, is_correct, created_at')
      .order('created_at', { ascending: false })
    
    const { data: adjustments } = await supabase
      .from('score_adjustments')
      .select('user_line_id, adjustment_score, reason, created_at')
      .order('created_at', { ascending: false })
    
    // 分析每個用戶的分數狀態
    const analysis = users?.map(user => {
      const userAnswers = answers?.filter(a => a.user_line_id === user.line_id) || []
      const userAdjustments = adjustments?.filter(a => a.user_line_id === user.line_id) || []
      
      const calculatedScore = userAnswers.reduce((sum, answer) => sum + (answer.earned_score || 0), 0)
      const adjustmentScore = userAdjustments.reduce((sum, adj) => sum + (adj.adjustment_score || 0), 0)
      const expectedTotal = calculatedScore + adjustmentScore
      
      return {
        user: user.display_name,
        line_id: user.line_id,
        current_total: user.total_score,
        calculated_from_answers: calculatedScore,
        adjustment_total: adjustmentScore,
        expected_total: expectedTotal,
        is_correct: user.total_score === expectedTotal,
        difference: user.total_score - expectedTotal,
        answer_count: userAnswers.length,
        adjustment_count: userAdjustments.length,
        recent_answers: userAnswers.slice(0, 3).map(a => ({
          question_id: a.question_id,
          earned_score: a.earned_score,
          is_correct: a.is_correct,
          created_at: a.created_at
        }))
      }
    }) || []
    
    return NextResponse.json({
      success: true,
      total_users: users?.length || 0,
      total_answers: answers?.length || 0,
      total_adjustments: adjustments?.length || 0,
      incorrect_scores: analysis.filter(a => !a.is_correct).length,
      user_analysis: analysis
    })
    
  } catch (error) {
    console.error('❌ 檢查分數狀態失敗:', error)
    return NextResponse.json({
      success: false,
      error: '檢查分數狀態失敗',
      details: error instanceof Error ? error.message : '未知錯誤'
    }, { status: 500 })
  }
}
