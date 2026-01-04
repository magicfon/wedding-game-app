'use client'

import { memo, useEffect, useState, useRef, useMemo } from 'react'
import { LotteryModeProps, Photo } from './types'
import { getPhotoUrl } from '@/lib/photo-utils'

// 設計尺寸
const DESIGN_WIDTH = 1920
const COLUMN_HEIGHT = 800
const PHOTO_SIZE = 200
const VISIBLE_ITEMS = 5 // 每列可見的照片數

interface SlotColumnProps {
    photos: Photo[]
    targetIndex: number
    delay: number
    isCenter: boolean
    onStop?: () => void
}

const SlotColumn = memo(({ photos, targetIndex, delay, isCenter, onStop }: SlotColumnProps) => {
    const [offset, setOffset] = useState(0)
    const [isStopping, setIsStopping] = useState(false)
    const [stopped, setStopped] = useState(false)
    const animationRef = useRef<number | null>(null)
    const startTimeRef = useRef<number>(0)

    // 創建循環列表（重複多次以確保平滑滾動）
    const extendedPhotos = useMemo(() => {
        const result: Photo[] = []
        for (let i = 0; i < 10; i++) { // 重複 10 次
            result.push(...photos)
        }
        return result
    }, [photos])

    useEffect(() => {
        if (stopped) return

        const totalHeight = photos.length * (PHOTO_SIZE + 16) // 16 = gap
        const targetOffset = targetIndex * (PHOTO_SIZE + 16)

        // 計算最終停止位置（多轉幾圈）
        const minSpins = 3 + (delay / 1000) // 根據延遲多轉幾圈
        const finalOffset = (minSpins * totalHeight) + targetOffset

        startTimeRef.current = performance.now()
        const spinDuration = 3000 + delay // 基礎 3 秒 + 延遲

        const animate = (currentTime: number) => {
            const elapsed = currentTime - startTimeRef.current
            const progress = Math.min(elapsed / spinDuration, 1)

            // 使用 easeOutCubic 減速曲線
            const easeOut = 1 - Math.pow(1 - progress, 3)

            const currentOffset = finalOffset * easeOut
            setOffset(currentOffset % (totalHeight * 5)) // 保持在合理範圍

            if (progress >= 0.8 && !isStopping) {
                setIsStopping(true)
            }

            if (progress < 1) {
                animationRef.current = requestAnimationFrame(animate)
            } else {
                setStopped(true)
                setOffset(targetOffset)
                onStop?.()
            }
        }

        // 延遲開始
        const startTimeout = setTimeout(() => {
            animationRef.current = requestAnimationFrame(animate)
        }, 100)

        return () => {
            clearTimeout(startTimeout)
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current)
            }
        }
    }, [photos.length, targetIndex, delay, stopped, onStop, isStopping])

    return (
        <div
            className={`relative overflow-hidden rounded-2xl ${isCenter ? 'border-4 border-yellow-400' : 'border-2 border-white/50'
                }`}
            style={{
                height: `${COLUMN_HEIGHT}px`,
                width: `${PHOTO_SIZE + 20}px`
            }}
        >
            {/* 滾動容器 */}
            <div
                className="absolute left-0 right-0 transition-none"
                style={{
                    transform: `translateY(-${offset}px)`,
                    top: `${COLUMN_HEIGHT / 2 - PHOTO_SIZE / 2}px`, // 中心對齊
                    willChange: 'transform'
                }}
            >
                {extendedPhotos.map((photo, idx) => (
                    <div
                        key={`${photo.id}-${idx}`}
                        className="mx-auto mb-4"
                        style={{
                            width: `${PHOTO_SIZE}px`,
                            height: `${PHOTO_SIZE}px`
                        }}
                    >
                        <img
                            src={getPhotoUrl(photo, 'medium')}
                            alt={photo.display_name}
                            className="w-full h-full object-cover rounded-xl"
                            loading="eager"
                        />
                    </div>
                ))}
            </div>

            {/* 上下漸變遮罩 */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-purple-900 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-purple-900 to-transparent" />
            </div>

            {/* 中心指示線 */}
            {isCenter && (
                <>
                    <div className="absolute left-0 right-0 top-1/2 -translate-y-[calc(50%+110px)] h-1 bg-yellow-400/80" />
                    <div className="absolute left-0 right-0 top-1/2 translate-y-[calc(-50%+110px)] h-1 bg-yellow-400/80" />
                </>
            )}
        </div>
    )
})
SlotColumn.displayName = 'SlotColumn'

export const SlotMachineLottery = memo(({
    photos,
    winnerPhoto,
    winnerIndex,
    onAnimationComplete,
    isAnimating,
    scale
}: LotteryModeProps) => {
    const [stoppedColumns, setStoppedColumns] = useState(0)

    // 隨機選擇左右兩列的停止位置
    const leftIndex = useMemo(() => Math.floor(Math.random() * photos.length), [photos.length])
    const rightIndex = useMemo(() => Math.floor(Math.random() * photos.length), [photos.length])

    const handleColumnStop = () => {
        setStoppedColumns(prev => {
            const newCount = prev + 1
            if (newCount === 3) {
                // 所有列都停止了
                setTimeout(() => {
                    onAnimationComplete(winnerPhoto)
                }, 800)
            }
            return newCount
        })
    }

    useEffect(() => {
        if (isAnimating) {
            setStoppedColumns(0)
        }
    }, [isAnimating])

    if (photos.length === 0) {
        return <div className="text-white text-2xl">載入中...</div>
    }

    return (
        <div className="relative flex flex-col items-center justify-center h-full">
            {/* 老虎機外框 */}
            <div className="relative bg-gradient-to-b from-purple-800 to-purple-900 rounded-3xl p-8 shadow-2xl">
                {/* 頂部燈飾 */}
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 flex gap-4">
                    {[...Array(5)].map((_, i) => (
                        <div
                            key={i}
                            className="w-8 h-8 rounded-full bg-yellow-400 animate-pulse"
                            style={{ animationDelay: `${i * 0.2}s` }}
                        />
                    ))}
                </div>

                {/* 三列 */}
                <div className="flex gap-6 items-center">
                    {/* 左列 */}
                    <SlotColumn
                        photos={photos}
                        targetIndex={leftIndex}
                        delay={0}
                        isCenter={false}
                        onStop={handleColumnStop}
                    />

                    {/* 中列 (中獎) */}
                    <SlotColumn
                        photos={photos}
                        targetIndex={winnerIndex}
                        delay={2000}
                        isCenter={true}
                        onStop={handleColumnStop}
                    />

                    {/* 右列 */}
                    <SlotColumn
                        photos={photos}
                        targetIndex={rightIndex}
                        delay={1000}
                        isCenter={false}
                        onStop={handleColumnStop}
                    />
                </div>

                {/* 中獎者名稱 */}
                {stoppedColumns === 3 && (
                    <div className="absolute -bottom-20 left-1/2 -translate-x-1/2 whitespace-nowrap">
                        <p className="text-3xl font-bold text-yellow-400 animate-pulse">
                            🎊 {winnerPhoto.display_name} 🎊
                        </p>
                    </div>
                )}
            </div>

            {/* 提示文字 */}
            <div className="absolute bottom-12 text-center">
                <p className="text-2xl text-white font-bold drop-shadow-lg">
                    {stoppedColumns < 3 ? '🎰 轉動中...' : '🎉 中獎!'}
                </p>
            </div>
        </div>
    )
})

SlotMachineLottery.displayName = 'SlotMachineLottery'
