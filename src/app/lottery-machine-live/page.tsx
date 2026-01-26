'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { Gift } from 'lucide-react'

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
}

export default function LotteryMachineLivePage() {
  const [photos, setPhotos] = useState<Photo[]>([])
  const [avatarBalls, setAvatarBalls] = useState<Photo[]>([])
  const [winners, setWinners] = useState<Winner[]>([])
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
  const [isEditorMode, setIsEditorMode] = useState(false)
  const [draggingNode, setDraggingNode] = useState<{ type: 'start' | 'end' | 'node', index?: number } | null>(null)
  const [windowSize, setWindowSize] = useState({ width: typeof window !== 'undefined' ? window.innerWidth : 1920, height: typeof window !== 'undefined' ? window.innerHeight : 1080 })
  const [dragPosition, setDragPosition] = useState<{ x: number; y: number } | null>(null)

  const chamberRef = useRef<HTMLDivElement>(null)
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
      chamberWidth: chamberWidth,
      trackWidth: trackWidth
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

  // 載入照片
  useEffect(() => {
    fetchPhotos()
    loadTrackConfig()
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
  }, [avatarBalls])

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
            nodes: savedConfig.nodes
          }))
          console.log('✅ 已載入儲存的軌道設定')
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
    if (!container) return

    const photoElements = container.querySelectorAll('.photo-item')
    const chamberRect = chamberRef.current?.getBoundingClientRect()
    if (!chamberRect || photoElements.length === 0) return

    // 初始化照片位置到腔體內
    const photoSize = trackConfig.ballDiameter // 使用動態彩球直徑
    photoElements.forEach((photoEl: Element) => {
      const el = photoEl as HTMLElement
      const currentLeft = parseFloat(el.style.left || '0')
      const currentTop = parseFloat(el.style.top || '0')

      // 確保照片在腔體範圍內
      let x = Math.min(Math.max(0, currentLeft), chamberRect.width - photoSize)
      let y = Math.min(Math.max(0, currentTop), chamberRect.height - photoSize)

      // 如果照片在腔體外，重新定位到中心
      if (x < 0 || x > chamberRect.width - photoSize || y < 0 || y > chamberRect.height - photoSize) {
        x = (chamberRect.width - photoSize) / 2 + (Math.random() - 0.5) * 50
        y = (chamberRect.height - photoSize) / 2 + (Math.random() - 0.5) * 50
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
        let newVy = vy + 0.35

        // 氣流力
        const bottomFactor = y / chamberRect.height
        newVy -= 0.8 * (0.5 + bottomFactor * 1.5)

        // 側向氣流力
        const horizontalFactor = x / chamberRect.width
        const newVx = vx + (Math.random() - 0.5) * 0.4 + (Math.random() - 0.5) * 0.2

        // 摩擦力
        const friction = 0.995
        const finalVx = newVx * friction
        const finalVy = newVy * friction

        // 速度限制
        const maxVelocity = 15
        let clampedVx = finalVx
        let clampedVy = finalVy

        if (Math.abs(clampedVx) > maxVelocity) {
          clampedVx = Math.sign(clampedVx) * maxVelocity
        }
        if (Math.abs(clampedVy) > maxVelocity) {
          clampedVy = Math.sign(clampedVy) * maxVelocity
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

        // 邊界碰撞
        const containerWidth = chamberRect.width
        const containerHeight = chamberRect.height

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
          clampedVy -= 0.8 * 3
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
    if (lotteryState.is_drawing || avatarBalls.length === 0) return

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
        setLotteryState(prev => ({ ...prev, is_drawing: true }))

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

        // 將中獎者添加到得獎者列表
        setWinners(prev => [...prev, { photo: winnerPhoto, order: prev.length + 1 }])
        setLotteryState(prev => ({ ...prev, is_drawing: false }))
      } else {
        setError(data.error || '抽獎失敗')
      }
    } catch (err) {
      console.error('抽獎失敗:', err)
      setError('抽獎失敗')
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
      console.log('📸 找到照片元素數量:', photoElements.length)

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

      console.log('🎯 開始抽獎動畫，中獎者 ID:', winner.id)

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
      console.log('📍 路徑點數量:', waypoints.length)
      console.log('📍 前5個路徑點:', waypoints.slice(0, 5))
      console.log('📍 最後5個路徑點:', waypoints.slice(-5))

      // 沿著路徑動畫
      let rotation = 0
      const animatePath = async () => {
        console.log('🚀 開始沿著路徑動畫，總共', waypoints.length - 1, '個線段')

        for (let i = 0; i < waypoints.length - 1; i++) {
          const from = waypoints[i]
          const to = waypoints[i + 1]
          const distance = Math.sqrt(Math.pow(to.x - from.x, 2) + Math.pow(to.y - from.y, 2))
          const duration = distance * 1.2 // 1.2ms per pixel (參考 lottery/ 的實現)

          console.log(`📍 線段 ${i + 1}/${waypoints.length - 1}:`, {
            from: { x: Math.round(from.x), y: Math.round(from.y) },
            to: { x: Math.round(to.x), y: Math.round(to.y) },
            distance: Math.round(distance),
            duration: Math.round(duration)
          })

          await animateSegment(travelingPhoto, from.x, from.y, to.x, to.y, duration, rotation)
          rotation += distance * 0.5 // 降低自旋轉速度（參考 lottery/ 的實現）
        }
      }

      // 動畫完成後的處理
      const onAnimationComplete = () => {
        console.log('🎉 動畫完成')

        // 播放彩紙效果
        triggerConfetti()

        // 將中獎者添加到平台
        const platformSlots = platformSlotsRef.current
        if (platformSlots) {
          const platformSurface = platformSlots.parentElement?.querySelector('.platform-surface') as HTMLElement
          const platformHeight = platformSurface?.clientHeight || 60
          const ballSize = Math.max(20, Math.round(platformHeight * 0.9))

          const winnerEl = document.createElement('div')
          winnerEl.className = 'platform-winner'
          winnerEl.innerHTML = `
            <div class="platform-winner-photo" style="width: ${ballSize}px; height: ${ballSize}px;">
              <img src="${winner.avatar_url}" alt="${winner.display_name}">
            </div>
            <div class="platform-winner-rank">#${winners.length + 1}</div>
          `
          platformSlots.appendChild(winnerEl)
          console.log('✅ 中獎者已添加到平台')
        } else {
          console.error('❌ platformSlots 不存在')
        }

        // 移除動畫元素
        setTimeout(() => {
          travelingPhoto.remove()
          console.log('✅ 動畫完成，動畫元素已移除')
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

    console.log('📍 路徑點生成：', {
      mainRect: { left: mainRect.left, top: mainRect.top, width: mainRect.width, height: mainRect.height },
      photoRect: { left: photoRect.left, top: photoRect.top, width: photoRect.width, height: photoRect.height },
      initialPos: { x: photoRect.left, y: photoRect.top },
      firstWaypoint: waypoints[1],
      lastWaypoint: waypoints[waypoints.length - 1]
    })

    return waypoints
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

      console.log('🎬 開始動畫線段:', {
        from: { x: Math.round(fromX), y: Math.round(fromY) },
        to: { x: Math.round(toX), y: Math.round(toY) },
        duration: Math.round(duration),
        startRotation: Math.round(startRotation)
      })

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

  const addToPlatform = (winner: Winner) => {
    const platformSlots = platformSlotsRef.current
    if (!platformSlots) return

    const winnerEl = document.createElement('div')
    winnerEl.className = 'platform-winner'
    winnerEl.innerHTML = `
      <div class="platform-winner-photo">
        <img src="${winner.photo.avatar_url}" alt="${winner.photo.display_name}">
      </div>
      <div class="platform-winner-rank">#${winner.order}</div>
    `
    platformSlots.appendChild(winnerEl)
  }

  // 拖曳處理
  const handleDragStart = (e: React.MouseEvent, type: 'start' | 'end' | 'node', index?: number) => {
    e.preventDefault()
    e.stopPropagation()
    setDraggingNode({ type, index })

    // 初始化拖曳位置
    const x = (e.clientX / windowSize.width) * 100
    const y = (e.clientY / windowSize.height) * 100
    setDragPosition({ x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) })
  }

  const handleDragMove = (e: React.MouseEvent) => {
    if (!draggingNode) return

    // 使用 requestAnimationFrame 優化拖曳更新
    if (dragAnimationFrameRef.current) {
      cancelAnimationFrame(dragAnimationFrameRef.current)
    }

    dragAnimationFrameRef.current = requestAnimationFrame(() => {
      const x = (e.clientX / windowSize.width) * 100
      const y = (e.clientY / windowSize.height) * 100

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
      const response = await fetch('/api/lottery-machine/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trackConfig })
      })
      const data = await response.json()
      console.log('📥 儲存回應:', data)
      if (data.success) {
        alert('✅ 軌道設定已儲存')
      } else {
        alert('❌ 儲存失敗: ' + data.error)
      }
    } catch (err) {
      console.error('❌ 儲存錯誤:', err)
      alert('❌ 儲存失敗')
    }
  }

  // 生成貝茲曲線路徑
  const generateTrackPath = useCallback(() => {
    const { startPoint, endPoint, nodes } = trackConfig
    const containerWidth = windowSize.width
    const containerHeight = windowSize.height

    // 使用 ref 獲取 track-container 的實際尺寸和位置
    let trackRect = { left: 0, top: 0, width: containerWidth, height: containerHeight }
    if (trackContainerRef.current) {
      const rect = trackContainerRef.current.getBoundingClientRect()
      trackRect = { left: rect.left, top: rect.top, width: rect.width, height: rect.height }
    }

    // 獲取 SVG 容器的實際尺寸和位置
    const svgContainer = document.querySelector('.track-svg-container')
    let svgRect = { left: 0, top: 0, width: containerWidth, height: containerHeight }
    if (svgContainer) {
      const rect = svgContainer.getBoundingClientRect()
      svgRect = { left: rect.left, top: rect.top, width: rect.width, height: rect.height }
    }

    // 計算坐標偏移（SVG 容器相對於 track-container 的偏移）
    const offsetX = svgRect.left - trackRect.left
    const offsetY = svgRect.top - trackRect.top

    // 節點有 transform: translate(-50%, -50%)，所以路徑需要對齊節點中心
    // 節點是相對於 track-container 定位的，所以需要將坐標轉換到 SVG 容器的坐標系
    const halfSize = trackConfig.ballDiameter / 2 // 使用動態半徑
    const start = {
      x: (startPoint.x / 100) * trackRect.width - offsetX - halfSize,
      y: (startPoint.y / 100) * trackRect.height - offsetY - halfSize
    }
    const end = {
      x: (endPoint.x / 100) * trackRect.width - offsetX - halfSize,
      y: (endPoint.y / 100) * trackRect.height - offsetY - halfSize
    }

    const controlPoints = nodes.map(n => ({
      x: (n.x / 100) * trackRect.width - offsetX - halfSize,
      y: (n.y / 100) * trackRect.height - offsetY - halfSize
    }))

    // 調試日誌
    console.log('📍 軌道路徑生成調試：', {
      containerSize: { width: containerWidth, height: containerHeight },
      svgRect: { left: svgRect.left, top: svgRect.top, width: svgRect.width, height: svgRect.height },
      trackRect: { left: trackRect.left, top: trackRect.top, width: trackRect.width, height: trackRect.height },
      offset: { x: offsetX, y: offsetY },
      startPoint: { pct: startPoint, pixel: start },
      endPoint: { pct: endPoint, pixel: end },
      controlPoints: nodes.map((n, i) => ({ pct: n, pixel: controlPoints[i] }))
    })

    if (controlPoints.length === 0) {
      return `M ${start.x},${start.y} L ${end.x},${end.y}`
    }

    // 使用 Catmull-Rom 樣條曲線生成平滑路徑
    // 這種曲線確保路徑穿過所有控制點，並且在節點之間平滑連接
    const points = [start, ...controlPoints, end]

    if (points.length < 2) {
      return `M ${start.x},${start.y} L ${end.x},${end.y}`
    }

    // Catmull-Rom 樣條曲線轉換為貝茲曲線
    const catmullRom2Bezier = (p0: { x: number; y: number }, p1: { x: number; y: number }, p2: { x: number; y: number }, p3: { x: number; y: number }) => {
      const t = 0.5 // tension parameter, lower = smoother

      const cp1x = p1.x + (p2.x - p0.x) / 6 * t
      const cp1y = p1.y + (p2.y - p0.y) / 6 * t

      const cp2x = p2.x - (p3.x - p1.x) / 6 * t
      const cp2y = p2.y - (p3.y - p1.y) / 6 * t

      return {
        cp1: { x: cp1x, y: cp1y },
        cp2: { x: cp2x, y: cp2y },
        end: { x: p2.x, y: p2.y }
      }
    }

    let path = `M ${points[0].x},${points[0].y}`

    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[Math.max(0, i - 1)]
      const p1 = points[i]
      const p2 = points[i + 1]
      const p3 = points[Math.min(points.length - 1, i + 2)]

      const bezier = catmullRom2Bezier(p0, p1, p2, p3)
      path += ` C ${bezier.cp1.x},${bezier.cp1.y} ${bezier.cp2.x},${bezier.cp2.y} ${bezier.end.x},${bezier.end.y}`
    }

    return path
  }, [trackConfig, windowSize])

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
    <div className="lottery-machine-live-page">
      {/* 標題 */}
      <div className="title">🎰 幸運抽獎機 🎰</div>

      {/* 編輯器控制按鈕 */}
      <div className="editor-controls">
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

      {/* 軌道容器 - 移到 main-content 之外 */}
      <div className="track-container" ref={trackContainerRef}>
        {/* SVG 軌道 */}
        <div className="track-svg-container">
          <svg xmlns="http://www.w3.org/2000/svg">
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

        {/* 軌道編輯器 */}
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
      </div>

      {/* 主要內容區域 */}
      <div className="main-content">
        {/* 中獎者平台 */}
        <div className="winners-platform">
          <div className="platform-surface">
            <div className="platform-slots" ref={platformSlotsRef}>
              {winners.length === 0 && <span className="placeholder">等待得獎者...</span>}
            </div>
          </div>
          <div className="platform-base"></div>
        </div>

        {/* 彩票機腔體 */}
        <div className="lottery-machine" ref={chamberRef} style={{ maxWidth: `${trackConfig.chamberWidth}px` }}>
          <div className="chamber" style={{ height: `${trackConfig.chamberHeight}px` }}>
            <div className="chamber-glass"></div>

            <div className="photos-container" ref={photosContainerRef}>
              {avatarBalls.map(ball => (
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

      {/* 控制面板 */}
      <div className="control-panel">
        <button
          onClick={drawWinner}
          disabled={lotteryState.is_drawing || avatarBalls.length === 0}
          className="btn btn-draw"
        >
          <span className="btn-text">🎲 抽出得獎者</span>
          <span className="btn-glow"></span>
        </button>
        <button
          onClick={() => setWinners([])}
          className="btn btn-reset"
        >
          <span className="btn-text">🔄 重置</span>
        </button>
      </div>

      {/* 彩紙效果容器 */}
      <div className="confetti-container"></div>

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
        }

        .platform-slots .placeholder {
          color: rgba(255,255,255,0.7);
          font-size: clamp(0.6rem, 0.8vw, 0.8rem);
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
          z-index: 5;
          pointer-events: none;
        }

        .track-svg-container {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          z-index: 4;
          overflow: visible;
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
          stroke-width: 32;
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

        .track-editor {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: auto;
          z-index: 50;
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
          z-index: 100;
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
          border-radius: clamp(14px, 1.4vw, 24px) 0 clamp(8px, 0.8vw, 14px) clamp(8px, 0.8vw, 14px);
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

      <style jsx global>{`
        .confetti - container {
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
          0 % {
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
          0 % { transform: translateY(0) scale(1); opacity: 0.7; }
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
          0 % { transform: translateX(40px) scale(0.5); opacity: 0; }
          60% {transform: translateX(-3px) scale(1.1); }
        100% {transform: translateX(0) scale(1); opacity: 1; }
        }

        .platform-winner-photo {
          border - radius: 50%;
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
          font - size: clamp(0.4rem, 0.5vw, 0.6rem);
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
