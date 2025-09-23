'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowser } from '@/lib/supabase'
import { useLiff } from '@/hooks/useLiff'
import { useRealtimeGameState } from '@/hooks/useRealtimeGameState'
import Layout from '@/components/Layout'
import { Clock, Users, Trophy, Heart } from 'lucide-react'

export default function QuizPage() {
  const [selectedAnswer, setSelectedAnswer] = useState<'A' | 'B' | 'C' | 'D' | null>(null)
  const [timeLeft, setTimeLeft] = useState<number>(0)
  const [hasAnswered, setHasAnswered] = useState(false)
  
  const router = useRouter()
  const supabase = createSupabaseBrowser()
  
  // 使用 LIFF 登入系統
  const { isReady, isLoggedIn, profile, login, loading: liffLoading } = useLiff()
  
  // 使用統一的即時遊戲狀態
  const { gameState, currentQuestion, loading: gameLoading, calculateTimeLeft } = useRealtimeGameState()



  // 當遊戲狀態或題目改變時重置答題狀態
  useEffect(() => {
    if (gameState && currentQuestion) {
      setHasAnswered(false)
      setSelectedAnswer(null)
      // 計算初始時間
      setTimeLeft(calculateTimeLeft())
    }
  }, [gameState?.current_question_id, currentQuestion?.id, calculateTimeLeft])


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

      // 超時記錄，不顯示結果
    } catch (error) {
      console.error('Error recording timeout:', error)
    }
  }, [profile, currentQuestion, hasAnswered, supabase])

  // 倒數計時器
  useEffect(() => {
    if (!gameState?.is_game_active || gameState.is_paused) {
      return
    }

    const timer = setInterval(() => {
      const newTimeLeft = calculateTimeLeft()
      setTimeLeft(newTimeLeft)
      
      // 時間到且尚未答題，自動提交空答案
      if (newTimeLeft === 0 && !hasAnswered) {
        handleTimeUp()
      }
    }, 1000)

    return () => clearInterval(timer)
  }, [gameState, calculateTimeLeft, hasAnswered, handleTimeUp])

  const handleAnswerSubmit = async (answer: 'A' | 'B' | 'C' | 'D') => {
    if (!profile || !currentQuestion || hasAnswered) return

    setSelectedAnswer(answer)
    setHasAnswered(true)

    // 計算答題時間（從題目開始到現在的時間）
    const answerTime = calculateTimeLeft() > 0 ? (currentQuestion.time_limit - calculateTimeLeft()) * 1000 : currentQuestion.time_limit * 1000
    const isCorrect = answer === currentQuestion.correct_answer
    
    let earnedScore = 0
    if (isCorrect) {
      // 計算得分：基礎分數 + 速度加成
      const remainingTime = calculateTimeLeft()
      const speedBonus = remainingTime > 0 ? Math.floor((remainingTime / currentQuestion.time_limit) * currentQuestion.base_score * 0.5) : 0
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

      // 答題成功，不顯示結果，只記錄選擇
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
      <div className="h-full flex flex-col py-4 px-4" style={{ height: 'calc(100vh - 80px)' }}>
        {/* 上方預留空間 5% */}
        <div style={{ height: '5%' }}></div>
        
        {/* 填滿剩餘空間的答題按鈕 - 90% */}
        <div className="grid grid-cols-2 gap-4" style={{ height: '90%' }}>
          {[
            { key: 'A' as const, color: 'bg-red-500 hover:bg-red-600', selectedColor: 'bg-red-600' },
            { key: 'B' as const, color: 'bg-blue-500 hover:bg-blue-600', selectedColor: 'bg-blue-600' },
            { key: 'C' as const, color: 'bg-green-500 hover:bg-green-600', selectedColor: 'bg-green-600' },
            { key: 'D' as const, color: 'bg-yellow-500 hover:bg-yellow-600', selectedColor: 'bg-yellow-600' }
          ].map((option) => (
            <button
              key={option.key}
              onClick={() => handleAnswerSubmit(option.key)}
              disabled={hasAnswered}
              className={`rounded-3xl text-white font-bold transition-all duration-200 shadow-2xl ${
                selectedAnswer === option.key
                  ? `${option.selectedColor} ring-8 ring-white scale-95`
                  : hasAnswered
                    ? 'bg-gray-400 opacity-70'
                    : `${option.color} cursor-pointer transform hover:scale-105 active:scale-95`
              }`}
            >
              <div className="text-9xl font-black">{option.key}</div>
            </button>
          ))}
        </div>
        
        {/* 下方預留空間 5% */}
        <div style={{ height: '5%' }}></div>
      </div>
    </Layout>
  )
}
