'use client'

import { useState, useEffect, useRef } from 'react'
import { createSupabaseBrowser } from '@/lib/supabase'
import { Gift, Sparkles, Heart } from 'lucide-react'

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

interface Photo {
  id: number
  image_url: string
  user_id: string
  display_name: string
  blessing_message: string
  avatar_url: string
}

export default function LotteryLivePage() {
  const [lotteryState, setLotteryState] = useState<LotteryState>({
    is_lottery_active: false,
    is_drawing: false,
    current_draw_id: null
  })
  const [currentDraw, setCurrentDraw] = useState<CurrentDraw | null>(null)
  const [photos, setPhotos] = useState<Photo[]>([])
  const [isAnimating, setIsAnimating] = useState(false)
  const [celebrating, setCelebrating] = useState(false)
  const [scale, setScale] = useState(1)
  const [carouselOffset, setCarouselOffset] = useState(0)
  
  const animationFrameRef = useRef<number | null>(null)
  const velocityRef = useRef<number>(0)
  const positionRef = useRef<number>(0)
  const carouselRef = useRef<HTMLDivElement>(null)
  
  const supabase = createSupabaseBrowser()

  // 固定設計尺寸 (基準: 1920x1080)
  const DESIGN_WIDTH = 1920
  const DESIGN_HEIGHT = 1080
  const ITEM_WIDTH = 320 // 照片寬度 (288px) + 間距 (32px)

  // 計算縮放比例以適應視窗大小（針對全螢幕播放優化）
  useEffect(() => {
    const updateScale = () => {
      const windowWidth = window.innerWidth
      const windowHeight = window.innerHeight
      
      // 計算寬高比例
      const scaleX = windowWidth / DESIGN_WIDTH
      const scaleY = windowHeight / DESIGN_HEIGHT
      
      // 針對 16:9 全螢幕：使用較大的比例填滿畫面
      const newScale = Math.max(scaleX, scaleY)
      
      setScale(newScale)
    }

    updateScale()
    window.addEventListener('resize', updateScale)
    return () => window.removeEventListener('resize', updateScale)
  }, [])

  // 載入初始資料
  useEffect(() => {
    fetchLotteryState()
    fetchPhotos()
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
          // 如果已經有中獎者但沒在動畫中，顯示慶祝效果
          if (!isAnimating) {
            startCelebration()
          }
        }
      }
    } catch (error) {
      console.error('獲取抽獎狀態失敗:', error)
    }
  }

  const fetchPhotos = async () => {
    try {
      const response = await fetch('/api/lottery/photos')
      const data = await response.json()
      
      if (data.success && data.photos) {
        setPhotos(data.photos)
      }
    } catch (error) {
      console.error('獲取照片失敗:', error)
    }
  }

  const handleNewDraw = (newDraw: CurrentDraw) => {
    setCurrentDraw(newDraw)
    setCelebrating(false)
    
    // 開始跑馬燈動畫
    startCarouselAnimation(newDraw)
  }

  const startCarouselAnimation = (winner: CurrentDraw) => {
    // 取消之前的動畫
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
    }

    setIsAnimating(true)
    
    // 詳細 log 除錯
    console.log('開始抽獎動畫')
    console.log('中獎者資料:', winner)
    console.log('中獎者 LINE ID:', winner.winner_line_id)
    console.log('照片列表:', photos.map(p => ({
      id: p.id,
      user_id: p.user_id,
      display_name: p.display_name
    })))
    
    // 找到中獎照片的索引（在原始列表中）
    const winnerIndex = photos.findIndex(p => {
      console.log(`比對: ${p.user_id} === ${winner.winner_line_id} ?`, p.user_id === winner.winner_line_id)
      return p.user_id === winner.winner_line_id
    })
    
    if (winnerIndex === -1) {
      console.error('找不到中獎照片！')
      console.error('中獎者 ID:', winner.winner_line_id)
      console.error('所有照片的 user_id:', photos.map(p => p.user_id))
      return
    }

    // 計算目標位置：讓中獎照片停在正中央
    const centerPosition = DESIGN_WIDTH / 2 - ITEM_WIDTH / 2
    const targetPosition = -(winnerIndex * ITEM_WIDTH) + centerPosition
    
    // 為了讓動畫看起來轉了很多圈，加上額外的距離
    // 至少轉 5 圈（5 * photos.length * ITEM_WIDTH）
    const extraDistance = photos.length * ITEM_WIDTH * 5
    const finalTarget = targetPosition - extraDistance

    console.log('Animation start:', {
      winnerIndex,
      centerPosition,
      targetPosition,
      finalTarget,
      photosLength: photos.length
    })

    // 動畫參數
    const startTime = Date.now()
    const duration = 10000 // 10秒
    const startPosition = 0 // 總是從0開始

    const animate = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)

      // 使用緩出函數 (ease-out cubic)
      const easeOutCubic = 1 - Math.pow(1 - progress, 3)
      
      // 計算當前位置（從 startPosition 到 finalTarget）
      const currentPosition = startPosition + easeOutCubic * (finalTarget - startPosition)
      
      // 更新位置
      setCarouselOffset(currentPosition)

      if (progress < 1) {
        // 繼續動畫
        animationFrameRef.current = requestAnimationFrame(animate)
      } else {
        // 動畫結束，儲存最終位置
        positionRef.current = finalTarget
        setIsAnimating(false)
        startCelebration()
      }
    }

    // 開始動畫
    animationFrameRef.current = requestAnimationFrame(animate)
  }

  // 清理動畫
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [])

  const startCelebration = () => {
    setCelebrating(true)
    // 慶祝效果持續 8 秒
    setTimeout(() => {
      setCelebrating(false)
    }, 8000)
  }

  // 生成重複的照片陣列以形成無限輪播效果
  const getCarouselItems = () => {
    if (photos.length === 0) return []
    // 重複多次以確保轉夠多圈（至少10圈）
    const repeats = 10
    const items = []
    for (let i = 0; i < repeats; i++) {
      items.push(...photos)
    }
    return items
  }

  // 找出中獎照片（停止時在中間的照片）
  const getWinnerPhoto = () => {
    if (!currentDraw || photos.length === 0) return null
    // 找出中獎者的照片
    return photos.find(photo => photo.user_id === currentDraw.winner_line_id) || photos[0]
  }

  const winnerPhoto = getWinnerPhoto()

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

  // 如果沒有照片
  if (photos.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-100 via-purple-100 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <Gift className="w-32 h-32 text-gray-400 mx-auto mb-8" />
          <h1 className="text-4xl font-bold text-gray-600 mb-4">照片摸彩</h1>
          <p className="text-xl text-gray-500">暫無公開照片</p>
        </div>
      </div>
    )
  }

  const carouselItems = getCarouselItems()

  return (
    <div data-lottery-live className="w-screen h-screen bg-black flex items-center justify-center overflow-hidden fixed inset-0">
      {/* 固定尺寸容器 + 縮放 */}
      <div 
        className="bg-gradient-to-br from-purple-600 via-pink-500 to-orange-500 flex flex-col items-center justify-center overflow-hidden relative"
        style={{
          width: `${DESIGN_WIDTH}px`,
          height: `${DESIGN_HEIGHT}px`,
          transform: `scale(${scale})`,
          transformOrigin: 'center center'
        }}
      >
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

      {/* 慶祝動畫（停止後） */}
      {celebrating && !isAnimating && (
        <div className="absolute inset-0 pointer-events-none z-30">
          {[...Array(150)].map((_, i) => (
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
                className="w-3 h-3 rounded-full"
                style={{
                  backgroundColor: ['#ff6b6b', '#ffd93d', '#6bcf7f', '#4d96ff', '#ff6bff'][Math.floor(Math.random() * 5)]
                }}
              />
            </div>
          ))}
        </div>
      )}

      {/* 標題 */}
      <div className="text-center mb-8 z-10">
        <h1 className={`text-6xl font-bold text-white mb-4 ${isAnimating ? 'animate-pulse' : ''}`}>
          {isAnimating ? '🎰 抽獎中 🎰' : '🎉 恭喜中獎 🎉'}
        </h1>
        <p className="text-2xl text-white opacity-90">
          參與照片數：{photos.length} 張
        </p>
      </div>

      {/* 跑馬燈容器 */}
      <div className="relative w-full max-w-7xl z-10">
        {/* 中間高亮框 */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-96 z-20 pointer-events-none">
          <div className={`w-full h-full border-8 rounded-3xl shadow-2xl ${
            isAnimating 
              ? 'border-yellow-400 animate-pulse' 
              : 'border-green-400 scale-110'
          }`}>
            <div className={`absolute inset-0 rounded-3xl ${
              isAnimating 
                ? 'bg-yellow-400 opacity-20' 
                : 'bg-green-400 opacity-30'
            }`}></div>
          </div>
          <div className={`absolute -top-16 left-1/2 -translate-x-1/2 text-4xl font-bold whitespace-nowrap ${
            isAnimating 
              ? 'text-yellow-300' 
              : 'text-green-300 animate-bounce'
          }`}>
            {isAnimating ? '⬇️ 中獎照片 ⬇️' : '✨ 得獎者 ✨'}
          </div>
          
          {/* 停止後顯示中獎者資訊 */}
          {!isAnimating && winnerPhoto && (
            <div className="absolute -bottom-24 left-1/2 -translate-x-1/2 bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-6 min-w-[400px]">
              <div className="flex items-center space-x-4">
                <img
                  src={winnerPhoto.avatar_url || '/default-avatar.png'}
                  alt={winnerPhoto.display_name}
                  className="w-16 h-16 rounded-full border-4 border-green-400"
                />
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-gray-800">
                    {winnerPhoto.display_name}
                  </h3>
                  {winnerPhoto.blessing_message && (
                    <p className="text-sm text-gray-600 mt-1">
                      {winnerPhoto.blessing_message}
                    </p>
                  )}
                </div>
                <Heart className="w-8 h-8 text-red-500 animate-pulse" />
              </div>
            </div>
          )}
        </div>

        {/* 跑馬燈照片輪播 */}
        <div className="overflow-hidden py-8">
          <div 
            ref={carouselRef}
            className="flex space-x-8"
            style={{
              transform: `translateX(${carouselOffset}px)`,
              willChange: 'transform'
            }}
          >
            {carouselItems.map((photo, index) => (
              <div
                key={`${photo.id}-${index}`}
                className="flex-shrink-0 w-72"
              >
                <div className="bg-white rounded-3xl shadow-2xl p-4 transform transition-all">
                  <div className="relative">
                    <img
                      src={photo.image_url}
                      alt={photo.display_name}
                      className="w-64 h-64 rounded-2xl object-cover mx-auto"
                      onError={(e) => {
                        e.currentTarget.src = '/default-avatar.png'
                      }}
                    />
                    <div className="absolute bottom-2 left-2 right-2 bg-black/60 backdrop-blur-sm rounded-xl p-2">
                      <div className="flex items-center space-x-2">
                        <img
                          src={photo.avatar_url || '/default-avatar.png'}
                          alt={photo.display_name}
                          className="w-8 h-8 rounded-full border-2 border-white"
                        />
                        <span className="text-white text-sm font-medium truncate">
                          {photo.display_name}
                        </span>
                      </div>
                    </div>
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

      {/* 底部提示文字 */}
      <div className="text-center mt-8 z-10">
        {isAnimating ? (
          <p className="text-3xl text-white font-bold animate-bounce">
            ✨ 敬請期待... ✨
          </p>
        ) : winnerPhoto && (
          <p className="text-4xl text-white font-bold animate-pulse">
            🎊 恭喜獲得精美禮品！ 🎊
          </p>
        )}
      </div>
      </div>
    </div>
  )
}
