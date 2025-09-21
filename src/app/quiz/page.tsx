'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowser, Question } from '@/lib/supabase'
import Layout from '@/components/Layout'
import { Clock, Users, Trophy, CheckCircle, XCircle } from 'lucide-react'

interface GameState {
  current_question_id: number | null
  is_game_active: boolean
  is_paused: boolean
  question_start_time: string | null
}

export default function QuizPage() {
  const [gameState, setGameState] = useState<GameState | null>(null)
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null)
  const [selectedAnswer, setSelectedAnswer] = useState<'A' | 'B' | 'C' | 'D' | null>(null)
  const [timeLeft, setTimeLeft] = useState<number>(0)
  const [hasAnswered, setHasAnswered] = useState(false)
  const [answerResult, setAnswerResult] = useState<{ isCorrect: boolean; score: number } | null>(null)
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  
  const router = useRouter()
  const supabase = createSupabaseBrowser()

  // 獲取用戶資訊
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/line')
        return
      }
      setUser(user)
      setLoading(false)
    }

    getUser()
  }, [supabase.auth, router])

  // 獲取遊戲狀態
  const fetchGameState = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('game_state')
        .select('*')
        .single()

      if (error) throw error
      setGameState(data)

      // 如果有當前題目，獲取題目詳情
      if (data.current_question_id) {
        const { data: questionData, error: questionError } = await supabase
          .from('questions')
          .select('*')
          .eq('id', data.current_question_id)
          .single()

        if (questionError) throw questionError
        setCurrentQuestion(questionData)

        // 計算剩餘時間
        if (data.question_start_time && !data.is_paused) {
          const startTime = new Date(data.question_start_time).getTime()
          const now = Date.now()
          const elapsed = Math.floor((now - startTime) / 1000)
          const remaining = Math.max(0, questionData.time_limit - elapsed)
          setTimeLeft(remaining)
        }
      }
    } catch (error) {
      console.error('Error fetching game state:', error)
    }
  }, [supabase])

  // 初始載入和訂閱即時更新
  useEffect(() => {
    if (!user) return

    fetchGameState()

    // 訂閱遊戲狀態變化
    const gameStateSubscription = supabase
      .channel('game_state_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'game_state'
      }, () => {
        fetchGameState()
        setHasAnswered(false)
        setSelectedAnswer(null)
        setAnswerResult(null)
      })
      .subscribe()

    return () => {
      gameStateSubscription.unsubscribe()
    }
  }, [user, fetchGameState, supabase])

  // 倒數計時器
  useEffect(() => {
    if (!gameState?.is_game_active || gameState.is_paused || timeLeft <= 0 || hasAnswered) {
      return
    }

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          // 時間到，自動提交空答案
          handleTimeUp()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [timeLeft, gameState, hasAnswered])

  const handleTimeUp = async () => {
    if (!user || !currentQuestion || hasAnswered) return

    setHasAnswered(true)
    
    try {
      const { error } = await supabase
        .from('answer_records')
        .insert({
          user_line_id: user.id,
          question_id: currentQuestion.id,
          selected_answer: null,
          answer_time: currentQuestion.time_limit * 1000,
          is_correct: false,
          earned_score: currentQuestion.timeout_penalty_enabled ? -currentQuestion.timeout_penalty_score : 0
        })

      if (error) throw error

      setAnswerResult({
        isCorrect: false,
        score: currentQuestion.timeout_penalty_enabled ? -currentQuestion.timeout_penalty_score : 0
      })
    } catch (error) {
      console.error('Error recording timeout:', error)
    }
  }

  const handleAnswerSubmit = async (answer: 'A' | 'B' | 'C' | 'D') => {
    if (!user || !currentQuestion || hasAnswered || timeLeft <= 0) return

    setSelectedAnswer(answer)
    setHasAnswered(true)

    const answerTime = (currentQuestion.time_limit - timeLeft) * 1000
    const isCorrect = answer === currentQuestion.correct_answer
    
    let earnedScore = 0
    if (isCorrect) {
      // 計算得分：基礎分數 + 速度加成
      const speedBonus = Math.floor((timeLeft / currentQuestion.time_limit) * currentQuestion.base_score * 0.5)
      earnedScore = currentQuestion.base_score + speedBonus
    } else if (currentQuestion.penalty_enabled) {
      earnedScore = -currentQuestion.penalty_score
    }

    try {
      const { error } = await supabase
        .from('answer_records')
        .insert({
          user_line_id: user.id,
          question_id: currentQuestion.id,
          selected_answer: answer,
          answer_time: answerTime,
          is_correct: isCorrect,
          earned_score: earnedScore
        })

      if (error) throw error

      setAnswerResult({
        isCorrect,
        score: earnedScore
      })
    } catch (error) {
      console.error('Error submitting answer:', error)
    }
  }

  if (loading) {
    return (
      <Layout title="快問快答">
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500"></div>
        </div>
      </Layout>
    )
  }

  if (!gameState?.is_game_active) {
    return (
      <Layout title="快問快答">
        <div className="text-center py-16">
          <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md mx-auto">
            <Trophy className="w-16 h-16 text-gray-400 mx-auto mb-6" />
            <h2 className="text-2xl font-bold text-gray-800 mb-4">遊戲暫未開始</h2>
            <p className="text-gray-600 mb-6">請等待主持人開始遊戲</p>
            <button
              onClick={() => router.push('/')}
              className="bg-pink-500 hover:bg-pink-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
            >
              返回首頁
            </button>
          </div>
        </div>
      </Layout>
    )
  }

  if (gameState.is_paused) {
    return (
      <Layout title="快問快答">
        <div className="text-center py-16">
          <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md mx-auto">
            <Clock className="w-16 h-16 text-yellow-500 mx-auto mb-6" />
            <h2 className="text-2xl font-bold text-gray-800 mb-4">遊戲暫停中</h2>
            <p className="text-gray-600">請等待主持人繼續遊戲</p>
          </div>
        </div>
      </Layout>
    )
  }

  if (!currentQuestion) {
    return (
      <Layout title="快問快答">
        <div className="text-center py-16">
          <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md mx-auto">
            <Users className="w-16 h-16 text-blue-500 mx-auto mb-6" />
            <h2 className="text-2xl font-bold text-gray-800 mb-4">準備中</h2>
            <p className="text-gray-600">正在載入題目...</p>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout title="快問快答">
      <div className="max-w-4xl mx-auto">
        {/* 計時器和狀態 */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold ${
                timeLeft > 10 ? 'bg-green-100 text-green-700' :
                timeLeft > 5 ? 'bg-yellow-100 text-yellow-700' :
                'bg-red-100 text-red-700'
              }`}>
                {timeLeft}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-800">剩餘時間</h3>
                <p className="text-sm text-gray-600">第 {currentQuestion.id} 題</p>
              </div>
            </div>
            
            {answerResult && (
              <div className={`flex items-center space-x-2 px-4 py-2 rounded-lg ${
                answerResult.isCorrect ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              }`}>
                {answerResult.isCorrect ? (
                  <CheckCircle className="w-5 h-5" />
                ) : (
                  <XCircle className="w-5 h-5" />
                )}
                <span className="font-semibold">
                  {answerResult.isCorrect ? '答對了！' : '答錯了！'}
                  {answerResult.score > 0 && `+${answerResult.score}分`}
                  {answerResult.score < 0 && `${answerResult.score}分`}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* 題目 */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-8 text-center leading-relaxed">
            {currentQuestion.question_text}
          </h2>

          {/* 選項 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { key: 'A' as const, text: currentQuestion.option_a },
              { key: 'B' as const, text: currentQuestion.option_b },
              { key: 'C' as const, text: currentQuestion.option_c },
              { key: 'D' as const, text: currentQuestion.option_d },
            ].map((option) => (
              <button
                key={option.key}
                onClick={() => handleAnswerSubmit(option.key)}
                disabled={hasAnswered || timeLeft <= 0}
                className={`p-4 rounded-xl border-2 text-left transition-all duration-200 ${
                  hasAnswered
                    ? selectedAnswer === option.key
                      ? answerResult?.isCorrect
                        ? 'border-green-500 bg-green-50 text-green-700'
                        : 'border-red-500 bg-red-50 text-red-700'
                      : currentQuestion.correct_answer === option.key
                        ? 'border-green-500 bg-green-50 text-green-700'
                        : 'border-gray-200 bg-gray-50 text-gray-500'
                    : 'border-gray-200 hover:border-pink-300 hover:bg-pink-50 cursor-pointer'
                } ${timeLeft <= 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div className="flex items-center space-x-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                    hasAnswered
                      ? selectedAnswer === option.key
                        ? answerResult?.isCorrect
                          ? 'bg-green-500 text-white'
                          : 'bg-red-500 text-white'
                        : currentQuestion.correct_answer === option.key
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-300 text-gray-600'
                      : 'bg-pink-100 text-pink-700'
                  }`}>
                    {option.key}
                  </div>
                  <span className="flex-1 text-lg">{option.text}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* 遊戲說明 */}
        <div className="bg-blue-50 rounded-xl p-4 text-center">
          <p className="text-blue-700 text-sm">
            💡 答對得分 = 基礎分數 + 速度加成 | 越快答對，得分越高！
          </p>
        </div>
      </div>
    </Layout>
  )
}
