650df0642fa7651e1120acb28f3f912258ae9c43'use client'

import { memo, useEffect, useState, useRef, useCallback } from 'react'
import { LotteryModeProps, Photo } from './types'
import { getPhotoUrl } from '@/lib/photo-utils'

// ===== 設計尺寸 =====
const DESIGN_WIDTH = 1920
const DESIGN_HEIGHT = 1080

// ===== 物理配置 =====
const PHYSICS = {
  airForce: 0.8,
  lateralAirForce: 0.2,
  gravity: 0.35,
  friction: 0.995,
  bounceFactor: 0.85,
  maxVelocity: 15,
  minVelocity: 4,
  turbulence: 0.4,
}

// ===== 軌道配置 =====
const TRACK_CONFIG = {
  chamberWidth: 480,
  chamberHeight: 220,
  ballDiameter: 42,
  trackWidth: 32,
  startPoint: { x: 50, y: 75 },  // % position
  endPoint: { x: 15, y: 8 },     // % position
  nodes: [
    { id: 1, x: 95, y: 75 },
    { id: 2, x: 95, y: 55 },
    { id: 3, x: 5, y: 55 },
    { id: 4, x: 5, y: 25 },
    { id: 5, x: 25, y: 25 },
  ]
}

// ===== 介面定義 =====
interface BouncingPhoto {
  id: number
  photo: Photo
  x: number
  y: number
  vx: number
  vy: number
  rotation: number
  rotationSpeed: number
  size: number
  isWinner?: boolean
}

interface NodeHandle {
  id: string | number
  label: string
  x: number  // %
  y: number  // %
}

// ===== Catmull-Rom 樣條曲線函數 =====
function sampleCatmullRomSpline(points: { x: number; y: number }[], numSamples: number) {
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
      if (seg > 0 && i === 0) continue
      const t = i / samplesPerSegment

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

function generateCatmullRomPath(points: { x: number; y: number }[]) {
  if (points.length < 2) return ''
  if (points.length === 2) {
    return `M ${points[0].x},${points[0].y} L ${points[1].x},${points[1].y}`
  }

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

    const cp1x = p1.x + (p2.x - p0.x) / 6
    const cp1y = p1.y + (p2.y - p0.y) / 6
    const cp2x = p2.x - (p3.x - p1.x) / 6
    const cp2y = p2.y - (p3.y - p1.y) / 6

    path += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`
  }

  return path
}

// ===== 主組件 =====
export const LotteryMachineLottery = memo(({
  photos,
  winnerPhoto,
  winnerIndex,
  winnerPhotos,
  winnersPerDraw = 1, // 預設值為 1（每次抽一位）
  onAnimationComplete,
  isAnimating,
  scale,
  adminId // 新增：管理員 ID（用於保存設定）
}: LotteryModeProps & { adminId?: string }) => {
  // ===== 狀態 =====
  const [bouncingPhotos, setBouncingPhotos] = useState<BouncingPhoto[]>([])
  const [animationPhase, setAnimationPhase] = useState<'idle' | 'bouncing' | 'drawing' | 'complete'>('idle')
  const [bubbles, setBubbles] = useState<Array<{ id: number; left: number; duration: number; width: number }>>([])
  const [confetti, setConfetti] = useState<Array<{ id: number; left: number; color: string }>>([])
  const [isEditMode, setIsEditMode] = useState(false)
  const [trackNodes, setTrackNodes] = useState(TRACK_CONFIG.nodes)
  const [startPoint, setStartPoint] = useState(TRACK_CONFIG.startPoint)
  const [endPoint, setEndPoint] = useState(TRACK_CONFIG.endPoint)
  const [showEditor, setShowEditor] = useState(false)
  const [winners, setWinners] = useState<Photo[]>([])
  const [isBouncing, setIsBouncing] = useState(false)

  // ===== Refs =====
  const rafRef = useRef<number | null>(null)
  const photoIdRef = useRef(0)
  const bouncingPhotosRef = useRef<BouncingPhoto[]>([])
  const chamberRef = useRef<HTMLDivElement>(null)
  const bubbleIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const isDraggingRef = useRef(false)
  const dragTargetRef = useRef<NodeHandle | null>(null)
  const dragTypeRef = useRef<string | null>(null)

  // ===== 如果提供了 winnerPhotos 陣列，使用它；否則使用單一 winnerPhoto =====
  const finalWinnerPhotos = winnerPhotos || (winnerPhoto ? [winnerPhoto] : [])

  // ===== 初始化照片 =====
  const initPhotos = useCallback(() => {
    const containerWidth = 400 // 腔體寬度
    const containerHeight = 200 // 腔體高度
    const photoSize = TRACK_CONFIG.ballDiameter
    const padding = 5

    const newPhotos: BouncingPhoto[] = []
    photos.forEach((photo, index) => {
      const x = padding + Math.random() * (containerWidth - photoSize - padding * 2)
      const y = padding + Math.random() * (containerHeight - photoSize - padding * 2)
      const vx = (Math.random() - 0.5) * PHYSICS.maxVelocity
      const vy = (Math.random() - 0.5) * PHYSICS.maxVelocity
      const rotation = Math.random() * 360
      const rotationSpeed = (Math.random() - 0.5) * 8

      newPhotos.push({
        id: photoIdRef.current++,
        photo,
        x, y, vx, vy,
        rotation, rotationSpeed,
        size: photoSize,
      })
    })

    setBouncingPhotos(newPhotos)
    bouncingPhotosRef.current = newPhotos
    setAnimationPhase('idle')
  }, [photos])

  // ===== 彈跳動畫 =====
  const updatePhysics = useCallback(() => {
    setBouncingPhotos(prevPhotos => {
      const newPhotos = prevPhotos.map(photo => {
        photo.vy += PHYSICS.gravity
        const bottomFactor = (photo.y / 200)
        photo.vy -= PHYSICS.airForce * (0.5 + bottomFactor * 1.5)

        photo.vx += (Math.random() - 0.5) * PHYSICS.turbulence
        photo.vx += (Math.random() - 0.5) * PHYSICS.lateralAirForce
        photo.vx *= PHYSICS.friction
        photo.vy *= PHYSICS.friction

        const speed = Math.sqrt(photo.vx * photo.vx + photo.vy * photo.vy)
        if (speed < PHYSICS.minVelocity) {
          const angle = Math.random() * Math.PI * 2
          photo.vx += Math.cos(angle) * PHYSICS.minVelocity * 0.5
          photo.vy += Math.sin(angle) * PHYSICS.minVelocity * 0.5
        }

        if (Math.abs(photo.vx) > PHYSICS.maxVelocity) photo.vx = Math.sign(photo.vx) * PHYSICS.maxVelocity
        if (Math.abs(photo.vy) > PHYSICS.maxVelocity) photo.vy = Math.sign(photo.vy) * PHYSICS.maxVelocity

        photo.x += photo.vx
        photo.y += photo.vy

        if (photo.x < 0) { photo.x = 0; photo.vx = -photo.vx * PHYSICS.bounceFactor; }
        else if (photo.x > 400 - photo.size) { photo.x = 400 - photo.size; photo.vx = -photo.vx * PHYSICS.bounceFactor; }

        if (photo.y < 0) { photo.y = 0; photo.vy = -photo.vy * PHYSICS.bounceFactor; }
        else if (photo.y > 200 - photo.size) {
          photo.y = 200 - photo.size
          photo.vy = -photo.vy * PHYSICS.bounceFactor
          photo.vy -= PHYSICS.airForce * 3
        }

        photo.rotation += photo.rotationSpeed + (photo.vx * 0.5)
        if (photo.x <= 0 || photo.x >= 400 - photo.size) {
          photo.rotationSpeed = -photo.rotationSpeed * 0.8 + (Math.random() - 0.5) * 3
        }

        return photo
      })

      bouncingPhotosRef.current = newPhotos
      return newPhotos
    })
  }, [isBouncing])

  // ===== 氣泡效果 =====
  const startBubbleEffect = useCallback(() => {
    if (bubbleIntervalRef.current) clearInterval(bubbleIntervalRef.current)

    bubbleIntervalRef.current = setInterval(() => {
      setBubbles(prev => {
        const newBubbles = [...prev]
        if (newBubbles.length > 20) {
          newBubbles.shift()
        }
        newBubbles.push({
          id: Date.now(),
          left: 10 + Math.random() * 80,
          duration: 1 + Math.random() * 0.5,
          width: 4 + Math.random() * 6
        })
        return newBubbles
      })
    }, 100)
  }, [])

  // ===== 紙屑效果 =====
  const createConfetti = useCallback(() => {
    const colors = ['#ffd700', '#ff6b6b', '#4ecdc4', '#45b7d1', '#96c93d', '#f093fb']
    const newConfetti = []

    for (let i = 0; i < 40; i++) {
      newConfetti.push({
        id: i,
        left: Math.random() * 100,
        color: colors[Math.floor(Math.random() * colors.length)]
      })
    }

    setConfetti(newConfetti)
  }, [])

  // ===== 添加到平台 =====
  const addToPlatform = useCallback((winnerPhoto: Photo) => {
    setWinners(prev => [...prev, winnerPhoto])
  }, [])

  // ===== 沿著軌道移動的動畫 =====
  const animateBallToFunnelThenTrack = useCallback(async (winnerPhoto: Photo) => {
    // 找到中獎者的 DOM 元素
    const winnerElement = document.querySelector(`[data-winner-id="${winnerPhoto.id}"]`) as HTMLElement
    if (!winnerElement) return

    const photoRect = winnerElement.getBoundingClientRect()
    const photoSize = TRACK_CONFIG.ballDiameter - 4

    // 創建 travelingPhoto 元素（複製中獎者照片）
    const travelingPhoto = document.createElement('div')
    travelingPhoto.className = 'photo-traveling'
    travelingPhoto.innerHTML = `<img src="${winnerPhoto.thumbnail_small_url || winnerPhoto.image_url}" alt="${winnerPhoto.display_name}" class="w-full h-full object-cover rounded-full shadow-lg border-2 border-white/50">`
    travelingPhoto.style.position = 'fixed'
    travelingPhoto.style.left = `${photoRect.left}px`
    travelingPhoto.style.top = `${photoRect.top}px`
    travelingPhoto.style.width = `${photoSize}px`
    travelingPhoto.style.height = `${photoSize}px`
    travelingPhoto.style.zIndex = '100'
    document.body.appendChild(travelingPhoto)

    // 將中獎者照片標記為 'exiting'（隱藏）
    winnerElement.style.opacity = '0'

    // 生成 waypoints（使用 Catmull-Rom spline）
    const waypoints = generateWaypoints(photoRect)

    // 逐段動畫照片沿著軌道移動
    let rotation = 0
    for (let i = 0; i < waypoints.length - 1; i++) {
      const from = waypoints[i]
      const to = waypoints[i + 1]
      const distance = Math.sqrt(Math.pow(to.x - from.x, 2) + Math.pow(to.y - from.y, 2))
      const duration = distance * 1.2

      await animateSegment(travelingPhoto, from.x, from.y, to.x, to.y, duration, rotation)
      rotation += distance * 0.5
    }

    // 移除 travelingPhoto
    travelingPhoto.remove()
  }, [])

  // ===== 動畫單一段 =====
  const animateSegment = useCallback((el: HTMLElement, fromX: number, fromY: number, toX: number, toY: number, duration: number, startRotation: number) => {
    return new Promise<void>(resolve => {
      const startTime = performance.now()

      function animate(currentTime: number) {
        const elapsed = currentTime - startTime
        const progress = Math.min(elapsed / duration, 1)

        // 使用 ease-in-out 緩動函數
        const eased = progress < 0.5
          ? 2 * progress * progress
          : 1 - Math.pow(-2 * progress + 2, 2) / 2

        const x = fromX + (toX - fromX) * eased
        const y = fromY + (toY - fromY) * eased
        const rotation = startRotation + progress * 60

        el.style.left = `${x}px`
        el.style.top = `${y}px`
        el.style.transform = `rotate(${rotation}deg)`

        if (progress < 1) {
          requestAnimationFrame(animate)
        } else {
          resolve()
        }
      }

      requestAnimationFrame(animate)
    })
  }, [])

  // ===== 生成 waypoints（使用 Catmull-Rom spline） =====
  const generateWaypoints = useCallback((photoRect: DOMRect) => {
    const mainContent = document.querySelector('[data-lottery-live]') as HTMLElement
    if (!mainContent) return []

    const mainRect = mainContent.getBoundingClientRect()
    const halfSize = TRACK_CONFIG.ballDiameter / 2

    // 建立控制點
    const controlPoints = [
      { x: TRACK_CONFIG.startPoint.x, y: TRACK_CONFIG.startPoint.y },
      ...trackNodes.map(n => ({ x: n.x, y: n.y })),
      { x: TRACK_CONFIG.endPoint.x, y: TRACK_CONFIG.endPoint.y }
    ]

    // 生成平滑曲線 waypoints
    const curveWaypoints = sampleCatmullRomSpline(controlPoints, 50)

    // 轉換為螢幕座標
    const waypoints = [{ x: photoRect.left, y: photoRect.top }]

    curveWaypoints.forEach(pt => {
      const screenX = mainRect.left + (pt.x / 100) * mainRect.width - halfSize
      const screenY = mainRect.top + (pt.y / 100) * mainRect.height - halfSize
      waypoints.push({ x: screenX, y: screenY })
    })

    return waypoints
  }, [trackNodes])

  // ===== 抽出中獎者 =====
  const drawWinner = useCallback(async () => {
    if (finalWinnerPhotos.length === 0) return

    setAnimationPhase('drawing')

    // 依序處理每個中獎者
    for (let i = 0; i < finalWinnerPhotos.length; i++) {
      const winnerPhoto = finalWinnerPhotos[i]
      
      // 標記中獎者
      setBouncingPhotos(prevPhotos => {
        const newPhotos = prevPhotos.map(p => {
          if (p.photo.id === winnerPhoto.id) {
            return { ...p, isWinner: true }
          }
          return p
        })
        bouncingPhotosRef.current = newPhotos
        return newPhotos
      })

      // 等待 300ms 後執行沿著軌道移動的動畫
      await new Promise(resolve => setTimeout(resolve, 300))

      // 執行沿著軌道移動的動畫
      await animateBallToFunnelThenTrack(winnerPhoto)

      // 將中獎者添加到平台
      addToPlatform(winnerPhoto)

      // 如果不是最後一個中獎者，等待一段時間再繼續
      if (i < finalWinnerPhotos.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1500))
      }
    }

    // 完成動畫
    setAnimationPhase('complete')
    
    // 創建紙屑效果
    createConfetti()
    
    // 觸發回調
    onAnimationComplete(finalWinnerPhotos[finalWinnerPhotos.length - 1])
  }, [finalWinnerPhotos, photos, onAnimationComplete, addToPlatform, animateBallToFunnelThenTrack, createConfetti])

  // ===== 載入設定 =====
  useEffect(() => {
    const loadSettings = async () => {
      // 先從 localStorage 載入
      const localSettings = localStorage.getItem('lotteryMachineConfig')
      if (localSettings) {
        try {
          const config = JSON.parse(localSettings)
          if (config.trackNodes) setTrackNodes(config.trackNodes)
          if (config.startPoint) setStartPoint(config.startPoint)
          if (config.endPoint) setEndPoint(config.endPoint)
        } catch (e) {
          console.error('載入 localStorage 設定失敗:', e)
        }
      }

      // 從 API 載入（如果有 adminId）
      if (adminId) {
        try {
          const response = await fetch('/api/lottery/control')
          const data = await response.json()
          if (data.success && data.lottery_machine_config) {
            const config = data.lottery_machine_config
            if (config.trackNodes) setTrackNodes(config.trackNodes)
            if (config.startPoint) setStartPoint(config.startPoint)
            if (config.endPoint) setEndPoint(config.endPoint)
          }
        } catch (e) {
          console.error('載入 API 設定失敗:', e)
        }
      }
    }

    loadSettings()
  }, [adminId])

  // ===== 保存設定到 localStorage =====
  const saveSettingsToLocal = useCallback(() => {
    const config = {
      trackNodes,
      startPoint,
      endPoint
    }
    localStorage.setItem('lotteryMachineConfig', JSON.stringify(config))
  }, [trackNodes, startPoint, endPoint])

  // ===== 保存設定到 API =====
  const saveSettingsToServer = useCallback(async () => {
    if (!adminId) {
      console.warn('沒有 adminId，無法保存到伺服器')
      return false
    }

    try {
      const response = await fetch('/api/lottery/control', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          admin_id: adminId,
          lottery_machine_config: {
            trackNodes,
            startPoint,
            endPoint
          }
        }),
      })

      const data = await response.json()
      if (data.success) {
        console.log('✅ 設定已保存到伺服器')
        return true
      } else {
        console.error('❌ 保存設定到伺服器失敗:', data.error)
        return false
      }
    } catch (e) {
      console.error('❌ 保存設定到伺服器時發生錯誤:', e)
      return false
    }
  }, [adminId, trackNodes, startPoint, endPoint])

  // ===== 當設定變更時自動保存到 localStorage =====
  useEffect(() => {
    saveSettingsToLocal()
  }, [trackNodes, startPoint, endPoint, saveSettingsToLocal])

  // ===== 初始化彈跳 =====
  useEffect(() => {
    // 組件掛載時初始化照片並開始彈跳
    initPhotos()
    setAnimationPhase('bouncing')
    startBubbleEffect()
    setIsBouncing(true)

    const animate = () => {
      updatePhysics()
      rafRef.current = requestAnimationFrame(animate)
    }

    rafRef.current = requestAnimationFrame(animate)

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
      }
      if (bubbleIntervalRef.current) {
        clearInterval(bubbleIntervalRef.current)
      }
    }
  }, [initPhotos, updatePhysics, startBubbleEffect])

  // ===== 抽獎動畫 =====
  useEffect(() => {
    if (!isAnimating) {
      // 如果沒有在抽獎，保持彈跳
      setIsBouncing(true)
      return
    }

    // 開始抽獎動畫
    setIsBouncing(false)
    setAnimationPhase('bouncing')
    startBubbleEffect()

    // 3秒後開始抽獎
    const drawTimeout = setTimeout(() => {
      drawWinner()
    }, 3000)

    const animate = () => {
      updatePhysics()
      rafRef.current = requestAnimationFrame(animate)
    }

    rafRef.current = requestAnimationFrame(animate)

    return () => {
      clearTimeout(drawTimeout)
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
      }
      if (bubbleIntervalRef.current) {
        clearInterval(bubbleIntervalRef.current)
      }
    }
  }, [isAnimating, updatePhysics, drawWinner, startBubbleEffect])

  // ===== 渲染軌道 =====
  const renderTrack = () => {
    const points = [
      { x: startPoint.x, y: startPoint.y },
      ...trackNodes.map(n => ({ x: n.x, y: n.y })),
      { x: endPoint.x, y: endPoint.y }
    ]

    const pathD = generateCatmullRomPath(points)

    return (
      <svg
        className="absolute inset-0 pointer-events-none"
        style={{ zIndex: 5 }}
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="trackGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" style={{ stopColor: 'rgba(100, 180, 255, 0.7)' }} />
            <stop offset="50%" style={{ stopColor: 'rgba(150, 120, 200, 0.7)' }} />
            <stop offset="100%" style={{ stopColor: 'rgba(200, 100, 150, 0.7)' }} />
          </linearGradient>
        </defs>
        <path
          d={pathD}
          fill="none"
          stroke="url(#trackGradient)"
          strokeWidth={TRACK_CONFIG.trackWidth / 10}
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            filter: 'drop-shadow(0 2px 8px rgba(100, 150, 255, 0.4))'
          }}
        />
      </svg>
    )
  }

  // ===== 渲染節點手柄（編輯模式） =====
  const renderNodeHandles = () => {
    if (!isEditMode) return null

    return (
      <>
        {/* 起點 */}
        <div
          className="absolute w-8 h-8 rounded-full cursor-grab flex items-center justify-center text-xs font-bold text-white z-50 transition-transform hover:scale-125"
          style={{
            left: `${startPoint.x}%`,
            top: `${startPoint.y}%`,
            background: 'linear-gradient(135deg, #4ecdc4 0%, #2ab7b0 100%)',
            border: '2px solid rgba(255,255,255,0.6)',
            boxShadow: '0 0 18px rgba(78, 205, 196, 0.6)',
            transform: 'translate(-50%, -50%)'
          }}
          onMouseDown={(e) => {
            e.preventDefault()
            isDraggingRef.current = true
            dragTargetRef.current = { id: 'start', label: '起點', x: startPoint.x, y: startPoint.y }
            dragTypeRef.current = 'start'
          }}
        >
          起點
        </div>

        {/* 節點 */}
        {trackNodes.map((node, index) => (
          <div
            key={node.id}
            className="absolute w-8 h-8 rounded-full cursor-grab flex items-center justify-center text-xs font-bold text-white z-50 transition-transform hover:scale-125"
            style={{
              left: `${node.x}%`,
              top: `${node.y}%`,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              border: '2px solid rgba(255,255,255,0.5)',
              boxShadow: '0 0 12px rgba(102, 126, 234, 0.5)',
              transform: 'translate(-50%, -50%)'
            }}
            onMouseDown={(e) => {
              e.preventDefault()
              isDraggingRef.current = true
              dragTargetRef.current = { id: index, label: node.id.toString(), x: node.x, y: node.y }
              dragTypeRef.current = `node-${index}`
            }}
          >
            {node.id}
          </div>
        ))}

        {/* 終點 */}
        <div
          className="absolute w-8 h-8 rounded-full cursor-grab flex items-center justify-center text-xs font-bold text-white z-50 transition-transform hover:scale-125"
          style={{
            left: `${endPoint.x}%`,
            top: `${endPoint.y}%`,
            background: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a5a 100%)',
            border: '2px solid rgba(255,255,255,0.6)',
            boxShadow: '0 0 18px rgba(255, 107, 107, 0.6)',
            transform: 'translate(-50%, -50%)'
          }}
          onMouseDown={(e) => {
            e.preventDefault()
            isDraggingRef.current = true
            dragTargetRef.current = { id: 'end', label: '終點', x: endPoint.x, y: endPoint.y }
            dragTypeRef.current = 'end'
          }}
        >
          終點
        </div>
      </>
    )
  }

  // ===== 滑鼠事件處理 =====
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current || !dragTargetRef.current) return

      const rect = chamberRef.current?.getBoundingClientRect()
      if (!rect) return

      const x = ((e.clientX - rect.left) / rect.width) * 100
      const y = ((e.clientY - rect.top) / rect.height) * 100

      const clampedX = Math.max(2, Math.min(98, x))
      const clampedY = Math.max(2, Math.min(98, y))

      const type = dragTypeRef.current

      if (type === 'start') {
        setStartPoint({ x: Math.round(clampedX), y: Math.round(clampedY) })
      } else if (type === 'end') {
        setEndPoint({ x: Math.round(clampedX), y: Math.round(clampedY) })
      } else if (type?.startsWith('node-')) {
        const index = parseInt(type.replace('node-', ''))
        setTrackNodes(prev => {
          const newNodes = [...prev]
          newNodes[index] = { ...newNodes[index], x: Math.round(clampedX), y: Math.round(clampedY) }
          return newNodes
        })
      }
    }

    const handleMouseUp = () => {
      if (isDraggingRef.current) {
        isDraggingRef.current = false
        dragTargetRef.current = null
        dragTypeRef.current = null
      }
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isEditMode])

  return (
    <div
      ref={chamberRef}
      data-lottery-live="true"
      className="relative flex flex-col items-center justify-center h-full"
      style={{
        width: '100%',
        height: '100%',
        background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
        border: isEditMode ? '2px dashed rgba(255,215,0,0.5)' : 'none'
      }}
    >
      {/* 軌道 */}
      {renderTrack()}

      {/* 節點手柄 */}
      {renderNodeHandles()}

      {/* 腔體 */}
      <div
        className="absolute rounded-full border-8 border-white/30"
        style={{
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          width: `${400 * scale}px`,
          height: `${200 * scale}px`,
          background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
          boxShadow: '0 0 60px rgba(255,255,255,0.2)'
        }}
      />

      {/* 腔體玻璃效果 */}
      <div
        className="absolute rounded-full pointer-events-none"
        style={{
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          width: `${400 * scale}px`,
          height: `${200 * scale}px`,
          background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.3) 0%, transparent 50%)'
        }}
      />

      {/* 氣泡 */}
      {bubbles.map(bubble => (
        <div
          key={bubble.id}
          className="absolute rounded-full"
          style={{
            left: `${bubble.left}%`,
            bottom: '14px',
            width: `${bubble.width}px`,
            height: `${bubble.width}px`,
            background: 'radial-gradient(circle at 30% 30%, rgba(100, 200, 255, 0.5), rgba(100, 200, 255, 0.1))',
            animation: `bubbleRise ${bubble.duration}s ease-out infinite`
          }}
        />
      ))}

      {/* 彈跳的照片 */}
      {bouncingPhotos.map(photo => (
        <div
          key={photo.id}
          data-winner-id={photo.photo.id}
          className={`absolute transition-transform ${photo.isWinner ? 'z-50' : 'z-10'}`}
          style={{
            left: `${photo.x * scale}px`,
            top: `${photo.y * scale}px`,
            width: `${photo.size * scale}px`,
            height: `${photo.size * scale}px`,
            transform: `rotate(${photo.rotation}deg)`,
            opacity: photo.isWinner ? 1 : 0.8
          }}
        >
          {photo.isWinner && (
            <div className="absolute -inset-2 bg-gradient-to-r from-yellow-400 via-orange-400 to-pink-400 rounded-full blur-xl opacity-70 animate-pulse" />
          )}
          <img
            src={photo.photo.thumbnail_small_url || photo.photo.image_url}
            alt={photo.photo.display_name}
            className="w-full h-full object-cover rounded-full shadow-lg border-2 border-white/50"
          />
        </div>
      ))}

      {/* 紙屑 */}
      {confetti.map(c => (
        <div
          key={c.id}
          className="absolute"
          style={{
            left: `${c.left}%`,
            top: '-10px',
            width: '10px',
            height: '10px',
            backgroundColor: c.color,
            borderRadius: Math.random() > 0.5 ? '50%' : '0',
            animation: `confettiFall ${2 + Math.random() * 2}s linear forwards`,
            animationDelay: `${Math.random() * 0.5}s`
          }}
        />
      ))}

      {/* 平台顯示 */}
      {winners.length > 0 && (
        <div
          className="absolute bottom-0 left-0 right-0 flex items-end justify-center gap-4 px-8"
          style={{
            height: '120px',
            background: 'linear-gradient(to top, rgba(255,255,255,0.1), transparent)',
            zIndex: 40
          }}
        >
          {winners.map((winner, index) => (
            <div
              key={winner.id}
              className="relative flex flex-col items-center"
              style={{ animation: 'fadeInUp 0.5s ease-out forwards' }}
            >
              {/* 排名 */}
              <div
                className="absolute -top-6 -right-2 w-8 h-8 rounded-full flex items-center justify-center text-white font-bold shadow-lg"
                style={{
                  background: `linear-gradient(135deg, hsl(${index * 60}, 70%, 50%), hsl(${index * 60}, 60%, 40%))`,
                  animation: 'pulse 1.5s ease-in-out infinite'
                }}
              >
                #{index + 1}
              </div>
              
              {/* 照片 */}
              <div
                className="relative rounded-2xl border-4 border-yellow-400 shadow-2xl"
                style={{
                  width: `${80 * scale}px`,
                  height: `${80 * scale}px`,
                  background: 'linear-gradient(135deg, #ffd700, #ff6b6b)',
                  animation: 'bounce 0.5s ease-out'
                }}
              >
                <img
                  src={winner.thumbnail_small_url || winner.image_url}
                  alt={winner.display_name}
                  className="w-full h-full object-cover rounded-xl"
                />
              </div>
              
              {/* 名稱 */}
              <div
                className="mt-2 px-3 py-1 bg-white/90 backdrop-blur-sm rounded-lg text-center"
                style={{ animation: 'fadeIn 0.3s ease-out 0.2s forwards' }}
              >
                <div className="text-sm font-semibold text-gray-800">
                  {winner.display_name}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 狀態文字 */}
      {animationPhase === 'drawing' && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
          <div className="text-6xl font-bold text-white animate-pulse drop-shadow-2xl">
            ✨ 抽出中獎者 ✨
          </div>
        </div>
      )}

      {animationPhase === 'complete' && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
          <div className="text-6xl font-bold text-white animate-bounce drop-shadow-2xl">
            🎉 抽獎完成 🎉
          </div>
        </div>
      )}

      {/* 編輯器切換按鈕 */}
      <button
        onClick={() => setShowEditor(!showEditor)}
        className="absolute top-4 right-4 z-50 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white rounded-lg font-semibold transition-all"
      >
        ⚙️ {showEditor ? '隱藏' : '顯示'}編輯器
      </button>

      {/* 編輯器面板 */}
      {showEditor && (
        <div className="absolute top-16 right-4 z-50 bg-gray-900/95 backdrop-blur-lg rounded-xl p-4 max-h-96 overflow-y-auto w-80 border border-white/20">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-white">🎨 軌道編輯器</h3>
            <button
              onClick={saveSettingsToServer}
              className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm font-semibold transition-colors"
            >
              💾 保存設定
            </button>
          </div>

          {/* 編輯模式切換 */}
          <div className="mb-4 p-3 bg-gray-800 rounded-lg">
            <label className="flex items-center gap-2 text-white cursor-pointer">
              <input
                type="checkbox"
                checked={isEditMode}
                onChange={(e) => setIsEditMode(e.target.checked)}
                className="w-5 h-5"
              />
              <span>🖱️ 啟用拖曳編輯模式</span>
            </label>
          </div>

          {/* 物理參數 */}
          <div className="mb-4">
            <h4 className="text-white font-semibold mb-2">📦 物理參數</h4>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <label className="text-white text-sm w-24">重力:</label>
                <input
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.05"
                  value={PHYSICS.gravity}
                  onChange={(e) => { PHYSICS.gravity = parseFloat(e.target.value) }}
                  className="flex-1"
                />
                <span className="text-white text-sm w-12">{PHYSICS.gravity}</span>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-white text-sm w-24">氣流力:</label>
                <input
                  type="range"
                  min="0.2"
                  max="2.0"
                  step="0.1"
                  value={PHYSICS.airForce}
                  onChange={(e) => { PHYSICS.airForce = parseFloat(e.target.value) }}
                  className="flex-1"
                />
                <span className="text-white text-sm w-12">{PHYSICS.airForce}</span>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-white text-sm w-24">側向氣流:</label>
                <input
                  type="range"
                  min="0"
                  max="1.0"
                  step="0.05"
                  value={PHYSICS.lateralAirForce}
                  onChange={(e) => { PHYSICS.lateralAirForce = parseFloat(e.target.value) }}
                  className="flex-1"
                />
                <span className="text-white text-sm w-12">{PHYSICS.lateralAirForce}</span>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-white text-sm w-24">最大速度:</label>
                <input
                  type="range"
                  min="5"
                  max="30"
                  step="1"
                  value={PHYSICS.maxVelocity}
                  onChange={(e) => { PHYSICS.maxVelocity = parseFloat(e.target.value) }}
                  className="flex-1"
                />
                <span className="text-white text-sm w-12">{PHYSICS.maxVelocity}</span>
              </div>
            </div>
          </div>

          {/* 起點與終點 */}
          <div className="mb-4">
            <h4 className="text-white font-semibold mb-2">📍 起點與終點</h4>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <label className="text-white text-sm">起點 X:</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={startPoint.x}
                  onChange={(e) => setStartPoint({ ...startPoint, x: parseInt(e.target.value) || 0 })}
                  className="w-20 px-2 py-1 bg-gray-800 text-white rounded border border-gray-600"
                />
                <span className="text-white text-sm">%</span>
                <label className="text-white text-sm ml-4">Y:</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={startPoint.y}
                  onChange={(e) => setStartPoint({ ...startPoint, y: parseInt(e.target.value) || 0 })}
                  className="w-20 px-2 py-1 bg-gray-800 text-white rounded border border-gray-600"
                />
                <span className="text-white text-sm">%</span>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-white text-sm">終點 X:</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={endPoint.x}
                  onChange={(e) => setEndPoint({ ...endPoint, x: parseInt(e.target.value) || 0 })}
                  className="w-20 px-2 py-1 bg-gray-800 text-white rounded border border-gray-600"
                />
                <span className="text-white text-sm">%</span>
                <label className="text-white text-sm ml-4">Y:</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={endPoint.y}
                  onChange={(e) => setEndPoint({ ...endPoint, y: parseInt(e.target.value) || 0 })}
                  className="w-20 px-2 py-1 bg-gray-800 text-white rounded border border-gray-600"
                />
                <span className="text-white text-sm">%</span>
              </div>
            </div>
          </div>

          {/* 節點列表 */}
          <div className="mb-4">
            <h4 className="text-white font-semibold mb-2">🔗 軌道節點</h4>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {trackNodes.map((node, index) => (
                <div key={node.id} className="flex items-center gap-2 bg-gray-800 p-2 rounded">
                  <span className="text-white text-sm font-bold w-8">#{node.id}</span>
                  <label className="text-white text-sm">X:</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={node.x}
                    onChange={(e) => {
                      const newNodes = [...trackNodes]
                      newNodes[index] = { ...newNodes[index], x: parseInt(e.target.value) || 0 }
                      setTrackNodes(newNodes)
                    }}
                    className="w-16 px-2 py-1 bg-gray-700 text-white rounded border border-gray-600"
                  />
                  <span className="text-white text-sm">%</span>
                  <label className="text-white text-sm ml-2">Y:</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={node.y}
                    onChange={(e) => {
                      const newNodes = [...trackNodes]
                      newNodes[index] = { ...newNodes[index], y: parseInt(e.target.value) || 0 }
                      setTrackNodes(newNodes)
                    }}
                    className="w-16 px-2 py-1 bg-gray-700 text-white rounded border border-gray-600"
                  />
                  <span className="text-white text-sm">%</span>
                  <button
                    onClick={() => {
                      const newNodes = trackNodes.filter((_, i) => i !== index)
                      setTrackNodes(newNodes)
                    }}
                    className="ml-auto px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm"
                  >
                    刪除
                  </button>
                </div>
              ))}
              <button
                onClick={() => {
                  const newId = trackNodes.length + 1
                  const lastNode = trackNodes[trackNodes.length - 1] || startPoint
                  setTrackNodes([...trackNodes, {
                    id: newId,
                    x: Math.min(95, lastNode.x + 10),
                    y: Math.max(5, lastNode.y - 10)
                  }])
                }}
                className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded font-semibold"
              >
                ➕ 新增節點
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
})

LotteryMachineLottery.displayName = 'LotteryMachineLottery'

// ===== CSS 動畫定義（需要添加到 globals.css） =====
const cssAnimations = `
  @keyframes bubbleRise {
    0% {
      transform: translateY(0) scale(1);
      opacity: 0.7;
    }
    100% {
      transform: translateY(-70px) scale(0.3);
      opacity: 0;
    }
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
`

// 將 CSS 動畫注入到頁面
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style')
  styleSheet.textContent = cssAnimations
  document.head.appendChild(styleSheet)
}
