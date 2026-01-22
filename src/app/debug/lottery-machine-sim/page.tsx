'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Play, RefreshCw, Box } from 'lucide-react'

// 設計尺寸
const DESIGN_WIDTH = 1920
const DESIGN_HEIGHT = 1080

// 模擬照片數據
const MOCK_PHOTOS = Array.from({ length: 20 }, (_, i) => ({
  id: i + 1,
  image_url: `https://picsum.photos/seed/${i + 1}/200/200`,
  display_name: `用戶 ${i + 1}`,
  avatar_url: `https://i.pravatar.cc/150?img=${i + 1}`
}))

interface BouncingPhoto {
  id: number
  photo: typeof MOCK_PHOTOS[0]
  x: number
  y: number
  vx: number
  vy: number
  angle: number
  vAngle: number
  scale: number
  opacity: number
  isFlyingOut: boolean
  targetX: number
  targetY: number
  isWinner: boolean
  winnerOrder?: number
}

export default function LotteryMachineSimPage() {
  const [photos, setPhotos] = useState<BouncingPhoto[]>([])
  const [isAnimating, setIsAnimating] = useState(false)
  const [isDrawing, setIsDrawing] = useState(false)
  const [drawnWinners, setDrawnWinners] = useState<BouncingPhoto[]>([])
  const [photoCount, setPhotoCount] = useState(20)
  const [bounceSpeed, setBounceSpeed] = useState(1)
  const [winnersPerDraw, setWinnersPerDraw] = useState(3)
  const [animationPhase, setAnimationPhase] = useState<'idle' | 'bouncing' | 'drawing' | 'complete'>('idle')

  const containerRef = useRef<HTMLDivElement>(null)
  const rafRef = useRef<number | null>(null)
  const photoIdRef = useRef(0)

  // 腔體參數
  const CHAMBER_RADIUS = 350
  const CHAMBER_CENTER_X = DESIGN_WIDTH / 2
  const CHAMBER_CENTER_Y = DESIGN_HEIGHT / 2 - 100
  const PHOTO_SIZE = 80

  // 初始化照片
  const initPhotos = useCallback(() => {
    const newPhotos: BouncingPhoto[] = []
    for (let i = 0; i < photoCount; i++) {
      const angle = Math.random() * Math.PI * 2
      const radius = Math.random() * (CHAMBER_RADIUS - PHOTO_SIZE / 2)
      newPhotos.push({
        id: photoIdRef.current++,
        photo: MOCK_PHOTOS[i % MOCK_PHOTOS.length],
        x: CHAMBER_CENTER_X + Math.cos(angle) * radius,
        y: CHAMBER_CENTER_Y + Math.sin(angle) * radius,
        vx: (Math.random() - 0.5) * 4 * bounceSpeed,
        vy: (Math.random() - 0.5) * 4 * bounceSpeed,
        angle: Math.random() * 360,
        vAngle: (Math.random() - 0.5) * 5,
        scale: 1,
        opacity: 1,
        isFlyingOut: false,
        targetX: 0,
        targetY: 0,
        isWinner: false,
        winnerOrder: undefined
      })
    }
    setPhotos(newPhotos)
    setDrawnWinners([])
    setAnimationPhase('idle')
  }, [photoCount, bounceSpeed])

  // 物理模擬：照片彈跳
  const updatePhysics = useCallback(() => {
    setPhotos(prevPhotos => {
      return prevPhotos.map(photo => {
        if (photo.isFlyingOut) {
          // 飛出動畫
          const dx = photo.targetX - photo.x
          const dy = photo.targetY - photo.y
          const dist = Math.sqrt(dx * dx + dy * dy)

          if (dist < 10) {
            // 到達目標位置
            return {
              ...photo,
              x: photo.targetX,
              y: photo.targetY,
              opacity: 1,
              scale: photo.isWinner ? 2 : 1.5
            }
          }

          // 繼續飛向目標
          const speed = 15
          return {
            ...photo,
            x: photo.x + (dx / dist) * speed,
            y: photo.y + (dy / dist) * speed,
            angle: photo.angle + photo.vAngle
          }
        }

        // 彈跳物理
        let newX = photo.x + photo.vx
        let newY = photo.y + photo.vy
        let newVx = photo.vx
        let newVy = photo.vy

        // 檢查是否在腔體內
        const dx = newX - CHAMBER_CENTER_X
        const dy = newY - CHAMBER_CENTER_Y
        const distFromCenter = Math.sqrt(dx * dx + dy * dy)
        const maxDist = CHAMBER_RADIUS - PHOTO_SIZE / 2

        if (distFromCenter > maxDist) {
          // 碰到邊界，反彈
          const normalX = dx / distFromCenter
          const normalY = dy / distFromCenter

          // 計算反射向量
          const dotProduct = newVx * normalX + newVy * normalY
          newVx = newVx - 2 * dotProduct * normalX
          newVy = newVy - 2 * dotProduct * normalY

          // 將照片推回腔體內
          newX = CHAMBER_CENTER_X + normalX * maxDist
          newY = CHAMBER_CENTER_Y + normalY * maxDist

          // 添加一些隨機性
          newVx += (Math.random() - 0.5) * 0.5
          newVy += (Math.random() - 0.5) * 0.5
        }

        return {
          ...photo,
          x: newX,
          y: newY,
          vx: newVx,
          vy: newVy,
          angle: photo.angle + photo.vAngle
        }
      })
    })
  }, [])

  // 開始動畫
  const startAnimation = () => {
    setIsAnimating(true)
    setAnimationPhase('bouncing')
    initPhotos()

    // 3秒後開始抽獎
    setTimeout(() => {
      startDrawing()
    }, 3000)
  }

  // 開始抽獎
  const startDrawing = () => {
    setIsDrawing(true)
    setAnimationPhase('drawing')

    let winnersDrawn = 0
    const totalWinners = winnersPerDraw

    const drawNextWinner = () => {
      if (winnersDrawn >= totalWinners) {
        // 抽獎完成
        setIsDrawing(false)
        setAnimationPhase('complete')
        return
      }

      // 隨機選擇一張照片作為中獎者
      setPhotos(prevPhotos => {
        const availablePhotos = prevPhotos.filter(p => !p.isFlyingOut && !p.isWinner)
        if (availablePhotos.length === 0) return prevPhotos

        const randomIndex = Math.floor(Math.random() * availablePhotos.length)
        const winnerPhoto = availablePhotos[randomIndex]

        // 計算目標位置（中獎者顯示區）
        const winnerOrder = winnersDrawn + 1
        const spacing = 300
        const startX = (DESIGN_WIDTH - (totalWinners * spacing)) / 2 + spacing / 2
        const targetX = startX + (winnerOrder - 1) * spacing
        const targetY = DESIGN_HEIGHT - 200

        return prevPhotos.map(p => {
          if (p.id === winnerPhoto.id) {
            return {
              ...p,
              isFlyingOut: true,
              isWinner: true,
              winnerOrder,
              targetX,
              targetY
            }
          }
          return p
        })
      })

      winnersDrawn++
      setDrawnWinners(prev => [...prev, prevPhotos.find(p => p.isWinner && p.winnerOrder === winnersDrawn)!])

      // 1.5秒後抽下一個
      setTimeout(drawNextWinner, 1500)
    }

    drawNextWinner()
  }

  // 動畫循環
  useEffect(() => {
    if (!isAnimating) return

    const animate = () => {
      updatePhysics()
      rafRef.current = requestAnimationFrame(animate)
    }

    rafRef.current = requestAnimationFrame(animate)

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
      }
    }
  }, [isAnimating, updatePhysics])

  // 重置
  const handleReset = () => {
    setIsAnimating(false)
    setIsDrawing(false)
    setDrawnWinners([])
    setAnimationPhase('idle')
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current)
    }
  }

  // 初始載入
  useEffect(() => {
    initPhotos()
  }, [initPhotos])

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-pink-800 to-orange-700 flex flex-col items-center justify-center p-8">
      {/* 控制面板 */}
      <div className="absolute top-8 left-8 bg-white/10 backdrop-blur-md rounded-xl p-6 text-white space-y-4 z-50">
        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
          <Box className="w-6 h-6" />
          Lottery Machine 模擬
        </h2>

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">照片數量: {photoCount}</label>
            <input
              type="range"
              min="5"
              max="50"
              value={photoCount}
              onChange={(e) => setPhotoCount(parseInt(e.target.value))}
              disabled={isAnimating}
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">彈跳速度: {bounceSpeed}x</label>
            <input
              type="range"
              min="0.5"
              max="3"
              step="0.1"
              value={bounceSpeed}
              onChange={(e) => setBounceSpeed(parseFloat(e.target.value))}
              disabled={isAnimating}
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">中獎者數量: {winnersPerDraw}</label>
            <input
              type="range"
              min="1"
              max="5"
              value={winnersPerDraw}
              onChange={(e) => setWinnersPerDraw(parseInt(e.target.value))}
              disabled={isAnimating}
              className="w-full"
            />
          </div>

          <div className="flex gap-2 pt-2">
            {!isAnimating ? (
              <button
                onClick={startAnimation}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 rounded-lg font-medium transition-colors"
              >
                <Play className="w-4 h-4" />
                開始
              </button>
            ) : (
              <button
                onClick={handleReset}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 rounded-lg font-medium transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                重置
              </button>
            )}
          </div>

          <div className="text-sm text-white/80">
            狀態: {
              animationPhase === 'idle' ? '待機' :
              animationPhase === 'bouncing' ? '彈跳中' :
              animationPhase === 'drawing' ? '抽獎中' : '完成'
            }
          </div>
        </div>
      </div>

      {/* 動畫容器 */}
      <div
        ref={containerRef}
        className="relative"
        style={{
          width: `${DESIGN_WIDTH}px`,
          height: `${DESIGN_HEIGHT}px`,
          transform: 'scale(0.6)',
          transformOrigin: 'center center'
        }}
      >
        {/* 腔體 */}
        <div
          className="absolute border-8 border-white/30 rounded-full"
          style={{
            left: `${CHAMBER_CENTER_X - CHAMBER_RADIUS}px`,
            top: `${CHAMBER_CENTER_Y - CHAMBER_RADIUS}px`,
            width: `${CHAMBER_RADIUS * 2}px`,
            height: `${CHAMBER_RADIUS * 2}px`,
            background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
            boxShadow: '0 0 60px rgba(255,255,255,0.2)'
          }}
        />

        {/* 腔體玻璃效果 */}
        <div
          className="absolute rounded-full pointer-events-none"
          style={{
            left: `${CHAMBER_CENTER_X - CHAMBER_RADIUS}px`,
            top: `${CHAMBER_CENTER_Y - CHAMBER_RADIUS}px`,
            width: `${CHAMBER_RADIUS * 2}px`,
            height: `${CHAMBER_RADIUS * 2}px`,
            background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.3) 0%, transparent 50%)'
          }}
        />

        {/* 彈跳的照片 */}
        {photos.map(photo => (
          <div
            key={photo.id}
            className="absolute transition-transform"
            style={{
              left: `${photo.x - PHOTO_SIZE / 2}px`,
              top: `${photo.y - PHOTO_SIZE / 2}px`,
              width: `${PHOTO_SIZE}px`,
              height: `${PHOTO_SIZE}px`,
              transform: `rotate(${photo.angle}deg) scale(${photo.scale})`,
              opacity: photo.opacity,
              zIndex: photo.isFlyingOut ? 100 : 10
            }}
          >
            <img
              src={photo.photo.image_url}
              alt={photo.photo.display_name}
              className="w-full h-full object-cover rounded-lg shadow-lg border-2 border-white/50"
            />
          </div>
        ))}

        {/* 中獎者顯示區 */}
        {drawnWinners.length > 0 && (
          <div className="absolute bottom-0 left-0 right-0 flex items-end justify-center pb-16 gap-8">
            {drawnWinners.map((winner, index) => (
              <div
                key={winner.id}
                className="relative animate-in zoom-in duration-500"
                style={{
                  animationDelay: `${index * 200}ms`
                }}
              >
                {/* 發光效果 */}
                <div className="absolute -inset-4 bg-gradient-to-r from-yellow-400 via-orange-400 to-pink-400 rounded-2xl blur-xl opacity-70 animate-pulse" />

                {/* 照片 */}
                <div className="relative">
                  <img
                    src={winner.photo.image_url}
                    alt={winner.photo.display_name}
                    className="w-48 h-48 object-cover rounded-2xl border-4 border-yellow-400 shadow-2xl"
                  />
                  <div className="absolute -top-6 -right-6 w-12 h-12 bg-yellow-400 rounded-full flex items-center justify-center text-2xl font-bold text-orange-900 shadow-lg">
                    {winner.winnerOrder}
                  </div>
                </div>

                {/* 名稱 */}
                <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 text-center">
                  <div className="text-white text-xl font-bold drop-shadow-lg">
                    {winner.photo.display_name}
                  </div>
                  <div className="text-yellow-300 text-sm">
                    第 {winner.winnerOrder} 位中獎者
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 提示文字 */}
        {animationPhase === 'bouncing' && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
            <div className="text-6xl font-bold text-white animate-pulse drop-shadow-2xl">
              🎰 抽獎中 🎰
            </div>
            <div className="text-2xl text-white/80 mt-4">
              照片在腔體內彈跳...
            </div>
          </div>
        )}

        {animationPhase === 'drawing' && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
            <div className="text-6xl font-bold text-white animate-pulse drop-shadow-2xl">
              ✨ 抽出中獎者 ✨
            </div>
            <div className="text-2xl text-white/80 mt-4">
              已抽出 {drawnWinners.length} / {winnersPerDraw} 位
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
      </div>
    </div>
  )
}
