'use client'

import { memo, useEffect, useState, useRef, useMemo, useCallback } from 'react'
import { LotteryModeProps, Photo } from './types'

const INITIAL_COUNT = 16 // 初始候選數量
const PHOTO_SIZE = 180

interface Candidate {
    photo: Photo
    eliminated: boolean
    position: number
}

export const TournamentLottery = memo(({
    photos,
    winnerPhoto,
    winnerIndex,
    onAnimationComplete,
    isAnimating,
    scale
}: LotteryModeProps) => {
    const [candidates, setCandidates] = useState<Candidate[]>([])
    const [round, setRound] = useState(0)
    const [roundText, setRoundText] = useState('')
    const [showFinal, setShowFinal] = useState(false)
    const [finalRevealed, setFinalRevealed] = useState(false)
    const timeoutRef = useRef<NodeJS.Timeout | null>(null)

    // 初始化候選者
    const initCandidates = useCallback(() => {
        // 確保中獎者在候選名單中
        const candidateSet = new Set<number>([winnerIndex])

        // 隨機選擇其他候選者
        while (candidateSet.size < Math.min(INITIAL_COUNT, photos.length)) {
            candidateSet.add(Math.floor(Math.random() * photos.length))
        }

        const indices = Array.from(candidateSet)
        // 洗牌
        for (let i = indices.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1))
                ;[indices[i], indices[j]] = [indices[j], indices[i]]
        }

        return indices.map((photoIdx, position) => ({
            photo: photos[photoIdx],
            eliminated: false,
            position
        }))
    }, [photos, winnerIndex])

    // 執行一輪淘汰
    const executeRound = useCallback((currentCandidates: Candidate[], roundNum: number) => {
        const remaining = currentCandidates.filter(c => !c.eliminated)
        const toEliminate = Math.floor(remaining.length / 2)

        if (remaining.length <= 2) {
            // 決賽
            setShowFinal(true)
            setRoundText('🏆 決賽!')

            timeoutRef.current = setTimeout(() => {
                setFinalRevealed(true)

                setTimeout(() => {
                    onAnimationComplete(winnerPhoto)
                }, 1000)
            }, 2000)
            return
        }

        // 找出要淘汰的（不包含中獎者）
        const eliminateIndices: number[] = []
        for (const candidate of remaining) {
            if (candidate.photo.id !== winnerPhoto.id && eliminateIndices.length < toEliminate) {
                eliminateIndices.push(candidate.position)
            }
        }

        // 補足淘汰數量（如果需要）
        for (const candidate of remaining) {
            if (eliminateIndices.length >= toEliminate) break
            if (!eliminateIndices.includes(candidate.position) && candidate.photo.id !== winnerPhoto.id) {
                eliminateIndices.push(candidate.position)
            }
        }

        setRoundText(`第 ${roundNum} 輪淘汰`)

        // 標記淘汰
        setCandidates(prev => prev.map(c => ({
            ...c,
            eliminated: c.eliminated || eliminateIndices.includes(c.position)
        })))

        // 下一輪
        timeoutRef.current = setTimeout(() => {
            setRound(roundNum + 1)
        }, 2000)
    }, [winnerPhoto, onAnimationComplete])

    useEffect(() => {
        if (!isAnimating || photos.length === 0) return

        // 重置狀態
        const initial = initCandidates()
        setCandidates(initial)
        setRound(1)
        setRoundText('準備開始...')
        setShowFinal(false)
        setFinalRevealed(false)

        // 延遲開始第一輪
        timeoutRef.current = setTimeout(() => {
            executeRound(initial, 1)
        }, 1500)

        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current)
            }
        }
    }, [isAnimating, photos, initCandidates, executeRound])

    // 監聽 round 變化執行淘汰
    useEffect(() => {
        if (round > 1 && !showFinal) {
            executeRound(candidates, round)
        }
    }, [round, showFinal, candidates, executeRound])

    // 計算格子布局
    const remaining = candidates.filter(c => !c.eliminated)
    const gridCols = remaining.length > 8 ? 4 : remaining.length > 4 ? 4 : 2

    return (
        <div className="relative flex flex-col items-center justify-center h-full">
            {/* 回合標題 */}
            <div className="absolute top-20 text-center">
                <h2 className="text-4xl font-bold text-white drop-shadow-lg animate-pulse">
                    {roundText}
                </h2>
                <p className="text-xl text-white/80 mt-2">
                    剩餘 {remaining.length} 位候選者
                </p>
            </div>

            {/* 候選者網格 */}
            {!showFinal && (
                <div
                    className="grid gap-4 transition-all duration-500"
                    style={{
                        gridTemplateColumns: `repeat(${gridCols}, ${PHOTO_SIZE}px)`
                    }}
                >
                    {candidates.map(candidate => (
                        <div
                            key={candidate.photo.id}
                            className={`relative transition-all duration-700 ${candidate.eliminated
                                    ? 'opacity-0 scale-50 rotate-12'
                                    : 'opacity-100 scale-100'
                                }`}
                            style={{
                                width: `${PHOTO_SIZE}px`,
                                height: `${PHOTO_SIZE}px`
                            }}
                        >
                            <img
                                src={candidate.photo.thumbnail_medium_url || candidate.photo.image_url}
                                alt={candidate.photo.display_name}
                                className="w-full h-full object-cover rounded-xl border-4 border-white shadow-lg"
                            />
                            {/* 淘汰 X */}
                            {candidate.eliminated && (
                                <div className="absolute inset-0 flex items-center justify-center bg-red-500/70 rounded-xl">
                                    <span className="text-6xl text-white">✕</span>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* 決賽畫面 */}
            {showFinal && (
                <div className="flex items-center gap-16">
                    {remaining.map((candidate, idx) => {
                        const isWinner = candidate.photo.id === winnerPhoto.id
                        const revealed = finalRevealed && isWinner

                        return (
                            <div
                                key={candidate.photo.id}
                                className={`relative transition-all duration-700 ${revealed ? 'scale-125 z-10' : finalRevealed && !isWinner ? 'opacity-40 scale-90' : ''
                                    }`}
                            >
                                {revealed && (
                                    <div className="absolute -inset-6 bg-gradient-to-r from-yellow-400 via-orange-400 to-pink-400 rounded-3xl blur-xl opacity-70 animate-pulse" />
                                )}
                                <img
                                    src={candidate.photo.image_url}
                                    alt={candidate.photo.display_name}
                                    className={`relative w-72 h-72 object-cover rounded-2xl shadow-2xl ${revealed ? 'border-8 border-yellow-400' : 'border-4 border-white'
                                        }`}
                                />
                                <p className={`absolute -bottom-12 left-1/2 -translate-x-1/2 whitespace-nowrap text-xl font-bold ${revealed ? 'text-yellow-400' : 'text-white'
                                    }`}>
                                    {revealed ? '🏆 ' : ''}{candidate.photo.display_name}{revealed ? ' 🏆' : ''}
                                </p>

                                {/* VS */}
                                {idx === 0 && !finalRevealed && (
                                    <div className="absolute -right-14 top-1/2 -translate-y-1/2 text-5xl font-bold text-red-500 animate-pulse">
                                        VS
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            )}

            {/* 底部提示 */}
            <div className="absolute bottom-12 text-center">
                <p className="text-xl text-white/80">
                    {showFinal
                        ? (finalRevealed ? '🎉 恭喜中獎!' : '⏳ 正在揭曉...')
                        : '👀 誰會被淘汰?'}
                </p>
            </div>
        </div>
    )
})

TournamentLottery.displayName = 'TournamentLottery'
