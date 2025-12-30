import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase-server'

// 計分規則配置 - 隨機計分系統（從資料庫讀取，這裡是預設值）
const DEFAULT_SCORING_RULES = {
  BASE_SCORE: 50,           // 基礎分數
  RANDOM_BONUS_MIN: 1,      // 隨機加成最小值
  RANDOM_BONUS_MAX: 50,     // 隨機加成最大值
  PARTICIPATION_SCORE: 50,  // 答錯參與獎（鼓勵大家都答題）
  TIMEOUT_SCORE: 0,         // 超時分數
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

// 從資料庫獲取計分規則
async function getScoringRules(supabase: any) {
  try {
    const { data, error } = await supabase
      .from('scoring_rules')
      .select('*')
      .order('id', { ascending: false })
      .limit(1)
      .single()

    if (error || !data) {
      console.log('使用預設計分規則')
      return DEFAULT_SCORING_RULES
    }

    return {
      BASE_SCORE: data.base_score,
      RANDOM_BONUS_MIN: data.random_bonus_min,
      RANDOM_BONUS_MAX: data.random_bonus_max,
      PARTICIPATION_SCORE: data.participation_score,
      TIMEOUT_SCORE: data.timeout_score
    }
  } catch (error) {
    console.error('獲取計分規則失敗，使用預設值:', error)
    return DEFAULT_SCORING_RULES
  }
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

    // 獲取計分規則
    const scoringRules = await getScoringRules(supabase)

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
      is_timeout,
      scoringRules
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

    // 隨機計分系統 - 不再需要前三名額外加分

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

// 計算分數邏輯 - 隨機計分系統
async function calculateScore({
  question,
  selected_answer,
  answer_time,
  is_timeout,
  scoringRules = DEFAULT_SCORING_RULES
}: {
  question: any
  selected_answer: 'A' | 'B' | 'C' | 'D' | null
  answer_time: number
  is_timeout: boolean
  scoringRules?: typeof DEFAULT_SCORING_RULES
}): Promise<ScoreCalculationResult> {
  const result: ScoreCalculationResult = {
    base_score: 0,
    speed_bonus: 0,  // 保留欄位以維持相容性，但不再使用
    rank_bonus: 0,   // 保留欄位以維持相容性，但不再使用
    penalty: 0,
    final_score: 0
  }

  // 處理超時情況 - 0 分
  if (is_timeout) {
    result.final_score = scoringRules.TIMEOUT_SCORE
    console.log('⏰ 超時，得分:', result.final_score)
    return result
  }

  // 處理答錯情況 - 參與獎（鼓勵大家都答題）
  if (selected_answer !== question.correct_answer) {
    result.base_score = scoringRules.PARTICIPATION_SCORE
    result.final_score = scoringRules.PARTICIPATION_SCORE
    console.log('❌ 答錯，參與獎:', result.final_score)
    return result
  }

  // 處理答對情況 - 基礎分 + 隨機加成
  result.base_score = scoringRules.BASE_SCORE

  // 計算隨機加成
  const randomBonus = Math.floor(
    Math.random() * (scoringRules.RANDOM_BONUS_MAX - scoringRules.RANDOM_BONUS_MIN + 1)
  ) + scoringRules.RANDOM_BONUS_MIN

  result.speed_bonus = randomBonus  // 使用 speed_bonus 欄位存儲隨機加成
  result.final_score = result.base_score + randomBonus

  console.log('🎲 答對，隨機計分:', {
    question_id: question.id,
    基礎分: result.base_score,
    隨機加成: randomBonus,
    最終得分: result.final_score
  })

  return result
}

// 隨機計分系統 - 不再需要前三名額外加分功能

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
