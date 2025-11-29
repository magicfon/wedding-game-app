'use client'

import { useState, useEffect, useRef, memo, useMemo } from 'react'
import { createSupabaseBrowser } from '@/lib/supabase'
import { Gift, Sparkles, Heart } from 'lucide-react'
import { SoundToggle } from '@/components/SoundToggle'
import { useSoundEffects } from '@/hooks/useSoundEffects'
import { useBackgroundMusic } from '@/hooks/useBackgroundMusic'

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

// 固定設計尺寸 (基準: 1920x1080)
const DESIGN_WIDTH = 1920
const DESIGN_HEIGHT = 1080

// --- Memoized Components ---

const BackgroundParticles = memo(() => {
  return (
    <div className="absolute inset-0 pointer-events-none">
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
  )
})
BackgroundParticles.displayName = 'BackgroundParticles'

const Confetti = memo(() => {
  return (
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
  )
})
Confetti.displayName = 'Confetti'

interface PhotoItemProps {
  photo: Photo
  size: number
  isWinner: boolean // Still needed for final static style if any, but not for animation
}

// Optimized PhotoItem: No longer receives isHighlighted or isAnimating
// This component should NEVER re-render during the animation
const PhotoItem = memo(({ photo, size, isWinner }: PhotoItemProps) => {
  return (
    <div
      className="relative"
      style={{
        width: `${size}px`,
        height: `${size}px`
      }}
    >
      {/* 照片 */}
      <div className={`
        relative w-full h-full bg-white rounded-2xl shadow-xl overflow-hidden
        transition-all duration-500 ease-out
        ${isWinner ? 'scale-110 z-20' : 'scale-100'}
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
      </div>
    </div>
  )
}, (prev, next) => {
  return prev.photo.id === next.photo.id &&
    prev.size === next.size &&
    prev.isWinner === next.isWinner
})
PhotoItem.displayName = 'PhotoItem'

interface FloatingHighlightProps {
  highlightedIndex: number
  gridLayout: { cols: number; rows: number; size: number }
  isAnimating: boolean
  winnerRef: React.RefObject<HTMLDivElement | null>
}

// New Component: Handles the moving highlight box
// Only this component re-renders during animation
const FloatingHighlight = memo(({ highlightedIndex, gridLayout, isAnimating, winnerRef }: FloatingHighlightProps) => {
  if (highlightedIndex === -1) return null

  const col = highlightedIndex % gridLayout.cols
  const row = Math.floor(highlightedIndex / gridLayout.cols)

  // Calculate position based on grid layout
  // Gap is 20px (5 * 4px from gap-5)
  const gap = 20
  const left = col * (gridLayout.size + gap)
  const top = row * (gridLayout.size + gap)

  return (
    <div
      ref={winnerRef}
      className={`
        absolute pointer-events-none z-30
        transition-all duration-300 ease-out
        ${isAnimating ? 'border-8 border-yellow-400' : 'border-8 border-green-400 scale-110'}
        rounded-2xl
        ${isAnimating ? 'animate-pulse' : ''}
      `}
      style={{
        width: `${gridLayout.size}px`,
        height: `${gridLayout.size}px`,
        left: 0,
        top: 0,
        transform: `translate(${left}px, ${top}px)`
      }}
    >
      {/* Inner glow */}
      <div className={`absolute inset-0 rounded-xl ${isAnimating ? 'bg-yellow-400/20' : 'bg-green-400/20'}`} />
    </div>
  )
})
FloatingHighlight.displayName = 'FloatingHighlight'

interface StaticPhotoGridProps {
  photos: Photo[]
  winnerIndex: number // Only used for static "winner" state AFTER animation
  gridLayout: { cols: number; rows: number; size: number }
}

// Renamed to StaticPhotoGrid to emphasize it should not update during animation
const StaticPhotoGrid = memo(({ photos, winnerIndex, gridLayout }: StaticPhotoGridProps) => {
  return (
    <div
      className="grid gap-5 items-center"
      style={{
        gridTemplateColumns: `repeat(${gridLayout.cols}, ${gridLayout.size}px)`
      }}
    >
      {photos.map((photo, index) => {
        // Only mark as winner if this is the index passed in (which should be -1 during animation)
        const isWinner = winnerIndex === index

        return (
          <PhotoItem
            key={photo.id}
            photo={photo}
            size={gridLayout.size}
            isWinner={isWinner}
          />
        )
      })}
    </div>
  )
})
StaticPhotoGrid.displayName = 'StaticPhotoGrid'

// --- Main Component ---

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

  // 音效控制
  const { isSoundEnabled, toggleSound } = useSoundEffects()
  const { tryPlay } = useBackgroundMusic({
    url: '/sounds/lottery_background.mp3',
    enabled: isSoundEnabled,
    volume: 0.2
  })

  // 處理用戶交互以啟用音效
  useEffect(() => {
    const handleInteraction = () => {
      tryPlay()
      window.removeEventListener('click', handleInteraction)
      window.removeEventListener('keydown', handleInteraction)
    }

    window.addEventListener('click', handleInteraction)
    window.addEventListener('keydown', handleInteraction)

    return () => {
      window.removeEventListener('click', handleInteraction)
      window.removeEventListener('keydown', handleInteraction)
    }
  }, [tryPlay])

  const animationFrameRef = useRef<number | null>(null)
  const winnerPhotoRef = useRef<HTMLDivElement>(null) // 中獎照片的 ref
  const currentDrawRef = useRef<CurrentDraw | null>(null) // 追蹤最新的 currentDraw 值
  const supabase = createSupabaseBrowser()

  // 同步 currentDraw 到 ref
  useEffect(() => {
    currentDrawRef.current = currentDraw
    console.log('🔄 currentDrawRef 更新:', currentDraw?.id || null)
  }, [currentDraw])

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
          fetchLotteryState(true)
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

  const fetchLotteryState = async (fromRealtime = false) => {
    try {
      const response = await fetch('/api/lottery/control')
      const data = await response.json()

      const latestCurrentDraw = currentDrawRef.current

      console.log('📡 fetchLotteryState:', {
        fromRealtime,
        current_draw_id: data.state?.current_draw_id,
        latestCurrentDraw_id: latestCurrentDraw?.id || null,
        has_current_draw: !!data.current_draw,
        will_reset: !data.state.current_draw_id && latestCurrentDraw !== null
      })

      if (data.success) {
        // 檢測重置操作：沒有 current_draw_id 且我們之前有 currentDraw
        // 重要：如果正在抽獎中 (is_drawing)，不要重置！這可能是狀態更新的 race condition
        if (!data.state.current_draw_id && latestCurrentDraw !== null && !data.state.is_drawing) {
          console.log('🔄 檢測到重置操作 - 清除中獎狀態')
          resetToInitialState()
          // 重置後直接返回，不再執行後續狀態更新
          setLotteryState(data.state)
          return
        }

        setLotteryState(data.state)

        // 注意：不在這裡調用 startCelebration()
        // 慶祝效果只應該在動畫結束時觸發（由 animateSelection 控制）
        if (data.current_draw && data.current_draw.id !== latestCurrentDraw?.id) {
          // 如果是 Realtime 觸發的更新，且是新的抽獎，則忽略（交給 handleNewDraw 處理）
          // 避免 "恭喜中獎" -> "抽獎中" 的閃爍
          if (fromRealtime) {
            console.log('⚠️ Realtime 觸發的新抽獎更新，忽略（交給 handleNewDraw）')
            return
          }

          console.log('📝 更新 currentDraw:', data.current_draw)
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
    console.log('重置前狀態:', {
      currentDraw: currentDraw?.id,
      celebrating,
      showingWinner,
      zoomingWinner,
      highlightedIndex,
      isAnimating
    })

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

    console.log('✅ 重置完成')
  }

  const handleNewDraw = async (newDraw: CurrentDraw) => {
    // 先重置所有狀態
    resetToInitialState()

    // 立即設置為動畫狀態，避免標題閃爍 ("恭喜中獎" -> "照片摸彩" -> "抽獎中")
    // 這樣會直接從 "恭喜中獎" (如果有) -> "抽獎中"
    setIsAnimating(true)

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

      // 找到中獎者的所有照片
      const winnerPhotos = currentPhotos.filter((p: Photo) => p.user_id === newDraw.winner_line_id)

      if (winnerPhotos.length === 0) {
        console.error('❌ 找不到中獎照片！')
        console.error('中獎者 ID:', newDraw.winner_line_id)
        // 即使找不到，也隨機顯示一張
        const randomIndex = Math.floor(Math.random() * currentPhotos.length)
        startCarouselAnimationWithPhotos(currentPhotos, randomIndex)
        return
      }

      // 從中獎者的照片中隨機選一張
      const randomWinnerPhoto = winnerPhotos[Math.floor(Math.random() * winnerPhotos.length)]
      const winnerIndex = currentPhotos.findIndex((p: Photo) => p.id === randomWinnerPhoto.id)

      console.log(`✅ 找到中獎者 ${winnerPhotos.length} 張照片，隨機選中 ID: ${randomWinnerPhoto.id}`)
      console.log('✅ 最終目標索引:', winnerIndex)
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

    // --- 預先計算動畫路徑 ---
    // 我們不使用 requestAnimationFrame 的時間差來決定下一步，
    // 而是預先生成一個 "時間表" (Schedule)，確保最後一步剛好落在 targetIndex

    const schedule: { index: number; delay: number }[] = []
    let currentDelay = 50 // 初始速度 (ms)
    const maxDelay = 800  // 結束速度 (ms)
    const totalDurationTarget = 10000 // 目標總時長 10秒
    let totalTime = 0

    // 1. 生成速度曲線 (Delay 逐漸增加)
    // 我們先生成一系列的 delay，直到總時間接近 10 秒
    const delays: number[] = []
    while (totalTime < totalDurationTarget) {
      delays.push(currentDelay)
      totalTime += currentDelay
      // 讓速度變慢：每次增加一點 delay
      // 使用指數增長或線性增長都可以，這裡微調係數讓它自然一點
      currentDelay = Math.min(maxDelay, currentDelay * 1.1)
    }

    // 2. 生成對應的索引路徑
    // 我們需要 delays.length 個步驟
    // 最後一步必須是 targetIndex
    // 倒數幾步最好是線性移動 (target-3, target-2, target-1, target) 讓視覺上有 "停下來" 的感覺
    // 前面的步驟則是隨機跳動

    const steps = delays.length
    let currentIndex = Math.floor(Math.random() * photoCount)

    // 為了視覺效果，最後 5 步我們做 "線性接近" (如果照片夠多的話)
    const finalStepsCount = Math.min(5, photoCount - 1)
    const randomStepsCount = steps - finalStepsCount

    // 生成隨機部分
    for (let i = 0; i < randomStepsCount; i++) {
      let nextIndex
      do {
        nextIndex = Math.floor(Math.random() * photoCount)
      } while (nextIndex === currentIndex) // 不重複上一張

      currentIndex = nextIndex
      schedule.push({ index: currentIndex, delay: delays[i] })
    }

    // 生成最後線性接近部分
    // 我們從 targetIndex 往回推 finalStepsCount 步
    // 例如 target=10, finalSteps=3 -> 7, 8, 9, 10
    // 注意：要處理環狀索引 (例如 target=0, prev=count-1)

    // 這裡我們簡單一點，直接計算最後幾步的路徑
    // 為了讓最後幾步看起來是 "滑" 到目標，我們確保它們是鄰居
    // 我們從目前的 currentIndex 開始，計算一條路徑連到 targetIndex ?
    // 不，這樣太複雜。我們直接強制最後幾步是 target-N ... target

    // 重新策略：最後幾步強制為 targetIndex 的前幾位
    // 為了避免突然跳躍，我們在 randomSteps 的最後一步，確保它跳到 finalSteps 的起點附近?
    // 其實隨機跳到哪都沒關係，只要最後幾步順暢即可。

    for (let i = 0; i < finalStepsCount; i++) {
      // 倒數第 (finalStepsCount - i) 步
      // 例如 finalStepsCount=5, i=0 (倒數第5步) -> target - 4
      // i=4 (倒數第1步) -> target

      const offset = finalStepsCount - 1 - i
      // 使用模運算處理負數： (target - offset + count) % count
      const nextIndex = (targetIndex - offset + photoCount) % photoCount

      // 使用對應的 delay (從 randomStepsCount + i 開始)
      schedule.push({ index: nextIndex, delay: delays[randomStepsCount + i] })
    }

    console.log(`📊 動畫排程: 總步數 ${schedule.length}, 預計總時長 ${(totalTime / 1000).toFixed(2)}s`)

    // --- 執行動畫 ---
    let stepIndex = 0

    const runStep = () => {
      if (stepIndex >= schedule.length) {
        // 動畫結束
        finishAnimation()
        return
      }

      const step = schedule[stepIndex]
      setHighlightedIndex(step.index)

      // 排程下一步
      stepIndex++
      setTimeout(() => {
        animationFrameRef.current = requestAnimationFrame(runStep)
      }, step.delay)
    }

    // 啟動
    runStep()

    const finishAnimation = () => {
      console.log('🎉 動畫結束，停在索引:', targetIndex)

      // Step 1: 確保停在目標位置 (黃框)
      setHighlightedIndex(targetIndex)

      // Step 2: 等待移動到位 (200ms) -> 變綠色
      setTimeout(() => {
        setIsAnimating(false) // 變綠色

        // Step 3: 等待綠框展示 (800ms) -> 開始慶祝
        setTimeout(() => {
          const winnerPhoto = photosToUse[targetIndex]
          startCelebration(winnerPhoto)
        }, 800)
      }, 200)
    }
  }

  // 清理動畫
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [])

  const startCelebration = (winnerPhoto?: Photo) => {
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
      } else {
        console.error('❌ 無法獲取中獎照片位置 (winnerPhotoRef is null)')
        // 嘗試查找 DOM
        const el = document.querySelector('.border-green-400')
        if (el) {
          const rect = el.getBoundingClientRect()
          setWinnerPhotoRect(rect)
          console.log('📍 透過 DOM 找到中獎照片位置:', rect)
        }
      }

      // 先觸發縮放動畫
      setZoomingWinner(true)

      // 800ms 後（縮放動畫完成）切換到完整顯示
      setTimeout(() => {
        setShowingWinner(true)
        setZoomingWinner(false)
        console.log('✅ 中獎畫面顯示完成，等待管理員操作...')

        // 觸發 LINE 通知
        const currentId = currentDrawRef.current?.id
        console.log('📨 準備觸發 LINE 通知, currentDrawId:', currentId)

        if (currentId) {
          console.log('📨 發送請求到 /api/lottery/notify-winner...')
          fetch('/api/lottery/notify-winner', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              lotteryId: currentId,
              winnerPhotoUrl: winnerPhoto?.image_url
            })
          }).then(res => {
            console.log('📨 API 回應狀態:', res.status)
            return res.json()
          })
            .then(data => {
              if (data.success) {
                console.log('✅ LINE 通知發送成功')
              } else {
                console.error('❌ LINE 通知發送失敗:', data.error)
              }
            })
            .catch(err => console.error('❌ LINE 通知請求失敗:', err))
        } else {
          console.error('❌ 無法發送通知: currentDrawRef.current.id 為空')
        }
      }, 800)
    }, 1500)
  }

  // 找出中獎照片
  // 優先使用視覺上選中的照片 (highlightedIndex)，確保動畫和結果一致
  const getWinnerPhoto = () => {
    // 1. 如果有高亮索引，且在有效範圍內，直接返回該照片
    if (highlightedIndex !== -1 && photos[highlightedIndex]) {
      return photos[highlightedIndex]
    }

    // 2. 降級策略：根據 ID 查找
    if (!currentDraw || photos.length === 0) return null
    return photos.find(photo => photo.user_id === currentDraw.winner_line_id) || null
  }

  const winnerPhoto = getWinnerPhoto()

  // 調試：記錄渲染狀態
  useEffect(() => {
    console.log('🎨 渲染狀態:', {
      currentDraw: currentDraw?.id || null,
      showingWinner,
      zoomingWinner,
      celebrating,
      isAnimating,
      highlightedIndex,
      winnerPhoto: winnerPhoto ? '有' : '無',
      shouldShowWinnerScreen: !isAnimating && showingWinner && !zoomingWinner && !!winnerPhoto
    })
  }, [currentDraw, showingWinner, zoomingWinner, celebrating, isAnimating, highlightedIndex, winnerPhoto])

  // 計算每張照片的大小（自動填滿螢幕）
  const gridLayout = useMemo(() => {
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
  }, [photos.length])

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
        <BackgroundParticles />

        {/* 慶祝動畫（停止後） */}
        {celebrating && !isAnimating && <Confetti />}

        {/* 音效開關 */}
        <div className="absolute top-8 right-8 z-50">
          <SoundToggle isEnabled={isSoundEnabled} onToggle={toggleSound} />
        </div>

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
          <div className="relative w-fit mx-auto">
            {/* The Grid of Photos (Static) */}
            <StaticPhotoGrid
              photos={photos}
              winnerIndex={isAnimating ? -1 : highlightedIndex}
              gridLayout={gridLayout}
            />

            {/* The Floating Highlight (Dynamic) */}
            <FloatingHighlight
              highlightedIndex={highlightedIndex}
              gridLayout={gridLayout}
              isAnimating={isAnimating}
              winnerRef={winnerPhotoRef}
            />
          </div>
        </div>

      </div>

      {/* 中獎照片放大動畫 - 從原位置放大到左側900x900位置 */}
      {!isAnimating && zoomingWinner && winnerPhoto && winnerPhotoRect && (() => {
        // 目標尺寸（左側大照片）
        const targetSize = 900

        // 計算目標位置（左側照片的中心位置）
        // 設計尺寸: 1920x1080, padding: 32px
        // 左側照片位置: 32px + 900px/2 = 482px (從設計稿左側算)
        const designLeftPhotoCenter = 32 + targetSize / 2  // 482px

        // 考慮縮放比例，計算實際螢幕上的位置
        const screenCenterY = window.innerHeight / 2

        // 計算左側照片在實際螢幕上的中心 X 位置
        // 使用 scale 來計算實際位置
        const scaledDesignWidth = DESIGN_WIDTH * scale
        const screenOffsetX = (window.innerWidth - scaledDesignWidth) / 2
        const targetCenterX = screenOffsetX + designLeftPhotoCenter * scale

        // 計算當前照片的中心位置
        const currentCenterX = winnerPhotoRect.left + winnerPhotoRect.width / 2
        const currentCenterY = winnerPhotoRect.top + winnerPhotoRect.height / 2

        // 計算需要移動的距離
        const translateX = targetCenterX - currentCenterX
        const translateY = screenCenterY - currentCenterY

        // 計算縮放比例
        const scaleFactor = (targetSize * scale) / winnerPhotoRect.width

        console.log('🎬 放大動畫參數:', {
          targetSize,
          scale,
          targetCenterX,
          currentCenterX,
          translateX,
          translateY,
          scaleFactor
        })

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
              animation: 'zoomToCenter 0.8s cubic-bezier(0.4, 0, 0.2, 1) forwards',
              willChange: 'transform' // 效能優化
            } as React.CSSProperties}
          >
            <div className="relative w-full h-full">
              <div className="absolute -inset-6 bg-gradient-to-r from-yellow-400 via-orange-400 to-pink-400 rounded-3xl animate-pulse blur-2xl opacity-75"></div>
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

      {/* 中獎照片放大特寫 - 左右分欄布局 */}
      {!isAnimating && showingWinner && !zoomingWinner && winnerPhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 animate-in fade-in duration-500">
          <div className="flex items-center justify-center gap-12 px-8" style={{ width: `${DESIGN_WIDTH * scale}px`, height: `${DESIGN_HEIGHT * scale}px` }}>
            {/* 左側：中獎照片 */}
            <div className="relative flex-shrink-0 animate-in zoom-in duration-500" style={{ willChange: 'transform' }}>
              <div className="absolute -inset-6 bg-gradient-to-r from-yellow-400 via-orange-400 to-pink-400 rounded-3xl animate-pulse blur-2xl opacity-75"></div>
              <img
                src={winnerPhoto.image_url}
                alt={winnerPhoto.display_name}
                style={{
                  width: `${900 * scale}px`,
                  height: `${900 * scale}px`
                }}
                className="relative object-cover rounded-3xl border-8 border-white shadow-2xl"
                onError={(e) => {
                  e.currentTarget.src = '/default-avatar.png'
                }}
              />
            </div>

            {/* 右側：恭喜文字 + 資訊卡片 */}
            <div className="flex flex-col justify-center gap-8 flex-1" style={{ maxWidth: `${880 * scale}px`, willChange: 'transform' }}>
              {/* 恭喜文字 */}
              <div className="text-center animate-in slide-in-from-right duration-500">
                <h1
                  className="font-bold text-white drop-shadow-2xl animate-pulse leading-tight mb-4"
                  style={{ fontSize: `${6 * scale}rem` }} // 96px * scale
                >
                  🎉 恭喜中獎 🎉
                </h1>
              </div>

              {/* 中獎者資訊卡片 */}
              <div className="bg-white/95 rounded-3xl shadow-2xl animate-in slide-in-from-right duration-500 delay-150" style={{ padding: `${2.5 * scale}rem` }}>
                <div className="flex items-center mb-8" style={{ gap: `${2 * scale}rem` }}>
                  <img
                    src={winnerPhoto.avatar_url || '/default-avatar.png'}
                    alt={winnerPhoto.display_name}
                    className="rounded-full border-8 border-green-400 shadow-lg flex-shrink-0"
                    style={{ width: `${8 * scale}rem`, height: `${8 * scale}rem` }}
                  />
                  <div className="flex items-center flex-1 min-w-0" style={{ gap: `${1 * scale}rem` }}>
                    <Gift className="text-green-500 flex-shrink-0" style={{ width: `${3 * scale}rem`, height: `${3 * scale}rem` }} />
                    <h2
                      className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-500 to-emerald-500 break-words leading-tight"
                      style={{ fontSize: `${3.75 * scale}rem` }} // 60px * scale
                    >
                      {winnerPhoto.display_name}
                    </h2>
                  </div>
                </div>

                {winnerPhoto.blessing_message && (
                  <div className="flex items-start" style={{ gap: `${1 * scale}rem` }}>
                    <Heart className="text-red-500 mt-1 flex-shrink-0" style={{ width: `${2.5 * scale}rem`, height: `${2.5 * scale}rem` }} />
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-gray-700 italic leading-relaxed break-words whitespace-pre-wrap overflow-y-auto pr-3"
                        style={{
                          fontSize: `${1.875 * scale}rem`, // 30px * scale
                          maxHeight: `${400 * scale}px`
                        }}
                      >
                        「{winnerPhoto.blessing_message}」
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
