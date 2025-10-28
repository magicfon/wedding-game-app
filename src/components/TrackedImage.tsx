'use client'

import { useState, useRef, useEffect } from 'react'
import { useImagePerformanceTracking } from '@/lib/image-performance-analytics'

interface TrackedImageProps {
  src: string
  alt: string
  width?: number
  height?: number
  className?: string
  thumbnailSize?: 'small' | 'medium' | 'large'
  quality?: number
  format?: string
  priority?: boolean
  onLoad?: () => void
  onError?: (error: Event) => void
  placeholder?: 'blur' | 'empty'
  blurDataURL?: string
}

export default function TrackedImage({
  src,
  alt,
  width,
  height,
  className = '',
  thumbnailSize,
  quality = 80,
  format = 'auto',
  priority = false,
  onLoad,
  onError,
  placeholder = 'empty',
  blurDataURL
}: TrackedImageProps) {
  const [isLoaded, setIsLoaded] = useState(false)
  const [hasError, setHasError] = useState(false)
  const [currentSrc, setCurrentSrc] = useState<string>('')
  const imgRef = useRef<HTMLImageElement>(null)
  
  const { trackVercelImage } = useImagePerformanceTracking({
    enableVercelAnalytics: true,
    enableConsoleLogging: process.env.NODE_ENV === 'development',
    sampleRate: 0.1 // 10% 抽樣
  })

  // 生成 Vercel Image Optimization URL
  const generateVercelUrl = (originalSrc: string, options: {
    width?: number
    quality?: number
    format?: string
  } = {}) => {
    const encodedUrl = encodeURIComponent(originalSrc)
    const params = new URLSearchParams()
    
    if (options.width) params.set('w', options.width.toString())
    if (options.quality) params.set('q', options.quality.toString())
    if (options.format) params.set('f', options.format)
    
    const queryString = params.toString()
    return `/_vercel/image?url=${encodedUrl}${queryString ? `&${queryString}` : ''}`
  }

  // 根據縮圖尺寸決定寬度
  const getThumbnailWidth = () => {
    switch (thumbnailSize) {
      case 'small': return 200
      case 'medium': return 400
      case 'large': return 800
      default: return width
    }
  }

  // 生成響應式 srcset
  const generateSrcSet = () => {
    if (!width) return undefined
    
    const sizes = [1, 2] // 設備像素比
    const srcSet = sizes.map(scale => {
      const scaledWidth = width * scale
      const vercelUrl = generateVercelUrl(src, {
        width: scaledWidth,
        quality,
        format
      })
      return `${vercelUrl} ${scale}x`
    }).join(', ')
    
    return srcSet
  }

  // 生成 sizes 屬性
  const generateSizes = () => {
    if (!width) return undefined
    
    // 簡單的響應式邏輯，可以根據需要調整
    if (width < 400) return '(max-width: 640px) 100vw, 400px'
    if (width < 800) return '(max-width: 1024px) 50vw, 800px'
    return '(max-width: 1536px) 33vw, 1200px'
  }

  useEffect(() => {
    if (!src) return

    const thumbnailWidth = getThumbnailWidth()
    const vercelUrl = generateVercelUrl(src, {
      width: thumbnailWidth,
      quality,
      format
    })
    
    setCurrentSrc(vercelUrl)
  }, [src, thumbnailSize, width, quality, format])

  const handleLoad = (event: React.SyntheticEvent<HTMLImageElement>) => {
    setIsLoaded(true)
    setHasError(false)
    
    // 追蹤影像載入效能
    if (imgRef.current) {
      trackVercelImage(src, currentSrc, imgRef.current, {
        width: getThumbnailWidth(),
        quality,
        format
      })
    }
    
    onLoad?.()
  }

  const handleError = (event: React.SyntheticEvent<HTMLImageElement>) => {
    setIsLoaded(false)
    setHasError(true)
    onError?.(event.nativeEvent)
  }

  // 如果有錯誤，顯示替代內容
  if (hasError) {
    return (
      <div 
        className={`flex items-center justify-center bg-gray-200 text-gray-500 ${className}`}
        style={{ width, height }}
      >
        <span className="text-sm">載入失敗</span>
      </div>
    )
  }

  return (
    <div className={`relative ${className}`}>
      {/* 佔位符 */}
      {placeholder === 'blur' && blurDataURL && !isLoaded && (
        <div 
          className="absolute inset-0 blur-sm bg-gray-200"
          style={{
            backgroundImage: `url(${blurDataURL})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        />
      )}
      
      {/* 主圖片 */}
      <img
        ref={imgRef}
        src={currentSrc}
        srcSet={generateSrcSet()}
        sizes={generateSizes()}
        alt={alt}
        width={width}
        height={height}
        loading={priority ? 'eager' : 'lazy'}
        onLoad={handleLoad}
        onError={handleError}
        className={`
          transition-opacity duration-300
          ${isLoaded ? 'opacity-100' : 'opacity-0'}
          ${placeholder === 'blur' && blurDataURL ? 'absolute inset-0' : ''}
        `}
        style={{
          objectFit: 'cover',
          width: width || '100%',
          height: height || 'auto'
        }}
      />
      
      {/* 載入指示器 */}
      {!isLoaded && !hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      )}
    </div>
  )
}

// 預設的模糊佔位符生成器
export function generateBlurDataURL(src: string, width: number = 40, height: number = 40): string {
  // 這是一個簡化的實現，實際應用中可以使用更複雜的演算法
  // 或者使用像 plaiceholder 這樣的庫來生成真正的模糊佔位符
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  
  if (ctx) {
    // 創建一個簡單的漸變作為佔位符
    const gradient = ctx.createLinearGradient(0, 0, width, height)
    gradient.addColorStop(0, '#f3f4f6')
    gradient.addColorStop(1, '#e5e7eb')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, width, height)
  }
  
  return canvas.toDataURL('image/jpeg', 0.1)
}

// 用於照片牆的預設配置
export const PhotoWallImageConfig = {
  small: {
    width: 200,
    quality: 75,
    format: 'auto' as const,
    thumbnailSize: 'small' as const
  },
  medium: {
    width: 400,
    quality: 80,
    format: 'auto' as const,
    thumbnailSize: 'medium' as const
  },
  large: {
    width: 800,
    quality: 85,
    format: 'auto' as const,
    thumbnailSize: 'large' as const
  }
}

// 用於縮圖網格的組件
export function ThumbnailImage({ 
  src, 
  alt, 
  size = 'medium',
  className = '',
  onClick 
}: { 
  src: string
  alt: string
  size?: 'small' | 'medium' | 'large'
  className?: string
  onClick?: () => void
}) {
  const config = PhotoWallImageConfig[size]
  
  return (
    <div 
      className={`cursor-pointer hover:opacity-90 transition-opacity ${className}`}
      onClick={onClick}
    >
      <TrackedImage
        src={src}
        alt={alt}
        width={config.width}
        quality={config.quality}
        format={config.format}
        thumbnailSize={config.thumbnailSize}
        className="w-full h-full object-cover rounded-lg"
      />
    </div>
  )
}