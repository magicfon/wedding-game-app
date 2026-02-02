'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
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

  // 心跳機制：定期告知服務器用戶還在快問快答頁面
  useEffect(() => {
    if (!profile?.userId) return

    // 立即發送一次心跳
    const sendHeartbeat = async () => {
      try {
        await fetch('/api/quiz/heartbeat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lineId: profile.userId })
        })
      } catch (error) {
        console.error('Heartbeat failed:', error)
      }
    }

    sendHeartbeat()

    // 每30秒發送一次心跳
    const heartbeatInterval = setInterval(sendHeartbeat, 30000)

    // 頁面卸載時通知服務器用戶離開
    const handleBeforeUnload = async () => {
      try {
        await fetch('/api/quiz/heartbeat', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lineId: profile.userId })
        })
      } catch (error) {
        console.error('Leave notification failed:', error)
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      clearInterval(heartbeatInterval)
      window.removeEventListener('beforeunload', handleBeforeUnload)
      // 組件卸載時也通知離開
      handleBeforeUnload()
    }
  }, [profile?.userId])



  // 追蹤上一次的題目 ID，避免不必要的重置
  const lastQuestionIdRef = useRef<number | null>(null)

  // 當題目真正改變時重置答題狀態
  useEffect(() => {
    if (gameState && currentQuestion) {
      // 只在題目 ID 真正改變時才重置
      if (lastQuestionIdRef.current !== currentQuestion.id) {
        lastQuestionIdRef.current = currentQuestion.id
        setHasAnswered(false)
        setSelectedAnswer(null)
        // 計算初始時間
        setTimeLeft(calculateTimeLeft())
      }
    }
  }, [gameState?.current_question_id, currentQuestion?.id, calculateTimeLeft])


  const handleTimeUp = useCallback(async () => {
    if (!profile || !currentQuestion || hasAnswered || !gameState) return

    setHasAnswered(true)

    // 總答題時間 = 題目顯示時間 + 全域答題時間
    const displayTime = currentQuestion.time_limit || 5
    const answerTime = gameState.question_time_limit || 15
    const effectiveTimeLimit = displayTime + answerTime

    try {
      // 使用新的計分 API 處理超時
      const response = await fetch('/api/quiz/scoring', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_line_id: profile.userId,
          question_id: currentQuestion.id,
          selected_answer: null,
          answer_time: effectiveTimeLimit * 1000,
          is_timeout: true
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || '提交超時記錄失敗')
      }

      console.log('⏰ 超時記錄已提交:', result.message)
    } catch (error) {
      console.error('Error recording timeout:', error)
    }
  }, [profile, currentQuestion, hasAnswered, gameState])

  // 倒數計時器
  useEffect(() => {
    if (!gameState?.is_game_active || gameState.is_paused) {
      return
    }

    const timer = setInterval(() => {
      const newTimeLeft = calculateTimeLeft() // 現在返回毫秒數
      setTimeLeft(newTimeLeft)

      // 時間到且尚未答題，自動提交空答案
      if (newTimeLeft <= 0 && !hasAnswered) {
        handleTimeUp()
      }
    }, 100) // 100ms 檢查一次，確保超時檢測準確

    return () => clearInterval(timer)
  }, [gameState, calculateTimeLeft, hasAnswered, handleTimeUp])

  const handleAnswerSubmit = async (answer: 'A' | 'B' | 'C' | 'D') => {
    if (!profile || !currentQuestion || hasAnswered || !gameState) return

    setSelectedAnswer(answer)
    setHasAnswered(true)

    // 總答題時間 = 題目顯示時間 + 全域答題時間
    const displayTime = currentQuestion.time_limit || 5
    const answerTimeSetting = gameState.question_time_limit || 15
    const effectiveTimeLimit = displayTime + answerTimeSetting
    // 計算答題時間（從題目開始到現在的時間，精確到毫秒）
    const remainingTimeMs = calculateTimeLeft() // 剩餘毫秒數
    const totalTimeMs = effectiveTimeLimit * 1000 // 總時間毫秒數
    const answerTime = Math.max(0, totalTimeMs - remainingTimeMs) // 已用時間毫秒數

    try {
      // 使用新的計分 API 處理答題
      const response = await fetch('/api/quiz/scoring', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_line_id: profile.userId,
          question_id: currentQuestion.id,
          selected_answer: answer,
          answer_time: answerTime,
          is_timeout: false
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || '提交答案失敗')
      }

      console.log('✅ 答題提交成功:', result.message)

      // 可以在這裡顯示得分詳情（如果需要的話）
      if (result.score_details) {
        const { base_score, speed_bonus, rank_bonus, final_score } = result.score_details
        console.log(`📊 得分詳情: 基礎分數 ${base_score} + 速度加成 ${speed_bonus} + 排名加分 ${rank_bonus} = ${final_score}`)
      }
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
            <p className="text-gray-600 mb-4">請等待主持人開始遊戲</p>
            <p className="text-sm text-gray-400 mb-4">如果畫面長時間未更新，請點擊下方按鈕</p>
            <button
              onClick={() => window.location.reload()}
              className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
            >
              重新整理
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
            <p className="text-gray-600 mb-4">正在載入題目...</p>
            <p className="text-sm text-gray-400 mb-4">如果畫面長時間未更新，請點擊下方按鈕</p>
            <button
              onClick={() => window.location.reload()}
              className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-6 rounded-lg transition-colors duration-200"
            >
              重新同步
            </button>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout title="快問快答">
      <div className="h-full flex flex-col py-4 px-4" style={{ height: 'calc(100vh - 80px)' }}>
        {/* 填滿剩餘空間的答題按鈕 - 95% */}
        <div className="grid grid-cols-2 gap-4" style={{ height: '95%' }}>
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
              className={`rounded-3xl text-white font-bold transition-all duration-200 shadow-2xl ${selectedAnswer === option.key
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
