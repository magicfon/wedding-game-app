'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowser, Photo } from '@/lib/supabase'
import { useLiff } from '@/hooks/useLiff'
import Layout from '@/components/Layout'
import { Heart, User, Clock, Trophy, X, MessageSquare } from 'lucide-react'

interface PhotoWithUser extends Photo {
  uploader: {
    display_name: string
    avatar_url: string
  }
  user_vote_count?: number
}

export default function PhotoWallPage() {
  const [photos, setPhotos] = useState<PhotoWithUser[]>([])
  const [displayedPhotos, setDisplayedPhotos] = useState<PhotoWithUser[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [sortBy, setSortBy] = useState<'votes' | 'time'>('time')
  const [userVotes, setUserVotes] = useState<Record<number, number>>({})
  const [availableVotes, setAvailableVotes] = useState(3)
  const [votingEnabled, setVotingEnabled] = useState(false)
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoWithUser | null>(null)
  const [page, setPage] = useState(1)
  const observerRef = useRef<IntersectionObserver | null>(null)
  const loadMoreRef = useRef<HTMLDivElement | null>(null)
  const [pullStartY, setPullStartY] = useState(0)
  const [pullDistance, setPullDistance] = useState(0)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [votingInProgress, setVotingInProgress] = useState<Set<number>>(new Set())
  
  const router = useRouter()
  const supabase = createSupabaseBrowser()
  const { isReady, isLoggedIn, profile, loading: liffLoading } = useLiff()

  const PHOTOS_PER_PAGE = 12

  // 檢查登入狀態
  useEffect(() => {
    if (isReady && !liffLoading && !isLoggedIn) {
      alert('請先登入才能查看照片牆')
      router.push('/')
    }
  }, [isReady, isLoggedIn, liffLoading, router])

  // 獲取投票設定
  const fetchVotingSettings = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('game_state')
        .select('voting_enabled, votes_per_user')
        .single()

      if (error) throw error
      
      setVotingEnabled(data.voting_enabled)
      setAvailableVotes(data.votes_per_user)
    } catch (error) {
      console.error('Error fetching voting settings:', error)
    }
  }, [supabase])

  // 獲取用戶投票記錄
  const fetchUserVotes = useCallback(async () => {
    if (!profile) return

    try {
      const { data, error } = await supabase
        .from('votes')
        .select('photo_id')
        .eq('voter_line_id', profile.userId)

      if (error) throw error

      // 計算每張照片的投票數
      const voteCount: Record<number, number> = {}
      data.forEach(vote => {
        voteCount[vote.photo_id] = (voteCount[vote.photo_id] || 0) + 1
      })
      
      setUserVotes(voteCount)
    } catch (error) {
      console.error('Error fetching user votes:', error)
    }
  }, [profile, supabase])

  // 獲取照片列表
  const fetchPhotos = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('photos')
        .select(`
          *,
          uploader:users!photos_user_id_fkey(display_name, avatar_url)
        `)
        .eq('is_public', true)
        .order(sortBy === 'votes' ? 'vote_count' : 'created_at', 
               { ascending: sortBy === 'votes' ? false : false })

      if (error) throw error
      
      setPhotos(data as PhotoWithUser[])
      setDisplayedPhotos((data as PhotoWithUser[]).slice(0, PHOTOS_PER_PAGE))
      setPage(1)
    } catch (error) {
      console.error('Error fetching photos:', error)
    } finally {
      setLoading(false)
    }
  }, [sortBy, supabase])

  // 載入更多照片
  const loadMorePhotos = useCallback(() => {
    if (loadingMore || displayedPhotos.length >= photos.length) return

    setLoadingMore(true)
    setTimeout(() => {
      const nextPage = page + 1
      const newPhotos = photos.slice(0, nextPage * PHOTOS_PER_PAGE)
      setDisplayedPhotos(newPhotos)
      setPage(nextPage)
      setLoadingMore(false)
    }, 500)
  }, [loadingMore, displayedPhotos.length, photos, page])

  // 設置 Intersection Observer 用於無限滾動
  useEffect(() => {
    if (observerRef.current) {
      observerRef.current.disconnect()
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loadingMore && displayedPhotos.length < photos.length) {
          loadMorePhotos()
        }
      },
      { threshold: 0.1 }
    )

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current)
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [loadMorePhotos, loadingMore, displayedPhotos.length, photos.length])

  useEffect(() => {
    if (!profile) return

    fetchVotingSettings()
    fetchUserVotes()
    fetchPhotos()

    // 訂閱照片變化（但不自動刷新投票，避免衝突）
    const photosSubscription = supabase
      .channel('photos_changes')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'photos'
      }, () => {
        // 只在新增照片時刷新列表
        fetchPhotos()
      })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'photos'
      }, () => {
        // 只在刪除照片時刷新列表
        fetchPhotos()
      })
      .subscribe()

    return () => {
      photosSubscription.unsubscribe()
    }
  }, [profile, sortBy, fetchPhotos, fetchVotingSettings, supabase])

  const handleVote = async (photoId: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    if (!profile || !votingEnabled) return

    // 防止重複點擊（防抖）
    if (votingInProgress.has(photoId)) {
      console.log('⏳ 投票處理中，請稍候...')
      return
    }

    const hasVoted = userVotes[photoId] > 0
    const totalUsedVotes = Object.values(userVotes).reduce((sum, count) => sum + count, 0)
    
    // 如果沒投過票，檢查是否還有額度
    if (!hasVoted && totalUsedVotes >= availableVotes) {
      alert(`您的投票額度已用完！\n\n您已使用：${totalUsedVotes} 票\n總額度：${availableVotes} 票\n\n如需投票給這張照片，請先取消其他照片的投票。`)
      return
    }

    // 標記此照片正在投票中
    setVotingInProgress(prev => new Set(prev).add(photoId))

    // 樂觀更新 UI（先更新介面，再發送請求）
    const previousUserVotes = { ...userVotes }
    const previousPhotos = [...photos]
    const previousDisplayedPhotos = [...displayedPhotos]
    const previousSelectedPhoto = selectedPhoto ? { ...selectedPhoto } : null

    try {
      // 立即更新本地狀態（樂觀更新）
      if (hasVoted) {
        // 取消投票
        setUserVotes(prev => ({
          ...prev,
          [photoId]: 0
        }))
        // 立即減少票數
        const updatePhotoCount = (p: any) => 
          p.id === photoId ? { ...p, vote_count: Math.max(0, p.vote_count - 1) } : p
        
        setPhotos(prev => prev.map(updatePhotoCount))
        setDisplayedPhotos(prev => prev.map(updatePhotoCount))
        if (selectedPhoto?.id === photoId) {
          setSelectedPhoto(prev => prev ? { ...prev, vote_count: Math.max(0, prev.vote_count - 1) } : null)
        }
      } else {
        // 投票
        setUserVotes(prev => ({
          ...prev,
          [photoId]: (prev[photoId] || 0) + 1
        }))
        // 立即增加票數
        const updatePhotoCount = (p: any) => 
          p.id === photoId ? { ...p, vote_count: p.vote_count + 1 } : p
        
        setPhotos(prev => prev.map(updatePhotoCount))
        setDisplayedPhotos(prev => prev.map(updatePhotoCount))
        if (selectedPhoto?.id === photoId) {
          setSelectedPhoto(prev => prev ? { ...prev, vote_count: prev.vote_count + 1 } : null)
        }
      }

      console.log(`🔄 正在${hasVoted ? '取消投票' : '投票'}...`)

      // 發送 API 請求
      const response = await fetch('/api/photo/vote', {
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

      // 用 API 返回的確切值更新票數（校正）
      setPhotos(prev => prev.map(p => 
        p.id === photoId ? { ...p, vote_count: newVoteCount } : p
      ))
      setDisplayedPhotos(prev => prev.map(p => 
        p.id === photoId ? { ...p, vote_count: newVoteCount } : p
      ))
      if (selectedPhoto?.id === photoId) {
        setSelectedPhoto(prev => prev ? { ...prev, vote_count: newVoteCount } : null)
      }

    } catch (error) {
      console.error('❌ 投票錯誤:', error)
      
      // 回滾狀態（恢復到投票前）
      setUserVotes(previousUserVotes)
      setPhotos(previousPhotos)
      setDisplayedPhotos(previousDisplayedPhotos)
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


  const getRemainingVotes = () => {
    const used = Object.values(userVotes).reduce((sum, count) => sum + count, 0)
    return Math.max(0, availableVotes - used)
  }

  // 下拉刷新功能
  const handleRefresh = async () => {
    setRefreshing(true)
    await Promise.all([
      fetchPhotos(),
      fetchUserVotes(),
      fetchVotingSettings()
    ])
    setTimeout(() => {
      setRefreshing(false)
      setPullDistance(0)
    }, 500)
  }

  // 觸控事件處理
  const handleTouchStart = (e: React.TouchEvent) => {
    if (window.scrollY === 0) {
      setPullStartY(e.touches[0].clientY)
    }
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (pullStartY === 0 || window.scrollY > 0) return
    
    const currentY = e.touches[0].clientY
    const distance = currentY - pullStartY
    
    if (distance > 0 && distance < 150) {
      setPullDistance(distance)
    }
  }

  const handleTouchEnd = () => {
    if (pullDistance > 80) {
      handleRefresh()
    } else {
      setPullDistance(0)
    }
    setPullStartY(0)
  }

  if (loading) {
    return (
      <Layout title="照片牆">
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500"></div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout title="照片牆">
      <div 
        ref={containerRef}
        className="max-w-6xl mx-auto"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          transform: `translateY(${pullDistance}px)`,
          transition: refreshing || pullDistance === 0 ? 'transform 0.3s ease' : 'none'
        }}
      >
        {/* 下拉刷新指示器 */}
        {pullDistance > 0 && (
          <div 
            className="absolute top-0 left-0 right-0 flex items-center justify-center"
            style={{
              transform: `translateY(-${Math.min(pullDistance, 80)}px)`,
              opacity: Math.min(pullDistance / 80, 1)
            }}
          >
            <div className="bg-white rounded-full shadow-lg px-4 py-2 flex items-center space-x-2">
              {refreshing ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-pink-500"></div>
                  <span className="text-sm text-gray-700">刷新中...</span>
                </>
              ) : pullDistance > 80 ? (
                <>
                  <span className="text-pink-500 text-xl">↓</span>
                  <span className="text-sm text-gray-700">放開刷新</span>
                </>
              ) : (
                <>
                  <span className="text-gray-400 text-xl">↓</span>
                  <span className="text-sm text-gray-700">下拉刷新</span>
                </>
              )}
            </div>
          </div>
        )}
        
        {/* 頂部控制列 */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex flex-col sm:flex-row items-center justify-between space-y-4 sm:space-y-0">
            <div className="flex items-center space-x-4">
              <h2 className="text-2xl font-bold text-gray-800">照片牆</h2>
              <span className="bg-pink-100 text-pink-700 px-3 py-1 rounded-full text-sm font-medium">
                {photos.length} 張照片
              </span>
            </div>

            <div className="flex items-center space-x-4">
              {/* 投票狀態 */}
              {votingEnabled && (
                <div className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                  getRemainingVotes() === 0 
                    ? 'bg-red-50 border-2 border-red-200' 
                    : getRemainingVotes() <= 2
                    ? 'bg-orange-50 border-2 border-orange-200'
                    : 'bg-blue-50 border-2 border-blue-200'
                }`}>
                  <Trophy className={`w-5 h-5 ${
                    getRemainingVotes() === 0 
                      ? 'text-red-600' 
                      : getRemainingVotes() <= 2
                      ? 'text-orange-600'
                      : 'text-blue-600'
                  }`} />
                  <div className="flex flex-col">
                    <span className={`font-bold text-lg ${
                      getRemainingVotes() === 0 
                        ? 'text-red-700' 
                        : getRemainingVotes() <= 2
                        ? 'text-orange-700'
                        : 'text-blue-700'
                    }`}>
                      {getRemainingVotes()} 票
                    </span>
                    <span className={`text-xs ${
                      getRemainingVotes() === 0 
                        ? 'text-red-600' 
                        : getRemainingVotes() <= 2
                        ? 'text-orange-600'
                        : 'text-blue-600'
                    }`}>
                      {getRemainingVotes() === 0 
                        ? '額度已用完' 
                        : `共 ${availableVotes} 票`
                      }
                    </span>
                  </div>
                </div>
              )}

              {/* 排序切換按鈕 */}
              <div className="flex items-center space-x-2 bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setSortBy('votes')}
                  className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center space-x-2 ${
                    sortBy === 'votes'
                      ? 'bg-white text-pink-600 shadow-md'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  <Trophy className="w-4 h-4" />
                  <span>票數</span>
                </button>
                <button
                  onClick={() => setSortBy('time')}
                  className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center space-x-2 ${
                    sortBy === 'time'
                      ? 'bg-white text-pink-600 shadow-md'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  <Clock className="w-4 h-4" />
                  <span>時間</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Pinterest 風格瀑布流照片牆 */}
        {displayedPhotos.length === 0 ? (
          <div className="text-center py-16">
            <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md mx-auto">
              <Heart className="w-16 h-16 text-gray-400 mx-auto mb-6" />
              <h3 className="text-xl font-semibold text-gray-800 mb-2">還沒有照片</h3>
              <p className="text-gray-600 mb-6">成為第一個分享美好回憶的人吧！</p>
              <button
                onClick={() => router.push('/photo-upload')}
                className="bg-pink-500 hover:bg-pink-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
              >
                上傳照片
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* 瀑布流布局 */}
            <div className="columns-3 sm:columns-4 md:columns-5 lg:columns-4 xl:columns-5 gap-3 sm:gap-4 space-y-3 sm:space-y-4">
              {displayedPhotos.map((photo) => (
                <div 
                  key={photo.id} 
                  className="break-inside-avoid mb-3 sm:mb-4 cursor-pointer group"
                  onClick={() => setSelectedPhoto(photo)}
                >
                  <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 hover:scale-[1.02]">
                    {/* 照片 */}
                    <div className="relative">
                      <img
                        src={photo.image_url}
                        alt="Wedding photo"
                        className="w-full h-auto object-cover"
                        loading="lazy"
                      />
                      
                      {/* 票數顯示 */}
                      <div className="absolute bottom-2 left-2 sm:bottom-3 sm:left-3 bg-black/70 text-white px-2 py-1 sm:px-3 sm:py-1.5 rounded-full flex items-center space-x-1">
                        <Heart className="w-3 h-3 sm:w-4 sm:h-4 fill-current" />
                        <span className="text-xs sm:text-sm font-semibold">{photo.vote_count}</span>
                      </div>
                    </div>

                    {/* 簡化資訊 */}
                    <div className="p-2 sm:p-3">
                      <div className="flex items-center space-x-1.5 sm:space-x-2">
                        <img
                          src={photo.uploader.avatar_url || '/default-avatar.png'}
                          alt="Avatar"
                          className="w-5 h-5 sm:w-6 sm:h-6 rounded-full"
                        />
                        <span className="text-xs sm:text-sm font-medium text-gray-800 truncate">
                          {photo.uploader.display_name}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* 載入更多指示器 */}
            {displayedPhotos.length < photos.length && (
              <div ref={loadMoreRef} className="text-center py-8">
                {loadingMore && (
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500 mx-auto"></div>
                )}
              </div>
            )}

            {/* 已載入全部照片 */}
            {displayedPhotos.length >= photos.length && photos.length > PHOTOS_PER_PAGE && (
              <div className="text-center py-8">
                <p className="text-gray-500 text-sm">✨ 已載入全部 {photos.length} 張照片</p>
              </div>
            )}
          </>
        )}

        {/* 底部提示 */}
        <div className="bg-blue-50 rounded-xl p-4 mt-8 text-center">
          <p className="text-blue-700 text-sm">
            💡 {votingEnabled 
              ? `每人有 ${availableVotes} 票，可以投給不同照片或同一張照片多次投票`
              : '投票功能目前關閉中，請等待主持人開啟'
            }
          </p>
        </div>
      </div>

      {/* 照片放大檢視模態框 */}
      {selectedPhoto && (
        <div 
          className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => setSelectedPhoto(null)}
        >
          <div className="max-w-6xl w-full h-full flex flex-col">
            {/* 頂部工具列 */}
            <div className="flex items-center justify-between p-4 text-white">
              <div className="flex items-center space-x-4">
                <img
                  src={selectedPhoto.uploader.avatar_url || '/default-avatar.png'}
                  alt="Avatar"
                  className="w-12 h-12 rounded-full border-2 border-white"
                />
                <div>
                  <h3 className="font-semibold text-lg">{selectedPhoto.uploader.display_name}</h3>
                  <p className="text-sm text-gray-300">
                    {new Date(selectedPhoto.created_at).toLocaleString('zh-TW')}
                  </p>
                </div>
              </div>
              
              <button
                onClick={() => setSelectedPhoto(null)}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* 照片主體 */}
            <div 
              className="flex-1 flex items-center justify-center relative"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={selectedPhoto.image_url}
                alt="Wedding photo"
                className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              />
              
              {/* 投票按鈕 - 右上角 */}
              {votingEnabled && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleVote(selectedPhoto.id)
                  }}
                  disabled={
                    votingInProgress.has(selectedPhoto.id) || 
                    (!userVotes[selectedPhoto.id] && getRemainingVotes() <= 0)
                  }
                  className={`absolute top-4 right-4 p-3 rounded-full shadow-2xl transition-all duration-200 backdrop-blur-sm ${
                    votingInProgress.has(selectedPhoto.id)
                      ? 'bg-white/60 cursor-wait'
                      : (!userVotes[selectedPhoto.id] && getRemainingVotes() <= 0)
                      ? 'bg-white/60 cursor-not-allowed'
                      : 'bg-white/90 hover:bg-white hover:scale-110'
                  }`}
                >
                  <Heart className={`w-8 h-8 transition-all ${
                    votingInProgress.has(selectedPhoto.id)
                      ? 'text-gray-400 animate-pulse'
                      : userVotes[selectedPhoto.id] > 0 
                      ? 'text-red-500 fill-current drop-shadow-lg' 
                      : 'text-gray-400 hover:text-pink-500'
                  }`} />
                </button>
              )}
            </div>

            {/* 底部資訊列 */}
            <div 
              className="bg-white/10 backdrop-blur-md rounded-2xl p-6 mt-4 text-white"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="space-y-3">
                {/* 得票數 */}
                <div className="flex items-center space-x-3">
                  <div className="bg-pink-500 px-4 py-2 rounded-full flex items-center space-x-2">
                    <Heart className="w-5 h-5 fill-current" />
                    <span className="font-semibold">{selectedPhoto.vote_count} 票</span>
                  </div>
                  {userVotes[selectedPhoto.id] > 0 && (
                    <span className="bg-red-500/80 px-3 py-1 rounded-full text-sm">
                      已投票 ❤
                    </span>
                  )}
                </div>

                {/* 祝福訊息 */}
                {selectedPhoto.blessing_message && (
                  <div className="flex items-start space-x-2">
                    <MessageSquare className="w-5 h-5 mt-0.5 flex-shrink-0 text-pink-300" />
                    <p className="text-white/90 leading-relaxed">
                      {selectedPhoto.blessing_message}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
