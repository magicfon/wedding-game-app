'use client'

import { useState, useEffect } from 'react'
import { createSupabaseBrowser } from '@/lib/supabase'
import { Heart, User, MessageSquare, ChevronLeft, ChevronRight, Play, Pause } from 'lucide-react'

interface PhotoWithUser {
  id: number
  user_id: string  // 對應 users.line_id
  image_url: string  // 照片的公開 URL
  blessing_message: string
  vote_count: number
  created_at: string  // 創建時間
  uploader: {
    display_name: string
    avatar_url: string
  }
}

export default function PhotoSlideshowPage() {
  const [photos, setPhotos] = useState<PhotoWithUser[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(true)
  const [loading, setLoading] = useState(true)
  const supabase = createSupabaseBrowser()

  useEffect(() => {
    const fetchPhotos = async () => {
      try {
        const { data, error } = await supabase
          .from('photos')
          .select(`
            *,
            uploader:users!photos_user_id_fkey(display_name, avatar_url)
          `)
          .eq('is_public', true)
          .order('vote_count', { ascending: false })

        if (error) throw error
        setPhotos(data as PhotoWithUser[])
      } catch (error) {
        console.error('Error fetching photos:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchPhotos()

    // 訂閱照片變化
    const subscription = supabase
      .channel('photos_slideshow')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'photos'
      }, () => {
        fetchPhotos()
      })
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase])

  // 自動播放
  useEffect(() => {
    if (!isPlaying || photos.length === 0) return

    const interval = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % photos.length)
    }, 5000) // 每5秒切換

    return () => clearInterval(interval)
  }, [isPlaying, photos.length])

  const handlePrevious = () => {
    setCurrentIndex(prev => prev === 0 ? photos.length - 1 : prev - 1)
  }

  const handleNext = () => {
    setCurrentIndex(prev => (prev + 1) % photos.length)
  }

  const handleVote = async (photoId: number) => {
    try {
      // 需要先獲取用戶身份
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        alert('請先登入才能投票')
        return
      }

      const response = await fetch('/api/photo/vote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          photoId,
          voterLineId: user.id
        })
      })

      const result = await response.json()

      if (!result.success) {
        // 如果是投票額度用完，顯示友善訊息
        if (result.error.includes('投票額度已用完')) {
          alert('您的投票額度已用完！感謝您的參與 ❤️')
        } else {
          alert(result.error || '投票失敗')
        }
        return
      }

      // 投票成功的視覺回饋
      const button = document.querySelector(`[data-photo-id="${photoId}"]`)
      if (button) {
        button.classList.add('animate-pulse')
        setTimeout(() => {
          button.classList.remove('animate-pulse')
        }, 1000)
      }

    } catch (error) {
      console.error('Error voting:', error)
      alert('投票失敗，請稍後再試')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500"></div>
      </div>
    )
  }

  if (photos.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 flex items-center justify-center p-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <Heart className="w-16 h-16 text-gray-400 mx-auto mb-6" />
            <h2 className="text-2xl font-bold text-gray-800 mb-4">還沒有照片</h2>
            <p className="text-gray-600 mb-6">快去上傳第一張照片吧！</p>
            <a
              href="/photo-upload"
              className="inline-block bg-pink-500 hover:bg-pink-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
            >
              上傳照片
            </a>
          </div>
        </div>
      </div>
    )
  }

  const currentPhoto = photos[currentIndex]

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 p-4">
      <div className="max-w-6xl mx-auto">
        {/* 控制列 */}
        <div className="bg-white rounded-2xl shadow-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h2 className="text-2xl font-bold text-gray-800">❤️ 快門傳情</h2>
              <span className="bg-pink-100 text-pink-700 px-3 py-1 rounded-full text-sm font-medium">
                {currentIndex + 1} / {photos.length}
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={handlePrevious}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <ChevronLeft className="w-6 h-6 text-gray-600" />
              </button>
              
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className={`p-2 rounded-lg transition-colors ${
                  isPlaying ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'
                }`}
              >
                {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
              </button>

              <button
                onClick={handleNext}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <ChevronRight className="w-6 h-6 text-gray-600" />
              </button>
            </div>
          </div>
        </div>

        {/* 主要展示區 */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="relative">
            {/* 照片 */}
            <div className="aspect-video bg-gray-100 flex items-center justify-center">
              <img
                src={currentPhoto.image_url}
                alt="Wedding photo"
                className="max-w-full max-h-full object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://via.placeholder.com/800x600/f3f4f6/9ca3af?text=照片載入中...'
                }}
              />
            </div>

            {/* 愛心按鈕 */}
            <button
              onClick={() => handleVote(currentPhoto.id)}
              data-photo-id={currentPhoto.id}
              className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm p-3 rounded-full shadow-lg hover:bg-white hover:scale-110 transition-all duration-200"
            >
              <Heart className="w-6 h-6 text-red-500" />
            </button>

            {/* 票數顯示 */}
            <div className="absolute bottom-4 left-4 bg-black/70 text-white px-3 py-2 rounded-lg flex items-center space-x-2">
              <Heart className="w-4 h-4 text-red-400" />
              <span className="font-medium">{currentPhoto.vote_count} 個愛心</span>
            </div>
          </div>

          {/* 照片資訊 */}
          <div className="p-6">
            <div className="flex items-start justify-between mb-4">
              {/* 上傳者資訊 */}
              <div className="flex items-center space-x-3">
                <img
                  src={currentPhoto.uploader.avatar_url || '/default-avatar.png'}
                  alt="Avatar"
                  className="w-12 h-12 rounded-full"
                />
                <div>
                  <div className="flex items-center space-x-2">
                    <User className="w-4 h-4 text-gray-500" />
                    <span className="font-semibold text-gray-800">
                      {currentPhoto.uploader.display_name}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500">
                    {new Date(currentPhoto.created_at).toLocaleString('zh-TW')}
                  </p>
                </div>
              </div>
            </div>

            {/* 祝福訊息 */}
            {currentPhoto.blessing_message && (
              <div className="bg-pink-50 rounded-lg p-4">
                <div className="flex items-start space-x-2">
                  <MessageSquare className="w-5 h-5 text-pink-500 mt-0.5 flex-shrink-0" />
                  <p className="text-gray-700 leading-relaxed">
                    {currentPhoto.blessing_message}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
