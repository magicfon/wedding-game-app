'use client'

import { memo, useEffect, useState, useRef, useMemo } from 'react'
import { LotteryModeProps, Photo } from './types'
import { getPhotoUrl } from '@/lib/photo-utils'

const PHOTO_SIZE = 80
const ORBIT_COUNT = 4 // 軌道數量
const ROTATION_DURATION = 10000 // 10 秒

interface OrbitPhoto {
    photo: Photo
    orbit: number
    angle: number
    isWinner: boolean
}

export const SpiralLottery = memo(({
    photos,
    winnerPhoto,
    winnerIndex,
    onAnimationComplete,
    isAnimating,
    scale
}: LotteryModeProps) => {
    const [rotation, setRotation] = useState(0)
    const [isSlowing, setIsSlowing] = useState(false)
    const [showWinner, setShowWinner] = useState(false)
    const [orbitPhotos, setOrbitPhotos] = useState<OrbitPhoto[]>([])
    const containerRef = useRef<HTMLDivElement>(null)
    const animationRef = useRef<number | null>(null)
    const startTimeRef = useRef<number>(0)

    // 初始化軌道上的照片
    useEffect(() => {
        if (photos.length === 0) return

        const orbits: OrbitPhoto[] = []
        const maxPerOrbit = Math.ceil(photos.length / ORBIT_COUNT)

        photos.forEach((photo, idx) => {
            const orbit = Math.floor(idx / maxPerOrbit)
            const positionInOrbit = idx % maxPerOrbit
            const photosInThisOrbit = Math.min(maxPerOrbit, photos.length - orbit * maxPerOrbit)
            const angle = (positionInOrbit / photosInThisOrbit) * 360

            orbits.push({
                photo,
                orbit: Math.min(orbit, ORBIT_COUNT - 1),
                angle,
                isWinner: photo.id === winnerPhoto.id
            })
        })

        setOrbitPhotos(orbits)
    }, [photos, winnerPhoto])

    // 動畫效果
    useEffect(() => {
        if (!isAnimating || orbitPhotos.length === 0) return

        setRotation(0)
        setIsSlowing(false)
        setShowWinner(false)
        startTimeRef.current = performance.now()

        const animate = (currentTime: number) => {
            const elapsed = currentTime - startTimeRef.current
            const progress = Math.min(elapsed / ROTATION_DURATION, 1)

            // easeOutCubic for slowdown
            const easeOut = 1 - Math.pow(1 - progress, 3)

            // 總旋轉量：5 圈 (1800°)
            const totalRotation = 1800
            const currentRotation = totalRotation * easeOut

            setRotation(currentRotation)

            // 80% 時開始減速效果
            if (progress >= 0.7 && !isSlowing) {
                setIsSlowing(true)
            }

            if (progress < 1) {
                animationRef.current = requestAnimationFrame(animate)
            } else {
                // 動畫結束
                setShowWinner(true)

                setTimeout(() => {
                    onAnimationComplete(winnerPhoto)
                }, 1000)
            }
        }

        animationRef.current = requestAnimationFrame(animate)

        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current)
            }
        }
    }, [isAnimating, orbitPhotos, winnerPhoto, isSlowing, onAnimationComplete])

    // 軌道半徑
    const orbitRadii = useMemo(() => [120, 220, 320, 420], [])

    return (
        <div
            ref={containerRef}
            className="relative flex flex-col items-center justify-center h-full"
        >
            {/* 背景發光 */}
            <div
                className={`absolute rounded-full blur-3xl transition-all duration-1000 ${isSlowing ? 'bg-yellow-400/50 scale-110' : 'bg-purple-500/30'
                    }`}
                style={{
                    width: '600px',
                    height: '600px'
                }}
            />

            {/* 軌道線 */}
            {orbitRadii.map((radius, i) => (
                <div
                    key={`orbit-line-${i}`}
                    className="absolute rounded-full border border-white/20"
                    style={{
                        width: `${radius * 2}px`,
                        height: `${radius * 2}px`
                    }}
                />
            ))}

            {/* 旋轉容器 */}
            <div
                className="absolute transition-none"
                style={{
                    transform: `rotate(${rotation}deg)`,
                    willChange: 'transform'
                }}
            >
                {orbitPhotos.map((orbitPhoto, idx) => {
                    const radius = orbitRadii[orbitPhoto.orbit]
                    const angleRad = (orbitPhoto.angle * Math.PI) / 180
                    const x = Math.cos(angleRad) * radius
                    const y = Math.sin(angleRad) * radius

                    return (
                        <div
                            key={orbitPhoto.photo.id}
                            className={`absolute transition-all duration-500 ${showWinner && orbitPhoto.isWinner
                                ? 'scale-0 opacity-0'
                                : showWinner
                                    ? 'opacity-30 scale-75'
                                    : ''
                                }`}
                            style={{
                                left: `calc(50% + ${x}px - ${PHOTO_SIZE / 2}px)`,
                                top: `calc(50% + ${y}px - ${PHOTO_SIZE / 2}px)`,
                                width: `${PHOTO_SIZE}px`,
                                height: `${PHOTO_SIZE}px`,
                                // 反向旋轉讓照片保持正向
                                transform: `rotate(-${rotation}deg)`
                            }}
                        >
                            <img
                                src={getPhotoUrl(orbitPhoto.photo, 'small')}
                                alt={orbitPhoto.photo.display_name}
                                className={`w-full h-full object-cover rounded-full ${orbitPhoto.isWinner && isSlowing
                                    ? 'border-4 border-yellow-400 shadow-lg shadow-yellow-400/50'
                                    : 'border-2 border-white/70'
                                    }`}
                            />
                        </div>
                    )
                })}
            </div>

            {/* 中央 - 中獎者放大顯示 */}
            {showWinner && (
                <div className="absolute inset-0 flex items-center justify-center z-20 animate-in zoom-in duration-700">
                    <div className="relative">
                        <div className="absolute -inset-8 bg-gradient-to-r from-yellow-400 via-pink-400 to-purple-400 rounded-full blur-2xl opacity-70 animate-pulse" />
                        <img
                            src={winnerPhoto.image_url}
                            alt={winnerPhoto.display_name}
                            className="relative w-80 h-80 object-cover rounded-full border-8 border-white shadow-2xl"
                        />
                        <div className="absolute -bottom-16 left-1/2 -translate-x-1/2 whitespace-nowrap">
                            <p className="text-3xl font-bold text-white drop-shadow-lg">
                                🌀 {winnerPhoto.display_name} 🌀
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* 中央小點 */}
            {!showWinner && (
                <div className={`absolute w-8 h-8 rounded-full transition-all duration-500 ${isSlowing ? 'bg-yellow-400 scale-150' : 'bg-white/50'
                    }`} />
            )}

            {/* 底部提示 */}
            <div className="absolute bottom-12 text-center">
                <p className="text-2xl text-white font-bold drop-shadow-lg">
                    {showWinner ? '🎉 中獎!' : isSlowing ? '🌀 即將停止...' : '🌀 旋轉中...'}
                </p>
            </div>
        </div>
    )
})

SpiralLottery.displayName = 'SpiralLottery'
