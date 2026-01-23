'use client'

import { memo, useEffect, useState, useRef, useCallback } from 'react'
import { LotteryModeProps, Photo } from './types'
import { getPhotoUrl } from '@/lib/photo-utils'

const DESIGN_WIDTH = 1920
const DESIGN_HEIGHT = 1080
const CHAMBER_RADIUS = 400
const CHAMBER_CENTER_X = 500
const CHAMBER_CENTER_Y = DESIGN_HEIGHT / 2 - 100
const PHOTO_SIZE = 80
const BOUNCE_SPEED = 1
const PIPE_WIDTH = 120
const PIPE_HEIGHT = 200

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
  pipePhase?: 'entering' | 'exiting' | 'complete'
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
    setAnimationPhase('idle')
  }, [photos])

  // 物理模擬：照片彈跳
  const updatePhysics = useCallback(() => {
    setBouncingPhotos(prevPhotos => {
      const newPhotos = prevPhotos.map(photo => {
        if (photo.isFlyingOut && photo.pipePhase) {
          // 管道動畫
          const pipeEntranceX = CHAMBER_CENTER_X + CHAMBER_RADIUS - 50
          const pipeEntranceY = CHAMBER_CENTER_Y

          if (photo.pipePhase === 'entering') {
            // 進入管道：從腔體移動到管道入口
            const dx = pipeEntranceX - photo.x
            const dy = pipeEntranceY - photo.y
            const dist = Math.sqrt(dx * dx + dy * dy)

            if (dist < 20) {
              // 到達管道入口，開始進入管道
              return {
                ...photo,
                x: pipeEntranceX,
                y: pipeEntranceY,
                pipePhase: 'exiting' as const
              }
            }

            // 繼續移動到管道入口
            const speed = 10
            return {
              ...photo,
              x: photo.x + (dx / dist) * speed,
              y: photo.y + (dy / dist) * speed,
              angle: photo.angle + photo.vAngle
            }
          } else if (photo.pipePhase === 'exiting') {
            // 從管道跑出：向右移動
            if (photo.x > photo.targetX) {
              // 跑出管道，到達目標位置
              return {
                ...photo,
                x: photo.targetX,
                y: photo.targetY,
                opacity: 1,
                scale: photo.isWinner ? 2 : 1.5,
                pipePhase: 'complete' as const
              }
            }

            // 向右跑出
            return {
              ...photo,
              x: photo.x + 15,
              angle: photo.angle + photo.vAngle
            }
          } else {
            // 完成狀態
            return {
              ...photo,
              x: photo.targetX,
              y: photo.targetY,
              opacity: 1,
              scale: photo.isWinner ? 2 : 1.5,
              pipePhase: 'complete' as const
            }
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
        return
      }

      // 從 ref 中獲取當前照片列表
      const currentPhotos = bouncingPhotosRef.current
      const availablePhotos = currentPhotos.filter(p => !p.isFlyingOut && !p.isWinner)

      if (availablePhotos.length === 0) {
        // 沒有可用的照片，結束抽獎
        setAnimationPhase('complete')
        return
      }

      const randomIndex = Math.floor(Math.random() * availablePhotos.length)
      const winnerPhoto = availablePhotos[randomIndex]

      // 計算目標位置（中獎者顯示區）- 從右到左排列
      const winnerOrder = currentDrawn + 1
      const spacing = 300
      // 從右邊開始排列：5,4,3,2,1
      const startX = DESIGN_WIDTH - 200
      const targetX = startX - (winnerOrder - 1) * spacing
      const targetY = DESIGN_HEIGHT / 2

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
              targetY,
              pipePhase: 'entering' as const
            }
          }
          return p
        })

        // 同步 ref
        bouncingPhotosRef.current = newPhotos

        return newPhotos
      })

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

      {/* 管道 */}
      <div
        className="absolute overflow-hidden rounded-lg"
        style={{
          left: `${CHAMBER_CENTER_X + CHAMBER_RADIUS - 50}px`,
          top: `${CHAMBER_CENTER_Y - PIPE_HEIGHT / 2}px`,
          width: `${PIPE_HEIGHT}px`,
          height: `${PIPE_WIDTH}px`
        }}
      >
        {/* 管道背景（半透明玻璃效果） */}
        <div className="absolute inset-0 bg-gradient-to-r from-gray-700 via-gray-600 to-gray-700 rounded-lg border-4 border-gray-500/50" style={{ opacity: 0.7 }}>
          {/* 管道光澤 */}
          <div className="absolute inset-0 bg-gradient-to-b from-gray-600 via-gray-500 to-gray-600 opacity-30" />

          {/* 機械閘門 */}
          <div
            className="absolute right-0 top-1/2 -translate-y-1/2 h-20 w-16 bg-gradient-to-b from-gray-500 via-gray-400 to-gray-500 rounded-l-lg border-4 border-gray-600 transition-transform duration-300"
            style={{
              transform: animationPhase === 'drawing' ? 'translateX(0)' : 'translateX(100%)'
            }}
          >
            {/* 開把手 */}
            <div className="absolute -left-8 top-1/2 -translate-y-1/2 h-4 w-8 bg-gray-400 rounded-l-lg border-2 border-gray-500" />
          </div>
        </div>
      </div>

      {/* 彈跳的照片 */}
      {bouncingPhotos.map(photo => {
        // 檢查是否在管道中
        const inPipe = photo.isFlyingOut && photo.pipePhase && photo.pipePhase !== 'entering'

        // 管道中的照片
        if (inPipe && photo.pipePhase !== 'complete') {
          return (
            <div
              key={photo.id}
              className="absolute transition-all animate-spin"
              style={{
                left: `${photo.x}px`,
                top: `${CHAMBER_CENTER_Y - PHOTO_SIZE / 2}px`,
                width: `${PHOTO_SIZE}px`,
                height: `${PHOTO_SIZE}px`,
                transform: `rotate(${photo.angle}deg)`,
                opacity: 0.8
              }}
            >
              <img
                src={getPhotoUrl(photo.photo, 'medium')}
                alt={photo.photo.display_name}
                className="w-full h-full object-cover rounded-lg shadow-lg border-2 border-white/50"
              />
            </div>
          )
        }

        // 完成管道動畫的照片 - 顯示為中獎者
        if (photo.isWinner && photo.pipePhase === 'complete') {
          return (
            <div
              key={photo.id}
              className="relative animate-in zoom-in duration-500"
              style={{
                left: `${photo.x - 96}px`,
                top: `${photo.y - 96}px`,
                width: '192px',
                height: '192px'
              }}
            >
              {/* 發光效果 */}
              <div className="absolute -inset-4 bg-gradient-to-r from-yellow-400 via-orange-400 to-pink-400 rounded-2xl blur-xl opacity-70 animate-pulse" />

              {/* 照片 */}
              <div className="relative">
                <img
                  src={getPhotoUrl(photo.photo, 'medium')}
                  alt={photo.photo.display_name}
                  className="w-48 h-48 object-cover rounded-2xl border-4 border-yellow-400 shadow-2xl"
                />
                <div className="absolute -top-6 -right-6 w-12 h-12 bg-yellow-400 rounded-full flex items-center justify-center text-2xl font-bold text-orange-900 shadow-lg">
                  {photo.winnerOrder}
                </div>
              </div>

              {/* 名稱 */}
              <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 text-center">
                <div className="text-white text-xl font-bold drop-shadow-lg">
                  {photo.photo.display_name}
                </div>
                <div className="text-yellow-300 text-sm">
                  第 {photo.winnerOrder} 位中獎者
                </div>
              </div>
            </div>
          )
        }

        // 正常彈跳的照片（添加軌跡效果）
        return (
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
            {/* 照片軌跡 */}
            <div
              className="absolute inset-0 rounded-full opacity-30"
              style={{
                width: `${PHOTO_SIZE * 1.5}px`,
                height: `${PHOTO_SIZE * 1.5}px`,
                left: `${-(PHOTO_SIZE * 0.25)}px`,
                top: `${-(PHOTO_SIZE * 0.25)}px`
              }}
            />
            <img
              src={getPhotoUrl(photo.photo, 'medium')}
              alt={photo.photo.display_name}
              className="w-full h-full object-cover rounded-lg shadow-lg border-2 border-white/50"
            />
          </div>
        )
      })}

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
            已抽出 {bouncingPhotos.filter(p => p.isWinner).length} / {winnersPerDraw} 位
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
  )
})

LotteryMachineLottery.displayName = 'LotteryMachineLottery'
