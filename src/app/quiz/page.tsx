'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowser } from '@/lib/supabase'
import { useLiff } from '@/hooks/useLiff'
import { useRealtimeGameState } from '@/hooks/useRealtimeGameState'
import Layout from '@/components/Layout'
import UserStatus from '@/components/UserStatus'
import { Clock, Users, Trophy, CheckCircle, XCircle, Heart } from 'lucide-react'

export default function QuizPage() {
  const [selectedAnswer, setSelectedAnswer] = useState<'A' | 'B' | 'C' | 'D' | null>(null)
  const [timeLeft, setTimeLeft] = useState<number>(0)
  const [hasAnswered, setHasAnswered] = useState(false)
  const [answerResult, setAnswerResult] = useState<{ isCorrect: boolean; score: number } | null>(null)
  const [answeredCount, setAnsweredCount] = useState<number>(0)
  
  const router = useRouter()
  const supabase = createSupabaseBrowser()
  
  // 使用 LIFF 登入系統
  const { isReady, isLoggedIn, profile, login, loading: liffLoading } = useLiff()
  
  // 使用統一的即時遊戲狀態
  const { gameState, currentQuestion, loading: gameLoading, calculateTimeLeft } = useRealtimeGameState()


  // 獲取當前題目答題人數
  const fetchAnsweredCount = useCallback(async () => {
    if (!currentQuestion) return

    try {
      const { count, error } = await supabase
        .from('answer_records')
        .select('*', { count: 'exact', head: true })
        .eq('question_id', currentQuestion.id)

      if (error) throw error
      setAnsweredCount(count || 0)
    } catch (error) {
      console.error('Error fetching answered count:', error)
    }
  }, [currentQuestion, supabase])

  // 當遊戲狀態或題目改變時重置答題狀態
  useEffect(() => {
    if (gameState && currentQuestion) {
      setHasAnswered(false)
      setSelectedAnswer(null)
      setAnswerResult(null)
      // 計算初始時間
      setTimeLeft(calculateTimeLeft())
    }
  }, [gameState?.current_question_id, currentQuestion?.id, calculateTimeLeft])

  // 當題目改變時獲取答題人數並訂閱答題記錄變化
  useEffect(() => {
    if (!currentQuestion) return

    fetchAnsweredCount()

    // 訂閱答題記錄變化
    const answerSubscription = supabase
      .channel('answer_records_changes')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'answer_records', filter: `question_id=eq.${currentQuestion.id}` },
        () => {
          fetchAnsweredCount()
        }
      )
      .subscribe()

    return () => {
      answerSubscription.unsubscribe()
    }
  }, [currentQuestion, fetchAnsweredCount, supabase])

  const handleTimeUp = useCallback(async () => {
    if (!profile || !currentQuestion || hasAnswered) return

    setHasAnswered(true)
    
    try {
      const { error } = await supabase
        .from('answer_records')
        .insert({
          user_line_id: profile.userId,
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
  }, [profile, currentQuestion, hasAnswered, supabase])

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
  }, [timeLeft, gameState, hasAnswered, handleTimeUp])

  const handleAnswerSubmit = async (answer: 'A' | 'B' | 'C' | 'D') => {
    if (!profile || !currentQuestion || hasAnswered || timeLeft <= 0) return

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
          user_line_id: profile.userId,
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

  // 載入狀態
  if (liffLoading || gameLoading) {
    return (
      <Layout title="快問快答">
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500"></div>
          <p className="ml-4 text-gray-600">載入中...</p>
        </div>
      </Layout>
    )
  }

  // 未登入狀態
  if (!isLoggedIn || !profile) {
    return (
      <Layout title="快問快答">
        <div className="text-center py-16">
          <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md mx-auto">
            <Heart className="w-16 h-16 text-pink-500 mx-auto mb-6" />
            <h2 className="text-2xl font-bold text-gray-800 mb-4">請先登入</h2>
            <p className="text-gray-600 mb-6">需要登入才能參與快問快答</p>
            <div className="space-y-4">
              <button
                onClick={login}
                disabled={!isReady}
                className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
              >
                {!isReady ? '載入中...' : 'Line 登入'}
              </button>
              <button
                onClick={() => router.push('/')}
                className="w-full bg-gray-500 hover:bg-gray-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
              >
                返回首頁
              </button>
            </div>
          </div>
        </div>
        <UserStatus />
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
        {/* 用戶狀態 */}
        <UserStatus />
        
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
            
            {/* 答題人數統計 */}
            <div className="flex items-center space-x-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{answeredCount}</div>
                <div className="text-sm text-gray-600">已答題</div>
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

          {/* 簡化選項按鈕 - 四個不同顏色的大按鈕 */}
          <div className="grid grid-cols-2 gap-6">
            {[
              { key: 'A' as const, text: currentQuestion.option_a, color: 'bg-red-500 hover:bg-red-600', selectedColor: 'bg-red-600' },
              { key: 'B' as const, text: currentQuestion.option_b, color: 'bg-blue-500 hover:bg-blue-600', selectedColor: 'bg-blue-600' },
              { key: 'C' as const, text: currentQuestion.option_c, color: 'bg-green-500 hover:bg-green-600', selectedColor: 'bg-green-600' },
              { key: 'D' as const, text: currentQuestion.option_d, color: 'bg-yellow-500 hover:bg-yellow-600', selectedColor: 'bg-yellow-600' }
            ].map((option) => (
              <button
                key={option.key}
                onClick={() => handleAnswerSubmit(option.key)}
                disabled={hasAnswered || timeLeft <= 0}
                className={`p-8 rounded-2xl text-white font-bold text-2xl transition-all duration-200 shadow-lg ${
                  hasAnswered && selectedAnswer === option.key
                    ? option.selectedColor
                    : hasAnswered
                      ? 'bg-gray-400 opacity-50'
                      : timeLeft <= 0
                        ? 'bg-gray-400 opacity-50 cursor-not-allowed'
                        : `${option.color} cursor-pointer transform hover:scale-105`
                }`}
              >
                <div className="text-center">
                  <div className="text-4xl font-black mb-2">{option.key}</div>
                  <div className="text-lg font-medium leading-tight">{option.text}</div>
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
