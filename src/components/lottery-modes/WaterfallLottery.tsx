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
    const [showWinner, setShowWinner] = useState(false)
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
        setShowWinner(false)

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

            // 1.5 秒後顯示中獎畫面
            setTimeout(() => {
                setShowWinner(true)
                setFallingPhotos([])

                setTimeout(() => {
                    onAnimationComplete(winnerPhoto)
                }, 800)
            }, 1500)
        }, 8000)

        return () => {
            clearInterval(spawnInterval)
            clearTimeout(catchTimeout)
            if (animationRef.current) {
                clearTimeout(animationRef.current)
            }
        }
    }, [isAnimating, photos, winnerPhoto, onAnimationComplete])

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
                    const elapsed = Date.now() - falling.startTime
                    const progress = Math.min(elapsed / FALL_DURATION, 1)

                    // 如果正在抓住且是中獎照片，改變動畫
                    const shouldCatch = catchingWinner && isWinnerPhoto && progress > 0.4

                    return (
                        <div
                            key={falling.id}
                            className={`absolute transition-all ${shouldCatch
                                ? 'duration-700 ease-out scale-150 z-50'
                                : 'duration-100 ease-linear'
                                }`}
                            style={{
                                left: shouldCatch
                                    ? 'calc(50% - 90px)'
                                    : `${trackPositions[falling.track]}px`,
                                top: shouldCatch
                                    ? '30%'
                                    : `${progress * 100}%`,
                                width: `${PHOTO_SIZE}px`,
                                height: `${PHOTO_SIZE}px`,
                                opacity: shouldCatch ? 1 : (1 - progress * 0.5)
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

                {/* 中獎者大圖 */}
                {showWinner && (
                    <div className="absolute inset-0 flex items-center justify-center animate-in zoom-in duration-500">
                        <div className="relative">
                            <div className="absolute -inset-8 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 rounded-3xl blur-2xl opacity-60 animate-pulse" />
                            <img
                                src={winnerPhoto.image_url}
                                alt={winnerPhoto.display_name}
                                className="relative w-96 h-96 object-cover rounded-3xl border-8 border-white shadow-2xl"
                            />
                            <div className="absolute -bottom-16 left-1/2 -translate-x-1/2 whitespace-nowrap">
                                <p className="text-3xl font-bold text-white drop-shadow-lg">
                                    🌊 {winnerPhoto.display_name} 🌊
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* 提示文字 */}
            {!showWinner && (
                <div className="absolute bottom-12 text-center">
                    <p className="text-2xl text-white font-bold drop-shadow-lg">
                        {catchingWinner ? '✨ 捕捉中...' : '🌊 雨落繽紛...'}
                    </p>
                </div>
            )}
        </div>
    )
})

WaterfallLottery.displayName = 'WaterfallLottery'
