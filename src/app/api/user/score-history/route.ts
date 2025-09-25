import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase-server'

// 獲取用戶積分變動歷史
export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServer()
    const { searchParams } = new URL(request.url)
    const user_line_id = searchParams.get('user_line_id')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    if (!user_line_id) {
      return NextResponse.json({ 
        error: '缺少用戶ID參數' 
      }, { status: 400 })
    }

    // 獲取答題記錄（積分變動）
    const { data: answerRecords, error: answerError } = await supabase
      .from('answer_records')
      .select(`
        id,
        question_id,
        selected_answer,
        answer_time,
        is_correct,
        earned_score,
        created_at,
        questions (
          id,
          question_text
        )
      `)
      .eq('user_line_id', user_line_id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (answerError) {
      console.error('獲取答題記錄失敗:', answerError)
    }

    // 獲取分數調整記錄
    const { data: adjustmentRecords, error: adjustmentError } = await supabase
      .from('score_adjustments')
      .select(`
        id,
        admin_line_id,
        adjustment_score,
        reason,
        created_at
      `)
      .eq('user_line_id', user_line_id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (adjustmentError) {
      console.error('獲取分數調整記錄失敗:', adjustmentError)
    }

    // 合併並排序所有記錄
    const allRecords: any[] = []

    // 處理答題記錄
    if (answerRecords) {
      answerRecords.forEach(record => {
        allRecords.push({
          id: `answer_${record.id}`,
          type: 'answer',
          score_change: record.earned_score,
          description: `答題：${record.questions?.question_text || '未知題目'}`,
          details: {
            question_id: record.question_id,
            selected_answer: record.selected_answer,
            answer_time: record.answer_time,
            is_correct: record.is_correct,
            is_timeout: record.selected_answer === null
          },
          created_at: record.created_at,
          icon: record.is_correct ? '✅' : (record.selected_answer === null ? '⏰' : '❌')
        })
      })
    }

    // 處理分數調整記錄
    if (adjustmentRecords) {
      adjustmentRecords.forEach(record => {
        allRecords.push({
          id: `adjustment_${record.id}`,
          type: 'adjustment',
          score_change: record.adjustment_score,
          description: `管理員調分：${record.reason || '無說明'}`,
          details: {
            admin_line_id: record.admin_line_id,
            reason: record.reason
          },
          created_at: record.created_at,
          icon: record.adjustment_score > 0 ? '⬆️' : '⬇️'
        })
      })
    }

    // 按時間排序（最新在前）
    allRecords.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    // 限制返回數量
    const limitedRecords = allRecords.slice(0, limit)

    // 計算累積分數（從最舊的記錄開始）
    const recordsWithCumulative = []
    let cumulativeScore = 0

    // 先獲取用戶當前總分
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('total_score, display_name')
      .eq('line_id', user_line_id)
      .single()

    if (userError) {
      console.error('獲取用戶資訊失敗:', userError)
    }

    const currentTotalScore = user?.total_score || 0

    // 從最新記錄開始，逆向計算每個時間點的分數
    let tempScore = currentTotalScore
    for (let i = 0; i < limitedRecords.length; i++) {
      const record = limitedRecords[i]
      recordsWithCumulative.push({
        ...record,
        score_after: tempScore,
        score_before: tempScore - record.score_change
      })
      tempScore -= record.score_change
    }

    return NextResponse.json({
      success: true,
      user: {
        line_id: user_line_id,
        display_name: user?.display_name || '未知用戶',
        current_total_score: currentTotalScore
      },
      history: recordsWithCumulative,
      pagination: {
        limit,
        offset,
        total_records: allRecords.length,
        has_more: allRecords.length > limit
      }
    })

  } catch (error) {
    console.error('獲取積分歷史失敗:', error)
    return NextResponse.json({ 
      error: '獲取積分歷史失敗',
      details: error instanceof Error ? error.message : '未知錯誤'
    }, { status: 500 })
  }
}
