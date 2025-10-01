'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import AdminLayout from '@/components/AdminLayout'
import { Eye, EyeOff, Download, Trash2, Image as ImageIcon, Clock, User, Heart } from 'lucide-react'
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

export default function PrivatePhotosPage() {
  const router = useRouter()
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [photos, setPhotos] = useState<PhotoWithUser[]>([])
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoWithUser | null>(null)

  // 檢查管理員權限
  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const response = await fetch('/api/admin/check-line-admin-simple', {
          credentials: 'include'
        })
        const data = await response.json()
        
        if (data.isAdmin) {
          setIsAdmin(true)
          await fetchPrivatePhotos()
        } else {
          router.push('/admin/line-auth')
        }
      } catch (error) {
        console.error('管理員檢查失敗:', error)
        router.push('/admin/line-auth')
      } finally {
        setLoading(false)
      }
    }

    checkAdmin()
  }, [router])

  // 獲取隱私照片
  const fetchPrivatePhotos = async () => {
    try {
      const response = await fetch('/api/admin/photos/private-list')
      const data = await response.json()

      if (response.ok) {
        setPhotos(data.photos || [])
      } else {
        console.error('獲取隱私照片失敗:', data.error)
      }
    } catch (error) {
      console.error('獲取隱私照片失敗:', error)
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
    link.download = `private-photo-${photoId}.jpg`
    link.target = '_blank'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (loading) {
    return (
      <AdminLayout title="隱私照片管理">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500"></div>
        </div>
      </AdminLayout>
    )
  }

  if (!isAdmin) {
    return null
  }

  return (
    <AdminLayout title="隱私照片管理">
      <div className="space-y-6">
        {/* 統計卡片 */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <EyeOff className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">隱私照片總數</h3>
              <p className="text-3xl font-bold text-purple-600">{photos.length}</p>
            </div>
          </div>
          <div className="mt-4 text-sm text-gray-500">
            這些照片僅管理員可見，不會出現在照片牆和快門傳情頁面
          </div>
        </div>

        {/* 照片列表 */}
        {photos.length === 0 ? (
          <div className="bg-white rounded-xl shadow-md p-12 text-center">
            <ImageIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">目前沒有隱私照片</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {photos.map((photo) => (
              <div
                key={photo.id}
                className="group relative bg-white rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer"
                onClick={() => setSelectedPhoto(photo)}
              >
                <div className="aspect-square relative">
                  <Image
                    src={photo.image_url}
                    alt={photo.blessing_message || '隱私照片'}
                    fill
                    className="object-cover"
                  />
                  
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
                alt={selectedPhoto.blessing_message || '隱私照片'}
                fill
                className="object-contain"
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
    </AdminLayout>
  )
}

