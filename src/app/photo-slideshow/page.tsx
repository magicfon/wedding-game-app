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
      <div className="w-screen h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-white"></div>
      </div>
    )
  }

  if (photos.length === 0) {
    return (
      <div className="w-screen h-screen bg-black flex items-center justify-center p-4">
        <div className="text-center">
          <Heart className="w-20 h-20 text-gray-400 mx-auto mb-6" />
          <h2 className="text-3xl font-bold text-white mb-4">還沒有照片</h2>
          <p className="text-gray-300 mb-6 text-lg">快去上傳第一張照片吧！</p>
          <a
            href="/photo-upload"
            className="inline-block bg-pink-500 hover:bg-pink-600 text-white font-semibold py-4 px-8 rounded-lg transition-colors duration-200 text-lg"
          >
            上傳照片
          </a>
        </div>
      </div>
    )
  }

  const currentPhoto = photos[currentIndex]

  return (
    <div className="w-screen h-screen bg-black overflow-hidden">
      {/* 全螢幕照片展示區 */}
      <div className="relative w-full h-full">
        {/* 照片 - 16:9 全螢幕 */}
        <div className="absolute inset-0 flex items-center justify-center">
          <img
            src={currentPhoto.image_url}
            alt="Wedding photo"
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'https://via.placeholder.com/1920x1080/1a1a1a/9ca3af?text=照片載入中...'
            }}
          />
        </div>

        {/* 計數器 - 左上角 */}
        <div className="absolute top-6 left-6 bg-black/70 text-white px-4 py-2 rounded-lg flex items-center space-x-2 backdrop-blur-sm">
          <span className="font-medium text-lg">{currentIndex + 1} / {photos.length}</span>
        </div>

        {/* 控制按鈕組 - 右下角 */}
        <div className="absolute bottom-6 right-6 flex items-center space-x-3">
          {/* 上一張 */}
          <button
            onClick={handlePrevious}
            className="bg-white/90 backdrop-blur-sm p-4 rounded-full shadow-2xl hover:bg-white hover:scale-110 transition-all duration-200"
          >
            <ChevronLeft className="w-8 h-8 text-gray-700" />
          </button>
          
          {/* 播放/暫停 */}
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="bg-white/90 backdrop-blur-sm p-4 rounded-full shadow-2xl hover:bg-white hover:scale-110 transition-all duration-200"
          >
            {isPlaying ? (
              <Pause className="w-8 h-8 text-red-500" />
            ) : (
              <Play className="w-8 h-8 text-green-500" />
            )}
          </button>

          {/* 下一張 */}
          <button
            onClick={handleNext}
            className="bg-white/90 backdrop-blur-sm p-4 rounded-full shadow-2xl hover:bg-white hover:scale-110 transition-all duration-200"
          >
            <ChevronRight className="w-8 h-8 text-gray-700" />
          </button>

          {/* 投票按鈕 */}
          <button
            onClick={() => handleVote(currentPhoto.id)}
            data-photo-id={currentPhoto.id}
            className="bg-white/90 backdrop-blur-sm p-4 rounded-full shadow-2xl hover:bg-white hover:scale-110 transition-all duration-200"
          >
            <Heart className="w-8 h-8 text-red-500" />
          </button>
        </div>

        {/* 票數顯示 - 左下角 */}
        <div className="absolute bottom-6 left-6 bg-black/70 text-white px-4 py-2 rounded-lg flex items-center space-x-2 backdrop-blur-sm">
          <Heart className="w-5 h-5 text-red-400" />
          <span className="font-medium text-lg">{currentPhoto.vote_count} 個愛心</span>
        </div>

        {/* 中央漂浮資訊 */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="animate-float-slow max-w-4xl mx-8 text-center pointer-events-auto">
            {/* 上傳者資訊 */}
            <div className="flex flex-col items-center space-y-3 mb-6">
              <img
                src={currentPhoto.uploader.avatar_url || '/default-avatar.png'}
                alt="Avatar"
                className="w-20 h-20 rounded-full ring-4 ring-white shadow-2xl"
              />
              <div>
                <div className="flex items-center justify-center space-x-2">
                  <User className="w-6 h-6 text-white drop-shadow-lg" />
                  <span className="text-3xl font-bold text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)]">
                    {currentPhoto.uploader.display_name}
                  </span>
                </div>
                <p className="text-base text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)] mt-2">
                  {new Date(currentPhoto.created_at).toLocaleString('zh-TW')}
                </p>
              </div>
            </div>

            {/* 祝福訊息 */}
            {currentPhoto.blessing_message && (
              <div className="flex items-start justify-center space-x-3">
                <MessageSquare className="w-7 h-7 text-white drop-shadow-lg mt-1 flex-shrink-0" />
                <p className="text-2xl text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)] leading-relaxed font-medium max-w-3xl">
                  {currentPhoto.blessing_message}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
