'use client'

import { memo, useEffect, useState, useRef, useCallback } from 'react'
import { LotteryModeProps, Photo } from './types'
import { getPhotoUrl } from '@/lib/photo-utils'

const DESIGN_WIDTH = 1920
const DESIGN_HEIGHT = 1080
const MACHINE_WIDTH = 800
const MACHINE_HEIGHT = 600
const PHOTO_SIZE = 100

interface BouncingPhoto {
    id: string
    photo: Photo
    x: number
    y: number
    vx: number
    vy: number
    rotation: number
    rotationSpeed: number
}

// 中獎揭曉組件
interface WinnerRevealProps {
    photo: Photo
    onComplete: () => void
}

const WinnerReveal = memo(({ photo, onComplete }: WinnerRevealProps) => {
    useEffect(() => {
        const timer = setTimeout(onComplete, 2000)
        return () => clearTimeout(timer)
    }, [onComplete])

    return (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-50 animate-in zoom-in duration-500">
            <h2 className="text-5xl font-bold text-white mb-8 animate-pulse drop-shadow-lg">
                🎰 中獎了！🎰
            </h2>
            <div className="relative">
                <div className="absolute -inset-8 bg-gradient-to-r from-yellow-400 via-orange-400 to-pink-400 rounded-3xl blur-2xl opacity-70 animate-pulse" />
                <div className="relative rounded-3xl overflow-hidden border-8 border-yellow-400 shadow-2xl"
                    style={{ width: '600px', height: '600px' }}
                >
                    <img
                        src={photo.image_url}
                        alt={photo.display_name}
                        className="w-full h-full object-cover"
                    />
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

export const LotteryMachineLottery = memo(({
    photos,
    winnerPhoto,
    winnerIndex,
    onAnimationComplete,
    isAnimating,
    scale
}: LotteryModeProps) => {
    const [bouncingPhotos, setBouncingPhotos] = useState<BouncingPhoto[]>([])
    const [drawnPhotos, setDrawnPhotos] = useState<Photo[]>([])
    const [showWinnerReveal, setShowWinnerReveal] = useState(false)
    const [isDrawing, setIsDrawing] = useState(false)
    const animationRef = useRef<number | null>(null)
    const photoIdRef = useRef(0)
    const drawTimeoutRef = useRef<NodeJS.Timeout | null>(null)

    // 初始化彈跳照片
    const initBouncingPhotos = useCallback(() => {
        const initialPhotos: BouncingPhoto[] = photos.map(photo => ({
            id: `photo-${photoIdRef.current++}`,
            photo,
            x: Math.random() * (MACHINE_WIDTH - PHOTO_SIZE),
            y: Math.random() * (MACHINE_HEIGHT - PHOTO_SIZE),
            vx: (Math.random() - 0.5) * 8,
            vy: (Math.random() - 0.5) * 8,
            rotation: Math.random() * 360,
            rotationSpeed: (Math.random() - 0.5) * 10
        }))
        setBouncingPhotos(initialPhotos)
    }, [photos])

    // 物理模擬更新
    const updatePhysics = useCallback(() => {
        setBouncingPhotos(prev => prev.map(p => {
            let newX = p.x + p.vx
            let newY = p.y + p.vy
            let newVx = p.vx
            let newVy = p.vy
            let newRotation = p.rotation + p.rotationSpeed

            // 邊界碰撞
            if (newX <= 0 || newX >= MACHINE_WIDTH - PHOTO_SIZE) {
                newVx = -p.vx * 0.9 // 稍微減速
                newX = newX <= 0 ? 0 : MACHINE_WIDTH - PHOTO_SIZE
            }
            if (newY <= 0 || newY >= MACHINE_HEIGHT - PHOTO_SIZE) {
                newVy = -p.vy * 0.9
                newY = newY <= 0 ? 0 : MACHINE_HEIGHT - PHOTO_SIZE
            }

            return {
                ...p,
                x: newX,
                y: newY,
                vx: newVx,
                vy: newVy,
                rotation: newRotation
            }
        }))
    }, [])

    // 開始抽獎流程
    useEffect(() => {
        if (!isAnimating || photos.length === 0) return

        setDrawnPhotos([])
        setShowWinnerReveal(false)
        setIsDrawing(false)
        initBouncingPhotos()

        // 8秒後開始抽獎
        drawTimeoutRef.current = setTimeout(() => {
            setIsDrawing(true)
            startDrawingSequence()
        }, 8000)

        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current)
            }
            if (drawTimeoutRef.current) {
                clearTimeout(drawTimeoutRef.current)
            }
        }
    }, [isAnimating, photos, initBouncingPhotos])

    // 物理動畫循環
    useEffect(() => {
        if (!isAnimating || isDrawing) return

        const animate = () => {
            updatePhysics()
            animationRef.current = requestAnimationFrame(animate)
        }
        animationRef.current = requestAnimationFrame(animate)

        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current)
            }
        }
    }, [isAnimating, isDrawing, updatePhysics])

    // 抽獎序列
    const startDrawingSequence = () => {
        const drawSequence = async () => {
            // 隨機選擇一些照片先抽出（非中獎者）
            const nonWinners = photos.filter((_, idx) => idx !== winnerIndex)
            const shuffled = [...nonWinners].sort(() => Math.random() - 0.5)
            const toDraw = shuffled.slice(0, Math.min(5, nonWinners.length))

            for (const photo of toDraw) {
                await new Promise(resolve => setTimeout(resolve, 800))
                setDrawnPhotos(prev => [...prev, photo])
                setBouncingPhotos(prev => prev.filter(p => p.photo.id !== photo.id))
            }

            // 最後抽出中獎者
            await new Promise(resolve => setTimeout(resolve, 1000))
            setDrawnPhotos(prev => [...prev, winnerPhoto])
            setBouncingPhotos([])
            
            // 1.5秒後顯示中獎揭曉
            setTimeout(() => {
                setShowWinnerReveal(true)
            }, 1500)
        }

        drawSequence()
    }

    const handleRevealComplete = () => {
        onAnimationComplete(winnerPhoto)
    }

    // 顯示中獎揭曉
    if (showWinnerReveal) {
        return <WinnerReveal photo={winnerPhoto} onComplete={handleRevealComplete} />
    }

    return (
        <div className="relative flex flex-col items-center justify-center h-full">
            {/* 標題 */}
            <div className="absolute top-20 text-center z-10">
                <h2 className="text-4xl font-bold text-white drop-shadow-lg animate-pulse">
                    {isDrawing ? '🎯 抽獎中...' : '🎰 彩票機'}
                </h2>
                <p className="text-xl text-white/80 mt-2">
                    {isDrawing ? `已抽出 ${drawnPhotos.length} 張` : '照片在腔體內彈跳...'}
                </p>
            </div>

            {/* 彩票機腔體 */}
            <div 
                className="relative rounded-3xl overflow-hidden border-8 border-white shadow-2xl bg-gradient-to-br from-purple-900/50 to-pink-900/50"
                style={{
                    width: `${MACHINE_WIDTH}px`,
                    height: `${MACHINE_HEIGHT}px`
                }}
            >
                {/* 背景網格 */}
                <div className="absolute inset-0 opacity-10">
                    <div className="w-full h-full" style={{
                        backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
                        backgroundSize: '40px 40px'
                    }} />
                </div>

                {/* 彈跳的照片 */}
                {bouncingPhotos.map(p => (
                    <div
                        key={p.id}
                        className="absolute rounded-xl overflow-hidden border-2 border-white/50 shadow-lg"
                        style={{
                            left: `${p.x}px`,
                            top: `${p.y}px`,
                            width: `${PHOTO_SIZE}px`,
                            height: `${PHOTO_SIZE}px`,
                            transform: `rotate(${p.rotation}deg)`,
                            transition: 'none'
                        }}
                    >
                        <img
                            src={getPhotoUrl(p.photo, 'small')}
                            alt={p.photo.display_name}
                            className="w-full h-full object-cover"
                        />
                    </div>
                ))}

                {/* 抽出的照片區域 */}
                {drawnPhotos.length > 0 && (
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-4">
                        <div className="flex gap-3 overflow-x-auto pb-2">
                            {drawnPhotos.map((photo, idx) => (
                                <div
                                    key={photo.id}
                                    className="flex-shrink-0 rounded-lg overflow-hidden border-2 border-yellow-400 shadow-lg animate-in slide-in-from-bottom duration-300"
                                    style={{
                                        width: '80px',
                                        height: '80px',
                                        animationDelay: `${idx * 100}ms`
                                    }}
                                >
                                    <img
                                        src={getPhotoUrl(photo, 'small')}
                                        alt={photo.display_name}
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* 底部提示 */}
            <div className="absolute bottom-12 text-center">
                <p className="text-2xl text-white font-bold drop-shadow-lg animate-bounce">
                    {isDrawing ? '✨ 看看誰會中獎？' : '🎲 彩票機運轉中...'}
                </p>
            </div>
        </div>
    )
})

LotteryMachineLottery.displayName = 'LotteryMachineLottery'
