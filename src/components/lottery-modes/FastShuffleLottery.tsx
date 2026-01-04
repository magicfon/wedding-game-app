'use client'

import { memo, useEffect, useState, useRef } from 'react'
import { LotteryModeProps, Photo } from './types'
import { getPhotoUrl } from '@/lib/photo-utils'

// 設計尺寸
const DESIGN_WIDTH = 1920
const DESIGN_HEIGHT = 1080

interface ShufflePhotoProps {
    photo: Photo
    size: number
}

const ShufflePhoto = memo(({ photo, size }: ShufflePhotoProps) => {
    return (
        <div
            className="relative rounded-3xl overflow-hidden shadow-2xl border-8 border-white"
            style={{
                width: `${size}px`,
                height: `${size}px`
            }}
        >
            <img
                src={getPhotoUrl(photo, 'large')}
                alt={photo.display_name}
                className="w-full h-full object-cover"
                loading="eager"
            />
            {/* 上傳者資訊 */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6">
                <div className="flex items-center gap-4">
                    <img
                        src={photo.avatar_url || '/default-avatar.png'}
                        alt={photo.display_name}
                        className="w-14 h-14 rounded-full border-2 border-white"
                    />
                    <span className="text-white text-2xl font-bold truncate">
                        {photo.display_name}
                    </span>
                </div>
            </div>
        </div>
    )
})
ShufflePhoto.displayName = 'ShufflePhoto'

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
                🎊 中獎了！🎊
            </h2>

            {/* 中獎照片 */}
            <div className="relative">
                {/* 發光效果 */}
                <div className="absolute -inset-8 bg-gradient-to-r from-yellow-400 via-orange-400 to-pink-400 rounded-3xl blur-2xl opacity-70 animate-pulse" />

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

export const FastShuffleLottery = memo(({
    photos,
    winnerPhoto,
    winnerIndex,
    onAnimationComplete,
    isAnimating,
    scale
}: LotteryModeProps) => {
    const [displayedPhoto, setDisplayedPhoto] = useState<Photo>(photos[0])
    const [isSlowingDown, setIsSlowingDown] = useState(false)
    const [showWinnerReveal, setShowWinnerReveal] = useState(false)
    const animationRef = useRef<NodeJS.Timeout | null>(null)
    const stepRef = useRef(0)

    // 照片大小
    const photoSize = Math.min(700, DESIGN_WIDTH * 0.4)

    useEffect(() => {
        if (!isAnimating || photos.length === 0) return

        // 重置狀態
        setShowWinnerReveal(false)
        setIsSlowingDown(false)

        // 動畫參數
        const schedule: { photoIndex: number; delay: number }[] = []
        let currentDelay = 40 // 初始速度極快
        const maxDelay = 600
        const totalDuration = 10000 // 10秒
        let totalTime = 0

        // 生成時間表
        while (totalTime < totalDuration - 2000) { // 留 2 秒給減速
            const randomIndex = Math.floor(Math.random() * photos.length)
            schedule.push({ photoIndex: randomIndex, delay: currentDelay })
            totalTime += currentDelay
            currentDelay = Math.min(maxDelay, currentDelay * 1.05)
        }

        // 最後 5 步確保落在 winner
        const finalSteps = 8
        for (let i = 0; i < finalSteps; i++) {
            let photoIdx: number
            if (i < finalSteps - 1) {
                // 前面幾步隨機（但避免連續相同）
                do {
                    photoIdx = Math.floor(Math.random() * photos.length)
                } while (photoIdx === winnerIndex)
            } else {
                // 最後一步必須是 winner
                photoIdx = winnerIndex
            }
            const delay = 300 + i * 150 // 300, 450, 600, 750, ...
            schedule.push({ photoIndex: photoIdx, delay })
            totalTime += delay
        }

        console.log(`🔀 FastShuffle: ${schedule.length} 步, 預計 ${(totalTime / 1000).toFixed(2)}s`)

        // 執行動畫
        stepRef.current = 0

        const runStep = () => {
            if (stepRef.current >= schedule.length) {
                // 動畫結束，顯示中獎揭曉
                setDisplayedPhoto(winnerPhoto)
                setShowWinnerReveal(true)
                return
            }

            const step = schedule[stepRef.current]
            setDisplayedPhoto(photos[step.photoIndex])

            // 檢測是否進入減速階段
            if (stepRef.current >= schedule.length - 10) {
                setIsSlowingDown(true)
            }

            stepRef.current++
            animationRef.current = setTimeout(runStep, step.delay)
        }

        runStep()

        return () => {
            if (animationRef.current) {
                clearTimeout(animationRef.current)
            }
        }
    }, [isAnimating, photos, winnerPhoto, winnerIndex])

    // 中獎揭曉完成後的回調
    const handleRevealComplete = () => {
        onAnimationComplete(winnerPhoto)
    }

    // 顯示中獎揭曉
    if (showWinnerReveal) {
        return <WinnerReveal photo={winnerPhoto} onComplete={handleRevealComplete} />
    }

    return (
        <div className="relative flex flex-col items-center justify-center h-full">
            {/* 發光背景效果 */}
            <div
                className={`absolute rounded-full blur-3xl transition-all duration-500 ${isSlowingDown ? 'bg-yellow-400/40' : 'bg-pink-500/30'
                    }`}
                style={{
                    width: `${photoSize * 1.4}px`,
                    height: `${photoSize * 1.4}px`
                }}
            />

            {/* 照片容器 */}
            <div
                className={`relative z-10 transition-transform duration-300 ${isSlowingDown ? 'scale-105' : 'scale-100'
                    }`}
            >
                <ShufflePhoto
                    photo={displayedPhoto}
                    size={photoSize}
                />
            </div>

            {/* 動態邊框效果 */}
            {isAnimating && (
                <div
                    className="absolute z-0 rounded-3xl animate-pulse"
                    style={{
                        width: `${photoSize + 40}px`,
                        height: `${photoSize + 40}px`,
                        background: `linear-gradient(45deg, 
              rgba(255,215,0,0.6), 
              rgba(255,105,180,0.6), 
              rgba(255,215,0,0.6)
            )`,
                        backgroundSize: '200% 200%',
                        animation: 'gradientShift 1s ease infinite'
                    }}
                />
            )}

            {/* 提示文字 */}
            <div className="absolute bottom-20 text-center z-10">
                <p className="text-3xl text-white font-bold drop-shadow-lg animate-bounce">
                    {isSlowingDown ? '🎯 即將揭曉...' : '🔀 抽選中...'}
                </p>
            </div>
        </div>
    )
})

FastShuffleLottery.displayName = 'FastShuffleLottery'
