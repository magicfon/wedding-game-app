'use client'

import { useState, useEffect, useRef, useMemo, useCallback, useLayoutEffect } from 'react'
import { Gift } from 'lucide-react'
import { SoundToggle } from '@/components/SoundToggle'
import { useSoundEffects } from '@/hooks/useSoundEffects'
import { useBackgroundMusic } from '@/hooks/useBackgroundMusic'

interface Photo {
  id: number
  image_url: string
  user_id: string
  display_name: string
  avatar_url: string
}

interface LotteryMachineState {
  is_lottery_active: boolean
  is_drawing: boolean
  current_draw_id: number | null
}

interface Winner {
  photo: Photo
  order: number
}

interface TrackNode {
  id: number
  x: number
  y: number
}

interface TrackConfig {
  startPoint: { x: number; y: number }
  endPoint: { x: number; y: number }
  nodes: TrackNode[]
  ballDiameter: number
  chamberWidth: number
  chamberHeight: number
  trackWidth: number
  platformSurfaceHeight?: number
}

interface PhysicsConfig {
  gravity: number
  airForce: number
  lateralAirForce: number
  maxVelocity: number
}

export default function LotteryMachineLivePage() {
  const [photos, setPhotos] = useState<Photo[]>([])
  const [avatarBalls, setAvatarBalls] = useState<Photo[]>([])
  const [winners, setWinners] = useState<Winner[]>([])
  const [excludedUserIds, setExcludedUserIds] = useState<Set<string>>(new Set())
  const [lotteryState, setLotteryState] = useState<LotteryMachineState>({
    is_lottery_active: false,
    is_drawing: false,
    current_draw_id: null
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [trackConfig, setTrackConfig] = useState<TrackConfig>({
    startPoint: { x: 50, y: 75 },
    endPoint: { x: 15, y: 8 },
    nodes: [
      { id: 1, x: 95, y: 75 },
      { id: 2, x: 95, y: 55 },
      { id: 3, x: 5, y: 55 },
      { id: 4, x: 5, y: 25 },
      { id: 5, x: 25, y: 25 }
    ],
    ballDiameter: 42,
    chamberWidth: 480,
    chamberHeight: 220,
    trackWidth: 32
  })
  const [physics, setPhysics] = useState<PhysicsConfig>({
    gravity: 0.35,
    airForce: 0.8,
    lateralAirForce: 0.2,
    maxVelocity: 15
  })
  const [isEditorMode, setIsEditorMode] = useState(false)
  const [draggingNode, setDraggingNode] = useState<{ type: 'start' | 'end' | 'node', index?: number } | null>(null)
  const [windowSize, setWindowSize] = useState({ width: typeof window !== 'undefined' ? window.innerWidth : 1920, height: typeof window !== 'undefined' ? window.innerHeight : 1080 })
  const [dragPosition, setDragPosition] = useState<{ x: number; y: number } | null>(null)
  const [isMounted, setIsMounted] = useState(false)
  const [mainContentRect, setMainContentRect] = useState<DOMRect | null>(null)
  const [hiddenWinnerPhotos, setHiddenWinnerPhotos] = useState<Set<number>>(new Set())
  const [hoveredWinner, setHoveredWinner] = useState<number | null>(null)
  const [floatingPhotoPosition, setFloatingPhotoPosition] = useState<{ x: number; y: number; maxHeight?: number } | null>(null)
  const [toastMessage, setToastMessage] = useState<{ type: 'error' | 'success', message: string } | null>(null)

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

  // 元素拖曳狀態
  const [elementDragState, setElementDragState] = useState<{
    type: 'chamber' | 'platform' | null
    action: string | null
    startX: number
    startY: number
    startWidth: number
    startHeight: number
    startLeft: number
    startTop: number
    startBottom: number
    mainRect?: DOMRect
  } | null>(null)

  // 元素位置和大小狀態
  const [chamberStyle, setChamberStyle] = useState({
    left: '50%',
    bottom: '0px',
    width: '55%',
    maxWidth: `${trackConfig.chamberWidth}px`
  })
  const [platformStyle, setPlatformStyle] = useState({
    top: '0.5vh',
    left: '5%',
    width: 'clamp(180px, 15vw, 280px)'
  })
  const [platformSurfaceStyle, setPlatformSurfaceStyle] = useState({
    height: 'clamp(60px, 6vh, 100px)'
  })

  const chamberRef = useRef<HTMLDivElement>(null)
  const chamberContainerRef = useRef<HTMLDivElement>(null)
  const photosContainerRef = useRef<HTMLDivElement>(null)
  const platformSlotsRef = useRef<HTMLDivElement>(null)
  const trackContainerRef = useRef<HTMLDivElement>(null)
  const animationFrameRef = useRef<number | null>(null)
  const dragAnimationFrameRef = useRef<number | null>(null)

  // 響應式配置更新
  const updateResponsiveConfig = useCallback(() => {
    if (typeof window === 'undefined') return

    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight

    // 根據視口大小調整配置 (參考 lottery/script.js)
    const minBallSize = 30
    const maxBallSize = 55
    const minChamberHeight = 160
    const maxChamberHeight = 280
    const minChamberWidth = 320
    const maxChamberWidth = 520

    // 計算相對於視口大小的值
    const ballSize = Math.min(maxBallSize, Math.max(minBallSize, viewportWidth * 0.035))
    const chamberHeight = Math.min(maxChamberHeight, Math.max(minChamberHeight, viewportHeight * 0.18))
    const chamberWidth = Math.min(maxChamberWidth, Math.max(minChamberWidth, viewportWidth * 0.35))
    const trackWidth = Math.round(ballSize * 0.76)

    setTrackConfig(prev => ({
      ...prev,
      ballDiameter: ballSize,
      chamberHeight: chamberHeight,
      chamberWidth: chamberWidth
      // 不更新 trackWidth，讓用戶手動設置的值保持不變
    }))

    console.log('📏 響應式配置更新:', {
      ballSize,
      chamberHeight,
      chamberWidth,
      trackWidth,
      viewportWidth,
      viewportHeight
    })
  }, [])

  // 監聽窗口大小變化
  useEffect(() => {
    const handleResize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight })
      updateResponsiveConfig()
    }

    // 初始化
    handleResize()

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [updateResponsiveConfig])

  // 確保組件已掛載後才渲染軌道
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // 使用 useLayoutEffect 獲取 main-content 的尺寸
  useLayoutEffect(() => {
    const mainContent = document.querySelector('.main-content')
    if (mainContent) {
      const rect = mainContent.getBoundingClientRect()
      setMainContentRect(rect)
    }
  }, [windowSize, isMounted])

  // 載入照片
  useEffect(() => {
    fetchPhotos()
    loadTrackConfig()
    loadLotteryHistory(false) // 不載入 winners（清空 winner platform），但載入 excludedUserIds 來過濾 chamber 中的彩球
  }, [])

  // 照片載入後啟動彈跳動畫
  useEffect(() => {
    if (avatarBalls.length > 0) {
      // 等待 DOM 渲染完成後再啟動動畫
      const timer = setTimeout(() => {
        if (chamberRef.current && photosContainerRef.current) {
          startBounceAnimation()
        }
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [avatarBalls, physics])

  // 待機狀態也顯示氣泡效果
  useEffect(() => {
    const airBubbles = document.getElementById('airBubbles')
    if (!airBubbles) return

    const bubbleInterval = setInterval(() => {
      const bubble = document.createElement('div')
      bubble.className = 'bubble'
      bubble.style.left = `${10 + Math.random() * 80}%`
      bubble.style.animationDuration = `${1 + Math.random() * 0.5}s`
      bubble.style.width = `${4 + Math.random() * 6}px`
      bubble.style.height = bubble.style.width
      airBubbles.appendChild(bubble)
      setTimeout(() => bubble.remove(), 1400)
    }, 100)

    return () => clearInterval(bubbleInterval)
  }, [])

  // 監聽 platform 高度變化並自動更新彩球大小
  useEffect(() => {
    const platformSurface = document.querySelector('.platform-surface') as HTMLElement
    if (!platformSurface) return

    // 更新彩球大小的函數
    const updateBallSizes = () => {
      const platformHeight = platformSurface.offsetHeight
      const ballSize = Math.max(20, Math.round(platformHeight * 0.9))

      const winnerPhotos = document.querySelectorAll('.platform-winner-photo')
      winnerPhotos.forEach(photo => {
        const el = photo as HTMLElement
        el.style.width = `${ballSize}px`
        el.style.height = `${ballSize}px`
      })

      console.log('📏 更新彩球大小:', ballSize, 'px (平台高度:', platformHeight, 'px)')
    }

    // 使用 ResizeObserver 監聽 platform 高度變化
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.target === platformSurface) {
          updateBallSizes()
        }
      }
    })

    resizeObserver.observe(platformSurface)

    // 初始更新
    updateBallSizes()

    return () => {
      resizeObserver.disconnect()
    }
  }, [winners.length]) // 當 winners 變化時重新設置

  // 計算未中獎的彩球（過濾掉已經中獎過的用戶）
  const availableBalls = useMemo(() => {
    return avatarBalls.filter(ball => !excludedUserIds.has(ball.user_id))
  }, [avatarBalls, excludedUserIds])

  // Realtime 連接管理
  const eventSourceRef = useRef<EventSource | null>(null)

  // 建立並開始 Realtime 連接
  const startRealtimeConnection = () => {
    if (eventSourceRef.current) {
      console.log('Realtime 已連接，跳過')
      return
    }

    try {
      console.log('建立 Realtime 連接...')
      const eventSource = new EventSource('/api/lottery-machine/state/stream')
      eventSourceRef.current = eventSource

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          console.log('Realtime 更新:', data)

          if (data.type === 'connected') {
            console.log('Realtime 連接成功')
          } else if (data.type === 'lottery_state') {
            setLotteryState(data.state)
          } else if (data.type === 'new_winner') {
            setWinners(prev => [...prev, data.winner])
          } else if (data.type === 'error') {
            console.error('Realtime 錯誤:', data.message)
          }
        } catch (e) {
          console.error('解析 Realtime 訊息失敗:', e)
        }
      }

      eventSource.onerror = () => {
        console.warn('Realtime 連接錯誤')
        stopRealtimeConnection()
      }
    } catch (e) {
      console.error('建立 EventSource 失敗:', e)
    }
  }

  // 停止 Realtime 連接
  const stopRealtimeConnection = () => {
    if (eventSourceRef.current) {
      console.log('關閉 Realtime 連接')
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }
  }

  // 頁面載入時建立連接獲取初始狀態
  useEffect(() => {
    startRealtimeConnection()

    // 5秒後關閉連接（只獲取初始狀態）
    const timer = setTimeout(() => {
      stopRealtimeConnection()
    }, 5000)

    return () => {
      clearTimeout(timer)
      stopRealtimeConnection()
    }
  }, [])

  const fetchPhotos = async () => {
    try {
      const response = await fetch('/api/lottery-machine/photos')
      const data = await response.json()

      if (data.success) {
        const fetchedPhotos = data.photos || []
        setPhotos(fetchedPhotos)

        // 按 user_id 分組照片，為每個用戶創建多個大頭貼彩球
        const userPhotosMap = new Map<string, Photo[]>()
        fetchedPhotos.forEach((photo: Photo) => {
          if (!userPhotosMap.has(photo.user_id)) {
            userPhotosMap.set(photo.user_id, [])
          }
          userPhotosMap.get(photo.user_id)!.push(photo)
        })

        // 為每個用戶根據其上傳的照片數量創建多個彩球
        const balls: Photo[] = []
        userPhotosMap.forEach((photos, userId) => {
          const userPhoto = photos[0] // 使用第一張照片的用戶資訊
          // 為該用戶創建與照片數量相同的彩球數量
          for (let i = 0; i < photos.length; i++) {
            balls.push({
              id: userPhoto.id + i * 1000000, // 為每個彩球生成唯一 ID
              image_url: userPhoto.avatar_url, // 使用大頭貼 URL
              user_id: userId,
              display_name: userPhoto.display_name,
              avatar_url: userPhoto.avatar_url
            })
          }
        })

        setAvatarBalls(balls)
        setLoading(false)
      } else {
        setError(data.error || '載入照片失敗')
        setLoading(false)
      }
    } catch (err) {
      console.error('載入照片失敗:', err)
      setError('載入照片失敗')
      setLoading(false)
    }
  }

  const loadLotteryHistory = async (loadWinners: boolean = false) => {
    try {
      const response = await fetch('/api/lottery-machine/history')
      const data = await response.json()

      if (data.success && data.history) {
        // 總是載入已中獎的 user_id 用於過濾 chamber 中的彩球
        const excludedIds = new Set<string>(data.history.map((record: any) => record.winner_line_id))
        setExcludedUserIds(excludedIds)
        console.log(`✅ 已載入 ${excludedIds.size} 個已中獎的 user_id`)

        // 只有在需要時才載入 winners 用於顯示在 winner platform
        if (loadWinners) {
          const historyWinners: Winner[] = data.history.map((record: any, index: number) => ({
            photo: {
              id: record.winner_photo_id || 0,
              image_url: record.winner_photo_url || '',
              user_id: record.winner_line_id || '',
              display_name: record.winner_display_name || '',
              avatar_url: record.winner_avatar_url || ''
            },
            order: index + 1
          }))
          setWinners(historyWinners)
          console.log(`✅ 已載入 ${historyWinners.length} 筆歷史記錄到 winner platform`)
        }
      }
    } catch (err) {
      console.error('載入歷史記錄失敗:', err)
      // 不影響頁面正常運作
    }
  }

  const loadTrackConfig = async () => {
    try {
      const response = await fetch('/api/lottery-machine/config')
      const data = await response.json()

      if (data.success && data.config?.track_config) {
        const savedConfig = data.config.track_config
        // 檢查是否有有效的設定
        if (savedConfig && savedConfig.startPoint && savedConfig.endPoint && savedConfig.nodes) {
          setTrackConfig(prev => ({
            ...prev, // 保留當前的 responsive values
            startPoint: savedConfig.startPoint,
            endPoint: savedConfig.endPoint,
            nodes: savedConfig.nodes,
            // 如果有儲存的 chamber 大小，也一併載入
            chamberWidth: savedConfig.chamberWidth || prev.chamberWidth,
            chamberHeight: savedConfig.chamberHeight || prev.chamberHeight,
            platformSurfaceHeight: savedConfig.platformSurfaceHeight,
            // 如果有儲存的彩球直徑，也一併載入
            ballDiameter: savedConfig.ballDiameter || prev.ballDiameter,
            // 如果有儲存的軌道寬度，也一併載入（否則根據彩球直徑計算）
            trackWidth: savedConfig.trackWidth || (savedConfig.ballDiameter ? Math.round(savedConfig.ballDiameter * 0.9) : prev.trackWidth)
          }))

          // 如果有儲存的 platformSurfaceHeight，應用它
          if (savedConfig.platformSurfaceHeight) {
            setPlatformSurfaceStyle(prev => ({
              ...prev,
              height: `${savedConfig.platformSurfaceHeight}px`
            }))
          }

          console.log('✅ 已載入儲存的軌道設定')
        }
      }

      // 載入物理參數
      if (data.success && data.config?.physics) {
        const savedPhysics = data.config.physics
        // 只載入存在的參數，保留預設值
        setPhysics(prev => ({
          gravity: savedPhysics.gravity !== undefined ? savedPhysics.gravity : prev.gravity,
          airForce: savedPhysics.airForce !== undefined ? savedPhysics.airForce : prev.airForce,
          lateralAirForce: savedPhysics.lateralAirForce !== undefined ? savedPhysics.lateralAirForce : prev.lateralAirForce,
          maxVelocity: savedPhysics.maxVelocity !== undefined ? savedPhysics.maxVelocity : prev.maxVelocity
        }))
        console.log('✅ 已載入儲存的物理參數:', savedPhysics)
      }

      // 載入 chamber 和 platform 樣式
      if (data.success && data.config) {
        if (data.config.chamber_style) {
          setChamberStyle(data.config.chamber_style)
          console.log('✅ 已載入儲存的 chamber 樣式')
        }
        if (data.config.platform_style) {
          setPlatformStyle(data.config.platform_style)
          console.log('✅ 已載入儲存的 platform 樣式')
        }
      }
    } catch (err) {
      console.error('載入軌道設定失敗:', err)
      // 不影響頁面正常運作，使用預設值
    }
  }

  const startBounceAnimation = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
    }

    const container = photosContainerRef.current
    const chamberContainer = chamberContainerRef.current
    if (!container || !chamberContainer) return

    const photoElements = container.querySelectorAll('.photo-item')
    const chamberRect = chamberContainer.getBoundingClientRect()
    const containerRect = container.getBoundingClientRect() // 獲取 photos-container 的實際尺寸
    if (photoElements.length === 0) return

    // 初始化照片位置到腔體內
    const photoSize = trackConfig.ballDiameter // 使用動態彩球直徑
    photoElements.forEach((photoEl: Element) => {
      const el = photoEl as HTMLElement
      const currentLeft = parseFloat(el.style.left || '0')
      const currentTop = parseFloat(el.style.top || '0')

      // 確保照片在 photos-container 範圍內（使用 containerRect）
      let x = Math.min(Math.max(0, currentLeft), containerRect.width - photoSize)
      let y = Math.min(Math.max(0, currentTop), containerRect.height - photoSize)

      // 如果照片在腔體外，重新定位到中心
      if (x < 0 || x > containerRect.width - photoSize || y < 0 || y > containerRect.height - photoSize) {
        x = (containerRect.width - photoSize) / 2 + (Math.random() - 0.5) * 50
        y = (containerRect.height - photoSize) / 2 + (Math.random() - 0.5) * 50
      }

      el.style.left = `${x}px`
      el.style.top = `${y}px`

      // 確保有速度
      if (!el.dataset.vx || el.dataset.vx === '0') {
        el.dataset.vx = ((Math.random() - 0.5) * 10).toString()
      }
      if (!el.dataset.vy || el.dataset.vy === '0') {
        el.dataset.vy = ((Math.random() - 0.5) * 10).toString()
      }
    })

    const animate = () => {
      photoElements.forEach((photoEl: Element) => {
        const el = photoEl as HTMLElement
        const x = parseFloat(el.style.left || '0')
        const y = parseFloat(el.style.top || '0')
        const vx = parseFloat(el.dataset.vx || '0')
        const vy = parseFloat(el.dataset.vy || '0')

        // 重力
        let newVy = vy + physics.gravity

        // 氣流力 - 使用 containerRect 計算
        const bottomFactor = y / containerRect.height
        newVy -= physics.airForce * (0.5 + bottomFactor * 1.5)

        // 側向氣流力 - 使用 containerRect 計算
        const horizontalFactor = x / containerRect.width
        const newVx = vx + (Math.random() - 0.5) * physics.lateralAirForce * 2 + (Math.random() - 0.5) * physics.lateralAirForce

        // 摩擦力
        const friction = 0.995
        const finalVx = newVx * friction
        const finalVy = newVy * friction

        // 速度限制
        let clampedVx = finalVx
        let clampedVy = finalVy

        if (Math.abs(clampedVx) > physics.maxVelocity) {
          clampedVx = Math.sign(clampedVx) * physics.maxVelocity
        }
        if (Math.abs(clampedVy) > physics.maxVelocity) {
          clampedVy = Math.sign(clampedVy) * physics.maxVelocity
        }

        // 最小速度
        const minVelocity = 4
        const speed = Math.sqrt(clampedVx * clampedVx + clampedVy * clampedVy)
        if (speed < minVelocity) {
          const angle = Math.random() * Math.PI * 2
          clampedVx += Math.cos(angle) * minVelocity * 0.5
          clampedVy += Math.sin(angle) * minVelocity * 0.5
        }

        // 更新位置
        let newX = x + clampedVx
        let newY = y + clampedVy

        // 邊界碰撞 - 使用 photos-container 的實際尺寸
        const containerWidth = containerRect.width
        const containerHeight = containerRect.height

        if (newX < 0) {
          newX = 0
          clampedVx = -clampedVx * 0.85
        } else if (newX > containerWidth - photoSize) {
          newX = containerWidth - photoSize
          clampedVx = -clampedVx * 0.85
        }

        if (newY < 0) {
          newY = 0
          clampedVy = -clampedVy * 0.85
        } else if (newY > containerHeight - photoSize) {
          newY = containerHeight - photoSize
          clampedVy = -clampedVy * 0.85
          // 底部額外氣流力
          clampedVy -= physics.airForce * 3
        }

        // 旋轉
        const rotation = parseFloat(el.dataset.rotation || '0')
        const rotationSpeed = parseFloat(el.dataset.rotationSpeed || '0')
        const newRotation = rotation + rotationSpeed + clampedVx * 0.5

        // 更新 DOM
        el.style.left = `${newX}px`
        el.style.top = `${newY}px`
        el.style.transform = `rotate(${newRotation}deg)`

        // 更新資料屬性
        el.dataset.vx = clampedVx.toString()
        el.dataset.vy = clampedVy.toString()
        el.dataset.rotation = newRotation.toString()
      })

      animationFrameRef.current = requestAnimationFrame(animate)
    }

    animate()
  }

  const drawWinner = async () => {
    if (lotteryState.is_drawing || availableBalls.length === 0) return

    // 立即更新狀態，顯示載入中（提供即時反饋）
    setLotteryState(prev => ({ ...prev, is_drawing: true }))

    try {
      const response = await fetch('/api/lottery-machine/draw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          admin_id: 'system',
          admin_name: '系統管理員'
        })
      })
      const data = await response.json()

      if (data.success) {
        // 構建完整的 Photo 物件用於動畫
        const winnerPhoto: Photo = {
          id: data.winner_photo.id,
          image_url: data.winner_photo.url,
          user_id: data.winner.line_id,
          display_name: data.winner.display_name,
          avatar_url: data.winner.avatar_url
        }

        // 動畫效果 - 傳入完整的 Photo 物件
        await animateWinnerSelection(winnerPhoto)

        // 將中獎者添加到得獎者列表（當前回合）
        setWinners(prev => [...prev, { photo: winnerPhoto, order: prev.length + 1 }])
        // 將中獎者的 user_id 添加到 excludedUserIds（用於過濾 chamber 中的彩球）
        setExcludedUserIds(prev => new Set(prev).add(winnerPhoto.user_id))
        setLotteryState(prev => ({ ...prev, is_drawing: false }))

        // 動畫完成後發送 LINE 通知（如果啟用）
        try {
          const notifyResponse = await fetch('/api/lottery-machine/notify-winner', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              lotteryId: data.lottery_id,
              winnerPhotoUrl: data.winner_photo.url
            })
          })
          const notifyData = await notifyResponse.json()

          if (notifyData.skipped) {
            console.log('⏭️ 中獎通知已關閉，跳過發送')
          } else if (notifyData.success) {
            console.log('✅ LINE 通知已發送')
          } else {
            console.warn('⚠️ LINE 通知發送失敗:', notifyData.error)
          }
        } catch (notifyError) {
          console.error('❌ 發送 LINE 通知失敗:', notifyError)
          // 不影響抽獎結果，只記錄錯誤
        }
      } else {
        // 失敗時重置狀態
        setLotteryState(prev => ({ ...prev, is_drawing: false }))
        // 顯示提示訊息而不是切換整個畫面
        setToastMessage({ type: 'error', message: data.error || '抽獎失敗' })
        // 3秒後自動隱藏提示
        setTimeout(() => setToastMessage(null), 3000)
      }
    } catch (err) {
      // 錯誤時重置狀態
      setLotteryState(prev => ({ ...prev, is_drawing: false }))
      console.error('抽獎失敗:', err)
      // 顯示提示訊息而不是切換整個畫面
      setToastMessage({ type: 'error', message: '抽獎失敗' })
      // 3秒後自動隱藏提示
      setTimeout(() => setToastMessage(null), 3000)
    }
  }

  const animateWinnerSelection = (winner: Photo): Promise<void> => {
    return new Promise(resolve => {
      const trackContainer = trackContainerRef.current
      const photosContainer = photosContainerRef.current
      if (!trackContainer || !photosContainer) {
        console.error('❌ track-container 或 photos-container 不存在')
        resolve()
        return
      }

      const photoElements = Array.from(photosContainer.querySelectorAll('.photo-item')) as HTMLElement[]

      // 使用 user_id 來查找照片元素（因為同一用戶的所有彩球都使用相同的頭像）
      const winnerEl = photoElements.find((el: HTMLElement) => {
        const photoUserId = el.dataset.userId
        return photoUserId === winner.user_id
      })

      if (!winnerEl) {
        console.error('❌ 找不到中獎者照片元素，user_id:', winner.user_id)
        console.log('📋 所有 user_id:', photoElements.map(el => el.dataset.userId))
        resolve()
        return
      }

      // 隱藏原始中獎照片
      winnerEl.style.opacity = '0'

      // 創建動畫元素（添加到 body，使用 position: fixed）
      const travelingPhoto = document.createElement('div')
      travelingPhoto.className = 'photo-traveling'
      travelingPhoto.innerHTML = `<img src="${winner.avatar_url}" alt="${winner.display_name}">`
      document.body.appendChild(travelingPhoto)

      // 設置動畫元素的初始樣式（使用相對於視口的坐標）
      const photoRect = winnerEl.getBoundingClientRect()
      const mainRect = document.querySelector('.main-content')?.getBoundingClientRect() || new DOMRect(0, 0, window.innerWidth, window.innerHeight) // Fallback if main-content not found
      const photoSize = trackConfig.ballDiameter - 4 // 稍微縮小一點（參考 reference）

      // 使用視口坐標 (fixed positioning)
      const initialX = photoRect.left
      const initialY = photoRect.top

      travelingPhoto.style.transition = 'none'
      travelingPhoto.style.left = `${initialX}px`
      travelingPhoto.style.top = `${initialY}px`
      travelingPhoto.style.width = `${photoSize}px`
      travelingPhoto.style.height = `${photoSize}px`

      // 生成路徑點（使用 Catmull-Rom spline）
      const waypoints = generateWaypoints(photoRect, mainRect)

      // 沿著路徑動畫
      let rotation = 0
      const animatePath = async () => {
        for (let i = 0; i < waypoints.length - 1; i++) {
          const from = waypoints[i]
          const to = waypoints[i + 1]
          const distance = Math.sqrt(Math.pow(to.x - from.x, 2) + Math.pow(to.y - from.y, 2))
          const duration = distance * 1.2 // 1.2ms per pixel (參考 lottery/ 的實現)

          await animateSegment(travelingPhoto, from.x, from.y, to.x, to.y, duration, rotation)
          rotation += distance * 0.5 // 降低自旋轉速度（參考 lottery/ 的實現）
        }
      }

      // 動畫完成後的處理
      const onAnimationComplete = () => {
        // 播放彩紙效果
        triggerConfetti()

        // 移除動畫元素
        setTimeout(() => {
          travelingPhoto.remove()
          resolve()
        }, 500)
      }

      // 開始動畫
      console.log('✅ 開始沿著路徑動畫')
      animatePath().then(onAnimationComplete)
    })
  }

  // 生成路徑點（使用 Catmull-Rom spline，與 lottery/ 完全相同）
  const generateWaypoints = (photoRect: DOMRect, mainRect: DOMRect) => {
    const halfSize = trackConfig.ballDiameter / 2 // 使用動態半徑

    // 構建控制點
    const controlPoints = [
      { x: trackConfig.startPoint.x, y: trackConfig.startPoint.y },
      ...trackConfig.nodes.map(n => ({ x: n.x, y: n.y })),
      { x: trackConfig.endPoint.x, y: trackConfig.endPoint.y }
    ]

    // 生成平滑曲線路徑點（Catmull-Rom spline 採樣）
    const curveWaypoints = sampleCatmullRomSpline(controlPoints, 50)

    // 轉換百分比坐標為相對於視口的坐標 (Fixed positioning)
    const waypoints = [{ x: photoRect.left, y: photoRect.top }]

    curveWaypoints.forEach(pt => {
      // 根據視口中的 main-content 位置計算絕對坐標
      const screenX = mainRect.left + (pt.x / 100) * mainRect.width - halfSize
      const screenY = mainRect.top + (pt.y / 100) * mainRect.height - halfSize
      waypoints.push({ x: screenX, y: screenY })
    })

    return waypoints
  }

  // 生成 Catmull-Rom 路徑（用於視覺軌道）
  const generateCatmullRomPath = (points: { x: number; y: number }[]) => {
    if (points.length < 2) return ''
    if (points.length === 2) {
      return `M ${points[0].x},${points[0].y} L ${points[1].x},${points[1].y}`
    }

    // 添加虛擬點以獲得平滑端點
    const extendedPoints = [
      { x: points[0].x * 2 - points[1].x, y: points[0].y * 2 - points[1].y },
      ...points,
      { x: points[points.length - 1].x * 2 - points[points.length - 2].x, y: points[points.length - 1].y * 2 - points[points.length - 2].y }
    ]

    let path = `M ${points[0].x},${points[0].y}`

    for (let i = 0; i < points.length - 1; i++) {
      const p0 = extendedPoints[i]
      const p1 = extendedPoints[i + 1]
      const p2 = extendedPoints[i + 2]
      const p3 = extendedPoints[i + 3]

      // Catmull-Rom 到貝茲曲線的轉換
      const cp1x = p1.x + (p2.x - p0.x) / 6
      const cp1y = p1.y + (p2.y - p0.y) / 6
      const cp2x = p2.x - (p3.x - p1.x) / 6
      const cp2y = p2.y - (p3.y - p1.y) / 6

      path += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`
    }

    return path
  }

  // Catmull-Rom spline 採樣
  const sampleCatmullRomSpline = (points: { x: number; y: number }[], numSamples: number) => {
    if (points.length < 2) return points
    if (points.length === 2) {
      const samples = []
      for (let i = 0; i <= numSamples; i++) {
        const t = i / numSamples
        samples.push({
          x: points[0].x + (points[1].x - points[0].x) * t,
          y: points[0].y + (points[1].y - points[0].y) * t
        })
      }
      return samples
    }

    // 添加虛擬點以獲得平滑端點
    const extendedPoints = [
      { x: points[0].x * 2 - points[1].x, y: points[0].y * 2 - points[1].y },
      ...points,
      { x: points[points.length - 1].x * 2 - points[points.length - 2].x, y: points[points.length - 1].y * 2 - points[points.length - 2].y }
    ]

    const samples = []
    const totalSegments = points.length - 1
    const samplesPerSegment = Math.ceil(numSamples / totalSegments)

    for (let seg = 0; seg < totalSegments; seg++) {
      const p0 = extendedPoints[seg]
      const p1 = extendedPoints[seg + 1]
      const p2 = extendedPoints[seg + 2]
      const p3 = extendedPoints[seg + 3]

      for (let i = 0; i <= samplesPerSegment; i++) {
        if (seg > 0 && i === 0) continue // 避免線段邊界重複
        const t = i / samplesPerSegment

        // Catmull-Rom spline 插值
        const t2 = t * t
        const t3 = t2 * t

        const x = 0.5 * (
          (2 * p1.x) +
          (-p0.x + p2.x) * t +
          (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
          (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3
        )
        const y = 0.5 * (
          (2 * p1.y) +
          (-p0.y + p2.y) * t +
          (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
          (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3
        )

        samples.push({ x, y })
      }
    }

    return samples
  }

  // 動畫單個線段
  const animateSegment = (el: HTMLElement, fromX: number, fromY: number, toX: number, toY: number, duration: number, startRotation: number): Promise<void> => {
    return new Promise(resolve => {
      const startTime = performance.now()

      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime
        const progress = Math.min(elapsed / duration, 1)
        // 使用 ease-in-out 緩動函數
        const eased = progress < 0.5
          ? 2 * progress * progress
          : 1 - Math.pow(-2 * progress + 2, 2) / 2

        const x = fromX + (toX - fromX) * eased
        const y = fromY + (toY - fromY) * eased
        const rotation = startRotation + progress * 60 // 降低每段的旋轉角度

        el.style.left = `${x}px`
        el.style.top = `${y}px`
        el.style.transform = `rotate(${rotation}deg)`

        if (progress < 1) {
          requestAnimationFrame(animate)
        } else {
          console.log('✅ 線段動畫完成')
          resolve()
        }
      }

      requestAnimationFrame(animate)
    })
  }

  const triggerConfetti = () => {
    const container = document.querySelector('.confetti-container')
    if (!container) return

    const colors = ['#f5af19', '#f12711', '#4CAF50', '#2196F3', '#9C27B0', '#FF9800']
    const confettiCount = 100

    for (let i = 0; i < confettiCount; i++) {
      const confetti = document.createElement('div')
      confetti.className = 'confetti'
      confetti.style.left = `${Math.random() * 100}%`
      confetti.style.top = '-10px'
      confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)]
      confetti.style.width = `${5 + Math.random() * 10}px`
      confetti.style.height = `${5 + Math.random() * 10}px`
      confetti.style.animationDuration = `${2 + Math.random() * 3}s`
      confetti.style.animationDelay = `${Math.random() * 0.5}s`
      container.appendChild(confetti)

      setTimeout(() => confetti.remove(), 5000)
    }
  }

  // 處理中獎照片點擊隱藏
  const handleWinnerPhotoClick = (winnerId: number, e: React.MouseEvent) => {
    e.stopPropagation()
    setHiddenWinnerPhotos(prev => {
      const newSet = new Set(prev)
      if (newSet.has(winnerId)) {
        newSet.delete(winnerId)
        setHoveredWinner(winnerId)
      } else {
        newSet.add(winnerId)
        setHoveredWinner(null)
      }
      return newSet
    })
  }

  // 處理中獎照片滑鼠移入
  const handleWinnerPhotoMouseEnter = (winnerId: number, e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const screenWidth = window.innerWidth
    const screenHeight = window.innerHeight

    // 計算照片寬度（使用 CSS 中的 clamp 值）
    const photoWidth = Math.min(450, Math.max(280, screenWidth * 0.3))

    // 計算初始位置（照片中心點）
    const initialLeft = rect.left + rect.width / 2
    const top = rect.bottom + 10
    const maxHeight = screenHeight - top - 10 // 高度切齊螢幕底部，留 10px 邊距

    // 計算照片左邊界（考慮 transform: translateX(-50%)）
    const photoLeftEdge = initialLeft - photoWidth / 2

    // 如果照片會超出左邊界，就向右移動
    let left = initialLeft
    if (photoLeftEdge < 10) {
      left = photoWidth / 2 + 10 // 確保照片左邊界距離螢幕左邊至少 10px
    }

    setFloatingPhotoPosition({ x: left, y: top, maxHeight })
    setHiddenWinnerPhotos(prev => {
      const newSet = new Set(prev)
      newSet.delete(winnerId)
      return newSet
    })
    setHoveredWinner(winnerId)
  }

  // 處理中獎照片滑鼠移出
  const handleWinnerPhotoMouseLeave = (winnerId: number) => {
    setHoveredWinner(null)
    setHiddenWinnerPhotos(prev => {
      const newSet = new Set(prev)
      newSet.add(winnerId)
      return newSet
    })
  }

  // 拖曳處理
  const handleDragStart = (e: React.MouseEvent, type: 'start' | 'end' | 'node', index?: number) => {
    e.preventDefault()
    e.stopPropagation()
    setDraggingNode({ type, index })

    // 初始化拖曳位置 - 使用相對於 main-content 的坐標
    const mainContent = document.querySelector('.main-content')
    if (!mainContent) return

    const mainRect = mainContent.getBoundingClientRect()
    const x = ((e.clientX - mainRect.left) / mainRect.width) * 100
    const y = ((e.clientY - mainRect.top) / mainRect.height) * 100
    setDragPosition({ x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) })
  }

  const handleDragMove = (e: React.MouseEvent) => {
    if (!draggingNode) return

    // 使用 requestAnimationFrame 優化拖曳更新
    if (dragAnimationFrameRef.current) {
      cancelAnimationFrame(dragAnimationFrameRef.current)
    }

    dragAnimationFrameRef.current = requestAnimationFrame(() => {
      const mainContent = document.querySelector('.main-content')
      if (!mainContent) return

      const mainRect = mainContent.getBoundingClientRect()
      const x = ((e.clientX - mainRect.left) / mainRect.width) * 100
      const y = ((e.clientY - mainRect.top) / mainRect.height) * 100

      const clampedX = Math.max(0, Math.min(100, x))
      const clampedY = Math.max(0, Math.min(100, y))

      setDragPosition({ x: clampedX, y: clampedY })

      if (draggingNode.type === 'start') {
        setTrackConfig(prev => ({ ...prev, startPoint: { x: clampedX, y: clampedY } }))
      } else if (draggingNode.type === 'end') {
        setTrackConfig(prev => ({ ...prev, endPoint: { x: clampedX, y: clampedY } }))
      } else if (draggingNode.type === 'node' && draggingNode.index !== undefined) {
        setTrackConfig(prev => ({
          ...prev,
          nodes: prev.nodes.map((n, i) => i === draggingNode.index ? { ...n, x: clampedX, y: clampedY } : n)
        }))
      }
    })
  }

  const handleDragEnd = () => {
    // 取消動畫幀
    if (dragAnimationFrameRef.current) {
      cancelAnimationFrame(dragAnimationFrameRef.current)
      dragAnimationFrameRef.current = null
    }

    setDraggingNode(null)
    setDragPosition(null)
  }

  const addNode = () => {
    const newId = trackConfig.nodes.length + 1
    const lastNode = trackConfig.nodes[trackConfig.nodes.length - 1] || trackConfig.startPoint
    setTrackConfig(prev => ({
      ...prev,
      nodes: [
        ...prev.nodes,
        {
          id: newId,
          x: Math.min(95, lastNode.x + 10),
          y: Math.max(5, lastNode.y - 10)
        }
      ]
    }))
  }

  const removeNode = (index: number) => {
    setTrackConfig(prev => ({
      ...prev,
      nodes: prev.nodes.filter((_, i) => i !== index).map((n, i) => ({ ...n, id: i + 1 }))
    }))
  }

  const saveTrackConfig = async () => {
    try {
      console.log('💾 儲存軌道設定...', trackConfig)
      console.log(' - physics:', physics)
      console.log(' - chamberStyle:', chamberStyle)
      console.log(' - platformStyle:', platformStyle)
      console.log(' - platformSurfaceStyle:', platformSurfaceStyle)

      const response = await fetch('/api/lottery-machine/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trackConfig: trackConfig,
          physics: physics,
          chamberStyle: chamberStyle,
          platformStyle: platformStyle,
          platform_surface_style: platformSurfaceStyle
        })
      })
      const data = await response.json()
      console.log('📥 儲存回應:', data)
      if (data.success) {
        alert('✅ 設定已儲存')
      } else {
        alert('❌ 儲存失敗: ' + data.error)
      }
    } catch (err) {
      console.error('❌ 儲存錯誤:', err)
      alert('❌ 儲存失敗')
    }
  }

  // 元素拖曳開始
  const handleElementDragStart = (e: React.MouseEvent, type: 'chamber' | 'platform', action: string) => {
    if (!isEditorMode) return
    e.preventDefault()
    e.stopPropagation()

    const element = type === 'chamber'
      ? chamberRef.current
      : document.querySelector('.winners-platform') as HTMLElement

    if (!element) return

    const rect = element.getBoundingClientRect()
    const mainRect = document.querySelector('.main-content')?.getBoundingClientRect()
    if (!mainRect) return

    let startHeight = rect.height
    if (type === 'platform') {
      const platformSurface = element.querySelector('.platform-surface') as HTMLElement
      if (platformSurface) {
        startHeight = platformSurface.offsetHeight
      }
    }

    setElementDragState({
      type,
      action,
      startX: e.clientX,
      startY: e.clientY,
      startWidth: rect.width,
      startHeight,
      startLeft: rect.left - mainRect.left,
      startTop: rect.top - mainRect.top,
      startBottom: mainRect.bottom - rect.bottom,
      mainRect
    })
  }

  // 元素拖曳移動
  const handleElementDragMove = (e: React.MouseEvent) => {
    if (!elementDragState || !isEditorMode) return

    const { type, action, startX, startY, startWidth, startHeight, startLeft, startTop, startBottom, mainRect } = elementDragState
    if (!action || !mainRect) return

    const dx = e.clientX - startX
    const dy = e.clientY - startY

    if (action === 'move') {
      if (type === 'chamber') {
        // Chamber 使用相對於 main-content 的百分比位置
        const newLeftPercent = ((startLeft + dx + startWidth / 2) / mainRect.width) * 100
        setChamberStyle(prev => ({
          ...prev,
          left: `${Math.max(0, Math.min(100, newLeftPercent))}%`,
          bottom: `${Math.max(0, -dy)}px`
        }))
      } else {
        // Platform 使用相對於 main-content 的位置
        const newLeft = ((startLeft + dx) / mainRect.width) * 100
        const newTop = startTop + dy
        setPlatformStyle(prev => ({
          ...prev,
          left: `${Math.max(0, newLeft)}%`,
          top: `${Math.max(0, newTop)}px`
        }))
      }
    } else if (action.startsWith('resize')) {
      const direction = action.replace('resize-', '')
      let newWidth = startWidth
      let newHeight = startHeight

      if (direction.includes('e')) {
        newWidth = startWidth + dx
      } else if (direction.includes('w')) {
        newWidth = startWidth - dx
      }

      if (direction.includes('s')) {
        newHeight = startHeight + dy
      } else if (direction.includes('n')) {
        newHeight = startHeight - dy
      }

      newWidth = Math.max(100, newWidth)
      newHeight = Math.max(40, newHeight)

      if (type === 'chamber') {
        setChamberStyle(prev => ({
          ...prev,
          width: `${newWidth}px`,
          maxWidth: 'none'
        }))
        setTrackConfig(prev => ({
          ...prev,
          chamberWidth: newWidth,
          chamberHeight: newHeight
        }))
      } else {
        setPlatformStyle(prev => ({
          ...prev,
          width: `${newWidth}px`
        }))
        setPlatformSurfaceStyle(prev => ({
          ...prev,
          height: `${newHeight}px`,
          minHeight: `${newHeight}px`
        }))
        // 同步更新 trackConfig 中的 platformSurfaceHeight
        setTrackConfig(prev => ({
          ...prev,
          platformSurfaceHeight: newHeight
        }))
      }
    }
  }

  // 元素拖曳結束
  const handleElementDragEnd = () => {
    if (elementDragState) {
      // 不再自動儲存，只清除拖曳狀態
      // 使用者需要點擊「儲存設定」按鈕來儲存變更
      setElementDragState(null)
    }
  }

  // 全局滑鼠移動和釋放事件
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      handleElementDragMove(e as unknown as React.MouseEvent)
    }

    const handleMouseUp = () => {
      handleElementDragEnd()
    }

    if (elementDragState) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [elementDragState, isEditorMode])

  // 生成貝茲曲線路徑
  const generateTrackPath = useCallback(() => {
    const { startPoint, endPoint, nodes } = trackConfig

    // 獲取 main-content 的實際尺寸
    const mainContent = document.querySelector('.main-content')
    let points: { x: number; y: number }[]

    if (!mainContent || !mainContentRect) {
      // 如果 main-content 還不存在，使用 windowSize 作為備選
      if (typeof window === 'undefined') return ''
      points = [
        { x: (startPoint.x / 100) * windowSize.width, y: (startPoint.y / 100) * windowSize.height },
        ...nodes.map(n => ({ x: (n.x / 100) * windowSize.width, y: (n.y / 100) * windowSize.height })),
        { x: (endPoint.x / 100) * windowSize.width, y: (endPoint.y / 100) * windowSize.height }
      ]
    } else {
      // 使用 mainContentRect 的尺寸
      points = [
        { x: (startPoint.x / 100) * mainContentRect.width, y: (startPoint.y / 100) * mainContentRect.height },
        ...nodes.map(n => ({ x: (n.x / 100) * mainContentRect.width, y: (n.y / 100) * mainContentRect.height })),
        { x: (endPoint.x / 100) * mainContentRect.width, y: (endPoint.y / 100) * mainContentRect.height }
      ]
    }

    if (points.length < 2) return ''

    // 使用 Catmull-Rom 樣條曲線生成平滑路徑
    const pathD = generateCatmullRomPath(points)

    return pathD
  }, [trackConfig, windowSize, mainContentRect])

  // 氣泡效果
  useEffect(() => {
    if (!lotteryState.is_lottery_active) return

    const airBubbles = document.getElementById('airBubbles')
    if (!airBubbles) return

    const bubbleInterval = setInterval(() => {
      const bubble = document.createElement('div')
      bubble.className = 'bubble'
      bubble.style.left = `${10 + Math.random() * 80}%`
      bubble.style.animationDuration = `${1 + Math.random() * 0.5}s`
      bubble.style.width = `${4 + Math.random() * 6}px`
      bubble.style.height = bubble.style.width
      airBubbles.appendChild(bubble)
      setTimeout(() => bubble.remove(), 1400)
    }, 100)

    return () => clearInterval(bubbleInterval)
  }, [lotteryState.is_lottery_active])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-100 via-purple-100 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <Gift className="w-32 h-32 text-gray-400 mx-auto mb-8 animate-pulse" />
          <h1 className="text-4xl font-bold text-gray-600 mb-4">彩票機</h1>
          <p className="text-xl text-gray-500">載入中...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-100 via-purple-100 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <Gift className="w-32 h-32 text-red-400 mx-auto mb-8" />
          <h1 className="text-4xl font-bold text-gray-600 mb-4">發生錯誤</h1>
          <p className="text-xl text-red-600">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="lottery-machine-live-page" data-lottery-live="true">
      {/* 標題 */}
      <div className="title">🎰 幸運抽獎機 🎰</div>

      {/* 編輯器控制按鈕 */}
      <div className="editor-controls">
        {/* 音效開關 */}
        <div className="sound-toggle-wrapper">
          <SoundToggle isEnabled={isSoundEnabled} onToggle={toggleSound} />
        </div>
        <button
          onClick={() => setIsEditorMode(!isEditorMode)}
          className={`editor-btn ${isEditorMode ? 'active' : ''}`}
        >
          {isEditorMode ? '✓ 完成編輯' : '✏️ 編輯軌道'}
        </button>
        {isEditorMode && (
          <>
            <button onClick={addNode} className="editor-btn">➕ 新增節點</button>
            <button onClick={saveTrackConfig} className="editor-btn save">💾 儲存設定</button>
          </>
        )}
      </div>

      {/* 物理參數控制面板 */}
      {isEditorMode && (
        <div className="physics-controls">
          <div className="physics-controls-header">
            <h3 className="physics-controls-title">⚙️ 物理參數</h3>
            <button
              onClick={() => {
                setPhysics({
                  gravity: 0.35,
                  airForce: 0.8,
                  lateralAirForce: 0.2,
                  maxVelocity: 15
                })
                setTrackConfig(prev => ({
                  ...prev,
                  ballDiameter: 42
                }))
                console.log('🔄 物理參數已重置為預設值')
              }}
              className="physics-reset-btn"
              title="重置為預設值"
            >
              🔄 重置
            </button>
          </div>
          <div className="physics-controls-grid">
            <div className="physics-control-item">
              <label className="physics-control-label">彩球直徑</label>
              <div className="physics-control-input">
                <input
                  type="range"
                  min="25"
                  max="80"
                  value={trackConfig.ballDiameter}
                  onChange={(e) => {
                    const newBallDiameter = parseInt(e.target.value)
                    setTrackConfig(prev => ({
                      ...prev,
                      ballDiameter: newBallDiameter,
                      trackWidth: Math.round(newBallDiameter * 0.9) // 軌道寬度與彩球直徑連動，比彩球稍大一點
                    }))
                  }}
                  className="physics-control-slider"
                />
                <span className="physics-control-value">{trackConfig.ballDiameter}px</span>
              </div>
            </div>
            <div className="physics-control-item">
              <label className="physics-control-label">重力</label>
              <div className="physics-control-input">
                <input
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.05"
                  value={physics.gravity}
                  onChange={(e) => setPhysics(prev => ({ ...prev, gravity: parseFloat(e.target.value) }))}
                  className="physics-control-slider"
                />
                <span className="physics-control-value">{physics.gravity}</span>
              </div>
            </div>
            <div className="physics-control-item">
              <label className="physics-control-label">氣流力</label>
              <div className="physics-control-input">
                <input
                  type="range"
                  min="0.2"
                  max="2.0"
                  step="0.1"
                  value={physics.airForce}
                  onChange={(e) => setPhysics(prev => ({ ...prev, airForce: parseFloat(e.target.value) }))}
                  className="physics-control-slider"
                />
                <span className="physics-control-value">{physics.airForce}</span>
              </div>
            </div>
            <div className="physics-control-item">
              <label className="physics-control-label">側向氣流力</label>
              <div className="physics-control-input">
                <input
                  type="range"
                  min="0"
                  max="1.0"
                  step="0.05"
                  value={physics.lateralAirForce}
                  onChange={(e) => setPhysics(prev => ({ ...prev, lateralAirForce: parseFloat(e.target.value) }))}
                  className="physics-control-slider"
                />
                <span className="physics-control-value">{physics.lateralAirForce}</span>
              </div>
            </div>
            <div className="physics-control-item">
              <label className="physics-control-label">最大速度</label>
              <div className="physics-control-input">
                <input
                  type="range"
                  min="5"
                  max="30"
                  step="1"
                  value={physics.maxVelocity}
                  onChange={(e) => setPhysics(prev => ({ ...prev, maxVelocity: parseInt(e.target.value) }))}
                  className="physics-control-slider"
                />
                <span className="physics-control-value">{physics.maxVelocity}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 軌道容器 - 保持 ref 用於動畫 */}
      <div className="track-container" ref={trackContainerRef}></div>

      {/* 主要內容區域 */}
      <div className="main-content">
        {/* SVG 軌道 - 在 chamber 和 platform 下方，移到 main-content 內 */}
        <div className="track-svg-container">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox={mainContentRect ? `0 0 ${mainContentRect.width} ${mainContentRect.height}` : `0 0 ${windowSize.width} ${windowSize.height}`}
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="trackGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" style={{ stopColor: 'rgba(100, 180, 255, 0.7)' }} />
                <stop offset="50%" style={{ stopColor: 'rgba(150, 120, 200, 0.7)' }} />
                <stop offset="100%" style={{ stopColor: 'rgba(200, 100, 150, 0.7)' }} />
              </linearGradient>
            </defs>
            <path id="trackPath" className="track-path" d={generateTrackPath()} />
          </svg>
        </div>

        {/* 軌道編輯器 - 在最上層，移到 main-content 內 */}
        {isEditorMode && (
          <div
            className="track-editor"
            onMouseMove={handleDragMove}
            onMouseUp={handleDragEnd}
            onMouseLeave={handleDragEnd}
          >
            {/* 起點 */}
            <div
              className={`track-node track-node-start ${draggingNode?.type === 'start' ? 'dragging' : ''}`}
              style={{
                left: `${draggingNode?.type === 'start' && dragPosition ? dragPosition.x : trackConfig.startPoint.x}%`,
                top: `${draggingNode?.type === 'start' && dragPosition ? dragPosition.y : trackConfig.startPoint.y}%`
              }}
              onMouseDown={(e) => handleDragStart(e, 'start')}
            >
              <span className="node-label">起點</span>
            </div>

            {/* 終點 */}
            <div
              className={`track-node track-node-end ${draggingNode?.type === 'end' ? 'dragging' : ''}`}
              style={{
                left: `${draggingNode?.type === 'end' && dragPosition ? dragPosition.x : trackConfig.endPoint.x}%`,
                top: `${draggingNode?.type === 'end' && dragPosition ? dragPosition.y : trackConfig.endPoint.y}%`
              }}
              onMouseDown={(e) => handleDragStart(e, 'end')}
            >
              <span className="node-label">終點</span>
            </div>

            {/* 節點 */}
            {trackConfig.nodes.map((node, index) => (
              <div
                key={node.id}
                className={`track-node ${draggingNode?.type === 'node' && draggingNode.index === index ? 'dragging' : ''}`}
                style={{
                  left: `${draggingNode?.type === 'node' && draggingNode.index === index && dragPosition ? dragPosition.x : node.x}%`,
                  top: `${draggingNode?.type === 'node' && draggingNode.index === index && dragPosition ? dragPosition.y : node.y}%`
                }}
                onMouseDown={(e) => handleDragStart(e, 'node', index)}
              >
                <span className="node-label">{node.id}</span>
                <button
                  className="node-delete"
                  onMouseDown={(e) => {
                    e.stopPropagation()
                  }}
                  onClick={(e) => {
                    e.stopPropagation()
                    removeNode(index)
                  }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
        {/* 中獎者平台 */}
        <div
          className={`winners-platform ${isEditorMode ? 'edit-mode-active' : ''}`}
          style={platformStyle}
        >
          {/* 移動手柄 */}
          {isEditorMode && (
            <div
              className="move-handle"
              onMouseDown={(e) => handleElementDragStart(e, 'platform', 'move')}
            />
          )}
          {/* 調整大小手柄 */}
          {isEditorMode && (
            <>
              <div
                className="resize-handle corner-se"
                onMouseDown={(e) => handleElementDragStart(e, 'platform', 'resize-se')}
              />
              <div
                className="resize-handle corner-sw"
                onMouseDown={(e) => handleElementDragStart(e, 'platform', 'resize-sw')}
              />
              <div
                className="resize-handle corner-ne"
                onMouseDown={(e) => handleElementDragStart(e, 'platform', 'resize-ne')}
              />
              <div
                className="resize-handle corner-nw"
                onMouseDown={(e) => handleElementDragStart(e, 'platform', 'resize-nw')}
              />
              <div
                className="resize-handle edge-e"
                onMouseDown={(e) => handleElementDragStart(e, 'platform', 'resize-e')}
              />
              <div
                className="resize-handle edge-w"
                onMouseDown={(e) => handleElementDragStart(e, 'platform', 'resize-w')}
              />
              <div
                className="resize-handle edge-s"
                onMouseDown={(e) => handleElementDragStart(e, 'platform', 'resize-s')}
              />
              <div
                className="resize-handle edge-n"
                onMouseDown={(e) => handleElementDragStart(e, 'platform', 'resize-n')}
              />
            </>
          )}
          <div className="platform-surface" style={platformSurfaceStyle}>
            <div className="platform-slots" ref={platformSlotsRef}>
              {winners.map((winner) => (
                <div
                  key={winner.order}
                  className="platform-winner"
                  data-winner-id={winner.order}
                  onClick={(e) => handleWinnerPhotoClick(winner.order, e)}
                  onMouseEnter={(e) => handleWinnerPhotoMouseEnter(winner.order, e)}
                  onMouseLeave={() => handleWinnerPhotoMouseLeave(winner.order)}
                >
                  <div className="platform-winner-photo">
                    <img src={winner.photo.avatar_url} alt={winner.photo.display_name} />
                  </div>
                  <div className="platform-winner-rank">#{winner.order}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="platform-base"></div>
        </div>

        {/* 彩票機腔體 */}
        <div
          className={`lottery-machine ${isEditorMode ? 'edit-mode-active' : ''}`}
          ref={chamberRef}
          style={chamberStyle}
        >
          {/* 移動手柄 */}
          {isEditorMode && (
            <div
              className="move-handle"
              onMouseDown={(e) => handleElementDragStart(e, 'chamber', 'move')}
            />
          )}
          {/* 調整大小手柄 */}
          {isEditorMode && (
            <>
              <div
                className="resize-handle corner-se"
                onMouseDown={(e) => handleElementDragStart(e, 'chamber', 'resize-se')}
              />
              <div
                className="resize-handle corner-sw"
                onMouseDown={(e) => handleElementDragStart(e, 'chamber', 'resize-sw')}
              />
              <div
                className="resize-handle corner-ne"
                onMouseDown={(e) => handleElementDragStart(e, 'chamber', 'resize-ne')}
              />
              <div
                className="resize-handle corner-nw"
                onMouseDown={(e) => handleElementDragStart(e, 'chamber', 'resize-nw')}
              />
              <div
                className="resize-handle edge-e"
                onMouseDown={(e) => handleElementDragStart(e, 'chamber', 'resize-e')}
              />
              <div
                className="resize-handle edge-w"
                onMouseDown={(e) => handleElementDragStart(e, 'chamber', 'resize-w')}
              />
              <div
                className="resize-handle edge-s"
                onMouseDown={(e) => handleElementDragStart(e, 'chamber', 'resize-s')}
              />
              <div
                className="resize-handle edge-n"
                onMouseDown={(e) => handleElementDragStart(e, 'chamber', 'resize-n')}
              />
            </>
          )}
          <div className="chamber" style={{ height: `${trackConfig.chamberHeight}px` }} ref={chamberContainerRef}>
            <div className="chamber-glass"></div>

            <div className="photos-container" ref={photosContainerRef}>
              {availableBalls.map(ball => (
                <div
                  key={ball.id}
                  className="photo-item"
                  data-id={ball.id}
                  data-user-id={ball.user_id}
                  data-vx={(Math.random() - 0.5) * 15}
                  data-vy={(Math.random() - 0.5) * 15}
                  data-rotation={Math.random() * 360}
                  data-rotation-speed={(Math.random() - 0.5) * 8}
                  style={{
                    left: `${Math.random() * (trackConfig.chamberWidth - trackConfig.ballDiameter)}px`,
                    top: `${Math.random() * (trackConfig.chamberHeight - trackConfig.ballDiameter)}px`,
                    width: `${trackConfig.ballDiameter}px`,
                    height: `${trackConfig.ballDiameter}px`
                  }}
                >
                  <img src={ball.avatar_url} alt={ball.display_name} />
                </div>
              ))}
            </div>

            {/* 底部氣流口 */}
            <div className="air-vents">
              <div className="vent"></div>
              <div className="vent"></div>
              <div className="vent"></div>
              <div className="vent"></div>
              <div className="vent"></div>
            </div>

            {/* 氣泡效果 */}
            <div className="air-bubbles" id="airBubbles"></div>
          </div>
        </div>
      </div>

      {/* 浮動中獎照片 */}
      {hoveredWinner !== null && floatingPhotoPosition && (
        <div
          className="floating-winner-photo"
          style={{
            left: `${floatingPhotoPosition.x}px`,
            top: `${floatingPhotoPosition.y}px`,
            maxHeight: floatingPhotoPosition.maxHeight ? `${floatingPhotoPosition.maxHeight}px` : undefined
          }}
        >
          {winners.find(w => w.order === hoveredWinner) && (
            <img
              src={winners.find(w => w.order === hoveredWinner)!.photo.image_url}
              alt={winners.find(w => w.order === hoveredWinner)!.photo.display_name}
            />
          )}
        </div>
      )}

      {/* 控制面板 */}
      <div className="control-panel">
        <button
          onClick={drawWinner}
          disabled={lotteryState.is_drawing || availableBalls.length === 0}
          className={`btn btn-draw ${lotteryState.is_drawing ? 'loading' : ''}`}
        >
          <span className="btn-text">
            {lotteryState.is_drawing ? '🎲 抽獎中...' : '🎲 抽出得獎者'}
          </span>
          <span className="btn-glow"></span>
        </button>
        <button
          onClick={() => {
            // 清空 winner platform（當前回合的中獎者）
            setWinners([])
            // 重新從 history 載入已中獎的 user_id 來過濾 chamber 中的彩球
            loadLotteryHistory(false)
            setHiddenWinnerPhotos(new Set())
            setHoveredWinner(null)
            setFloatingPhotoPosition(null)
            // 重新啟動動畫
            setTimeout(() => {
              if (chamberRef.current && photosContainerRef.current) {
                startBounceAnimation()
              }
            }, 100)
          }}
          className="btn btn-reset"
        >
          <span className="btn-text">🔄 重置</span>
        </button>
      </div>

      {/* 彩紙效果容器 */}
      <div className="confetti-container"></div>

      {/* 提示訊息覆蓋層 */}
      {toastMessage && (
        <div className="toast-overlay">
          <div className={`toast-message ${toastMessage.type}`}>
            {toastMessage.type === 'error' && '⚠️ '}
            {toastMessage.message}
          </div>
        </div>
      )}

      <style jsx>{`
        .lottery-machine-live-page {
          width: 100vw;
          height: 100vh;
          background: linear-gradient(135deg, #0a0a1a 0%, #16213e 100%);
          background-image:
            radial-gradient(ellipse at top, rgba(102, 126, 234, 0.15) 0%, transparent 50%),
            radial-gradient(ellipse at bottom, rgba(245, 87, 108, 0.1) 0%, transparent 50%);
          color: white;
          font-family: 'Outfit', sans-serif;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          padding: 12px 20px;
        }

        .title {
          font-size: clamp(1.1rem, 2.2vw, 1.8rem);
          font-weight: 700;
          background: linear-gradient(135deg, #f5af19 0%, #f12711 100%);
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          text-fill-color: transparent;
          text-align: center;
          animation: titlePulse 2s ease-in-out infinite;
          flex-shrink: 0;
          margin-bottom: 8px;
        }

        @keyframes titlePulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.02); }
        }

        .main-content {
          flex: 1;
          position: relative;
          min-height: 0;
        }

        .winners-platform {
          position: absolute;
          top: 0.5vh;
          left: 5%;
          width: clamp(180px, 15vw, 280px);
          z-index: 20;
        }

        .platform-surface {
          background: linear-gradient(180deg, #3a4a6e 0%, #2a3a5e 100%);
          border-radius: clamp(10px, 1vw, 14px) 0 0;
          padding: clamp(6px, 0.6vw, 10px);
          min-height: clamp(30px, 3vh, 50px);
          height: clamp(60px, 6vh, 100px);
          border: clamp(2px, 0.2vw, 3px) solid rgba(255,255,255,0.2);
          border-bottom: none;
          box-shadow: 0 -8px 30px rgba(102,126,234,0.3), inset 0 2px 10px rgba(255,255,255,0.1);
          transition: height 0.1s ease;
        }

        .platform-slots {
          display: flex;
          gap: clamp(6px, 0.6vw, 10px);
          justify-content: flex-start;
          align-items: center;
          flex-wrap: nowrap;
          min-height: clamp(40px, 4vh, 65px);
          overflow-x: auto;
          /* 隱藏 scrollbar */
          scrollbar-width: none; /* Firefox */
          -ms-overflow-style: none; /* IE and Edge */
        }

        .platform-slots::-webkit-scrollbar {
          display: none; /* Chrome, Safari, Opera */
        }

        .platform-base {
          height: clamp(4px, 0.4vw, 8px);
          background: linear-gradient(180deg, #4a5a7e 0%, #2a3a5e 100%);
          border-radius: 0 0 clamp(6px, 0.6vw, 10px) clamp(6px, 0.6vw, 10px);
        }

        .platform-winner {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
          animation: winnerLand 0.5s ease-out;
        }

        @keyframes winnerLand {
          0% { transform: translateX(40px) scale(0.5); opacity: 0; }
          60% { transform: translateX(-3px) scale(1.1); }
          100% { transform: translateX(0) scale(1); opacity: 1; }
        }

        .platform-winner-photo {
          width: clamp(24px, 2.5vw, 40px);
          height: clamp(24px, 2.5vw, 40px);
          border-radius: 50%;
          overflow: hidden;
          border: clamp(2px, 0.2vw, 3px) solid #ffd700;
          box-shadow: 0 0 clamp(8px, 0.8vw, 12px) rgba(255,215,0,0.4);
          transition: width 0.2s ease, height 0.2s ease;
        }

        .platform-winner-photo img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .floating-winner-photo {
          position: fixed;
          width: clamp(280px, 30vw, 450px);
          max-height: clamp(350px, 40vh, 500px);
          border-radius: clamp(12px, 1.2vw, 16px);
          overflow: hidden;
          background: rgba(0, 0, 0, 0.9);
          border: clamp(3px, 0.3vw, 4px) solid rgba(255, 215, 0, 0.6);
          box-shadow: 0 clamp(8px, 0.8vw, 16px) clamp(24px, 2.4vw, 40px) rgba(0, 0, 0, 0.6);
          z-index: 1000;
          transform: translateX(-50%);
          animation: fadeIn 0.2s ease-out;
          pointer-events: none;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .floating-winner-photo img {
          width: 100%;
          height: auto;
          max-height: 100%;
          object-fit: contain;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }

        .platform-winner-rank {
          font-size: clamp(0.4rem, 0.5vw, 0.6rem);
          color: #ffd700;
          background: rgba(255,215,0,0.15);
          padding: clamp(1px, 0.1vw, 2px) clamp(3px, 0.3vw, 5px);
          border-radius: clamp(4px, 0.4vw, 6px);
          font-weight: 600;
        }

        .track-container {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          z-index: 1;
          pointer-events: none;
        }

        .track-svg-container {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          z-index: 1;
          overflow: visible;
        }

        .track-editor {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          z-index: 100;
        }

        .track-svg-container svg {
          width: 100%;
          height: 100%;
          display: block;
          overflow: visible;
        }

        .track-path {
          fill: none;
          stroke: url(#trackGradient);
          stroke-width: ${trackConfig.trackWidth}px;
          stroke-linecap: round;
          stroke-linejoin: round;
          filter: drop-shadow(0 2px 8px rgba(100,150,255,0.4));
        }

        .editor-controls {
          position: fixed;
          top: 16px;
          right: 16px;
          display: flex;
          gap: 8px;
          z-index: 1000;
          align-items: center;
        }

        .sound-toggle-wrapper {
          display: flex;
          align-items: center;
        }

        .editor-btn {
          padding: 8px 16px;
          background: rgba(255, 255, 255, 0.1);
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-radius: 8px;
          color: white;
          font-size: 0.85rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .editor-btn:hover {
          background: rgba(255, 255, 255, 0.2);
          transform: translateY(-2px);
        }

        .editor-btn.active {
          background: linear-gradient(135deg, #f5af19 0%, #f12711 100%);
          border-color: #f5af19;
        }

        .editor-btn.save {
          background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
          border-color: #4CAF50;
        }

        .physics-controls {
          position: fixed;
          top: 70px;
          right: 16px;
          width: 280px;
          background: rgba(0, 0, 0, 0.8);
          backdrop-filter: blur(10px);
          border: 2px solid rgba(255, 215, 0, 0.5);
          border-radius: 12px;
          padding: 16px;
          z-index: 999;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
        }

        .physics-controls-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
        }

        .physics-controls-title {
          font-size: 1rem;
          font-weight: 700;
          color: #ffd700;
        }

        .physics-reset-btn {
          padding: 6px 12px;
          background: rgba(255, 215, 0, 0.2);
          border: 1px solid rgba(255, 215, 0, 0.5);
          border-radius: 6px;
          color: #ffd700;
          font-size: 0.75rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .physics-reset-btn:hover {
          background: rgba(255, 215, 0, 0.3);
          transform: scale(1.05);
        }

        .physics-controls-grid {
          display: grid;
          gap: 12px;
        }

        .physics-control-item {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .physics-control-label {
          font-size: 0.8rem;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.9);
        }

        .physics-control-input {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .physics-control-slider {
          flex: 1;
          -webkit-appearance: none;
          appearance: none;
          height: 6px;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 3px;
          outline: none;
          cursor: pointer;
        }

        .physics-control-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 16px;
          height: 16px;
          background: linear-gradient(135deg, #ffd700 0%, #ffaa00 100%);
          border-radius: 50%;
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(255, 215, 0, 0.5);
          transition: transform 0.2s ease;
        }

        .physics-control-slider::-webkit-slider-thumb:hover {
          transform: scale(1.2);
        }

        .physics-control-slider::-moz-range-thumb {
          width: 16px;
          height: 16px;
          background: linear-gradient(135deg, #ffd700 0%, #ffaa00 100%);
          border-radius: 50%;
          cursor: pointer;
          border: none;
          box-shadow: 0 2px 8px rgba(255, 215, 0, 0.5);
          transition: transform 0.2s ease;
        }

        .physics-control-slider::-moz-range-thumb:hover {
          transform: scale(1.2);
        }

        .physics-control-value {
          min-width: 50px;
          text-align: right;
          font-size: 0.75rem;
          font-weight: 600;
          color: #ffd700;
          background: rgba(255, 215, 0, 0.1);
          padding: 4px 8px;
          border-radius: 4px;
        }

        .track-node {
          position: absolute;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: move;
          transform: translate(-50%, -50%);
          transition: transform 0.1s ease, box-shadow 0.1s ease;
          z-index: 10000;
          pointer-events: auto;
        }

        .track-node:hover {
          transform: translate(-50%, -50%) scale(1.1);
        }

        .track-node.dragging {
          transform: translate(-50%, -50%) scale(1.2);
          box-shadow: 0 0 20px rgba(255, 215, 0, 0.8);
        }

        .track-node-start {
          background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
          border: 3px solid #81C784;
          box-shadow: 0 4px 15px rgba(76, 175, 80, 0.4);
        }

        .track-node-end {
          background: linear-gradient(135deg, #f44336 0%, #d32f2f 100%);
          border: 3px solid #E57373;
          box-shadow: 0 4px 15px rgba(244, 67, 54, 0.4);
        }

        .track-node:not(.track-node-start):not(.track-node-end) {
          background: linear-gradient(135deg, #2196F3 0%, #1976D2 100%);
          border: 3px solid #64B5F6;
          box-shadow: 0 4px 15px rgba(33, 150, 243, 0.4);
        }

        .node-label {
          color: white;
          font-size: 0.7rem;
          font-weight: 700;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
          pointer-events: none;
        }

        .node-delete {
          position: absolute;
          top: -8px;
          right: -8px;
          width: 20px;
          height: 20px;
          background: #f44336;
          border: 2px solid white;
          border-radius: 50%;
          color: white;
          font-size: 0.7rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          transition: opacity 0.2s ease;
        }

        .track-node:hover .node-delete {
          opacity: 1;
        }

        .node-delete:hover {
          background: #d32f2f;
          transform: scale(1.1);
        }

        .lottery-machine {
          position: absolute;
          bottom: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 55%;
          max-width: clamp(320px, 35vw, 520px);
          z-index: 10;
          display: flex;
          flex-direction: column;
          align-items: center;
          overflow: visible;
        }

        .chamber {
          position: relative;
          width: 100%;
          height: clamp(160px, 18vh, 280px);
          background: linear-gradient(180deg, #1a1a2e 0%, #16213e 100%);
          border-radius: clamp(14px, 1.4vw, 24px) clamp(14px, 1.4vw, 24px) clamp(8px, 0.8vw, 14px) clamp(8px, 0.8vw, 14px);
          overflow: hidden;
          box-shadow: 0 0 clamp(35px, 3.5vw, 60px) rgba(102,126,234,0.35), inset 0 0 clamp(55px, 5.5vw, 90px) rgba(0,0,0,0.5);
          border: clamp(2px, 0.2vw, 3px) solid rgba(255,255,255,0.2);
        }

        .chamber-glass {
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, rgba(255,255,255,0.1) 0%, transparent 50%, rgba(255,255,255,0.05) 100%);
          pointer-events: none;
          z-index: 10;
        }

        .photos-container {
          position: absolute;
          top: clamp(6px, 0.6vw, 10px);
          left: clamp(6px, 0.6vw, 10px);
          right: clamp(6px, 0.6vw, 10px);
          bottom: clamp(18px, 2vh, 30px);
          overflow: hidden;
        }

        .photo-item {
          position: absolute;
          width: clamp(30px, 3.5vw, 55px);
          height: clamp(30px, 3.5vw, 55px);
          border-radius: 50%;
          overflow: hidden;
          box-shadow: 0 clamp(1px, 0.1vw, 3px) clamp(6px, 0.6vw, 10px) rgba(0,0,0,0.4);
          border: clamp(1px, 0.1vw, 2px) solid rgba(255,255,255,0.3);
          cursor: pointer;
          will-change: transform, left, top;
          z-index: 1;
        }

        .photo-item img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .photo-item.selected {
          z-index: 100;
          border-color: #ffd700;
          box-shadow: 0 0 clamp(14px, 1.5vw, 25px) rgba(255,215,0,0.8);
          animation: selectedPulse 0.4s ease-in-out infinite;
        }

        @keyframes selectedPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }

        .air-vents {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: clamp(14px, 1.5vh, 24px);
          display: flex;
          justify-content: space-evenly;
          align-items: center;
          background: linear-gradient(180deg, #1a1a2e 0%, #0a0a15 100%);
          border-top: clamp(1px, 0.1vw, 2px) solid rgba(255,255,255,0.1);
          border-radius: 0 0 clamp(6px, 0.6vw, 10px) clamp(6px, 0.6vw, 10px);
        }

        .vent {
          width: clamp(18px, 2vw, 32px);
          height: clamp(6px, 0.6vw, 10px);
          background: linear-gradient(180deg, #2a3a5e 0%, #1a2540 100%);
          border-radius: clamp(2px, 0.2vw, 4px);
          position: relative;
        }

        .vent::after {
          content: '';
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: clamp(8px, 0.8vw, 14px);
          height: clamp(1px, 0.1vw, 2px);
          background: rgba(100,200,255,0.4);
          border-radius: clamp(1px, 0.1vw, 2px);
          animation: ventGlow 1s ease-in-out infinite alternate;
        }

        @keyframes ventGlow {
          0% { opacity: 0.3; }
          100% { opacity: 0.9; }
        }

        .air-bubbles {
          position: absolute;
          bottom: clamp(14px, 1.5vh, 24px);
          left: 0;
          right: 0;
          height: calc(100% - clamp(20px, 2vh, 35px));
          pointer-events: none;
          overflow: hidden;
        }



        .control-panel {
          display: flex;
          gap: 12px;
          justify-content: center;
          flex-shrink: 0;
          padding: 5px 0;
        }

        .btn {
          position: relative;
          padding: 8px 22px;
          font-size: 0.85rem;
          font-weight: 600;
          font-family: 'Outfit', sans-serif;
          border: none;
          border-radius: 50px;
          cursor: pointer;
          overflow: hidden;
          transition: all 0.3s ease;
        }

        .btn-draw {
          background: linear-gradient(135deg, #f5af19 0%, #f12711 100%);
          color: #1a1a2e;
          box-shadow: 0 6px 25px rgba(245,175,25,0.4);
        }

        .btn-draw:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 10px 35px rgba(245,175,25,0.6);
        }

        .btn-draw:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .btn-draw.loading {
          opacity: 0.8;
          cursor: wait;
        }

        .btn-draw.loading .btn-text {
          animation: pulseText 1.5s ease-in-out infinite;
        }

        @keyframes pulseText {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }

        .btn-glow {
          position: absolute;
          inset: -50%;
          background: linear-gradient(45deg, transparent 40%, rgba(255,255,255,0.3) 50%, transparent 60%);
          animation: btnGlow 3s linear infinite;
        }

        @keyframes btnGlow {
          0% { transform: translateX(-100%) rotate(45deg); }
          100% { transform: translateX(100%) rotate(45deg); }
        }

        .btn-reset {
          background: rgba(255,255,255,0.1);
          color: white;
          border: 2px solid rgba(255,255,255,0.2);
        }

        .btn-reset:hover {
          background: rgba(255,255,255,0.2);
        }

        .btn-text {
          position: relative;
          z-index: 1;
        }

        /* Edit Mode Styles */
        .edit-mode-active {
          outline: 2px dashed rgba(255, 215, 0, 0.5);
          outline-offset: 5px;
        }

        /* Resize Handles */
        .resize-handle {
          position: absolute;
          background: linear-gradient(135deg, #ffd700 0%, #ffaa00 100%);
          border: clamp(1px, 0.1vw, 2px) solid white;
          border-radius: clamp(3px, 0.3vw, 5px);
          z-index: 10000;
          opacity: 0;
          transition: opacity 0.2s ease, transform 0.1s ease;
        }

        .edit-mode-active .resize-handle {
          opacity: 1;
        }

        .resize-handle:hover {
          transform: scale(1.2);
          box-shadow: 0 0 clamp(7px, 0.7vw, 12px) rgba(255, 215, 0, 0.8);
        }

        /* Corner resize handles */
        .resize-handle.corner-se {
          width: clamp(14px, 1.5vw, 22px);
          height: clamp(14px, 1.5vw, 22px);
          right: calc(-1 * clamp(7px, 0.75vw, 11px));
          bottom: calc(-1 * clamp(7px, 0.75vw, 11px));
          cursor: nwse-resize;
          border-radius: 50%;
        }

        .resize-handle.corner-ne {
          width: clamp(14px, 1.5vw, 22px);
          height: clamp(14px, 1.5vw, 22px);
          right: calc(-1 * clamp(7px, 0.75vw, 11px));
          top: calc(-1 * clamp(7px, 0.75vw, 11px));
          cursor: nesw-resize;
          border-radius: 50%;
        }

        .resize-handle.corner-sw {
          width: clamp(14px, 1.5vw, 22px);
          height: clamp(14px, 1.5vw, 22px);
          left: calc(-1 * clamp(7px, 0.75vw, 11px));
          bottom: calc(-1 * clamp(7px, 0.75vw, 11px));
          cursor: nesw-resize;
          border-radius: 50%;
        }

        .resize-handle.corner-nw {
          width: clamp(14px, 1.5vw, 22px);
          height: clamp(14px, 1.5vw, 22px);
          left: calc(-1 * clamp(7px, 0.75vw, 11px));
          top: calc(-1 * clamp(7px, 0.75vw, 11px));
          cursor: nwse-resize;
          border-radius: 50%;
        }

        /* Edge resize handles */
        .resize-handle.edge-e {
          width: clamp(9px, 1vw, 16px);
          height: clamp(45px, 5vw, 75px);
          right: calc(-1 * clamp(4px, 0.4vw, 8px));
          top: calc(50% - clamp(22px, 2.5vw, 37px));
          cursor: ew-resize;
        }

        .resize-handle.edge-w {
          width: clamp(9px, 1vw, 16px);
          height: clamp(45px, 5vw, 75px);
          left: calc(-1 * clamp(4px, 0.4vw, 8px));
          top: calc(50% - clamp(22px, 2.5vw, 37px));
          cursor: ew-resize;
        }

        .resize-handle.edge-s {
          width: clamp(45px, 5vw, 75px);
          height: clamp(9px, 1vw, 16px);
          bottom: calc(-1 * clamp(4px, 0.4vw, 8px));
          left: calc(50% - clamp(22px, 2.5vw, 37px));
          cursor: ns-resize;
        }

        .resize-handle.edge-n {
          width: clamp(45px, 5vw, 75px);
          height: clamp(9px, 1vw, 16px);
          top: calc(-1 * clamp(4px, 0.4vw, 8px));
          left: calc(50% - clamp(22px, 2.5vw, 37px));
          cursor: ns-resize;
        }

        /* Move handle (center grip) */
        .move-handle {
          position: absolute;
          width: clamp(30px, 3vw, 50px);
          height: clamp(15px, 1.5vw, 25px);
          top: clamp(-18px, -2vh, -30px);
          left: 50%;
          transform: translateX(-50%);
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border: clamp(1px, 0.1vw, 2px) solid white;
          border-radius: clamp(7px, 0.7vw, 12px);
          cursor: move;
          z-index: 10000;
          opacity: 0;
          transition: opacity 0.2s ease, transform 0.1s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          pointer-events: none;
        }

        .move-handle::before {
          content: '⋮⋮';
          font-size: clamp(7px, 0.8vw, 12px);
          color: white;
          letter-spacing: clamp(1px, 0.1vw, 3px);
        }

        .edit-mode-active .move-handle {
          opacity: 1;
          pointer-events: auto;
        }

        .move-handle:hover {
          transform: translateX(-50%) scale(1.1);
          box-shadow: 0 0 clamp(10px, 1vw, 18px) rgba(102, 126, 234, 0.8);
        }

        /* 提示訊息覆蓋層 */
        .toast-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          pointer-events: none;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2000;
        }

        .toast-message {
          background: rgba(0, 0, 0, 0.85);
          backdrop-filter: blur(10px);
          color: white;
          padding: clamp(16px, 2vw, 24px) clamp(24px, 3vw, 36px);
          border-radius: clamp(12px, 1.2vw, 16px);
          font-size: clamp(1rem, 1.2vw, 1.3rem);
          font-weight: 600;
          box-shadow: 0 clamp(8px, 1vw, 16px) clamp(32px, 3vw, 48px) rgba(0, 0, 0, 0.6);
          animation: toastSlideIn 0.3s ease-out, toastFadeOut 0.3s ease-in 2.7s forwards;
          max-width: clamp(300px, 40vw, 600px);
          text-align: center;
        }

        .toast-message.error {
          border: clamp(2px, 0.2vw, 3px) solid rgba(244, 67, 54, 0.6);
          box-shadow: 0 clamp(8px, 1vw, 16px) clamp(32px, 3vw, 48px) rgba(244, 67, 54, 0.4);
        }

        .toast-message.success {
          border: clamp(2px, 0.2vw, 3px) solid rgba(76, 175, 80, 0.6);
          box-shadow: 0 clamp(8px, 1vw, 16px) clamp(32px, 3vw, 48px) rgba(76, 175, 80, 0.4);
        }

        @keyframes toastSlideIn {
          from {
            opacity: 0;
            transform: translateY(-20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes toastFadeOut {
          from {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
          to {
            opacity: 0;
            transform: translateY(-20px) scale(0.95);
          }
        }
      `}</style>

      <style jsx global>{`
        .confetti-container {
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 1000;
          overflow: hidden;
        }

        .confetti {
          position: absolute;
          border-radius: 2px;
          animation: confettiFall linear forwards;
        }

        @keyframes confettiFall {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }

        .winner-animation-ball {
          position: absolute;
          width: clamp(45px, 5vw, 75px);
          height: clamp(45px, 5vw, 75px);
          border-radius: 50%;
          overflow: hidden;
          box-shadow: 0 4px 20px rgba(0,0,0,0.5);
          border: 3px solid #ffd700;
          z-index: 1000;
          will-change: transform, left, top;
        }

        .winner-animation-ball img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .photo-traveling {
          position: fixed;
          width: clamp(28px, 3vw, 48px);
          height: clamp(28px, 3vw, 48px);
          border-radius: 50%;
          overflow: hidden;
          border: clamp(2px, 0.2vw, 3px) solid #ffd700;
          box-shadow: 0 0 clamp(14px, 1.5vw, 25px) rgba(255, 215, 0, 0.6);
          z-index: 1000;
          pointer-events: none;
        }

        .photo-traveling img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .bubble {
          position: absolute;
          bottom: clamp(-7px, -0.7vh, -12px);
          width: clamp(6px, 0.6vw, 10px);
          height: clamp(6px, 0.6vw, 10px);
          background: radial-gradient(circle at 30% 30%, rgba(100,200,255,0.5), rgba(100,200,255,0.1));
          border-radius: 50%;
          animation: bubbleRise 1.3s ease-out infinite;
        }

        @keyframes bubbleRise {
          0% { transform: translateY(0) scale(1); opacity: 0.7; }
          100% {transform: translateY(clamp(-70px, -7vh, -120px)) scale(0.3); opacity: 0; }
        }

        .platform-winner {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
          animation: winnerLand 0.5s ease-out;
        }

        @keyframes winnerLand {
          0% { transform: translateX(40px) scale(0.5); opacity: 0; }
          60% {transform: translateX(-3px) scale(1.1); }
          100% {transform: translateX(0) scale(1); opacity: 1; }
        }

        .platform-winner-photo {
          border-radius: 50%;
          overflow: hidden;
          border: clamp(2px, 0.2vw, 3px) solid #ffd700;
          box-shadow: 0 0 clamp(8px, 0.8vw, 12px) rgba(255,215,0,0.4);
          transition: width 0.2s ease, height 0.2s ease;
        }

        .platform-winner-photo img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .platform-winner-rank {
          font-size: clamp(0.4rem, 0.5vw, 0.6rem);
          color: #ffd700;
          background: rgba(255,215,0,0.15);
          padding: clamp(1px, 0.1vw, 2px) clamp(3px, 0.3vw, 5px);
          border-radius: clamp(4px, 0.4vw, 6px);
          font-weight: 600;
        }
      `}</style>
    </div>
  )
}
