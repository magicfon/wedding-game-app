'use client'

import Image from 'next/image'
import { useState, useEffect } from 'react'
import { Loader2 } from 'lucide-react'

interface ResponsiveImageProps {
  src: string
  alt: string
  className?: string
  priority?: boolean
  onClick?: () => void
  sizes?: string
  quality?: number
  width?: number  // 新增屬性：明確設置寬度
  height?: number  // 新增屬性：明確設置高度
  thumbnailUrls?: {
    small?: string
    medium?: string
    large?: string
  }
  fallbackSrc?: string
  onLoad?: () => void
  onError?: () => void
  lightboxMode?: boolean  // 新增屬性：放大模式時強制使用原圖
  progressiveLoad?: boolean  // 新增屬性：是否啟用漸進式載入
}

export default function ResponsiveImage({
  src,
  alt,
  className = '',
  priority = false,
  onClick,
  sizes = '(max-width: 640px) 200px, (max-width: 1024px) 400px, 800px',
  quality = 80,
  width,
  height,
  thumbnailUrls,
  fallbackSrc,
  onLoad,
  onError,
  lightboxMode = false,  // 新增參數，默認為 false
  progressiveLoad = false  // 新增參數，默認為 false
}: ResponsiveImageProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const [currentSrc, setCurrentSrc] = useState(src)
  const [isProgressiveLoading, setIsProgressiveLoading] = useState(false)
  const [originalImageLoaded, setOriginalImageLoaded] = useState(false)

  // 根據螢幕尺寸選擇適當的縮圖
  const getOptimalSrc = () => {
    if (hasError && fallbackSrc) return fallbackSrc
    
    // 🎯 放大模式優先使用原圖（僅在不啟用漸進式載入時）
    if (lightboxMode && !progressiveLoad) {
      return src
    }
    
    // 如果有縮圖 URL，根據螢幕寬度選擇
    if (thumbnailUrls && typeof window !== 'undefined') {
      const screenWidth = window.innerWidth
      if (screenWidth <= 640 && thumbnailUrls.small) {
        return thumbnailUrls.small
      } else if (screenWidth <= 1024 && thumbnailUrls.medium) {
        return thumbnailUrls.medium
      } else if (thumbnailUrls.large) {
        return thumbnailUrls.large
      }
    }
    
    return src
  }

  // 🎯 漸進式載入：獲取初始圖片（瀑布牆上的照片）
  const getInitialSrc = () => {
    if (hasError && fallbackSrc) return fallbackSrc
    
    // 🎯 漸進式載入：直接使用當前顯示的圖片（瀑布牆上的縮圖）
    // 這樣可以保持與瀑布牆一致的顯示
    // 在 lightbox 模式下，即使啟用漸進式載入，也先顯示縮圖
    return getOptimalSrc()
  }

  // 🎯 預載入原圖
  useEffect(() => {
    if (lightboxMode && progressiveLoad && !originalImageLoaded) {
      // 創建一個新的 Image 對象來預載入原圖
      const img = document.createElement('img')
      img.onload = () => {
        setOriginalImageLoaded(true)
      }
      img.onerror = () => {
        console.error('Failed to preload original image')
      }
      img.src = src
    }
  }, [lightboxMode, progressiveLoad, src, originalImageLoaded])

  const handleLoad = () => {
    setIsLoading(false)
    
    // 🎯 漸進式載入：在 lightbox 模式下，如果原圖已預載入且當前不是原圖，則切換到原圖
    if (progressiveLoad && lightboxMode && originalImageLoaded && currentSrc !== src) {
      setIsProgressiveLoading(true)
      setCurrentSrc(src)  // 切換到原圖
    } else {
      setIsProgressiveLoading(false)
      onLoad?.()
    }
  }

  const handleError = () => {
    setIsLoading(false)
    setIsProgressiveLoading(false)
    setHasError(true)
    onError?.()
  }

  return (
    <div className={`relative ${className}`}>
      {/* 載入指示器 */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      )}
      
      {/* 錯誤狀態 */}
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg">
          <div className="text-center">
            <div className="text-gray-400 text-sm mb-2">圖片載入失敗</div>
            <button
              onClick={() => {
                setHasError(false)
                setIsLoading(true)
                setCurrentSrc(src)
              }}
              className="text-blue-500 text-sm hover:text-blue-600"
            >
              重試
            </button>
          </div>
        </div>
      )}
      
      {/* 🎯 漸進式載入指示器 */}
      {isProgressiveLoading && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="bg-black/20 backdrop-blur-sm rounded-full p-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
          </div>
        </div>
      )}
      
      {/* 主要圖片 */}
      <Image
        src={currentSrc}
        alt={alt}
        sizes={lightboxMode ? undefined : sizes}  // 🎯 放大模式下不使用 sizes
        quality={lightboxMode ? 100 : quality}  // 🎯 放大模式下使用最高品質
        priority={priority || lightboxMode}  // 🎯 放大模式下優先載入
        width={lightboxMode ? (width || 1200) : width}  // 🎯 放大模式下設置寬度避免錯誤
        height={lightboxMode ? undefined : height}  // 🎯 高度自動計算
        className={`
          transition-opacity duration-300
          ${isLoading ? 'opacity-0' : 'opacity-100'}
          ${isProgressiveLoading ? 'opacity-90' : ''}  // 🎯 漸進式載入時稍微透明
          ${hasError ? 'hidden' : ''}
          ${className}
        `}
        onLoad={handleLoad}
        onError={handleError}
        onClick={onClick}
        fill={className.includes('absolute') || className.includes('inset-0')}
        style={{
          objectFit: 'cover',
          cursor: onClick ? 'pointer' : 'default'
        }}
      />
    </div>
  )
}