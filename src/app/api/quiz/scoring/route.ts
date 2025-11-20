import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase-server'

// 計分規則配置
const SCORING_RULES = {
  // 基礎分數由題目設定決定
  SPEED_BONUS_MULTIPLIER: 0.5, // 速度加成倍數（基於剩餘時間比例）
  TOP_ANSWER_BONUS: [50, 30, 20], // 前三名答對者額外加分
  WRONG_ANSWER_PENALTY: 0, // 答錯不扣分
  TIMEOUT_PENALTY_DEFAULT: 10, // 未答題默認扣分
}

interface AnswerSubmission {
  user_line_id: string
  question_id: number
  selected_answer: 'A' | 'B' | 'C' | 'D' | null
  answer_time: number // 毫秒
  is_timeout: boolean
}

interface ScoreCalculationResult {
  base_score: number
  speed_bonus: number
  rank_bonus: number
  penalty: number
  final_score: number
  rank_position?: number
}

// 計算答題分數
export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServer()
    const body = await request.json()

    const { user_line_id, question_id, selected_answer, answer_time, is_timeout = false } = body as AnswerSubmission

    // 驗證必要參數
    if (!user_line_id || !question_id) {
      return NextResponse.json({
        error: '缺少必要參數：user_line_id, question_id'
      }, { status: 400 })
    }

    // 獲取題目資訊
    const { data: question, error: questionError } = await supabase
      .from('questions')
      .select('*')
      .eq('id', question_id)
      .single()

    if (questionError || !question) {
      return NextResponse.json({ error: '題目不存在' }, { status: 404 })
    }

    // 檢查用戶是否已經答過這題
    const { data: existingAnswer } = await supabase
      .from('answer_records')
      .select('id')
      .eq('user_line_id', user_line_id)
      .eq('question_id', question_id)
      .single()

    if (existingAnswer) {
      return NextResponse.json({
        error: '用戶已經回答過這個問題'
      }, { status: 400 })
    }

    // 計算分數
    const scoreResult = await calculateScore({
      question,
      selected_answer,
      answer_time,
      is_timeout
    })

    // 記錄答題
    console.log('💾 準備記錄答題:', {
      user_line_id,
      question_id,
      selected_answer: is_timeout ? null : selected_answer,
      answer_time,
      is_correct: !is_timeout && selected_answer === question.correct_answer,
      earned_score: scoreResult.final_score
    })

    const { data: answerRecord, error: insertError } = await supabase
      .from('answer_records')
      .insert({
        user_line_id,
        question_id,
        selected_answer: is_timeout ? null : selected_answer,
        answer_time,
        is_correct: !is_timeout && selected_answer === question.correct_answer,
        earned_score: scoreResult.final_score
      })
      .select()
      .single()

    if (insertError) {
      console.error('❌ 記錄答題失敗:', insertError)
      throw insertError
    }

    console.log('✅ 答題記錄已插入:', answerRecord)

    // 如果答對了，檢查是否需要給前三名額外加分
    if (!is_timeout && selected_answer === question.correct_answer) {
      await updateTopAnswerBonuses(question_id, supabase)
    }

    // 檢查用戶總分是否已更新（觸發器應該會自動更新）
    const { data: updatedUser, error: userError } = await supabase
      .from('users')
      .select('quiz_score')
      .eq('line_id', user_line_id)
      .single()

    if (userError) {
      console.error('⚠️ 無法檢查用戶分數更新:', userError)
    } else {
      console.log('📊 用戶當前快問快答分數:', updatedUser.quiz_score)
    }

    return NextResponse.json({
      success: true,
      score_details: scoreResult,
      answer_record: answerRecord,
      user_quiz_score: updatedUser?.quiz_score || 0,
      message: `獲得 ${scoreResult.final_score} 分！`
    })
  } catch (error) {
    console.error('Error in quiz scoring:', error)
    return NextResponse.json({
      error: '計分失敗',
      details: error instanceof Error ? error.message : '未知錯誤'
    }, { status: 500 })
  }
}

// 計算分數邏輯
async function calculateScore({
  question,
  selected_answer,
  answer_time,
  is_timeout
}: {
  question: any
  selected_answer: 'A' | 'B' | 'C' | 'D' | null
  answer_time: number
  is_timeout: boolean
}): Promise<ScoreCalculationResult> {
  const result: ScoreCalculationResult = {
    base_score: 0,
    speed_bonus: 0,
    rank_bonus: 0,
    penalty: 0,
    final_score: 0
  }

  // 處理超時情況
  if (is_timeout) {
    const timeoutPenalty = question.timeout_penalty_enabled
      ? question.timeout_penalty_score
      : SCORING_RULES.TIMEOUT_PENALTY_DEFAULT

    result.penalty = timeoutPenalty
    result.final_score = -timeoutPenalty
    return result
  }

  // 處理答錯情況（不扣分）
  if (selected_answer !== question.correct_answer) {
    result.final_score = 0
    return result
  }

  // 處理答對情況 - 優先使用管理界面設定的 points
  result.base_score = question.points || question.base_score || 100
  console.log('📊 基礎分數計算:', {
    question_id: question.id,
    管理界面設定_points: question.points,
    資料庫預設_base_score: question.base_score,
    最終使用_base_score: result.base_score
  })

  // 計算速度加成（基於剩餘時間比例）
  const totalTimeMs = question.time_limit * 1000
  const remainingTimeMs = Math.max(0, totalTimeMs - answer_time)
  const timeRatio = remainingTimeMs / totalTimeMs
  result.speed_bonus = Math.floor(timeRatio * result.base_score * SCORING_RULES.SPEED_BONUS_MULTIPLIER)

  // 基礎分數 + 速度加成
  result.final_score = result.base_score + result.speed_bonus

  return result
}

// 更新前三名答對者的額外加分
async function updateTopAnswerBonuses(question_id: number, supabase: any) {
  try {
    // 獲取這題所有答對的記錄，按答題時間排序
    const { data: correctAnswers, error } = await supabase
      .from('answer_records')
      .select('*')
      .eq('question_id', question_id)
      .eq('is_correct', true)
      .order('answer_time', { ascending: true })
      .limit(3)

    if (error || !correctAnswers || correctAnswers.length === 0) {
      return
    }

    // 為前三名添加額外加分
    const updates = correctAnswers.map((record: any, index: number) => {
      const rankBonus = SCORING_RULES.TOP_ANSWER_BONUS[index] || 0
      const newScore = record.earned_score + rankBonus

      return supabase
        .from('answer_records')
        .update({
          earned_score: newScore
        })
        .eq('id', record.id)
    })

    await Promise.all(updates)

    console.log(`✅ 已為題目 ${question_id} 的前 ${correctAnswers.length} 名答對者添加排名加分`)
  } catch (error) {
    console.error('Error updating top answer bonuses:', error)
  }
}

// 獲取題目計分統計
export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServer()
    const { searchParams } = new URL(request.url)
    const question_id = searchParams.get('question_id')

    if (!question_id) {
      return NextResponse.json({ error: '缺少 question_id 參數' }, { status: 400 })
    }

    // 獲取答題統計
    const { data: stats, error } = await supabase
      .from('answer_records')
      .select(`
        *,
        users!answer_records_user_line_id_fkey (
          display_name,
          avatar_url
        )
      `)
      .eq('question_id', parseInt(question_id))
      .order('answer_time', { ascending: true })

    if (error) throw error

    // 分析統計數據
    const analysis = {
      total_answers: stats?.length || 0,
      correct_answers: stats?.filter(s => s.is_correct).length || 0,
      wrong_answers: stats?.filter(s => !s.is_correct && s.selected_answer).length || 0,
      timeout_answers: stats?.filter(s => !s.selected_answer).length || 0,
      average_answer_time: 0,
      top_scorers: [] as any[],
      score_distribution: {
        A: 0, B: 0, C: 0, D: 0, timeout: 0
      }
    }

    if (stats && stats.length > 0) {
      // 計算平均答題時間
      const validAnswers = stats.filter(s => s.selected_answer)
      if (validAnswers.length > 0) {
        analysis.average_answer_time = Math.round(
          validAnswers.reduce((sum, s) => sum + s.answer_time, 0) / validAnswers.length
        )
      }

      // 統計答案分布
      stats.forEach(stat => {
        if (stat.selected_answer) {
          analysis.score_distribution[stat.selected_answer as keyof typeof analysis.score_distribution]++
        } else {
          analysis.score_distribution.timeout++
        }
      })

      // 前三名得分者
      analysis.top_scorers = stats
        .filter(s => s.is_correct)
        .sort((a, b) => a.answer_time - b.answer_time)
        .slice(0, 3)
        .map((s, index) => ({
          rank: index + 1,
          user: s.users,
          score: s.earned_score,
          answer_time: s.answer_time,
          answer_time_seconds: (s.answer_time / 1000).toFixed(1)
        }))
    }

    return NextResponse.json({
      question_id: parseInt(question_id),
      analysis,
      detailed_answers: stats
    })
  } catch (error) {
    console.error('Error getting quiz statistics:', error)
    return NextResponse.json({
      error: '獲取統計失敗',
      details: error instanceof Error ? error.message : '未知錯誤'
    }, { status: 500 })
  }
}
