'use client'

import { useState } from 'react'

/**
 * 影像效能監控工具
 * 使用 Vercel Analytics 和 Web Performance API 來追蹤影像載入效能
 */

export interface ImagePerformanceMetrics {
  imageUrl: string
  loadTime: number
  fileSize?: number
  dimensions?: {
    width: number
    height: number
  }
  thumbnailSize?: 'small' | 'medium' | 'large'
  deviceInfo: {
    userAgent: string
    viewport: {
      width: number
      height: number
    }
    devicePixelRatio: number
    connection?: {
      effectiveType: string
      downlink: number
      rtt: number
    }
  }
  timestamp: number
  success: boolean
  error?: string
}

export interface ImageAnalyticsConfig {
  enableVercelAnalytics?: boolean
  enableConsoleLogging?: boolean
  enableCustomEndpoint?: boolean
  customEndpoint?: string
  sampleRate?: number // 0-1, 抽樣率
}

class ImagePerformanceTracker {
  private config: ImageAnalyticsConfig
  private metrics: ImagePerformanceMetrics[] = []
  private observers: PerformanceObserver[] = []

  constructor(config: ImageAnalyticsConfig = {}) {
    this.config = {
      enableVercelAnalytics: true,
      enableConsoleLogging: true,
      enableCustomEndpoint: false,
      sampleRate: 0.1, // 預設 10% 抽樣
      ...config
    }

    this.initializeObservers()
  }

  /**
   * 初始化效能觀察器
   */
  private initializeObservers() {
    if (typeof window === 'undefined') return

    // 觀察圖片載入效能
    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        entries.forEach((entry) => {
          if (entry.entryType === 'resource' && 
              (entry as PerformanceResourceTiming).initiatorType === 'img') {
            this.trackImageLoad(entry as PerformanceResourceTiming)
          }
        })
      })
      
      observer.observe({ entryTypes: ['resource'] })
      this.observers.push(observer)
    } catch (error) {
      console.warn('無法初始化 Performance Observer:', error)
    }
  }

  /**
   * 追蹤圖片載入效能
   */
  private trackImageLoad(entry: PerformanceResourceTiming) {
    if (this.shouldSample() === false) return

    const imageUrl = entry.name
    const loadTime = entry.responseEnd - entry.startTime
    
    // 嘗試從 URL 中解析縮圖尺寸
    const thumbnailSize = this.parseThumbnailSize(imageUrl)
    
    // 獲取設備資訊
    const deviceInfo = this.getDeviceInfo()
    
    const metrics: ImagePerformanceMetrics = {
      imageUrl,
      loadTime,
      dimensions: this.getImageDimensions(imageUrl),
      thumbnailSize,
      deviceInfo,
      timestamp: Date.now(),
      success: true
    }

    this.addMetrics(metrics)
  }

  /**
   * 手動追蹤圖片載入
   */
  public trackImage(
    imageUrl: string, 
    imgElement: HTMLImageElement,
    thumbnailSize?: 'small' | 'medium' | 'large'
  ) {
    if (this.shouldSample() === false) return

    const startTime = performance.now()
    
    const onLoad = () => {
      const loadTime = performance.now() - startTime
      
      const metrics: ImagePerformanceMetrics = {
        imageUrl,
        loadTime,
        dimensions: {
          width: imgElement.naturalWidth,
          height: imgElement.naturalHeight
        },
        thumbnailSize,
        deviceInfo: this.getDeviceInfo(),
        timestamp: Date.now(),
        success: true
      }

      this.addMetrics(metrics)
      
      imgElement.removeEventListener('load', onLoad)
      imgElement.removeEventListener('error', onError)
    }

    const onError = (error: Event) => {
      const loadTime = performance.now() - startTime
      
      const metrics: ImagePerformanceMetrics = {
        imageUrl,
        loadTime,
        thumbnailSize,
        deviceInfo: this.getDeviceInfo(),
        timestamp: Date.now(),
        success: false,
        error: 'Image load failed'
      }

      this.addMetrics(metrics)
      
      imgElement.removeEventListener('load', onLoad)
      imgElement.removeEventListener('error', onError)
    }

    imgElement.addEventListener('load', onLoad)
    imgElement.addEventListener('error', onError)
  }

  /**
   * 追蹤 Vercel Image Optimization 載入
   */
  public trackVercelImage(
    originalUrl: string,
    vercelUrl: string,
    imgElement: HTMLImageElement,
    options: {
      width?: number
      quality?: number
      format?: string
    } = {}
  ) {
    if (this.shouldSample() === false) return

    const startTime = performance.now()
    
    const onLoad = () => {
      const loadTime = performance.now() - startTime
      
      const metrics: ImagePerformanceMetrics = {
        imageUrl: vercelUrl,
        loadTime,
        dimensions: {
          width: imgElement.naturalWidth,
          height: imgElement.naturalHeight
        },
        thumbnailSize: this.getThumbnailSizeFromWidth(options.width),
        deviceInfo: this.getDeviceInfo(),
        timestamp: Date.now(),
        success: true
      }

      // 添加 Vercel 特定資訊
      this.addMetrics(metrics, {
        originalUrl,
        vercelOptions: options
      })
      
      imgElement.removeEventListener('load', onLoad)
      imgElement.removeEventListener('error', onError)
    }

    const onError = (error: Event) => {
      const loadTime = performance.now() - startTime
      
      const metrics: ImagePerformanceMetrics = {
        imageUrl: vercelUrl,
        loadTime,
        thumbnailSize: this.getThumbnailSizeFromWidth(options.width),
        deviceInfo: this.getDeviceInfo(),
        timestamp: Date.now(),
        success: false,
        error: 'Vercel image load failed'
      }

      this.addMetrics(metrics, {
        originalUrl,
        vercelOptions: options
      })
      
      imgElement.removeEventListener('load', onLoad)
      imgElement.removeEventListener('error', onError)
    }

    imgElement.addEventListener('load', onLoad)
    imgElement.addEventListener('error', onError)
  }

  /**
   * 添加效能指標
   */
  private addMetrics(metrics: ImagePerformanceMetrics, additionalData?: any) {
    this.metrics.push(metrics)

    // 控制台日誌
    if (this.config.enableConsoleLogging) {
      console.log('📊 Image Performance:', metrics, additionalData)
    }

    // Vercel Analytics
    if (this.config.enableVercelAnalytics && typeof window !== 'undefined' && 'va' in window) {
      try {
        // @ts-ignore
        window.va('event', {
          eventName: 'image_performance',
          data: {
            loadTime: metrics.loadTime,
            thumbnailSize: metrics.thumbnailSize,
            success: metrics.success,
            deviceType: this.getDeviceType(metrics.deviceInfo.userAgent),
            connectionType: metrics.deviceInfo.connection?.effectiveType
          }
        })
      } catch (error) {
        console.warn('Vercel Analytics 追蹤失敗:', error)
      }
    }

    // 自定義端點
    if (this.config.enableCustomEndpoint && this.config.customEndpoint) {
      this.sendToCustomEndpoint(metrics, additionalData)
    }
  }

  /**
   * 發送到自定義端點
   */
  private async sendToCustomEndpoint(metrics: ImagePerformanceMetrics, additionalData?: any) {
    if (!this.config.customEndpoint) return

    try {
      await fetch(this.config.customEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          metrics,
          additionalData,
          timestamp: Date.now()
        })
      })
    } catch (error) {
      console.warn('發送效能數據到自定義端點失敗:', error)
    }
  }

  /**
   * 獲取設備資訊
   */
  private getDeviceInfo() {
    if (typeof window === 'undefined') {
      return {
        userAgent: 'SSR',
        viewport: { width: 0, height: 0 },
        devicePixelRatio: 1
      }
    }

    const connection = (navigator as any).connection || 
                     (navigator as any).mozConnection || 
                     (navigator as any).webkitConnection

    return {
      userAgent: navigator.userAgent,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      },
      devicePixelRatio: window.devicePixelRatio || 1,
      connection: connection ? {
        effectiveType: connection.effectiveType,
        downlink: connection.downlink,
        rtt: connection.rtt
      } : undefined
    }
  }

  /**
   * 從 URL 解析縮圖尺寸
   */
  private parseThumbnailSize(url: string): 'small' | 'medium' | 'large' | undefined {
    if (url.includes('w=200')) return 'small'
    if (url.includes('w=400')) return 'medium'
    if (url.includes('w=800')) return 'large'
    return undefined
  }

  /**
   * 從寬度推斷縮圖尺寸
   */
  private getThumbnailSizeFromWidth(width?: number): 'small' | 'medium' | 'large' | undefined {
    if (!width) return undefined
    if (width <= 200) return 'small'
    if (width <= 400) return 'medium'
    return 'large'
  }

  /**
   * 獲取圖片尺寸（簡化版本）
   */
  private getImageDimensions(url: string): { width: number; height: number } | undefined {
    // 這裡可以實現更複雜的邏輯來獲取圖片尺寸
    // 目前返回 undefined，實際應用中可以預先獲取或從資料庫查詢
    return undefined
  }

  /**
   * 獲取設備類型
   */
  private getDeviceType(userAgent: string): string {
    if (/Mobile|Android|iPhone|iPad/.test(userAgent)) {
      return 'mobile'
    }
    if (/Tablet/.test(userAgent)) {
      return 'tablet'
    }
    return 'desktop'
  }

  /**
   * 決定是否抽樣
   */
  private shouldSample(): boolean {
    return Math.random() < (this.config.sampleRate || 0.1)
  }

  /**
   * 獲取效能統計
   */
  public getStatistics() {
    if (this.metrics.length === 0) return null

    const successfulLoads = this.metrics.filter(m => m.success)
    const failedLoads = this.metrics.filter(m => !m.success)
    
    const averageLoadTime = successfulLoads.reduce((sum, m) => sum + m.loadTime, 0) / successfulLoads.length
    
    const byThumbnailSize = this.metrics.reduce((acc, m) => {
      const size = m.thumbnailSize || 'unknown'
      if (!acc[size]) acc[size] = []
      acc[size].push(m)
      return acc
    }, {} as Record<string, ImagePerformanceMetrics[]>)

    return {
      totalImages: this.metrics.length,
      successfulLoads: successfulLoads.length,
      failedLoads: failedLoads.length,
      successRate: (successfulLoads.length / this.metrics.length) * 100,
      averageLoadTime,
      byThumbnailSize: Object.entries(byThumbnailSize).map(([size, metrics]) => ({
        size,
        count: metrics.length,
        averageLoadTime: metrics.filter(m => m.success).reduce((sum, m) => sum + m.loadTime, 0) / metrics.filter(m => m.success).length || 0
      }))
    }
  }

  /**
   * 清理觀察器
   */
  public cleanup() {
    this.observers.forEach(observer => observer.disconnect())
    this.observers = []
  }
}

// 創建全域實例
let globalTracker: ImagePerformanceTracker | null = null

/**
 * 獲取全域影像效能追蹤器
 */
export function getImagePerformanceTracker(config?: ImageAnalyticsConfig): ImagePerformanceTracker {
  if (!globalTracker) {
    globalTracker = new ImagePerformanceTracker(config)
  }
  return globalTracker
}

/**
 * 初始化影像效能監控
 */
export function initializeImagePerformanceMonitoring(config?: ImageAnalyticsConfig) {
  const tracker = getImagePerformanceTracker(config)
  
  // 在頁面卸載時清理
  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', () => {
      tracker.cleanup()
    })
  }
  
  return tracker
}

/**
 * React Hook for image performance tracking
 */
export function useImagePerformanceTracking(config?: ImageAnalyticsConfig) {
  const [tracker] = useState(() => getImagePerformanceTracker(config))
  
  return {
    trackImage: (imageUrl: string, imgElement: HTMLImageElement, thumbnailSize?: 'small' | 'medium' | 'large') => {
      tracker.trackImage(imageUrl, imgElement, thumbnailSize)
    },
    trackVercelImage: (originalUrl: string, vercelUrl: string, imgElement: HTMLImageElement, options?: any) => {
      tracker.trackVercelImage(originalUrl, vercelUrl, imgElement, options)
    },
    getStatistics: () => tracker.getStatistics()
  }
}