'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useLiff } from '@/hooks/useLiff'
import AdminLayout from '@/components/AdminLayout'
import { Eye, EyeOff, Download, Trash2, Image as ImageIcon, Clock, User, Heart, Filter, CheckCircle, XCircle, Loader2, Users, HardDrive, CheckSquare, Square, Video, Play, ArrowDownWideNarrow, ArrowUpDown, Camera, RotateCcw } from 'lucide-react'
import ResponsiveImage from '@/components/ResponsiveImage'
import WeddingPhotosTab from '@/components/WeddingPhotosTab'
import UserVotesTab from '@/components/UserVotesTab'

type TabType = 'photo-wall' | 'wedding-photos' | 'user-votes'

interface PhotoWithUser {
  id: number
  image_url: string
  blessing_message: string | null
  is_public: boolean
  vote_count: number
  created_at: string
  user_id: string
  file_size: number | null
  uploader: {
    display_name: string
    avatar_url: string | null
  }
  thumbnail_small_url?: string
  thumbnail_medium_url?: string
  thumbnail_large_url?: string
  thumbnail_generated_at?: string
  media_type?: 'image' | 'video'
}

interface Voter {
  lineId: string
  displayName: string
  avatarUrl: string | null
}


type FilterType = 'all' | 'public' | 'private'

export default function PhotosManagePage() {
  const router = useRouter()
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [photos, setPhotos] = useState<PhotoWithUser[]>([])
  const [filteredPhotos, setFilteredPhotos] = useState<PhotoWithUser[]>([])
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoWithUser | null>(null)
  const [filter, setFilter] = useState<FilterType>('all')
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [voters, setVoters] = useState<Voter[]>([])
  const [votersLoading, setVotersLoading] = useState(false)
  const [votersError, setVotersError] = useState<string | null>(null)
  const [fileSizes, setFileSizes] = useState<Map<number, number>>(new Map())
  const [loadingSizes, setLoadingSizes] = useState<Set<number>>(new Set())
  const [selectedPhotos, setSelectedPhotos] = useState<Set<number>>(new Set())
  const [isBatchMode, setIsBatchMode] = useState(false)
  const [batchDeleting, setBatchDeleting] = useState(false)
  const [sortByVotes, setSortByVotes] = useState(false)  // 是否依得票數排序
  const [activeTab, setActiveTab] = useState<TabType>('photo-wall')
  const [resettingVotes, setResettingVotes] = useState(false)

  const { isLoggedIn, profile, isAdmin: liffIsAdmin, loading: liffLoading, adminLoading } = useLiff()

  // 檔案大小格式化函數
  const formatFileSize = (bytes: number | null): string => {
    if (!bytes || bytes === 0) return '未知'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
  }

  // 獲取檔案大小
  const fetchFileSize = async (photoId: number, imageUrl: string): Promise<number | null> => {
    // 檢查快取
    if (fileSizes.has(photoId)) {
      return fileSizes.get(photoId)!
    }

    // 檢查是否正在載入
    if (loadingSizes.has(photoId)) {
      return null
    }

    setLoadingSizes(prev => new Set(prev).add(photoId))

    try {
      const response = await fetch(imageUrl, { method: 'HEAD' })
      const contentLength = response.headers.get('content-length')

      if (contentLength) {
        const fileSize = parseInt(contentLength, 10)
        setFileSizes(prev => new Map(prev).set(photoId, fileSize))
        return fileSize
      }
    } catch (error) {
      console.warn(`無法獲取照片 ${photoId} 的檔案大小:`, error)
    } finally {
      setLoadingSizes(prev => {
        const newSet = new Set(prev)
        newSet.delete(photoId)
        return newSet
      })
    }

    return null
  }

  // 批量獲取檔案大小
  useEffect(() => {
    if (filteredPhotos.length > 0) {
      const visiblePhotos = filteredPhotos.slice(0, 20) // 限制前 20 張照片

      visiblePhotos.forEach(photo => {
        if (!fileSizes.has(photo.id) && !loadingSizes.has(photo.id)) {
          fetchFileSize(photo.id, photo.image_url)
        }
      })
    }
  }, [filteredPhotos])

  // 檢查管理員權限
  useEffect(() => {
    if (liffLoading || adminLoading) {
      return
    }

    if (!isLoggedIn || !profile?.userId) {
      router.push('/')
      return
    }

    if (!liffIsAdmin) {
      router.push('/')
      return
    }

    setIsAdmin(true)
    fetchAllPhotos()
    setLoading(false)
  }, [isLoggedIn, profile, liffIsAdmin, liffLoading, adminLoading, router])

  // 篩選照片
  useEffect(() => {
    console.log('篩選照片 - filter:', filter, 'photos.length:', photos.length)
    if (filter === 'all') {
      setFilteredPhotos(photos)
    } else if (filter === 'public') {
      const publicPhotos = photos.filter(p => p.is_public)
      console.log('公開照片數量:', publicPhotos.length)
      setFilteredPhotos(publicPhotos)
    } else if (filter === 'private') {
      const privatePhotos = photos.filter(p => !p.is_public)
      console.log('隱私照片數量:', privatePhotos.length)
      setFilteredPhotos(privatePhotos)
    }
    console.log('filteredPhotos 將更新為:', filter === 'all' ? photos.length :
      filter === 'public' ? photos.filter(p => p.is_public).length :
        photos.filter(p => !p.is_public).length)
  }, [filter, photos])

  // 獲取所有照片
  const fetchAllPhotos = async () => {
    try {
      console.log('開始獲取所有照片...')
      const response = await fetch('/api/admin/photos/all-list')
      const data = await response.json()

      console.log('API 回應:', {
        ok: response.ok,
        status: response.status,
        photosCount: data.photos?.length || 0,
        photos: data.photos
      })

      if (response.ok) {
        const photosData = data.photos || []
        setPhotos(photosData)
        console.log('照片已載入:', photosData.length)
        console.log('第一張照片資訊:', photosData[0])
        console.log('第一張照片 URL:', photosData[0]?.image_url)
      } else {
        console.error('獲取照片失敗:', data.error)
      }
    } catch (error) {
      console.error('獲取照片失敗:', error)
    }
  }


  // 切換照片公開狀態
  const togglePhotoVisibility = async (photoId: number, currentStatus: boolean) => {
    try {
      const response = await fetch('/api/admin/photos/toggle-visibility', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photoId, isPublic: !currentStatus }),
        credentials: 'include'
      })

      const data = await response.json()

      if (response.ok) {
        setPhotos(photos.map(photo =>
          photo.id === photoId ? { ...photo, is_public: !currentStatus } : photo
        ))
        alert(`照片已${!currentStatus ? '公開' : '設為隱私'}`)
      } else {
        alert(`操作失敗: ${data.error}`)
      }
    } catch (error) {
      console.error('切換可見性失敗:', error)
      alert('操作失敗')
    }
  }

  // 刪除照片
  const deletePhoto = async (photoId: number) => {
    if (!confirm('確定要刪除這張照片嗎？此操作無法復原。')) {
      return
    }

    try {
      const response = await fetch('/api/admin/photos/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photoId }),
        credentials: 'include'
      })

      const data = await response.json()

      if (response.ok) {
        setPhotos(photos.filter(photo => photo.id !== photoId))
        setSelectedPhoto(null)
        alert('照片已刪除')
      } else {
        alert(`刪除失敗: ${data.error}`)
      }
    } catch (error) {
      console.error('刪除照片失敗:', error)
      alert('刪除失敗')
    }
  }

  // 批量刪除照片
  const batchDeletePhotos = async (photoIds: number[]) => {
    if (!confirm(`確定要刪除選中的 ${photoIds.length} 張照片嗎？此操作無法復原。`)) {
      return
    }

    setBatchDeleting(true)

    try {
      const response = await fetch('/api/admin/photos/batch-delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photoIds }),
        credentials: 'include'
      })

      const data = await response.json()

      if (response.ok) {
        setPhotos(photos.filter(photo => !photoIds.includes(photo.id)))
        setSelectedPhotos(new Set())
        setIsBatchMode(false)
        alert(`已成功刪除 ${data.deletedCount} 張照片`)
      } else {
        alert(`批量刪除失敗: ${data.error}`)
      }
    } catch (error) {
      console.error('批量刪除照片失敗:', error)
      alert('批量刪除失敗')
    } finally {
      setBatchDeleting(false)
    }
  }

  // 切換照片選擇狀態
  const togglePhotoSelection = (photoId: number) => {
    setSelectedPhotos(prev => {
      const newSet = new Set(prev)
      if (newSet.has(photoId)) {
        newSet.delete(photoId)
      } else {
        newSet.add(photoId)
      }
      return newSet
    })
  }

  // 全選/取消全選
  const toggleSelectAll = () => {
    if (selectedPhotos.size === filteredPhotos.length) {
      setSelectedPhotos(new Set())
    } else {
      setSelectedPhotos(new Set(filteredPhotos.map(photo => photo.id)))
    }
  }

  // 下載照片
  const downloadPhoto = (imageUrl: string, photoId: number) => {
    const link = document.createElement('a')
    link.href = imageUrl
    link.download = `photo-${photoId}.jpg`
    link.target = '_blank'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // 重置所有投票
  const resetAllVotes = async () => {
    if (!confirm('確定要重置所有投票嗎？\n\n此操作會：\n• 刪除所有投票記錄\n• 將所有照片的得票數歸零\n• 將用戶的投票額度全部返還\n\n此操作無法復原！')) {
      return
    }

    setResettingVotes(true)

    try {
      const response = await fetch('/api/admin/photos/reset-votes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      })

      const data = await response.json()

      if (response.ok) {
        // 更新本地狀態，將所有照片的 vote_count 設為 0
        setPhotos(photos.map(photo => ({ ...photo, vote_count: 0 })))
        alert(`已成功重置所有投票！共刪除 ${data.deletedVotes} 筆投票記錄`)
      } else {
        alert(`重置投票失敗: ${data.error}`)
      }
    } catch (error) {
      console.error('重置投票失敗:', error)
      alert('重置投票失敗')
    } finally {
      setResettingVotes(false)
    }
  }

  // 獲取照片投票者資訊
  const fetchPhotoVoters = async (photoId: number) => {
    if (!photoId) return

    setVotersLoading(true)
    setVotersError(null)

    try {
      console.log(`開始獲取照片 ${photoId} 的投票者資訊...`)
      const response = await fetch(`/api/admin/photos/voters?photoId=${photoId}`)
      const data = await response.json()

      if (response.ok && data.success) {
        setVoters(data.data.voters || [])
        console.log(`照片 ${photoId} 投票者資訊已載入:`, data.data.voters.length, '人')
      } else {
        console.error('獲取投票者失敗:', data.error)
        setVotersError(data.error || '獲取投票者失敗')
      }
    } catch (error) {
      console.error('獲取投票者資訊錯誤:', error)
      setVotersError('網路錯誤，請稍後再試')
    } finally {
      setVotersLoading(false)
    }
  }

  // 當選擇照片時，重置投票者資訊並重新載入
  useEffect(() => {
    if (selectedPhoto) {
      fetchPhotoVoters(selectedPhoto.id)
    } else {
      setVoters([])
      setVotersError(null)
    }
  }, [selectedPhoto])

  if (loading || liffLoading || adminLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500 mx-auto mb-4"></div>
          <p className="text-gray-600">載入中...</p>
        </div>
      </div>
    )
  }

  if (!isAdmin) {
    return null
  }

  const publicCount = photos.filter(p => p.is_public).length
  const privateCount = photos.filter(p => !p.is_public).length

  console.log('渲染照片管理頁面 - photos:', photos.length, 'filteredPhotos:', filteredPhotos.length, 'filter:', filter)

  return (
    <AdminLayout title="照片管理">
      <div className="max-w-7xl mx-auto">
        <div className="space-y-6">
          {/* Tab 切換 */}
          <div className="bg-white rounded-xl shadow-md p-2 flex space-x-2 mb-6">
            <button
              onClick={() => setActiveTab('photo-wall')}
              className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-lg font-medium transition-colors ${activeTab === 'photo-wall'
                ? 'bg-pink-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
            >
              <ImageIcon className="w-5 h-5" />
              <span>照片牆</span>
            </button>
            <button
              onClick={() => setActiveTab('wedding-photos')}
              className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-lg font-medium transition-colors ${activeTab === 'wedding-photos'
                ? 'bg-pink-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
            >
              <Camera className="w-5 h-5" />
              <span>婚紗照</span>
            </button>
            <button
              onClick={() => setActiveTab('user-votes')}
              className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-lg font-medium transition-colors ${activeTab === 'user-votes'
                ? 'bg-pink-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
            >
              <Users className="w-5 h-5" />
              <span>用戶投票</span>
            </button>
          </div>

          {/* 婚紗照 Tab 內容 */}
          {activeTab === 'wedding-photos' && <WeddingPhotosTab />}

          {/* 用戶投票 Tab 內容 */}
          {activeTab === 'user-votes' && <UserVotesTab />}

          {/* 統計卡片 - 照片牆 Tab */}
          <div className={activeTab !== 'photo-wall' ? 'hidden' : ''}>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl shadow-md p-6">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <ImageIcon className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-600">照片總數</h3>
                    <p className="text-2xl font-bold text-gray-900">{photos.length}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-md p-6">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <Eye className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-600">公開照片</h3>
                    <p className="text-2xl font-bold text-green-600">{publicCount}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-md p-6">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <EyeOff className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-600">隱私照片</h3>
                    <p className="text-2xl font-bold text-purple-600">{privateCount}</p>
                  </div>
                </div>
              </div>

            </div>

            {/* 篩選和批量操作按鈕 */}
            <div className="bg-white rounded-xl shadow-md p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Filter className="w-5 h-5 text-gray-600" />
                  <span className="text-sm font-medium text-gray-700">篩選：</span>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setFilter('all')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === 'all'
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                    >
                      全部 ({photos.length})
                    </button>
                    <button
                      onClick={() => setFilter('public')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === 'public'
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                    >
                      公開 ({publicCount})
                    </button>
                    <button
                      onClick={() => setFilter('private')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === 'private'
                        ? 'bg-purple-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                    >
                      隱私 ({privateCount})
                    </button>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {/* 票數排序按鈕 */}
                  <button
                    onClick={() => setSortByVotes(!sortByVotes)}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${sortByVotes
                      ? 'bg-pink-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    title={sortByVotes ? '依得票數排序中' : '點擊依得票數排序'}
                  >
                    {sortByVotes ? (
                      <ArrowDownWideNarrow className="w-4 h-4" />
                    ) : (
                      <ArrowUpDown className="w-4 h-4" />
                    )}
                    <span>{sortByVotes ? '依票數' : '排序'}</span>
                  </button>
                  <button
                    onClick={resetAllVotes}
                    disabled={resettingVotes}
                    className="flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors bg-red-100 text-red-700 hover:bg-red-200 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                    title="重置所有投票記錄"
                  >
                    {resettingVotes ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <RotateCcw className="w-4 h-4" />
                    )}
                    <span>{resettingVotes ? '重置中...' : '重置投票'}</span>
                  </button>
                  <button
                    onClick={() => {
                      setIsBatchMode(!isBatchMode)
                      setSelectedPhotos(new Set())
                    }}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${isBatchMode
                      ? 'bg-orange-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                  >
                    {isBatchMode ? '取消批量選擇' : '批量選擇'}
                  </button>
                </div>
              </div>

              {/* 批量操作工具列 */}
              {isBatchMode && (
                <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <button
                      onClick={toggleSelectAll}
                      className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      {selectedPhotos.size === filteredPhotos.length ? (
                        <CheckSquare className="w-4 h-4" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                      <span>
                        {selectedPhotos.size === filteredPhotos.length ? '取消全選' : '全選'}
                      </span>
                    </button>
                    <span className="text-sm text-gray-500">
                      已選擇 {selectedPhotos.size} 張照片
                    </span>
                  </div>

                  {selectedPhotos.size > 0 && (
                    <button
                      onClick={() => batchDeletePhotos(Array.from(selectedPhotos))}
                      disabled={batchDeleting}
                      className="flex items-center space-x-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                    >
                      {batchDeleting ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          <span>刪除中...</span>
                        </>
                      ) : (
                        <>
                          <Trash2 className="w-4 h-4" />
                          <span>批量刪除</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              )}
            </div>


            {/* 照片列表 */}
            {filteredPhotos.length === 0 ? (
              <div className="bg-white rounded-xl shadow-md p-12 text-center">
                <ImageIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">
                  {filter === 'all' ? '目前沒有照片' :
                    filter === 'public' ? '目前沒有公開照片' :
                      '目前沒有隱私照片'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {(sortByVotes
                  ? [...filteredPhotos].sort((a, b) => b.vote_count - a.vote_count)
                  : filteredPhotos
                ).map((photo) => (
                  <div
                    key={photo.id}
                    className={`group relative bg-white rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 ${isBatchMode ? 'cursor-pointer' : ''
                      }`}
                    onClick={() => {
                      if (isBatchMode) {
                        togglePhotoSelection(photo.id)
                      } else {
                        setSelectedPhoto(photo)
                      }
                    }}
                  >
                    <div className="aspect-square w-full relative overflow-hidden bg-gray-100">
                      {photo.media_type === 'video' ? (
                        <div className="w-full h-full relative">
                          <ResponsiveImage
                            src={photo.thumbnail_medium_url || photo.thumbnail_small_url || photo.image_url}
                            alt={photo.blessing_message || '影片'}
                            className="w-full h-full object-cover"
                            thumbnailUrls={{
                              small: photo.thumbnail_small_url,
                              medium: photo.thumbnail_medium_url,
                              large: photo.thumbnail_large_url
                            }}
                            sizes="200px"
                          />
                          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-black/50 rounded-full p-2">
                            <Play className="w-6 h-6 text-white fill-current" />
                          </div>
                          <div className="absolute top-2 left-2 z-20 bg-black/60 px-1.5 py-0.5 rounded text-white text-xs font-medium flex items-center">
                            <Video className="w-3 h-3 mr-1" /> 影片
                          </div>
                        </div>
                      ) : photo.image_url ? (
                        <ResponsiveImage
                          src={photo.image_url}
                          alt={photo.blessing_message || '照片'}
                          className="w-full h-full object-cover"
                          thumbnailUrls={{
                            small: photo.thumbnail_small_url,
                            medium: photo.thumbnail_medium_url,
                            large: photo.thumbnail_large_url
                          }}
                          sizes="200px"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ImageIcon className="w-12 h-12 text-gray-400" />
                        </div>
                      )}

                      {/* 批量選擇模式下的選擇框 */}
                      {isBatchMode && (
                        <div className="absolute top-2 left-2 z-10">
                          <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center ${selectedPhotos.has(photo.id)
                            ? 'bg-blue-500 border-blue-500'
                            : 'bg-white border-gray-300'
                            }`}>
                            {selectedPhotos.has(photo.id) && (
                              <CheckSquare className="w-4 h-4 text-white" />
                            )}
                          </div>
                        </div>
                      )}

                      {/* 公開/隱私標記 */}
                      <div className={`absolute top-2 z-10 ${isBatchMode ? 'right-2' : 'right-2'}`}>
                        {photo.is_public ? (
                          <div className="bg-green-500 text-white px-2 py-1 rounded-full text-xs font-medium flex items-center space-x-1">
                            <Eye className="w-3 h-3" />
                            <span>公開</span>
                          </div>
                        ) : (
                          <div className="bg-purple-500 text-white px-2 py-1 rounded-full text-xs font-medium flex items-center space-x-1">
                            <EyeOff className="w-3 h-3" />
                            <span>隱私</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 照片資訊 */}
                    <div className="p-3">
                      <div className="flex items-center space-x-2 mb-2">
                        {photo.uploader.avatar_url ? (
                          <img
                            src={photo.uploader.avatar_url}
                            alt={photo.uploader.display_name}
                            className="w-6 h-6 rounded-full object-cover"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none'
                              e.currentTarget.nextElementSibling?.classList.remove('hidden')
                            }}
                          />
                        ) : null}
                        <div className={`w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center ${photo.uploader.avatar_url ? 'hidden' : ''}`}>
                          <User className="w-4 h-4 text-gray-600" />
                        </div>
                        <span className="text-sm text-gray-700 truncate">
                          {photo.uploader.display_name}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <div className="flex items-center space-x-1">
                          <Heart className="w-3 h-3 text-red-400" />
                          <span>{photo.vote_count}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          {loadingSizes.has(photo.id) ? (
                            <div className="animate-spin rounded-full h-3 w-3 border-b border-gray-400"></div>
                          ) : (
                            <>
                              <HardDrive className="w-3 h-3" />
                              <span>{formatFileSize(fileSizes.get(photo.id) || null)}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 照片詳情彈窗 */}
          {selectedPhoto && (
            <div
              className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4"
              onClick={() => setSelectedPhoto(null)}
            >
              <div
                className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                {/* 照片或影片 */}
                <div className="relative w-full aspect-video bg-black flex items-center justify-center">
                  {selectedPhoto.media_type === 'video' ? (
                    <video
                      src={selectedPhoto.image_url}
                      poster={selectedPhoto.thumbnail_large_url || selectedPhoto.thumbnail_medium_url}
                      controls
                      autoPlay
                      className="max-h-[70vh] w-auto h-auto max-w-full"
                    >
                      您的瀏覽器不支援影片標籤。
                    </video>
                  ) : (
                    <div className="relative w-full h-full">
                      <img
                        src={selectedPhoto.image_url}
                        alt={selectedPhoto.blessing_message || '照片'}
                        className="w-full h-full object-contain"
                      />
                    </div>
                  )}
                </div>

                {/* 照片資訊 */}
                <div className="p-6 space-y-4">
                  {/* 上傳者 */}
                  <div className="flex items-center space-x-3">
                    {selectedPhoto.uploader.avatar_url ? (
                      <img
                        src={selectedPhoto.uploader.avatar_url}
                        alt={selectedPhoto.uploader.display_name}
                        className="w-12 h-12 rounded-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none'
                          e.currentTarget.nextElementSibling?.classList.remove('hidden')
                        }}
                      />
                    ) : null}
                    <div className={`w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center flex-shrink-0 ${selectedPhoto.uploader.avatar_url ? 'hidden' : ''}`}>
                      <User className="w-6 h-6 text-gray-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{selectedPhoto.uploader.display_name}</p>
                      <p className="text-sm text-gray-500">
                        {new Date(selectedPhoto.created_at).toLocaleString('zh-TW')}
                      </p>
                    </div>
                  </div>

                  {/* 祝福訊息 */}
                  {selectedPhoto.blessing_message && (
                    <div className="bg-pink-50 rounded-lg p-4">
                      <p className="text-gray-700">{selectedPhoto.blessing_message}</p>
                    </div>
                  )}

                  {/* 統計 */}
                  <div className="flex items-center space-x-4 text-sm text-gray-600">
                    <div className="flex items-center space-x-2">
                      <Heart className="w-5 h-5 text-red-400" />
                      <span>{selectedPhoto.vote_count} 個愛心</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      {selectedPhoto.is_public ? (
                        <>
                          <Eye className="w-5 h-5 text-green-500" />
                          <span className="text-green-600">公開</span>
                        </>
                      ) : (
                        <>
                          <EyeOff className="w-5 h-5 text-purple-500" />
                          <span className="text-purple-600">隱私</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* 操作按鈕 */}
                  <div className="flex items-center space-x-3 pt-4 border-t">
                    <button
                      onClick={() => togglePhotoVisibility(selectedPhoto.id, selectedPhoto.is_public)}
                      className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-lg font-medium transition-colors ${selectedPhoto.is_public
                        ? 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                        : 'bg-green-100 text-green-700 hover:bg-green-200'
                        }`}
                    >
                      {selectedPhoto.is_public ? (
                        <>
                          <EyeOff className="w-5 h-5" />
                          <span>設為隱私</span>
                        </>
                      ) : (
                        <>
                          <Eye className="w-5 h-5" />
                          <span>設為公開</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => downloadPhoto(selectedPhoto.image_url, selectedPhoto.id)}
                      className="flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-lg font-medium bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors"
                    >
                      <Download className="w-5 h-5" />
                      <span>下載</span>
                    </button>

                    <button
                      onClick={() => deletePhoto(selectedPhoto.id)}
                      className="flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-lg font-medium bg-red-100 text-red-700 hover:bg-red-200 transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                      <span>刪除</span>
                    </button>
                  </div>

                  {/* 投票者列表 */}
                  <div className="pt-4 border-t">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-800 flex items-center space-x-2">
                        <Users className="w-5 h-5" />
                        <span>投票者 ({voters.length})</span>
                      </h3>
                      {votersLoading && (
                        <div className="flex items-center space-x-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span className="text-sm text-gray-500">載入中...</span>
                        </div>
                      )}
                    </div>

                    {votersError ? (
                      <div className="text-center py-8">
                        <XCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
                        <p className="text-red-600 font-medium mb-3">{votersError}</p>
                        <button
                          onClick={() => fetchPhotoVoters(selectedPhoto?.id || 0)}
                          className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                        >
                          重試
                        </button>
                      </div>
                    ) : votersLoading ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                        {Array.from({ length: 8 }).map((_, index) => (
                          <div key={index} className="flex flex-col items-center p-3 bg-gray-50 rounded-lg">
                            <div className="w-12 h-12 bg-gray-200 rounded-full animate-pulse mb-2" />
                            <div className="w-16 h-4 bg-gray-200 rounded animate-pulse" />
                          </div>
                        ))}
                      </div>
                    ) : voters.length === 0 ? (
                      <div className="text-center py-8">
                        <Heart className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500 font-medium">尚無投票者</p>
                        <p className="text-gray-400 text-sm mt-1">
                          當有用戶投票時，他們的資訊會顯示在這裡
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                        {voters.map((voter) => (
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
                    onClick={() => setSelectedPhoto(null)}
                    className="w-full py-3 px-4 rounded-lg font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                  >
                    關閉
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 訊息顯示 */}

      {message && (
        <div className={`fixed bottom-4 right-4 z-50 rounded-xl p-4 flex items-center space-x-3 max-w-md ${message.type === 'success'
          ? 'bg-green-50 border-2 border-green-200 text-green-800'
          : 'bg-red-50 border-2 border-red-200 text-red-800'
          }`}>
          {message.type === 'success' ? (
            <CheckCircle className="w-6 h-6 flex-shrink-0" />
          ) : (
            <XCircle className="w-6 h-6 flex-shrink-0" />
          )}
          <p className="font-medium">{message.text}</p>
          <button
            onClick={() => setMessage(null)}
            className="ml-auto text-gray-400 hover:text-gray-600"
          >
            ×
          </button>
        </div>
      )}
    </AdminLayout>
  )
}

