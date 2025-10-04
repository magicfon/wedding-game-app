'use client'

import { useState, useEffect } from 'react'
import { createSupabaseBrowser } from '@/lib/supabase'
import { Gift, Users, Trophy, Sparkles } from 'lucide-react'

interface LotteryState {
  is_lottery_active: boolean
  is_drawing: boolean
  current_draw_id: number | null
}

interface CurrentDraw {
  id: number
  winner_line_id: string
  winner_display_name: string
  winner_avatar_url: string
  photo_count: number
  draw_time: string
  participants_count: number
}

export default function LotteryLivePage() {
  const [lotteryState, setLotteryState] = useState<LotteryState>({
    is_lottery_active: false,
    is_drawing: false,
    current_draw_id: null
  })
  const [currentDraw, setCurrentDraw] = useState<CurrentDraw | null>(null)
  const [countdown, setCountdown] = useState(5)
  const [showWinner, setShowWinner] = useState(false)
  const [celebrating, setCelebrating] = useState(false)
  const supabase = createSupabaseBrowser()

  // 載入初始資料
  useEffect(() => {
    fetchLotteryState()
  }, [])

  // 訂閱 Realtime 更新
  useEffect(() => {
    const channel = supabase
      .channel('lottery-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'lottery_state'
        },
        (payload) => {
          console.log('抽獎狀態更新:', payload)
          fetchLotteryState()
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'lottery_history'
        },
        (payload) => {
          console.log('新的抽獎記錄:', payload)
          handleNewDraw(payload.new as CurrentDraw)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase])

  // 倒數計時效果
  useEffect(() => {
    if (lotteryState.is_drawing && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1)
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [lotteryState.is_drawing, countdown])

  const fetchLotteryState = async () => {
    try {
      const response = await fetch('/api/lottery/control')
      const data = await response.json()
      
      if (data.success) {
        setLotteryState(data.state)
        
        if (data.current_draw && data.current_draw.id !== currentDraw?.id) {
          setCurrentDraw(data.current_draw)
          setShowWinner(true)
          startCelebration()
        }
      }
    } catch (error) {
      console.error('獲取抽獎狀態失敗:', error)
    }
  }

  const handleNewDraw = (newDraw: CurrentDraw) => {
    setCurrentDraw(newDraw)
    setCountdown(5)
    setShowWinner(false)
    
    // 倒數後顯示中獎者
    setTimeout(() => {
      setShowWinner(true)
      startCelebration()
    }, 5000)
  }

  const startCelebration = () => {
    setCelebrating(true)
    setTimeout(() => {
      setCelebrating(false)
    }, 5000)
  }

  // 待機畫面
  if (!lotteryState.is_lottery_active) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-100 via-purple-100 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <Gift className="w-32 h-32 text-gray-400 mx-auto mb-8 animate-pulse" />
          <h1 className="text-4xl font-bold text-gray-600 mb-4">照片摸彩</h1>
          <p className="text-xl text-gray-500">等待開始抽獎...</p>
        </div>
      </div>
    )
  }

  // 抽獎中 - 倒數階段
  if (lotteryState.is_drawing && !showWinner) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-500 via-purple-500 to-indigo-500 flex items-center justify-center relative overflow-hidden">
        {/* 背景動畫 */}
        <div className="absolute inset-0">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute animate-float"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${3 + Math.random() * 2}s`
              }}
            >
              <Sparkles className="w-8 h-8 text-white opacity-30" />
            </div>
          ))}
        </div>

        {/* 倒數計時 */}
        <div className="text-center z-10">
          <Gift className="w-32 h-32 text-white mx-auto mb-12 animate-bounce" />
          <h1 className="text-6xl font-bold text-white mb-8">準備抽獎</h1>
          <div className="text-9xl font-bold text-white mb-8 animate-pulse">
            {countdown}
          </div>
          <p className="text-3xl text-white opacity-90">敬請期待...</p>
        </div>
      </div>
    )
  }

  // 顯示中獎者
  if (showWinner && currentDraw) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-400 via-orange-400 to-red-400 flex items-center justify-center relative overflow-hidden">
        {/* 慶祝動畫 */}
        {celebrating && (
          <div className="absolute inset-0 pointer-events-none">
            {[...Array(50)].map((_, i) => (
              <div
                key={i}
                className="absolute animate-confetti"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: '-10%',
                  animationDelay: `${Math.random() * 0.5}s`,
                  animationDuration: `${2 + Math.random()}s`
                }}
              >
                <div 
                  className="w-4 h-4 rounded-full"
                  style={{
                    backgroundColor: ['#ff6b6b', '#ffd93d', '#6bcf7f', '#4d96ff', '#ff6bff'][Math.floor(Math.random() * 5)]
                  }}
                />
              </div>
            ))}
          </div>
        )}

        {/* 中獎者資訊 */}
        <div className="text-center z-10 bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl p-16 max-w-4xl mx-auto">
          <Trophy className="w-24 h-24 text-yellow-500 mx-auto mb-8 animate-bounce" />
          
          <h1 className="text-5xl font-bold text-gray-800 mb-12">
            🎉 恭喜中獎 🎉
          </h1>

          {/* 中獎者頭像 */}
          <div className="mb-8">
            <div className="relative inline-block">
              <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-full animate-ping opacity-75"></div>
              <img
                src={currentDraw.winner_avatar_url || '/default-avatar.png'}
                alt={currentDraw.winner_display_name}
                className="relative w-48 h-48 rounded-full border-8 border-white shadow-2xl"
              />
            </div>
          </div>

          {/* 中獎者名稱 */}
          <h2 className="text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-500 mb-6">
            {currentDraw.winner_display_name}
          </h2>

          {/* 詳細資訊 */}
          <div className="grid grid-cols-3 gap-8 mt-12">
            <div className="bg-gradient-to-br from-pink-100 to-purple-100 rounded-2xl p-6">
              <Gift className="w-8 h-8 text-purple-500 mx-auto mb-3" />
              <div className="text-3xl font-bold text-gray-800 mb-1">
                {currentDraw.photo_count}
              </div>
              <div className="text-gray-600">上傳照片數</div>
            </div>

            <div className="bg-gradient-to-br from-blue-100 to-indigo-100 rounded-2xl p-6">
              <Users className="w-8 h-8 text-indigo-500 mx-auto mb-3" />
              <div className="text-3xl font-bold text-gray-800 mb-1">
                {currentDraw.participants_count}
              </div>
              <div className="text-gray-600">參與人數</div>
            </div>

            <div className="bg-gradient-to-br from-green-100 to-teal-100 rounded-2xl p-6">
              <Trophy className="w-8 h-8 text-teal-500 mx-auto mb-3" />
              <div className="text-3xl font-bold text-gray-800 mb-1">
                {new Date(currentDraw.draw_time).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })}
              </div>
              <div className="text-gray-600">抽獎時間</div>
            </div>
          </div>

          {/* 祝賀訊息 */}
          <div className="mt-12 text-2xl text-gray-600">
            恭喜獲得精美禮品！
          </div>
        </div>
      </div>
    )
  }

  // 預設畫面
  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-100 via-purple-100 to-indigo-100 flex items-center justify-center">
      <div className="text-center">
        <Gift className="w-32 h-32 text-gray-400 mx-auto mb-8" />
        <h1 className="text-4xl font-bold text-gray-600 mb-4">照片摸彩</h1>
        <p className="text-xl text-gray-500">準備中...</p>
      </div>
    </div>
  )
}

