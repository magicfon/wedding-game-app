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
  const [showingWinner, setShowingWinner] = useState(false) // 新增：顯示中獎者特寫
  const [zoomingWinner, setZoomingWinner] = useState(false) // 新增：正在放大動畫
  const [winnerPhotoRect, setWinnerPhotoRect] = useState<DOMRect | null>(null) // 中獎照片原始位置
  const [scale, setScale] = useState(1)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  
  const animationFrameRef = useRef<number | null>(null)
  const winnerPhotoRef = useRef<HTMLDivElement>(null) // 中獎照片的 ref
  const supabase = createSupabaseBrowser()

  // 固定設計尺寸 (基準: 1920x1080)
  const DESIGN_WIDTH = 1920
  const DESIGN_HEIGHT = 1080

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
        
        // 檢測重置操作：沒有 current_draw_id 且我們之前有 currentDraw
        if (!data.state.current_draw_id && currentDraw !== null) {
          console.log('🔄 檢測到重置操作 - 清除中獎狀態')
          resetToInitialState()
        }
        
        // 注意：不在這裡調用 startCelebration()
        // 慶祝效果只應該在動畫結束時觸發（由 animateSelection 控制）
        if (data.current_draw && data.current_draw.id !== currentDraw?.id) {
          setCurrentDraw(data.current_draw)
        }
      }
    } catch (error) {
      console.error('獲取抽獎狀態失敗:', error)
    }
  }

  const fetchPhotos = async () => {
    try {
      console.log('📸 開始載入照片...')
      const response = await fetch('/api/lottery/photos')
      const data = await response.json()
      
      console.log('📸 API 回應:', data)
      
      if (data.success && data.photos) {
        console.log(`✅ 成功載入 ${data.photos.length} 張照片`)
        setPhotos(data.photos)
      } else {
        console.error('❌ 照片載入失敗:', data)
      }
    } catch (error) {
      console.error('❌ 獲取照片失敗:', error)
    }
  }

  const resetToInitialState = () => {
    console.log('🔄 重置到初始狀態')
    setCurrentDraw(null)
    setCelebrating(false)
    setShowingWinner(false)
    setZoomingWinner(false)
    setWinnerPhotoRect(null)
    setHighlightedIndex(-1) // 移除黃框
    setIsAnimating(false)
    
    // 取消任何進行中的動畫
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }
  }

  const handleNewDraw = async (newDraw: CurrentDraw) => {
    // 先重置所有狀態
    resetToInitialState()
    
    setCurrentDraw(newDraw)
    
    console.log('🎰 收到新的抽獎記錄')
    console.log('當前照片數量:', photos.length)
    
    // 如果照片還沒載入，先載入照片
    if (photos.length === 0) {
      console.log('⚠️ 照片尚未載入，現在載入...')
      await fetchPhotos()
      // 等待一下讓 state 更新
      await new Promise(resolve => setTimeout(resolve, 200))
    }
    
    // 重新獲取最新的照片列表
    const response = await fetch('/api/lottery/photos')
    const data = await response.json()
    
    if (data.success && data.photos && data.photos.length > 0) {
      const currentPhotos = data.photos
      console.log(`📸 使用 ${currentPhotos.length} 張照片進行抽獎`)
      
      // 找到中獎照片的索引
      const winnerIndex = currentPhotos.findIndex((p: Photo) => p.user_id === newDraw.winner_line_id)
      
      if (winnerIndex === -1) {
        console.error('❌ 找不到中獎照片！')
        console.error('中獎者 ID:', newDraw.winner_line_id)
        console.error('照片列表:', currentPhotos.map((p: Photo) => ({ id: p.id, user_id: p.user_id, name: p.display_name })))
        // 即使找不到，也隨機顯示一張
        const randomIndex = Math.floor(Math.random() * currentPhotos.length)
        startCarouselAnimationWithPhotos(currentPhotos, randomIndex)
        return
      }
      
      console.log('✅ 找到中獎照片，索引:', winnerIndex)
      startCarouselAnimationWithPhotos(currentPhotos, winnerIndex)
    } else {
      console.error('❌ 無法載入照片進行抽獎')
    }
  }

  const startCarouselAnimationWithPhotos = (photosToUse: Photo[], targetIndex: number) => {
    // 取消之前的動畫
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
    }

    // 確保 photos state 也是最新的
    setPhotos(photosToUse)
    setIsAnimating(true)
    setHighlightedIndex(-1)
    
    console.log('🎰 開始抽獎動畫')
    console.log('使用照片數:', photosToUse.length)
    console.log('目標索引:', targetIndex)
    
    animateSelection(targetIndex, photosToUse)
  }

  const animateSelection = (targetIndex: number, photosToUse: Photo[]) => {
    const photoCount = photosToUse.length
    console.log('🎯 開始跳動動畫，目標索引:', targetIndex, '照片總數:', photoCount)
    
    if (photoCount === 0) {
      console.error('❌ 沒有照片可以進行動畫！')
      return
    }
    
    // 動畫參數
    const startTime = Date.now()
    const duration = 10000 // 10秒
    let lastJumpTime = startTime - 100
    let currentIndex = Math.floor(Math.random() * photoCount)
    let lastIndex = currentIndex // 記錄上一次的索引，避免重複
    
    // 立即顯示第一個框框
    setHighlightedIndex(currentIndex)
    console.log('📍 初始框框位置:', currentIndex)
    
    // 跳動間隔函數 (越來越慢)
    const getJumpInterval = (progress: number) => {
      // 開始很快 (30ms)，結束很慢 (800ms)
      return 30 + progress * progress * 770
    }

    // 生成不重複的隨機索引
    const getNextRandomIndex = (current: number, count: number): number => {
      if (count <= 1) return current
      let next
      do {
        next = Math.floor(Math.random() * count)
      } while (next === current)
      return next
    }

    const animate = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)
      const now = Date.now()

      // 檢查是否該跳到下一張照片
      const jumpInterval = getJumpInterval(progress)
      
      if (now - lastJumpTime >= jumpInterval) {
        lastJumpTime = now
        lastIndex = currentIndex
        
        if (progress < 0.92) {
          // 還沒接近結束，隨機跳動（但不重複上一張）
          currentIndex = getNextRandomIndex(lastIndex, photoCount)
        } else {
          // 接近結束，逐步接近目標
          const distance = targetIndex - currentIndex
          if (distance !== 0) {
            // 根據距離決定移動方向
            if (Math.abs(distance) === 1) {
              currentIndex = targetIndex
            } else {
              currentIndex += distance > 0 ? 1 : -1
            }
          }
        }
        
        console.log(`📍 跳到索引 ${currentIndex}，進度: ${(progress * 100).toFixed(1)}%`)
        setHighlightedIndex(currentIndex)
      }

      if (progress < 1) {
        // 繼續動畫
        animationFrameRef.current = requestAnimationFrame(animate)
      } else {
        // 動畫結束，確保停在目標位置
        console.log('🎉 動畫結束，停在索引:', targetIndex)
        setHighlightedIndex(targetIndex)
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
    console.log('🎊 開始慶祝動畫')
    setCelebrating(true)
    
    // 1.5秒後開始放大中獎照片（讓大家先看清楚中獎的是哪張）
    setTimeout(() => {
      console.log('🔍 開始放大中獎照片')
      
      // 獲取中獎照片的位置
      if (winnerPhotoRef.current) {
        const rect = winnerPhotoRef.current.getBoundingClientRect()
        setWinnerPhotoRect(rect)
        console.log('📍 中獎照片位置:', rect)
      }
      
      // 先觸發縮放動畫
      setZoomingWinner(true)
      
      // 800ms 後（縮放動畫完成）切換到完整顯示
      setTimeout(() => {
        setShowingWinner(true)
        setZoomingWinner(false)
        console.log('✅ 中獎畫面顯示完成，等待管理員操作...')
      }, 800)
    }, 1500)
    
    // 不再自動關閉，畫面會持續顯示直到：
    // 1. 管理員點擊「重置狀態」
    // 2. 管理員開始新的抽獎
    // 這些操作會觸發 handleNewDraw，自動重置所有狀態
  }

  // 找出中獎照片
  const getWinnerPhoto = () => {
    if (!currentDraw || photos.length === 0) return null
    return photos.find(photo => photo.user_id === currentDraw.winner_line_id) || null
  }

  const winnerPhoto = getWinnerPhoto()

  // 計算每張照片的大小（自動填滿螢幕）
  const getPhotoGridLayout = () => {
    const count = photos.length
    if (count === 0) return { cols: 0, rows: 0, size: 0 }
    
    // 計算最佳的行列數
    const ratio = DESIGN_WIDTH / DESIGN_HEIGHT
    const cols = Math.ceil(Math.sqrt(count * ratio))
    const rows = Math.ceil(count / cols)
    
    // 計算照片大小（留一些間距）
    const photoWidth = (DESIGN_WIDTH - (cols + 1) * 20) / cols
    const photoHeight = (DESIGN_HEIGHT - (rows + 1) * 20 - 200) / rows // 200px 留給標題
    const size = Math.min(photoWidth, photoHeight, 300) // 最大300px
    
    return { cols, rows, size }
  }

  const gridLayout = getPhotoGridLayout()

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
          {isAnimating ? '🎰 抽獎中 🎰' : (currentDraw ? '🎉 恭喜中獎 🎉' : '📸 照片摸彩 📸')}
        </h1>
        <p className="text-2xl text-white opacity-90">
          參與照片數：{photos.length} 張
        </p>
      </div>

      {/* 照片 Grid 顯示 */}
      <div className={`relative z-10 px-10 transition-opacity duration-1000 ${showingWinner || zoomingWinner ? 'opacity-0' : 'opacity-100'}`}>
        <div 
          className="grid gap-5 justify-center items-center"
          style={{
            gridTemplateColumns: `repeat(${gridLayout.cols}, ${gridLayout.size}px)`
          }}
        >
          {photos.map((photo, index) => {
            const isWinner = highlightedIndex === index && !isAnimating
            
            return (
              <div
                key={photo.id}
                ref={isWinner ? winnerPhotoRef : null}
                className="relative"
                style={{
                  width: `${gridLayout.size}px`,
                  height: `${gridLayout.size}px`
                }}
              >
                {/* 照片 */}
                <div className={`
                  relative w-full h-full bg-white rounded-2xl shadow-xl overflow-hidden
                  transition-all duration-150 ease-out
                  ${highlightedIndex === index 
                    ? 'ring-8 ring-yellow-400 scale-110 z-20' 
                    : 'scale-100'
                  }
                  ${isWinner
                    ? 'ring-green-400 scale-110 !duration-500' 
                    : ''
                  }
                `}>
                  <img
                    src={photo.image_url}
                    alt={photo.display_name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.src = '/default-avatar.png'
                    }}
                  />
                  
                  {/* 照片資訊 */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
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

                {/* 動畫中的高亮框 */}
                {highlightedIndex === index && (
                  <div className={`
                    absolute inset-0 
                    ${isAnimating ? 'bg-yellow-400/40' : 'bg-green-400/40'}
                    pointer-events-none
                    transition-colors duration-150
                    ${isAnimating ? 'animate-pulse' : ''}
                  `} />
                )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* 中獎照片放大動畫 - 從原位置放大到中央 */}
      {!isAnimating && zoomingWinner && winnerPhoto && winnerPhotoRect && (() => {
        // 計算中心位置（考慮縮放後的容器）
        const centerX = window.innerWidth / 2
        const centerY = window.innerHeight / 2
        
        // 目標尺寸
        const targetSize = 600
        
        // 計算需要移動的距離（到達螢幕中央）
        const currentCenterX = winnerPhotoRect.left + winnerPhotoRect.width / 2
        const currentCenterY = winnerPhotoRect.top + winnerPhotoRect.height / 2
        
        const translateX = centerX - currentCenterX
        const translateY = centerY - currentCenterY
        
        // 計算縮放比例
        const scaleFactor = targetSize / winnerPhotoRect.width
        
        return (
          <div 
            className="fixed z-50 pointer-events-none"
            style={{
              left: `${winnerPhotoRect.left}px`,
              top: `${winnerPhotoRect.top}px`,
              width: `${winnerPhotoRect.width}px`,
              height: `${winnerPhotoRect.height}px`,
              '--translate-x': `${translateX}px`,
              '--translate-y': `${translateY}px`,
              '--scale-factor': scaleFactor,
              animation: 'zoomToCenter 0.8s cubic-bezier(0.4, 0, 0.2, 1) forwards'
            } as React.CSSProperties}
          >
            <div className="relative w-full h-full">
              <div className="absolute -inset-4 bg-gradient-to-r from-yellow-400 via-orange-400 to-pink-400 rounded-3xl animate-pulse blur-xl opacity-75"></div>
              <img
                src={winnerPhoto.image_url}
                alt={winnerPhoto.display_name}
                className="relative w-full h-full object-cover rounded-3xl border-8 border-white shadow-2xl"
                onError={(e) => {
                  e.currentTarget.src = '/default-avatar.png'
                }}
              />
            </div>
          </div>
        )
      })()}

      {/* 中獎照片放大特寫 - 只有在動畫結束且慶祝時才顯示 */}
      {!isAnimating && showingWinner && !zoomingWinner && winnerPhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm animate-in fade-in duration-500 px-8 py-4 overflow-y-auto">
          <div className="text-center w-full max-w-[1600px] my-auto">
            {/* 中獎照片 */}
            <div className="relative mb-6">
              <div className="absolute -inset-4 bg-gradient-to-r from-yellow-400 via-orange-400 to-pink-400 rounded-3xl animate-pulse blur-xl opacity-75"></div>
              <img
                src={winnerPhoto.image_url}
                alt={winnerPhoto.display_name}
                className="relative w-[600px] h-[600px] max-w-[85vw] max-h-[45vh] object-cover rounded-3xl border-8 border-white shadow-2xl mx-auto"
                onError={(e) => {
                  e.currentTarget.src = '/default-avatar.png'
                }}
              />
            </div>

            {/* 中獎者資訊 */}
            <div className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl p-8 md:p-12 w-full mx-auto animate-in slide-in-from-bottom-8 duration-500">
              <div className="flex flex-col md:flex-row items-center justify-center gap-6 md:gap-10">
                <img
                  src={winnerPhoto.avatar_url || '/default-avatar.png'}
                  alt={winnerPhoto.display_name}
                  className="w-28 h-28 md:w-36 md:h-36 rounded-full border-8 border-green-400 shadow-lg flex-shrink-0"
                />
                <div className="flex-1 text-center md:text-left w-full min-w-0">
                  <div className="flex flex-col md:flex-row items-center md:items-center gap-4 md:gap-5 mb-6">
                    <Gift className="w-12 h-12 md:w-14 md:h-14 text-green-500 flex-shrink-0" />
                    <h2 className="text-5xl md:text-6xl lg:text-7xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-500 to-emerald-500 break-words leading-tight">
                      {winnerPhoto.display_name}
                    </h2>
                  </div>
                  {winnerPhoto.blessing_message && (
                    <div className="flex items-start gap-4 mt-6">
                      <Heart className="w-8 h-8 md:w-10 md:h-10 text-red-500 mt-1 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xl md:text-2xl lg:text-3xl text-gray-700 italic leading-relaxed break-words whitespace-pre-wrap max-h-[25vh] overflow-y-auto pr-3 text-left">
                          「{winnerPhoto.blessing_message}」
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 恭喜文字 */}
            <div className="mt-8 px-4 animate-in slide-in-from-bottom-6 duration-500">
              <h1 className="text-6xl md:text-7xl lg:text-8xl font-bold text-white drop-shadow-2xl animate-pulse break-words leading-tight">
                🎉 恭喜中獎 🎉
              </h1>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  )
}
