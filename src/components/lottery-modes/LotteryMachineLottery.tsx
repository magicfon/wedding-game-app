'use client'

import { memo, useEffect, useState, useRef, useCallback } from 'react'
import { LotteryModeProps, Photo } from './types'
import { getPhotoUrl } from '@/lib/photo-utils'

const DESIGN_WIDTH = 1920
const DESIGN_HEIGHT = 1080
const CHAMBER_RADIUS = 350
const CHAMBER_CENTER_X = DESIGN_WIDTH / 2
const CHAMBER_CENTER_Y = DESIGN_HEIGHT / 2 - 100
const PHOTO_SIZE = 80
const BOUNCE_SPEED = 1

interface BouncingPhoto {
  id: number
  photo: Photo
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

// 中獎揭曉組件
interface WinnerRevealProps {
  winners: BouncingPhoto[]
  onComplete: () => void
}

const WinnerReveal = memo(({ winners, onComplete }: WinnerRevealProps) => {
  useEffect(() => {
    const timer = setTimeout(onComplete, 3000) // 3秒後轉場
    return () => clearTimeout(timer)
  }, [onComplete])

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center z-50 animate-in zoom-in duration-500">
      {/* 標題 */}
      <h2 className="text-5xl font-bold text-white mb-12 animate-pulse drop-shadow-lg">
        🎰 中獎名單 🎰
      </h2>

      {/* 中獎者列表 */}
      <div className="flex items-end justify-center gap-8 flex-wrap">
        {winners.map((winner, index) => (
          <div
            key={winner.id}
            className="relative animate-in zoom-in duration-500"
            style={{
              animationDelay: `${index * 300}ms`
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
    </div>
  )
})
WinnerReveal.displayName = 'WinnerReveal'

export const LotteryMachineLottery = memo(({
  photos,
  winnerPhoto,
  winnerIndex,
  onAnimationComplete,
  isAnimating,
  scale
}: LotteryModeProps) => {
  const [bouncingPhotos, setBouncingPhotos] = useState<BouncingPhoto[]>([])
  const [drawnWinners, setDrawnWinners] = useState<BouncingPhoto[]>([])
  const [showWinnerReveal, setShowWinnerReveal] = useState(false)
  const [animationPhase, setAnimationPhase] = useState<'idle' | 'bouncing' | 'drawing' | 'complete'>('idle')

  const rafRef = useRef<number | null>(null)
  const photoIdRef = useRef(0)
  const bouncingPhotosRef = useRef<BouncingPhoto[]>([])
  const winnersDrawnRef = useRef(0)

  // 預設抽出 3 位中獎者（可以從外部傳入或從 API 獲取）
  const winnersPerDraw = 3

  // 初始化照片
  const initPhotos = useCallback(() => {
    const newPhotos: BouncingPhoto[] = []
    for (let i = 0; i < photos.length; i++) {
      const angle = Math.random() * Math.PI * 2
      const radius = Math.random() * (CHAMBER_RADIUS - PHOTO_SIZE / 2)
      newPhotos.push({
        id: photoIdRef.current++,
        photo: photos[i],
        x: CHAMBER_CENTER_X + Math.cos(angle) * radius,
        y: CHAMBER_CENTER_Y + Math.sin(angle) * radius,
        vx: (Math.random() - 0.5) * 4 * BOUNCE_SPEED,
        vy: (Math.random() - 0.5) * 4 * BOUNCE_SPEED,
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
    setBouncingPhotos(newPhotos)
    bouncingPhotosRef.current = newPhotos
    setDrawnWinners([])
    setAnimationPhase('idle')
  }, [photos])

  // 物理模擬：照片彈跳
  const updatePhysics = useCallback(() => {
    setBouncingPhotos(prevPhotos => {
      const newPhotos = prevPhotos.map(photo => {
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

      // 同步 ref
      bouncingPhotosRef.current = newPhotos
      return newPhotos
    })
  }, [])

  // 開始抽獎
  const startDrawing = useCallback(() => {
    setAnimationPhase('drawing')

    // 重置計數器
    winnersDrawnRef.current = 0
    const totalWinners = winnersPerDraw

    const drawNextWinner = () => {
      const currentDrawn = winnersDrawnRef.current

      if (currentDrawn >= totalWinners) {
        // 抽獎完成
        setAnimationPhase('complete')
        setTimeout(() => {
          setShowWinnerReveal(true)
        }, 1000)
        return
      }

      // 從 ref 中獲取當前照片列表
      const currentPhotos = bouncingPhotosRef.current
      const availablePhotos = currentPhotos.filter(p => !p.isFlyingOut && !p.isWinner)

      if (availablePhotos.length === 0) {
        // 沒有可用的照片，結束抽獎
        setAnimationPhase('complete')
        setTimeout(() => {
          setShowWinnerReveal(true)
        }, 1000)
        return
      }

      const randomIndex = Math.floor(Math.random() * availablePhotos.length)
      const winnerPhoto = availablePhotos[randomIndex]

      // 計算目標位置（中獎者顯示區）
      const winnerOrder = currentDrawn + 1
      const spacing = 300
      const startX = (DESIGN_WIDTH - (totalWinners * spacing)) / 2 + spacing / 2
      const targetX = startX + (winnerOrder - 1) * spacing
      const targetY = DESIGN_HEIGHT - 200

      // 更新照片狀態
      setBouncingPhotos(prevPhotos => {
        const newPhotos = prevPhotos.map(p => {
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

        // 同步 ref
        bouncingPhotosRef.current = newPhotos

        return newPhotos
      })

      // 添加到中獎者列表（在下一個 tick 執行）
      setTimeout(() => {
        setDrawnWinners(prev => [...prev, winnerPhoto])
      }, 50)

      // 增加計數器
      winnersDrawnRef.current++

      // 1.5秒後抽下一個
      setTimeout(drawNextWinner, 1500)
    }

    drawNextWinner()
  }, [winnersPerDraw])

  // 動畫循環
  useEffect(() => {
    if (!isAnimating) return

    // 初始化照片
    initPhotos()
    setAnimationPhase('bouncing')

    // 3秒後開始抽獎
    const drawTimeout = setTimeout(() => {
      startDrawing()
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
    }
  }, [isAnimating, initPhotos, updatePhysics, startDrawing])

  // 中獎揭曉完成後的回調
  const handleRevealComplete = () => {
    // 使用第一個中獎者調用回調（保持與其他動畫模式一致）
    if (drawnWinners.length > 0) {
      onAnimationComplete(drawnWinners[0].photo)
    }
  }

  // 顯示中獎揭曉
  if (showWinnerReveal && drawnWinners.length > 0) {
    return <WinnerReveal winners={drawnWinners} onComplete={handleRevealComplete} />
  }

  return (
    <div className="relative flex flex-col items-center justify-center h-full">
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
      {bouncingPhotos.map(photo => (
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
            src={getPhotoUrl(photo.photo, 'medium')}
            alt={photo.photo.display_name}
            className="w-full h-full object-cover rounded-lg shadow-lg border-2 border-white/50"
          />
        </div>
      ))}

      {/* 中獎者顯示區（動畫過程中） */}
      {drawnWinners.length > 0 && !showWinnerReveal && (
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

      {animationPhase === 'complete' && !showWinnerReveal && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
          <div className="text-6xl font-bold text-white animate-bounce drop-shadow-2xl">
            🎉 抽獎完成 🎉
          </div>
        </div>
      )}
    </div>
  )
})

LotteryMachineLottery.displayName = 'LotteryMachineLottery'
