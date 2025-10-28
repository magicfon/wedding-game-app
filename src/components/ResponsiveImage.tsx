'use client'

import Image from 'next/image'
import { useState } from 'react'
import { Loader2 } from 'lucide-react'

interface ResponsiveImageProps {
  src: string
  alt: string
  className?: string
  priority?: boolean
  onClick?: () => void
  sizes?: string
  quality?: number
  thumbnailUrls?: {
    small?: string
    medium?: string
    large?: string
  }
  fallbackSrc?: string
  onLoad?: () => void
  onError?: () => void
}

export default function ResponsiveImage({
  src,
  alt,
  className = '',
  priority = false,
  onClick,
  sizes = '(max-width: 640px) 200px, (max-width: 1024px) 400px, 800px',
  quality = 80,
  thumbnailUrls,
  fallbackSrc,
  onLoad,
  onError
}: ResponsiveImageProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const [currentSrc, setCurrentSrc] = useState(src)

  // 根據螢幕尺寸選擇適當的縮圖
  const getOptimalSrc = () => {
    if (hasError && fallbackSrc) return fallbackSrc
    
    // 如果有縮圖 URL，根據螢幕寬度選擇
    if (thumbnailUrls) {
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

  const handleLoad = () => {
    setIsLoading(false)
    onLoad?.()
  }

  const handleError = () => {
    setIsLoading(false)
    setHasError(true)
    onError?.()
  }

  // 生成 srcset 以支援響應式圖片
  const generateSrcSet = () => {
    if (!thumbnailUrls) return undefined
    
    const srcSet = []
    if (thumbnailUrls.small) srcSet.push(`${thumbnailUrls.small} 200w`)
    if (thumbnailUrls.medium) srcSet.push(`${thumbnailUrls.medium} 400w`)
    if (thumbnailUrls.large) srcSet.push(`${thumbnailUrls.large} 800w`)
    if (src) srcSet.push(`${src} 1200w`)
    
    return srcSet.join(', ')
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
      
      {/* 主要圖片 */}
      <Image
        src={currentSrc}
        alt={alt}
        sizes={sizes}
        quality={quality}
        priority={priority}
        className={`
          transition-opacity duration-300
          ${isLoading ? 'opacity-0' : 'opacity-100'}
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