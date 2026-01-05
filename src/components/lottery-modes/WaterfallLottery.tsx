'use client'

import { memo, useEffect, useState, useRef, useMemo } from 'react'
import { LotteryModeProps, Photo } from './types'
import { getPhotoUrl } from '@/lib/photo-utils'

const TRACK_COUNT = 6
const PHOTO_SIZE = 120
const FALL_DURATION = 4000 // 每張照片下落時間 (ms)

interface FallingPhoto {
    id: string
    photo: Photo
    track: number
    startTime: number
    delay: number
}

// 中獎揭曉組件
interface WinnerRevealProps {
    photo: Photo
    onComplete: () => void
}

const WinnerReveal = memo(({ photo, onComplete }: WinnerRevealProps) => {
    useEffect(() => {
        const timer = setTimeout(onComplete, 2000) // 2秒後轉場
        return () => clearTimeout(timer)
    }, [onComplete])

    return (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-50 animate-in zoom-in duration-500">
            {/* 標題 */}
            <h2 className="text-5xl font-bold text-white mb-8 animate-pulse drop-shadow-lg">
                🌊 中獎了！🌊
            </h2>

            {/* 中獎照片 */}
            <div className="relative">
                {/* 發光效果 */}
                <div className="absolute -inset-8 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 rounded-3xl blur-2xl opacity-70 animate-pulse" />

                {/* 照片 */}
                <div className="relative rounded-3xl overflow-hidden border-8 border-yellow-400 shadow-2xl"
                    style={{ width: '600px', height: '600px' }}
                >
                    <img
                        src={photo.image_url}
                        alt={photo.display_name}
                        className="w-full h-full object-cover"
                    />
                    {/* 上傳者資訊 */}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-8">
                        <div className="flex items-center gap-4">
                            <img
                                src={photo.avatar_url || '/default-avatar.png'}
                                alt={photo.display_name}
                                className="w-16 h-16 rounded-full border-4 border-yellow-400"
                            />
                            <span className="text-white text-3xl font-bold">
                                {photo.display_name}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
})
WinnerReveal.displayName = 'WinnerReveal'

export const WaterfallLottery = memo(({
    photos,
    winnerPhoto,
    winnerIndex,
    onAnimationComplete,
    isAnimating,
    scale
}: LotteryModeProps) => {
    const [fallingPhotos, setFallingPhotos] = useState<FallingPhoto[]>([])
    const [catchingWinner, setCatchingWinner] = useState(false)
    const [showWinnerReveal, setShowWinnerReveal] = useState(false)
    const containerRef = useRef<HTMLDivElement>(null)
    const animationRef = useRef<NodeJS.Timeout | null>(null)
    const photoIdRef = useRef(0)

    // 計算軌道位置
    const trackPositions = useMemo(() => {
        const containerWidth = 1200
        const trackWidth = containerWidth / TRACK_COUNT
        return Array.from({ length: TRACK_COUNT }, (_, i) =>
            (i * trackWidth) + (trackWidth - PHOTO_SIZE) / 2
        )
    }, [])

    useEffect(() => {
        if (!isAnimating || photos.length === 0) return

        setFallingPhotos([])
        setCatchingWinner(false)
        setShowWinnerReveal(false)

        // 持續生成下落的照片
        const spawnPhoto = () => {
            const track = Math.floor(Math.random() * TRACK_COUNT)
            const randomPhoto = photos[Math.floor(Math.random() * photos.length)]

            const newFalling: FallingPhoto = {
                id: `falling-${photoIdRef.current++}`,
                photo: randomPhoto,
                track,
                startTime: Date.now(),
                delay: 0
            }

            setFallingPhotos(prev => [...prev.slice(-30), newFalling]) // 最多保留 30 張
        }

        // 每 300ms 生成一張
        const spawnInterval = setInterval(spawnPhoto, 300)

        // 8 秒後開始 "抓住" 中獎照片
        const catchTimeout = setTimeout(() => {
            setCatchingWinner(true)
            clearInterval(spawnInterval)

            // 添加最終的中獎照片
            const winnerFalling: FallingPhoto = {
                id: 'winner-final',
                photo: winnerPhoto,
                track: Math.floor(TRACK_COUNT / 2),
                startTime: Date.now(),
                delay: 0
            }
            setFallingPhotos(prev => [...prev, winnerFalling])

            // 1.5 秒後顯示中獎揭曉
            setTimeout(() => {
                setShowWinnerReveal(true)
                setFallingPhotos([])
            }, 1500)
        }, 8000)

        return () => {
            clearInterval(spawnInterval)
            clearTimeout(catchTimeout)
            if (animationRef.current) {
                clearTimeout(animationRef.current)
            }
        }
    }, [isAnimating, photos, winnerPhoto])

    const handleRevealComplete = () => {
        onAnimationComplete(winnerPhoto)
    }

    // 顯示中獎揭曉
    if (showWinnerReveal) {
        return <WinnerReveal photo={winnerPhoto} onComplete={handleRevealComplete} />
    }

    return (
        <div
            ref={containerRef}
            className="relative flex flex-col items-center justify-center h-full overflow-hidden"
        >
            {/* 下落區域 */}
            <div
                className="relative"
                style={{
                    width: '1200px',
                    height: '800px'
                }}
            >
                {/* 軌道背景 */}
                {trackPositions.map((left, i) => (
                    <div
                        key={`track-${i}`}
                        className="absolute top-0 bottom-0 bg-white/5 rounded-lg"
                        style={{
                            left: `${left - 10}px`,
                            width: `${PHOTO_SIZE + 20}px`
                        }}
                    />
                ))}

                {/* 下落的照片 */}
                {fallingPhotos.map(falling => {
                    const isWinnerPhoto = falling.id === 'winner-final'

                    // 使用純 CSS 動畫，不再在 render 中計算位置
                    const shouldCatch = catchingWinner && isWinnerPhoto

                    return (
                        <div
                            key={falling.id}
                            className={`absolute lottery-animated ${shouldCatch
                                ? 'transition-all duration-700 ease-out scale-150 z-50'
                                : 'falling-photo'
                                }`}
                            style={{
                                left: shouldCatch
                                    ? 'calc(50% - 90px)'
                                    : `${trackPositions[falling.track]}px`,
                                top: shouldCatch ? '30%' : undefined,
                                width: `${PHOTO_SIZE}px`,
                                height: `${PHOTO_SIZE}px`,
                                animationDelay: shouldCatch ? undefined : `${falling.delay}ms`,
                                // 捕捉時暫停下落動畫
                                animationPlayState: shouldCatch ? 'paused' : 'running'
                            }}
                        >
                            <img
                                src={getPhotoUrl(falling.photo, 'medium')}
                                alt={falling.photo.display_name}
                                className={`w-full h-full object-cover rounded-xl ${shouldCatch ? 'border-4 border-yellow-400 shadow-2xl' : 'border-2 border-white/50'
                                    }`}
                            />
                        </div>
                    )
                })}
            </div>

            {/* 提示文字 */}
            <div className="absolute bottom-12 text-center">
                <p className="text-2xl text-white font-bold drop-shadow-lg">
                    {catchingWinner ? '✨ 捕捉中...' : '🌊 雨落繽紛...'}
                </p>
            </div>
        </div>
    )
})

WaterfallLottery.displayName = 'WaterfallLottery'
