'use client'

import { useState, useEffect, useCallback } from 'react'
import Layout from '@/components/Layout'
import { X, Heart, Image as ImageIcon, Trophy, ChevronLeft, ChevronRight, ArrowDownWideNarrow, ArrowUpDown } from 'lucide-react'
import { createSupabaseBrowser } from '@/lib/supabase'
import { useLiff } from '@/hooks/useLiff'

interface WeddingPhoto {
    id: string
    name: string
    url: string
    thumbnailUrl: string
    vote_count?: number
}

interface PhotoWithLayout extends WeddingPhoto {
    isLandscape: boolean
    loaded: boolean
    vote_count: number
}

export default function WeddingPhotosPage() {
    const [photos, setPhotos] = useState<PhotoWithLayout[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedPhoto, setSelectedPhoto] = useState<PhotoWithLayout | null>(null)
    const [error, setError] = useState<string | null>(null)

    // 投票相關狀態
    const [userVotes, setUserVotes] = useState<Record<string, number>>({})
    const availableVotes = 1  // 婚紗照固定每人 1 票
    const votingEnabled = true  // 婚紗照投票永遠啟用
    const [votingInProgress, setVotingInProgress] = useState<Set<string>>(new Set())
    const [showVoteLimitModal, setShowVoteLimitModal] = useState(false)
    const [sortByVotes, setSortByVotes] = useState(false)  // 是否依得票數排序

    const supabase = createSupabaseBrowser()
    const { profile } = useLiff()

    // 獲取用戶投票記錄 (針對婚紗照)
    const fetchUserVotes = useCallback(async () => {
        if (!profile) return

        try {
            const { data, error } = await supabase
                .from('wedding_photo_votes')
                .select('photo_id')
                .eq('voter_line_id', profile.userId)

            if (error) throw error

            // 計算每張照片的投票數
            const voteCount: Record<string, number> = {}
            data.forEach(vote => {
                voteCount[vote.photo_id] = (voteCount[vote.photo_id] || 0) + 1
            })

            setUserVotes(voteCount)
        } catch (error) {
            console.error('Error fetching user votes:', error)
        }
    }, [profile, supabase])

    // 獲取婚紗照片
    const fetchPhotos = useCallback(async () => {
        try {
            setLoading(true)
            const response = await fetch('/api/wedding-photos')
            const data = await response.json()

            if (data.success) {
                setPhotos(data.photos.map((p: WeddingPhoto) => ({
                    ...p,
                    isLandscape: false,
                    loaded: false,
                    vote_count: p.vote_count || 0
                })))
            } else {
                setError(data.error || '無法載入照片')
            }
        } catch (err) {
            console.error('Error fetching wedding photos:', err)
            setError('載入照片時發生錯誤')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchPhotos()
    }, [fetchPhotos])

    useEffect(() => {
        if (profile) {
            fetchUserVotes()
        }
    }, [profile, fetchUserVotes])

    // 處理圖片載入，獲取真實尺寸判斷是否為橫式
    const handleImageLoad = useCallback((photoId: string, img: HTMLImageElement) => {
        const width = img.naturalWidth
        const height = img.naturalHeight
        const isLandscape = width > height

        setPhotos(prev => prev.map(p =>
            p.id === photoId ? { ...p, isLandscape, loaded: true } : p
        ))
    }, [])

    // 計算剩餘投票數
    const getRemainingVotes = () => {
        const used = Object.values(userVotes).reduce((sum, count) => sum + count, 0)
        return Math.max(0, availableVotes - used)
    }

    // 獲取當前照片索引
    const getCurrentPhotoIndex = () => {
        if (!selectedPhoto) return -1
        return photos.findIndex(p => p.id === selectedPhoto.id)
    }

    // 上一張照片
    const goToPreviousPhoto = (e: React.MouseEvent) => {
        e.stopPropagation()
        const currentIndex = getCurrentPhotoIndex()
        if (currentIndex > 0) {
            setSelectedPhoto(photos[currentIndex - 1])
        }
    }

    // 下一張照片
    const goToNextPhoto = (e: React.MouseEvent) => {
        e.stopPropagation()
        const currentIndex = getCurrentPhotoIndex()
        if (currentIndex < photos.length - 1) {
            setSelectedPhoto(photos[currentIndex + 1])
        }
    }

    // 處理投票
    const handleVote = async (photoId: string, e?: React.MouseEvent) => {
        if (e) e.stopPropagation()

        console.log('🗳️ handleVote called:', { photoId, profile: !!profile, votingEnabled })

        if (!profile) {
            console.log('❌ 無法投票：用戶未登入')
            alert('請先登入才能投票')
            return
        }

        if (!votingEnabled) {
            console.log('❌ 無法投票：投票功能已關閉')
            alert('投票功能目前已關閉')
            return
        }

        // 防止重複點擊
        if (votingInProgress.has(photoId)) {
            console.log('⏳ 投票處理中，請稍候...')
            return
        }

        const hasVoted = userVotes[photoId] > 0
        const totalUsedVotes = Object.values(userVotes).reduce((sum, count) => sum + count, 0)

        // 如果沒投過票，檢查是否還有額度
        if (!hasVoted && totalUsedVotes >= availableVotes) {
            setShowVoteLimitModal(true)
            return
        }

        // 標記此照片正在投票中
        setVotingInProgress(prev => new Set(prev).add(photoId))

        // 樂觀更新 UI
        const previousUserVotes = { ...userVotes }
        const previousPhotos = [...photos]
        const previousSelectedPhoto = selectedPhoto ? { ...selectedPhoto } : null

        try {
            // 立即更新本地狀態
            if (hasVoted) {
                // 取消投票
                setUserVotes(prev => ({
                    ...prev,
                    [photoId]: 0
                }))
                const updatePhotoCount = (p: PhotoWithLayout) =>
                    p.id === photoId ? { ...p, vote_count: Math.max(0, p.vote_count - 1) } : p

                setPhotos(prev => prev.map(updatePhotoCount))
                if (selectedPhoto?.id === photoId) {
                    setSelectedPhoto(prev => prev ? { ...prev, vote_count: Math.max(0, prev.vote_count - 1) } : null)
                }
            } else {
                // 投票
                setUserVotes(prev => ({
                    ...prev,
                    [photoId]: (prev[photoId] || 0) + 1
                }))
                const updatePhotoCount = (p: PhotoWithLayout) =>
                    p.id === photoId ? { ...p, vote_count: p.vote_count + 1 } : p

                setPhotos(prev => prev.map(updatePhotoCount))
                if (selectedPhoto?.id === photoId) {
                    setSelectedPhoto(prev => prev ? { ...prev, vote_count: prev.vote_count + 1 } : null)
                }
            }

            console.log(`🔄 正在${hasVoted ? '取消投票' : '投票'}...`)

            // 發送 API 請求
            const response = await fetch('/api/wedding-photos/vote', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    photoId,
                    voterLineId: profile.userId,
                    action: hasVoted ? 'unvote' : 'vote'
                })
            })

            const result = await response.json()

            if (!result.success) {
                throw new Error(result.error || '操作失敗')
            }

            // 使用 API 返回的確切票數校正本地狀態
            const newVoteCount = result.data.newVoteCount

            console.log(`✅ ${hasVoted ? '取消投票' : '投票'}成功！照片 ${photoId} 確切票數: ${newVoteCount}`)

            // 用 API 返回的確切值更新票數
            setPhotos(prev => prev.map(p =>
                p.id === photoId ? { ...p, vote_count: newVoteCount } : p
            ))
            if (selectedPhoto?.id === photoId) {
                setSelectedPhoto(prev => prev ? { ...prev, vote_count: newVoteCount } : null)
            }

        } catch (error) {
            console.error('❌ 投票錯誤:', error)

            // 回滾狀態
            setUserVotes(previousUserVotes)
            setPhotos(previousPhotos)
            setSelectedPhoto(previousSelectedPhoto)

            alert(error instanceof Error ? error.message : '操作失敗，請稍後再試')
        } finally {
            // 移除投票中標記
            setVotingInProgress(prev => {
                const newSet = new Set(prev)
                newSet.delete(photoId)
                return newSet
            })
        }
    }

    if (loading) {
        return (
            <Layout title="婚紗照">
                <div className="flex items-center justify-center py-16">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500"></div>
                </div>
            </Layout>
        )
    }

    if (error) {
        return (
            <Layout title="婚紗照">
                <div className="text-center py-16">
                    <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md mx-auto">
                        <ImageIcon className="w-16 h-16 text-gray-400 mx-auto mb-6" />
                        <h3 className="text-xl font-semibold text-gray-800 mb-2">載入失敗</h3>
                        <p className="text-gray-600 mb-6">{error}</p>
                        <button
                            onClick={fetchPhotos}
                            className="bg-pink-500 hover:bg-pink-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
                        >
                            重試
                        </button>
                    </div>
                </div>
            </Layout>
        )
    }

    return (
        <Layout title="婚紗照">
            <div className="min-h-screen -mx-4 -my-4 px-4 py-4 bg-gradient-to-b from-[#2D1B2E] via-[#3D2438] to-[#1A0F1B]">
                <div className="max-w-6xl mx-auto px-2 sm:px-4">
                    {/* 頂部提示 */}
                    <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6 mb-4 sm:mb-6">
                        <div className="flex items-center justify-between">
                            <div className="text-center flex-1 space-y-2">
                                <p className="text-lg sm:text-xl font-medium text-gray-700">
                                    💕 幸福多選一，你 Pick 哪一張？
                                </p>
                                {getRemainingVotes() === 0 ? (
                                    <div className="flex items-center justify-center space-x-3">
                                        <p className="text-sm font-semibold text-green-600">
                                            ✓ 完成投票
                                        </p>
                                        <button
                                            onClick={() => {
                                                // 找到已投票的照片並撤回
                                                const votedPhotoId = Object.keys(userVotes).find(id => userVotes[id] > 0)
                                                if (votedPhotoId) {
                                                    handleVote(votedPhotoId)
                                                }
                                            }}
                                            disabled={votingInProgress.size > 0}
                                            className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 rounded-full shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            <X className="w-3 h-3" />
                                            <span>撤回並重新投票</span>
                                        </button>
                                    </div>
                                ) : (
                                    <p className="text-sm font-semibold text-red-500">
                                        ○ 尚未投票
                                    </p>
                                )}
                            </div>
                            {/* 排序按鈕 */}
                            <button
                                onClick={() => setSortByVotes(!sortByVotes)}
                                className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-all duration-200 ml-4 ${sortByVotes
                                    ? 'bg-pink-500 text-white shadow-md'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                                title={sortByVotes ? '依得票數排序中' : '點擊依得票數排序'}
                            >
                                {sortByVotes ? (
                                    <ArrowDownWideNarrow className="w-5 h-5" />
                                ) : (
                                    <ArrowUpDown className="w-5 h-5" />
                                )}
                                <span className="text-sm font-medium hidden sm:inline">
                                    {sortByVotes ? '依票數' : '排序'}
                                </span>
                            </button>
                        </div>
                    </div>

                    {/* 照片牆 - CSS Grid with auto-flow dense */}
                    {photos.length === 0 ? (
                        <div className="text-center py-16">
                            <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md mx-auto">
                                <Heart className="w-16 h-16 text-gray-400 mx-auto mb-6" />
                                <h3 className="text-xl font-semibold text-gray-800 mb-2">還沒有照片</h3>
                                <p className="text-gray-600">婚紗照即將上傳，敬請期待！</p>
                            </div>
                        </div>
                    ) : (
                        <div
                            className="grid gap-2"
                            style={{
                                gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                                gridAutoFlow: 'dense'
                            }}
                        >
                            {(sortByVotes
                                ? [...photos].sort((a, b) => b.vote_count - a.vote_count)
                                : photos
                            ).map((photo) => (
                                <div
                                    key={photo.id}
                                    className={`cursor-pointer group transition-all duration-300 ${photo.isLandscape ? 'col-span-2' : ''
                                        }`}
                                    onClick={() => setSelectedPhoto(photo)}
                                >
                                    <div className="w-full bg-white rounded-lg sm:rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-all duration-300 hover:scale-[1.02] relative">
                                        <img
                                            src={photo.thumbnailUrl}
                                            alt={photo.name}
                                            className="w-full h-auto object-cover"
                                            style={{
                                                aspectRatio: photo.isLandscape ? '16/9' : '3/4'
                                            }}
                                            onLoad={(e) => {
                                                if (!photo.loaded) {
                                                    handleImageLoad(photo.id, e.currentTarget)
                                                }
                                            }}
                                        />
                                        {/* 票數顯示 */}
                                        {votingEnabled && (
                                            <div className="absolute bottom-2 left-2 bg-black/70 text-white px-2 py-1 rounded-full flex items-center space-x-1">
                                                <Heart className={`w-3 h-3 ${userVotes[photo.id] > 0 ? 'fill-current text-red-500' : ''}`} />
                                                <span className="text-xs font-semibold">{photo.vote_count}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* 照片放大檢視 */}
                {selectedPhoto && (
                    <div
                        className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4 animate-fadeIn cursor-pointer"
                        onClick={() => setSelectedPhoto(null)}
                    >
                        {/* 關閉按鈕 */}
                        <button
                            onClick={() => setSelectedPhoto(null)}
                            className="absolute top-4 right-4 p-2 text-white hover:bg-white/10 rounded-full transition-colors z-10"
                        >
                            <X className="w-8 h-8" />
                        </button>

                        {/* 上一張按鈕 */}
                        {getCurrentPhotoIndex() > 0 && (
                            <button
                                onClick={goToPreviousPhoto}
                                className="absolute left-2 sm:left-6 top-1/2 -translate-y-1/2 p-3 sm:p-4 bg-white/30 hover:bg-white/50 rounded-full transition-all z-10 backdrop-blur-sm"
                            >
                                <ChevronLeft className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
                            </button>
                        )}

                        {/* 下一張按鈕 */}
                        {getCurrentPhotoIndex() < photos.length - 1 && (
                            <button
                                onClick={goToNextPhoto}
                                className="absolute right-2 sm:right-6 top-1/2 -translate-y-1/2 p-3 sm:p-4 bg-white/30 hover:bg-white/50 rounded-full transition-all z-10 backdrop-blur-sm"
                            >
                                <ChevronRight className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
                            </button>
                        )}

                        {/* 照片計數 */}
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 text-white px-4 py-2 rounded-full text-sm backdrop-blur-sm">
                            {getCurrentPhotoIndex() + 1} / {photos.length}
                        </div>

                        <div className="relative" onClick={(e) => e.stopPropagation()}>
                            <img
                                src={selectedPhoto.url}
                                alt={selectedPhoto.name}
                                className="max-w-full max-h-[80vh] w-auto h-auto object-contain rounded-lg shadow-2xl"
                            />

                            {/* 投票區域 - 右上角 */}
                            {votingEnabled && (
                                <div className="absolute top-4 right-4 flex items-center space-x-3">
                                    {/* 投票按鈕 */}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            const hasVoted = userVotes[selectedPhoto.id] > 0
                                            const totalUsedVotes = Object.values(userVotes).reduce((sum, count) => sum + count, 0)

                                            if (!hasVoted && totalUsedVotes >= availableVotes) {
                                                setShowVoteLimitModal(true)
                                                return
                                            }

                                            handleVote(selectedPhoto.id)
                                        }}
                                        disabled={votingInProgress.has(selectedPhoto.id)}
                                        className={`p-3 rounded-full shadow-2xl transition-all duration-200 backdrop-blur-sm ${votingInProgress.has(selectedPhoto.id)
                                            ? 'bg-white/60 cursor-wait'
                                            : (!userVotes[selectedPhoto.id] && getRemainingVotes() <= 0)
                                                ? 'bg-white/80 cursor-not-allowed'
                                                : 'bg-white/90 hover:bg-white hover:scale-110'
                                            }`}
                                    >
                                        <Heart className={`w-8 h-8 transition-all ${votingInProgress.has(selectedPhoto.id)
                                            ? 'text-gray-400 animate-pulse'
                                            : userVotes[selectedPhoto.id] > 0
                                                ? 'text-red-500 fill-current drop-shadow-lg'
                                                : getRemainingVotes() <= 0
                                                    ? 'text-gray-400'
                                                    : 'text-gray-400 hover:text-pink-500'
                                            }`} />
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* 投票額度用完提示 Modal */}
                {showVoteLimitModal && (
                    <div
                        className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
                        onClick={() => setShowVoteLimitModal(false)}
                    >
                        <div
                            className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden transform transition-all"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* 頭部 */}
                            <div className="bg-gradient-to-r from-red-500 to-pink-500 px-6 py-8 text-center">
                                <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Trophy className="w-12 h-12 text-red-500" />
                                </div>
                                <h2 className="text-2xl font-bold text-white mb-2">投票額度已用完</h2>
                                <p className="text-white/90 text-sm">You've used all your votes</p>
                            </div>

                            {/* 內容 */}
                            <div className="px-8 py-6 space-y-6">
                                {/* 統計卡片 */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-gradient-to-br from-pink-50 to-red-50 rounded-2xl p-4 text-center border-2 border-pink-200">
                                        <div className="text-3xl font-bold text-pink-600 mb-1">
                                            {Object.values(userVotes).reduce((sum, count) => sum + count, 0)}
                                        </div>
                                        <div className="text-sm text-gray-600">已使用</div>
                                    </div>
                                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-4 text-center border-2 border-blue-200">
                                        <div className="text-3xl font-bold text-blue-600 mb-1">
                                            {availableVotes}
                                        </div>
                                        <div className="text-sm text-gray-600">總額度</div>
                                    </div>
                                </div>

                                {/* 提示訊息 */}
                                <div className="bg-yellow-50 border-2 border-yellow-200 rounded-2xl p-4">
                                    <div className="flex items-start space-x-3">
                                        <div className="w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                                            <span className="text-white text-sm font-bold">!</span>
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-gray-700 leading-relaxed text-base">
                                                如需投票給這張照片，請先<span className="font-bold text-pink-600">取消其他照片的投票</span>。
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* 操作說明 */}
                                <div className="space-y-2 text-sm text-gray-600">
                                    <p className="flex items-center space-x-2">
                                        <span className="w-2 h-2 bg-pink-500 rounded-full"></span>
                                        <span>點擊已投票照片的<span className="text-red-500 font-semibold">實心愛心 ❤</span> 可取消投票</span>
                                    </p>
                                    <p className="flex items-center space-x-2">
                                        <span className="w-2 h-2 bg-pink-500 rounded-full"></span>
                                        <span>取消後即可將票投給其他照片</span>
                                    </p>
                                </div>
                            </div>

                            {/* 關閉按鈕 */}
                            <div className="px-8 pb-6">
                                <button
                                    onClick={() => setShowVoteLimitModal(false)}
                                    className="w-full bg-gradient-to-r from-pink-500 to-red-500 text-white font-semibold py-3 rounded-xl hover:from-pink-600 hover:to-red-600 transition-all"
                                >
                                    我知道了
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    )
}
