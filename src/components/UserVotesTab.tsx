'use client'

import { useState, useEffect } from 'react'
import { Heart, User, Users, Loader2, Image as ImageIcon, Camera, ChevronDown, ChevronUp } from 'lucide-react'
import ResponsiveImage from './ResponsiveImage'

interface PhotoWallVote {
    photoId: number
    imageUrl: string | null
    thumbnailUrls: {
        small: string | null
        medium: string | null
        large: string | null
    }
    votedAt: string
}

interface WeddingPhotoVote {
    photoId: string
    votedAt: string
}

interface UserWithVotes {
    lineId: string
    displayName: string
    avatarUrl: string | null
    photoWallVotes: PhotoWallVote[]
    weddingPhotoVotes: WeddingPhotoVote[]
}

interface WeddingPhotoInfo {
    id: string
    thumbnailUrl: string
}

export default function UserVotesTab() {
    const [users, setUsers] = useState<UserWithVotes[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set())
    const [weddingPhotoThumbnails, setWeddingPhotoThumbnails] = useState<Map<string, string>>(new Map())

    // 獲取用戶投票記錄
    const fetchUserVotes = async () => {
        setLoading(true)
        setError(null)
        try {
            const response = await fetch('/api/admin/user-votes')
            const data = await response.json()
            if (data.success) {
                setUsers(data.data.users || [])
            } else {
                setError(data.error || '獲取資料失敗')
            }
        } catch (err) {
            console.error('獲取用戶投票記錄失敗:', err)
            setError('網路錯誤，請稍後再試')
        } finally {
            setLoading(false)
        }
    }

    // 獲取婚紗照縮圖
    const fetchWeddingPhotos = async () => {
        try {
            const response = await fetch('/api/wedding-photos')
            const data = await response.json()
            if (data.success && data.photos) {
                const thumbnailMap = new Map<string, string>()
                for (const photo of data.photos) {
                    thumbnailMap.set(photo.id, photo.thumbnailUrl)
                }
                setWeddingPhotoThumbnails(thumbnailMap)
            }
        } catch (err) {
            console.error('獲取婚紗照失敗:', err)
        }
    }

    // 初始載入
    useEffect(() => {
        fetchUserVotes()
        fetchWeddingPhotos()
    }, [])

    // 切換用戶展開/收合
    const toggleUserExpand = (lineId: string) => {
        setExpandedUsers(prev => {
            const newSet = new Set(prev)
            if (newSet.has(lineId)) {
                newSet.delete(lineId)
            } else {
                newSet.add(lineId)
            }
            return newSet
        })
    }

    // 全部展開/收合
    const toggleAllExpand = () => {
        if (expandedUsers.size === users.length) {
            setExpandedUsers(new Set())
        } else {
            setExpandedUsers(new Set(users.map(u => u.lineId)))
        }
    }

    return (
        <div className="space-y-6">
            {/* 統計和操作 */}
            <div className="bg-white rounded-xl shadow-md p-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                            <Users className="w-5 h-5 text-blue-500" />
                            <span className="font-medium text-gray-700">
                                有投票記錄的用戶：{users.length} 人
                            </span>
                        </div>
                    </div>
                    <div className="flex items-center space-x-2">
                        <button
                            onClick={toggleAllExpand}
                            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
                        >
                            {expandedUsers.size === users.length ? '全部收合' : '全部展開'}
                        </button>
                        <button
                            onClick={fetchUserVotes}
                            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
                        >
                            重新載入
                        </button>
                    </div>
                </div>
            </div>

            {/* 用戶列表 */}
            {loading ? (
                <div className="bg-white rounded-xl shadow-md p-12 text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                    <p className="text-gray-600">載入用戶投票記錄中...</p>
                </div>
            ) : error ? (
                <div className="bg-white rounded-xl shadow-md p-12 text-center">
                    <p className="text-red-500">{error}</p>
                    <button
                        onClick={fetchUserVotes}
                        className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                    >
                        重試
                    </button>
                </div>
            ) : users.length === 0 ? (
                <div className="bg-white rounded-xl shadow-md p-12 text-center">
                    <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 text-lg">目前沒有用戶投票記錄</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {users.map((user) => {
                        const isExpanded = expandedUsers.has(user.lineId)
                        const totalVotes = user.photoWallVotes.length + user.weddingPhotoVotes.length

                        return (
                            <div key={user.lineId} className="bg-white rounded-xl shadow-md overflow-hidden">
                                {/* 用戶標題列 */}
                                <button
                                    onClick={() => toggleUserExpand(user.lineId)}
                                    className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                                >
                                    <div className="flex items-center space-x-3">
                                        <div className="w-12 h-12 relative flex-shrink-0">
                                            {user.avatarUrl ? (
                                                <img
                                                    src={user.avatarUrl}
                                                    alt={user.displayName}
                                                    className="w-full h-full rounded-full object-cover"
                                                    onError={(e) => {
                                                        e.currentTarget.style.display = 'none'
                                                        e.currentTarget.nextElementSibling?.classList.remove('hidden')
                                                    }}
                                                />
                                            ) : null}
                                            <div className={`w-full h-full bg-gray-300 rounded-full flex items-center justify-center ${user.avatarUrl ? 'hidden' : ''}`}>
                                                <User className="w-6 h-6 text-gray-600" />
                                            </div>
                                        </div>
                                        <div className="text-left">
                                            <p className="font-semibold text-gray-800">{user.displayName}</p>
                                            <p className="text-sm text-gray-500">
                                                總投票：{totalVotes} 票
                                                {user.photoWallVotes.length > 0 && (
                                                    <span className="ml-2">
                                                        <ImageIcon className="w-3 h-3 inline-block mr-1" />
                                                        {user.photoWallVotes.length}
                                                    </span>
                                                )}
                                                {user.weddingPhotoVotes.length > 0 && (
                                                    <span className="ml-2">
                                                        <Camera className="w-3 h-3 inline-block mr-1" />
                                                        {user.weddingPhotoVotes.length}
                                                    </span>
                                                )}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <div className="flex items-center space-x-1 bg-pink-100 text-pink-600 px-3 py-1 rounded-full">
                                            <Heart className="w-4 h-4" />
                                            <span className="font-medium">{totalVotes}</span>
                                        </div>
                                        {isExpanded ? (
                                            <ChevronUp className="w-5 h-5 text-gray-400" />
                                        ) : (
                                            <ChevronDown className="w-5 h-5 text-gray-400" />
                                        )}
                                    </div>
                                </button>

                                {/* 展開內容 */}
                                {isExpanded && (
                                    <div className="px-4 pb-4 space-y-4 border-t">
                                        {/* 照片牆投票 */}
                                        {user.photoWallVotes.length > 0 && (
                                            <div className="pt-4">
                                                <h4 className="text-sm font-medium text-gray-600 mb-3 flex items-center space-x-2">
                                                    <ImageIcon className="w-4 h-4" />
                                                    <span>照片牆投票 ({user.photoWallVotes.length})</span>
                                                </h4>
                                                <div className="flex flex-wrap gap-2">
                                                    {user.photoWallVotes.map((vote) => (
                                                        <div
                                                            key={vote.photoId}
                                                            className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0 relative"
                                                        >
                                                            {vote.imageUrl ? (
                                                                <ResponsiveImage
                                                                    src={vote.imageUrl}
                                                                    alt={`照片 ${vote.photoId}`}
                                                                    className="w-full h-full object-cover absolute inset-0"
                                                                    thumbnailUrls={{
                                                                        small: vote.thumbnailUrls.small || undefined,
                                                                        medium: vote.thumbnailUrls.medium || undefined,
                                                                        large: vote.thumbnailUrls.large || undefined
                                                                    }}
                                                                    sizes="64px"
                                                                    width={64}
                                                                    height={64}
                                                                />
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center">
                                                                    <ImageIcon className="w-6 h-6 text-gray-400" />
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* 婚紗照投票 */}
                                        {user.weddingPhotoVotes.length > 0 && (
                                            <div className="pt-4">
                                                <h4 className="text-sm font-medium text-gray-600 mb-3 flex items-center space-x-2">
                                                    <Camera className="w-4 h-4" />
                                                    <span>婚紗照投票 ({user.weddingPhotoVotes.length})</span>
                                                </h4>
                                                <div className="flex flex-wrap gap-2">
                                                    {user.weddingPhotoVotes.map((vote) => {
                                                        const thumbnailUrl = weddingPhotoThumbnails.get(vote.photoId)
                                                        return (
                                                            <div
                                                                key={vote.photoId}
                                                                className="w-16 h-20 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0 relative"
                                                            >
                                                                {thumbnailUrl ? (
                                                                    <>
                                                                        <img
                                                                            src={thumbnailUrl}
                                                                            alt={`婚紗照 ${vote.photoId}`}
                                                                            className="w-full h-full object-cover"
                                                                            onError={(e) => {
                                                                                e.currentTarget.style.display = 'none'
                                                                                e.currentTarget.nextElementSibling?.classList.remove('hidden')
                                                                            }}
                                                                        />
                                                                        <div className="hidden w-full h-full flex items-center justify-center absolute inset-0 bg-gray-100">
                                                                            <Camera className="w-6 h-6 text-gray-400" />
                                                                        </div>
                                                                    </>
                                                                ) : (
                                                                    <div className="w-full h-full flex items-center justify-center">
                                                                        <Camera className="w-6 h-6 text-gray-400" />
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )
                                                    })}
                                                </div>
                                            </div>
                                        )}

                                        {/* 無投票記錄 */}
                                        {user.photoWallVotes.length === 0 && user.weddingPhotoVotes.length === 0 && (
                                            <div className="pt-4 text-center py-6">
                                                <Heart className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                                                <p className="text-gray-500">尚無投票記錄</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
