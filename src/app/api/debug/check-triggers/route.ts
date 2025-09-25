import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase-server'

// 檢查資料庫觸發器和手動更新分數
export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServer()
    
    console.log('🔍 開始檢查觸發器和分數更新...')
    
    // 1. 檢查 answer_records 表格中的資料
    const { data: answerRecords, error: answerError } = await supabase
      .from('answer_records')
      .select('user_line_id, earned_score, created_at')
      .order('created_at', { ascending: false })
      .limit(10)
    
    if (answerError) {
      console.error('❌ 無法獲取答題記錄:', answerError)
      return NextResponse.json({ error: '無法獲取答題記錄', details: answerError })
    }
    
    console.log('📝 最近的答題記錄:', answerRecords)
    
    // 2. 檢查 users 表格中的分數
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('line_id, display_name, total_score')
      .order('total_score', { ascending: false })
      .limit(10)
    
    if (usersError) {
      console.error('❌ 無法獲取用戶資料:', usersError)
      return NextResponse.json({ error: '無法獲取用戶資料', details: usersError })
    }
    
    console.log('👥 用戶分數:', users)
    
    // 3. 手動計算每個用戶應該有的分數
    const userScoreCalculations = []
    
    for (const user of users || []) {
      const { data: userAnswers, error: userAnswerError } = await supabase
        .from('answer_records')
        .select('earned_score')
        .eq('user_line_id', user.line_id)
      
      if (!userAnswerError && userAnswers) {
        const calculatedScore = userAnswers.reduce((sum, answer) => sum + (answer.earned_score || 0), 0)
        userScoreCalculations.push({
          line_id: user.line_id,
          display_name: user.display_name,
          current_total_score: user.total_score,
          calculated_score: calculatedScore,
          needs_update: user.total_score !== calculatedScore
        })
      }
    }
    
    console.log('🧮 分數計算結果:', userScoreCalculations)
    
    // 4. 找出需要更新的用戶
    const usersNeedingUpdate = userScoreCalculations.filter(user => user.needs_update)
    
    if (usersNeedingUpdate.length > 0) {
      console.log('⚠️ 發現分數不一致的用戶:', usersNeedingUpdate)
      
      // 5. 手動更新分數
      for (const user of usersNeedingUpdate) {
        const { error: updateError } = await supabase
          .from('users')
          .update({ total_score: user.calculated_score })
          .eq('line_id', user.line_id)
        
        if (updateError) {
          console.error(`❌ 更新用戶 ${user.display_name} 分數失敗:`, updateError)
        } else {
          console.log(`✅ 已更新用戶 ${user.display_name} 分數: ${user.current_total_score} → ${user.calculated_score}`)
        }
      }
    }
    
    return NextResponse.json({
      success: true,
      answer_records: answerRecords,
      users: users,
      score_calculations: userScoreCalculations,
      users_updated: usersNeedingUpdate.length,
      message: `檢查完成。更新了 ${usersNeedingUpdate.length} 個用戶的分數。`
    })
    
  } catch (error) {
    console.error('❌ 檢查觸發器失敗:', error)
    return NextResponse.json({ 
      error: '檢查失敗', 
      details: error instanceof Error ? error.message : '未知錯誤' 
    }, { status: 500 })
  }
}

// 手動重新計算所有用戶分數
export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServer()
    
    console.log('🔄 開始手動重新計算所有用戶分數...')
    
    // 獲取所有用戶
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('line_id, display_name, total_score')
    
    if (usersError) {
      throw usersError
    }
    
    const updateResults = []
    
    for (const user of users || []) {
      // 計算用戶應該有的分數
      const { data: userAnswers, error: answerError } = await supabase
        .from('answer_records')
        .select('earned_score')
        .eq('user_line_id', user.line_id)
      
      if (answerError) {
        console.error(`❌ 獲取用戶 ${user.display_name} 答題記錄失敗:`, answerError)
        continue
      }
      
      const calculatedScore = userAnswers?.reduce((sum, answer) => sum + (answer.earned_score || 0), 0) || 0
      
      // 更新分數
      const { error: updateError } = await supabase
        .from('users')
        .update({ total_score: calculatedScore })
        .eq('line_id', user.line_id)
      
      if (updateError) {
        console.error(`❌ 更新用戶 ${user.display_name} 分數失敗:`, updateError)
        updateResults.push({
          user: user.display_name,
          success: false,
          error: updateError.message
        })
      } else {
        console.log(`✅ 已更新用戶 ${user.display_name} 分數: ${user.total_score} → ${calculatedScore}`)
        updateResults.push({
          user: user.display_name,
          success: true,
          old_score: user.total_score,
          new_score: calculatedScore
        })
      }
    }
    
    return NextResponse.json({
      success: true,
      message: `已重新計算 ${users?.length || 0} 個用戶的分數`,
      results: updateResults
    })
    
  } catch (error) {
    console.error('❌ 手動重新計算分數失敗:', error)
    return NextResponse.json({ 
      error: '重新計算失敗', 
      details: error instanceof Error ? error.message : '未知錯誤' 
    }, { status: 500 })
  }
}
