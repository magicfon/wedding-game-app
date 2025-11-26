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
            className="max-w-full max-h-full object-contain"
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'https://via.placeholder.com/1920x1080/1a1a1a/9ca3af?text=照片載入中...'
            }}
          />
        </div>

        {/* 計數器 - 左下角 */}
        <div className="absolute bottom-6 left-6 bg-black/70 text-white px-4 py-2 rounded-lg flex items-center space-x-2 backdrop-blur-sm">
          <span className="font-medium text-lg">{currentIndex + 1} / {photos.length}</span>
        </div>

        {/* 票數顯示 - 右上角 */}
        <div className="absolute top-6 right-6 bg-black/70 text-white px-5 py-3 rounded-lg flex items-center space-x-2 backdrop-blur-sm">
          <Heart className="w-6 h-6 text-red-400" />
          <span className="font-bold text-2xl">{currentPhoto.vote_count}</span>
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

        </div>

        {/* 固定在左上角的資訊卡片 */}
        <div className="absolute top-6 left-6 max-w-md">
          <div className="flex flex-col items-start space-y-4">
            {/* 上傳者資訊 */}
            <div className="flex items-center space-x-4 bg-black/30 p-3 rounded-xl backdrop-blur-sm">
              <img
                src={currentPhoto.uploader.avatar_url || '/default-avatar.png'}
                alt="Avatar"
                className="w-16 h-16 rounded-full ring-2 ring-white shadow-lg"
              />
              <div>
                <span className="text-2xl font-bold text-white drop-shadow-md block">
                  {currentPhoto.uploader.display_name}
                </span>
                <span className="text-sm text-gray-200 drop-shadow-md">
                  {new Date(currentPhoto.created_at).toLocaleString('zh-TW')}
                </span>
              </div>
            </div>

            {/* 祝福訊息 */}
            {currentPhoto.blessing_message && (
              <div className="bg-black/30 p-4 rounded-xl backdrop-blur-sm">
                <p className="text-xl text-white drop-shadow-md leading-relaxed font-medium break-words">
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
