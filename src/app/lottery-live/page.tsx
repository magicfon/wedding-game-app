'use client'

import { useState, useEffect, useRef } from 'react'
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
  participants_snapshot?: string
}

interface Participant {
  line_id: string
  display_name: string
  avatar_url: string
  photo_count: number
}

export default function LotteryLivePage() {
  const [lotteryState, setLotteryState] = useState<LotteryState>({
    is_lottery_active: false,
    is_drawing: false,
    current_draw_id: null
  })
  const [currentDraw, setCurrentDraw] = useState<CurrentDraw | null>(null)
  const [participants, setParticipants] = useState<Participant[]>([])
  const [isAnimating, setIsAnimating] = useState(false)
  const [animationSpeed, setAnimationSpeed] = useState(0.5) // 初始速度（秒）
  const [showWinner, setShowWinner] = useState(false)
  const [celebrating, setCelebrating] = useState(false)
  const carouselRef = useRef<HTMLDivElement>(null)
  const supabase = createSupabaseBrowser()

  // 載入初始資料
  useEffect(() => {
    fetchLotteryState()
    fetchEligibleUsers()
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

  const fetchLotteryState = async () => {
    try {
      const response = await fetch('/api/lottery/control')
      const data = await response.json()
      
      if (data.success) {
        setLotteryState(data.state)
        
        if (data.current_draw && data.current_draw.id !== currentDraw?.id) {
          setCurrentDraw(data.current_draw)
          // 如果已經有中獎者，直接顯示結果
          if (!isAnimating) {
            setShowWinner(true)
            startCelebration()
          }
        }
      }
    } catch (error) {
      console.error('獲取抽獎狀態失敗:', error)
    }
  }

  const fetchEligibleUsers = async () => {
    try {
      const response = await fetch('/api/lottery/check-eligibility')
      const data = await response.json()
      
      if (data.success && data.eligible_users) {
        setParticipants(data.eligible_users)
      }
    } catch (error) {
      console.error('獲取符合資格用戶失敗:', error)
    }
  }

  const handleNewDraw = (newDraw: CurrentDraw) => {
    setCurrentDraw(newDraw)
    setShowWinner(false)
    
    // 解析參與者資料
    if (newDraw.participants_snapshot) {
      try {
        const snapshot = typeof newDraw.participants_snapshot === 'string' 
          ? JSON.parse(newDraw.participants_snapshot)
          : newDraw.participants_snapshot
        setParticipants(snapshot)
      } catch (e) {
        console.error('解析參與者資料失敗:', e)
      }
    }
    
    // 開始跑馬燈動畫
    startCarouselAnimation(newDraw)
  }

  const startCarouselAnimation = (winner: CurrentDraw) => {
    setIsAnimating(true)
    setAnimationSpeed(0.5) // 快速開始
    
    // 階段 1: 快速滾動 (2秒)
    setTimeout(() => {
      setAnimationSpeed(1) // 稍微減速
    }, 2000)
    
    // 階段 2: 減速 (1秒)
    setTimeout(() => {
      setAnimationSpeed(2) // 繼續減速
    }, 3000)
    
    // 階段 3: 慢速 (1秒)
    setTimeout(() => {
      setAnimationSpeed(4) // 很慢
    }, 4000)
    
    // 階段 4: 停止並顯示中獎者 (5秒後)
    setTimeout(() => {
      setIsAnimating(false)
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

  // 生成重複的參與者陣列以形成無限輪播效果
  const getCarouselItems = () => {
    if (participants.length === 0) return []
    // 重複3次以確保流暢的輪播
    return [...participants, ...participants, ...participants]
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

  // 跑馬燈抽獎動畫
  if (isAnimating && participants.length > 0) {
    const carouselItems = getCarouselItems()
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 via-pink-500 to-orange-500 flex flex-col items-center justify-center overflow-hidden relative">
        {/* 背景動畫 */}
        <div className="absolute inset-0">
          {[...Array(30)].map((_, i) => (
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
              <Sparkles className="w-6 h-6 text-white opacity-30" />
            </div>
          ))}
        </div>

        {/* 標題 */}
        <div className="text-center mb-12 z-10">
          <h1 className="text-6xl font-bold text-white mb-4 animate-pulse">
            🎰 抽獎中 🎰
          </h1>
          <p className="text-2xl text-white opacity-90">
            參與人數：{participants.length} 人
          </p>
        </div>

        {/* 跑馬燈容器 */}
        <div className="relative w-full max-w-6xl z-10">
          {/* 中間高亮框 */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-80 z-20 pointer-events-none">
            <div className="w-full h-full border-8 border-yellow-400 rounded-2xl shadow-2xl animate-pulse">
              <div className="absolute inset-0 bg-yellow-400 opacity-20 rounded-2xl"></div>
            </div>
            <div className="absolute -top-12 left-1/2 -translate-x-1/2 text-3xl font-bold text-yellow-300 whitespace-nowrap">
              ⬇️ 中獎者 ⬇️
            </div>
          </div>

          {/* 跑馬燈照片輪播 */}
          <div className="overflow-hidden py-8">
            <div 
              ref={carouselRef}
              className="flex space-x-8 carousel-scroll"
              style={{
                animationDuration: `${animationSpeed}s`,
                animationTimingFunction: 'linear'
              }}
            >
              {carouselItems.map((participant, index) => (
                <div
                  key={`${participant.line_id}-${index}`}
                  className="flex-shrink-0 w-56"
                >
                  <div className="bg-white rounded-2xl shadow-2xl p-4 transform transition-all">
                    <div className="relative">
                      <img
                        src={participant.avatar_url || '/default-avatar.png'}
                        alt={participant.display_name}
                        className="w-48 h-48 rounded-xl object-cover mx-auto"
                      />
                      <div className="absolute top-2 right-2 bg-pink-500 text-white px-3 py-1 rounded-full text-sm font-bold">
                        {participant.photo_count} 張
                      </div>
                    </div>
                    <div className="mt-4 text-center">
                      <h3 className="text-xl font-bold text-gray-800 truncate">
                        {participant.display_name}
                      </h3>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 左右漸變遮罩 */}
          <div className="absolute left-0 top-0 bottom-0 w-64 bg-gradient-to-r from-purple-600 to-transparent pointer-events-none z-10"></div>
          <div className="absolute right-0 top-0 bottom-0 w-64 bg-gradient-to-l from-orange-500 to-transparent pointer-events-none z-10"></div>
        </div>

        {/* 提示文字 */}
        <div className="text-center mt-12 z-10">
          <p className="text-3xl text-white font-bold animate-bounce">
            ✨ 敬請期待... ✨
          </p>
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
            {[...Array(100)].map((_, i) => (
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
