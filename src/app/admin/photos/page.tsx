'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useLiff } from '@/hooks/useLiff'
import { Eye, EyeOff, Download, Trash2, Image as ImageIcon, Clock, User, Heart, Home, ArrowLeft, Filter } from 'lucide-react'
import Image from 'next/image'

interface PhotoWithUser {
  id: number
  image_url: string
  blessing_message: string | null
  is_public: boolean
  vote_count: number
  created_at: string
  user_id: string
  uploader: {
    display_name: string
    picture_url: string | null
  }
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

  const { isLoggedIn, profile, isAdmin: liffIsAdmin, loading: liffLoading, adminLoading } = useLiff()

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
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/admin/dashboard')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">照片管理</h1>
                <p className="text-sm text-gray-600">管理所有上傳的照片</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/admin/dashboard')}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <Home className="w-4 h-4" />
                <span className="text-sm">控制台</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* 統計卡片 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

          {/* 篩選按鈕 */}
          <div className="bg-white rounded-xl shadow-md p-4">
            <div className="flex items-center space-x-2">
              <Filter className="w-5 h-5 text-gray-600" />
              <span className="text-sm font-medium text-gray-700">篩選：</span>
              <div className="flex space-x-2">
                <button
                  onClick={() => setFilter('all')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filter === 'all'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  全部 ({photos.length})
                </button>
                <button
                  onClick={() => setFilter('public')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filter === 'public'
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  公開 ({publicCount})
                </button>
                <button
                  onClick={() => setFilter('private')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filter === 'private'
                      ? 'bg-purple-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  隱私 ({privateCount})
                </button>
              </div>
            </div>
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
              {filteredPhotos.map((photo) => (
                <div
                  key={photo.id}
                  className="group relative bg-white rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer"
                  onClick={() => setSelectedPhoto(photo)}
                >
                  <div className="aspect-square relative bg-gray-200">
                    {photo.image_url ? (
                      <Image
                        src={photo.image_url}
                        alt={photo.blessing_message || '照片'}
                        fill
                        className="object-cover"
                        unoptimized
                        onError={(e) => {
                          console.error('圖片載入失敗:', photo.image_url)
                          e.currentTarget.style.display = 'none'
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageIcon className="w-12 h-12 text-gray-400" />
                      </div>
                    )}
                    
                    {/* 公開/隱私標記 */}
                    <div className="absolute top-2 right-2">
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
                    
                    {/* 懸停遮罩 */}
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all duration-300 flex items-center justify-center">
                      <Eye className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    </div>
                  </div>

                  {/* 照片資訊 */}
                  <div className="p-3">
                    <div className="flex items-center space-x-2 mb-2">
                      {photo.uploader.picture_url ? (
                        <Image
                          src={photo.uploader.picture_url}
                          alt={photo.uploader.display_name}
                          width={24}
                          height={24}
                          className="rounded-full"
                          unoptimized
                        />
                      ) : (
                        <div className="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center">
                          <User className="w-4 h-4 text-gray-600" />
                        </div>
                      )}
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
                        <Clock className="w-3 h-3" />
                        <span>{new Date(photo.created_at).toLocaleDateString('zh-TW')}</span>
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
              {/* 照片 */}
              <div className="relative w-full aspect-video bg-gray-100">
                <Image
                  src={selectedPhoto.image_url}
                  alt={selectedPhoto.blessing_message || '照片'}
                  fill
                  className="object-contain"
                  unoptimized
                />
              </div>

              {/* 照片資訊 */}
              <div className="p-6 space-y-4">
                {/* 上傳者 */}
                <div className="flex items-center space-x-3">
                  {selectedPhoto.uploader.picture_url ? (
                    <Image
                      src={selectedPhoto.uploader.picture_url}
                      alt={selectedPhoto.uploader.display_name}
                      width={48}
                      height={48}
                      className="rounded-full"
                      unoptimized
                    />
                  ) : (
                    <div className="w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center">
                      <User className="w-6 h-6 text-gray-600" />
                    </div>
                  )}
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
                    className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-lg font-medium transition-colors ${
                      selectedPhoto.is_public
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
  )
}

