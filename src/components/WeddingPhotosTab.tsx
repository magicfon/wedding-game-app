'use client'

import { useState, useEffect } from 'react'
import { Heart, User, Users, Loader2, Camera, ArrowDownWideNarrow, ArrowUpDown } from 'lucide-react'

interface WeddingPhoto {
    id: string
    name: string
    url: string
    thumbnailUrl: string
    vote_count: number
}

interface WeddingVoter {
    lineId: string
    displayName: string
    avatarUrl: string | null
    votedAt: string
}

export default function WeddingPhotosTab() {
    const [weddingPhotos, setWeddingPhotos] = useState<WeddingPhoto[]>([])
    const [weddingPhotosLoading, setWeddingPhotosLoading] = useState(true)
    const [selectedWeddingPhoto, setSelectedWeddingPhoto] = useState<WeddingPhoto | null>(null)
    const [weddingVoters, setWeddingVoters] = useState<WeddingVoter[]>([])
    const [weddingVotersLoading, setWeddingVotersLoading] = useState(false)
    const [weddingSortByVotes, setWeddingSortByVotes] = useState(false)

    // 獲取婚紗照
    const fetchWeddingPhotos = async () => {
        setWeddingPhotosLoading(true)
        try {
            const response = await fetch('/api/wedding-photos')
            const data = await response.json()
            if (data.success) {
                setWeddingPhotos(data.photos.map((p: any) => ({
                    ...p,
                    vote_count: p.vote_count || 0
                })))
            }
        } catch (error) {
            console.error('獲取婚紗照失敗:', error)
        } finally {
            setWeddingPhotosLoading(false)
        }
    }

    // 獲取婚紗照投票者
    const fetchWeddingVoters = async (photoId: string) => {
        setWeddingVotersLoading(true)
        try {
            const response = await fetch(`/api/admin/wedding-photos/voters?photoId=${photoId}`)
            const data = await response.json()
            if (data.success) {
                setWeddingVoters(data.data.voters || [])
            }
        } catch (error) {
            console.error('獲取婚紗照投票者失敗:', error)
        } finally {
            setWeddingVotersLoading(false)
        }
    }

    // 初始載入
    useEffect(() => {
        fetchWeddingPhotos()
    }, [])

    // 當選擇婚紗照時載入投票者
    useEffect(() => {
        if (selectedWeddingPhoto) {
            fetchWeddingVoters(selectedWeddingPhoto.id)
        } else {
            setWeddingVoters([])
        }
    }, [selectedWeddingPhoto])

    return (
        <div className="space-y-6">
            {/* 婚紗照統計和操作 */}
            <div className="bg-white rounded-xl shadow-md p-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                            <Camera className="w-5 h-5 text-pink-500" />
                            <span className="font-medium text-gray-700">婚紗照總數：{weddingPhotos.length}</span>
                        </div>
                    </div>
                    <div className="flex items-center space-x-2">
                        <button
                            onClick={() => setWeddingSortByVotes(!weddingSortByVotes)}
                            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${weddingSortByVotes
                                    ? 'bg-pink-500 text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                        >
                            {weddingSortByVotes ? (
                                <ArrowDownWideNarrow className="w-4 h-4" />
                            ) : (
                                <ArrowUpDown className="w-4 h-4" />
                            )}
                            <span>{weddingSortByVotes ? '依票數' : '排序'}</span>
                        </button>
                        <button
                            onClick={fetchWeddingPhotos}
                            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
                        >
                            重新載入
                        </button>
                    </div>
                </div>
            </div>

            {/* 婚紗照列表 */}
            {weddingPhotosLoading ? (
                <div className="bg-white rounded-xl shadow-md p-12 text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500 mx-auto mb-4"></div>
                    <p className="text-gray-600">載入婚紗照中...</p>
                </div>
            ) : weddingPhotos.length === 0 ? (
                <div className="bg-white rounded-xl shadow-md p-12 text-center">
                    <Camera className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 text-lg">目前沒有婚紗照</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {(weddingSortByVotes
                        ? [...weddingPhotos].sort((a, b) => b.vote_count - a.vote_count)
                        : weddingPhotos
                    ).map((photo) => (
                        <div
                            key={photo.id}
                            className="group relative bg-white rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer"
                            onClick={() => setSelectedWeddingPhoto(photo)}
                        >
                            <div className="aspect-[3/4] w-full relative overflow-hidden bg-gray-100">
                                <img
                                    src={photo.thumbnailUrl}
                                    alt={photo.name}
                                    className="w-full h-full object-cover"
                                />
                                {/* 票數標記 */}
                                <div className="absolute bottom-2 left-2 bg-black/70 text-white px-2 py-1 rounded-full flex items-center space-x-1">
                                    <Heart className="w-3 h-3 fill-current text-red-500" />
                                    <span className="text-xs font-semibold">{photo.vote_count}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* 婚紗照投票者彈窗 */}
            {selectedWeddingPhoto && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4"
                    onClick={() => setSelectedWeddingPhoto(null)}
                >
                    <div
                        className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* 照片 */}
                        <div className="relative w-full aspect-[3/4] max-h-[50vh] bg-black flex items-center justify-center">
                            <img
                                src={selectedWeddingPhoto.url}
                                alt={selectedWeddingPhoto.name}
                                className="w-full h-full object-contain"
                            />
                        </div>

                        {/* 票數資訊 */}
                        <div className="p-6 space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                    <Heart className="w-6 h-6 text-red-500 fill-current" />
                                    <span className="text-xl font-bold text-gray-800">{selectedWeddingPhoto.vote_count} 票</span>
                                </div>
                            </div>

                            {/* 投票者列表 */}
                            <div className="pt-4 border-t">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-semibold text-gray-800 flex items-center space-x-2">
                                        <Users className="w-5 h-5" />
                                        <span>投票者 ({weddingVoters.length})</span>
                                    </h3>
                                    {weddingVotersLoading && (
                                        <div className="flex items-center space-x-2">
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            <span className="text-sm text-gray-500">載入中...</span>
                                        </div>
                                    )}
                                </div>

                                {weddingVotersLoading ? (
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                        {Array.from({ length: 4 }).map((_, index) => (
                                            <div key={index} className="flex flex-col items-center p-3 bg-gray-50 rounded-lg">
                                                <div className="w-12 h-12 bg-gray-200 rounded-full animate-pulse mb-2" />
                                                <div className="w-16 h-4 bg-gray-200 rounded animate-pulse" />
                                            </div>
                                        ))}
                                    </div>
                                ) : weddingVoters.length === 0 ? (
                                    <div className="text-center py-8">
                                        <Heart className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                        <p className="text-gray-500 font-medium">尚無投票者</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                        {weddingVoters.map((voter) => (
                                            <div
                                                key={voter.lineId}
                                                className="flex flex-col items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                                            >
                                                <div className="w-12 h-12 mb-2 relative">
                                                    {voter.avatarUrl ? (
                                                        <img
                                                            src={voter.avatarUrl}
                                                            alt={voter.displayName}
                                                            className="w-full h-full rounded-full object-cover"
                                                            onError={(e) => {
                                                                e.currentTarget.style.display = 'none'
                                                                e.currentTarget.nextElementSibling?.classList.remove('hidden')
                                                            }}
                                                        />
                                                    ) : null}
                                                    <div className={`w-full h-full bg-gray-300 rounded-full flex items-center justify-center ${voter.avatarUrl ? 'hidden' : ''}`}>
                                                        <User className="w-6 h-6 text-gray-600" />
                                                    </div>
                                                </div>
                                                <p className="text-sm text-gray-700 text-center truncate w-full">
                                                    {voter.displayName}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* 關閉按鈕 */}
                            <button
                                onClick={() => setSelectedWeddingPhoto(null)}
                                className="w-full py-3 px-4 rounded-lg font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                            >
                                關閉
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
