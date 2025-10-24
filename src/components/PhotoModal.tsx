'use client'

import { useState, useEffect } from 'react'
import { Photo } from '@/lib/supabase'
import { X, Heart, MessageSquare } from 'lucide-react'

interface PhotoWithUser extends Photo {
  uploader: {
    display_name: string
    avatar_url: string
  }
}

interface PhotoModalProps {
  photo: PhotoWithUser
  onClose: () => void
  onVote: (photoId: number) => void
  userVotes: Record<number, number>
  votingEnabled: boolean
  votingInProgress: Set<number>
}

export default function PhotoModal({ 
  photo, 
  onClose, 
  onVote, 
  userVotes, 
  votingEnabled, 
  votingInProgress 
}: PhotoModalProps) {
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageError, setImageError] = useState(false)
  
  // 重置狀態當照片變更時
  useEffect(() => {
    setImageLoaded(false)
    setImageError(false)
  }, [photo.id])
  
  const handleImageLoad = () => {
    setImageLoaded(true)
  }
  
  const handleImageError = () => {
    setImageError(true)
  }
  
  const getRemainingVotes = () => {
    const used = Object.values(userVotes).reduce((sum, count) => sum + count, 0)
    return Math.max(0, 3 - used) // 假設每人3票
  }
  
  return (
    <div 
      className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4 animate-fadeIn"
      onClick={onClose}
    >
      <div className="max-w-6xl w-full h-full flex flex-col">
        {/* 頂部工具列 */}
        <div className="flex items-center justify-between p-4 text-white flex-shrink-0">
          <div className="flex items-center space-x-4">
            <img
              src={photo.uploader.avatar_url || '/default-avatar.png'}
              alt="Avatar"
              className="w-12 h-12 rounded-full border-2 border-white"
            />
            <div>
              <h3 className="font-semibold text-lg">{photo.uploader.display_name}</h3>
              <p className="text-sm text-gray-300">
                {new Date(photo.created_at).toLocaleString('zh-TW')}
              </p>
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        
        {/* 可滾動的內容區域 */}
        <div 
          className="flex-1 overflow-y-auto overflow-x-hidden px-4 pb-4"
          onClick={(e) => e.stopPropagation()}
          style={{
            scrollbarWidth: 'thin',
            scrollbarColor: 'rgba(255, 255, 255, 0.3) transparent'
          }}
        >
          {/* 照片容器 */}
          <div className="flex items-center justify-center relative min-h-0 mb-4">
            {/* 縮圖（初始顯示） */}
            <img
              src={photo.thumbnail_url || photo.image_url}
              alt="Wedding photo thumbnail"
              className={`max-w-full w-auto h-auto object-contain rounded-lg shadow-2xl transition-opacity duration-300 ${
                imageLoaded && !imageError ? 'opacity-0' : 'opacity-100'
              }`}
              style={{ position: imageLoaded ? 'absolute' : 'relative' }}
            />
            
            {/* 原圖（背景載入） */}
            <img
              src={photo.image_url}
              alt="Wedding photo"
              className={`max-w-full w-auto h-auto object-contain rounded-lg shadow-2xl transition-opacity duration-300 ${
                imageLoaded && !imageError ? 'opacity-100' : 'opacity-0'
              }`}
              onLoad={handleImageLoad}
              onError={handleImageError}
              onClick={(e) => e.stopPropagation()}
            />
            
            {/* 載入指示器 */}
            {!imageLoaded && !imageError && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
              </div>
            )}
            
            {/* 錯誤指示器 */}
            {imageError && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-white text-center">
                  <p className="text-lg">載入失敗</p>
                  <p className="text-sm mt-2">請稍後再試</p>
                </div>
              </div>
            )}
            
            {/* 投票區域 - 右上角 */}
            {votingEnabled && (
              <div className="absolute top-4 right-4 flex items-center space-x-3">
                {/* 得票數顯示 */}
                <div className="bg-pink-500/90 backdrop-blur-sm px-4 py-2 rounded-full flex items-center space-x-2 shadow-lg">
                  <Heart className="w-5 h-5 fill-current text-white" />
                  <span className="font-semibold text-white">{photo.vote_count}</span>
                </div>
                
                {/* 投票按鈕 */}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    // 檢查是否已經沒有票數
                    const hasVoted = userVotes[photo.id] > 0
                    const totalUsedVotes = Object.values(userVotes).reduce((sum, count) => sum + count, 0)
                    
                    if (!hasVoted && totalUsedVotes >= 3) {
                      alert('投票額度已用完，請先取消其他照片的投票')
                      return
                    }
                    
                    onVote(photo.id)
                  }}
                  disabled={votingInProgress.has(photo.id)}
                  className={`p-3 rounded-full shadow-2xl transition-all duration-200 backdrop-blur-sm ${
                    votingInProgress.has(photo.id)
                      ? 'bg-white/60 cursor-wait'
                      : (!userVotes[photo.id] && getRemainingVotes() <= 0)
                      ? 'bg-white/80 cursor-not-allowed'
                      : 'bg-white/90 hover:bg-white hover:scale-110'
                  }`}
                >
                  <Heart className={`w-8 h-8 transition-all ${
                    votingInProgress.has(photo.id)
                      ? 'text-gray-400 animate-pulse'
                      : userVotes[photo.id] > 0 
                      ? 'text-red-500 fill-current drop-shadow-lg' 
                      : getRemainingVotes() <= 0
                      ? 'text-gray-400'
                      : 'text-gray-400 hover:text-pink-500'
                  }`} />
                </button>
              </div>
            )}
          </div>
          
          {/* 祝福訊息區域 */}
          {photo.blessing_message && (
            <div 
              className="bg-white/10 backdrop-blur-md rounded-2xl p-6 text-white"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start space-x-3">
                <MessageSquare className="w-6 h-6 mt-0.5 flex-shrink-0 text-pink-300" />
                <p className="text-white/90 leading-relaxed text-lg break-words">
                  {photo.blessing_message}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}