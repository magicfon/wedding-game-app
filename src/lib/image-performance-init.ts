'use client'

import { initializeImagePerformanceMonitoring } from './image-performance-analytics'

/**
 * 初始化影像效能監控系統
 * 這個函數應該在應用程式啟動時調用
 */

export function initializeImagePerformanceSystem() {
  // 檢查是否在瀏覽器環境中
  if (typeof window === 'undefined') {
    return
  }

  // 初始化影像效能監控
  const tracker = initializeImagePerformanceMonitoring({
    enableVercelAnalytics: process.env.NODE_ENV === 'production',
    enableConsoleLogging: process.env.NODE_ENV === 'development',
    enableCustomEndpoint: true,
    customEndpoint: '/api/analytics/image-performance',
    sampleRate: 0.1 // 10% 抽樣率，避免過多數據
  })

  // 全域錯誤處理
  window.addEventListener('error', (event) => {
    // 檢查是否為圖片載入錯誤
    if (event.target && (event.target as HTMLImageElement).tagName === 'IMG') {
      const img = event.target as HTMLImageElement
      console.warn('圖片載入錯誤:', img.src, event.message)
      
      // 可以在這裡添加錯誤追蹤邏輯
      if (tracker) {
        // 手動記錄錯誤
        // tracker.trackImageError(img.src, event.message)
      }
    }
  })

  // 監控頁面可見性變化
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      // 頁面變為可見時，可以重新開始監控
      console.log('頁面變為可見，重新啟動影像效能監控')
    }
  })

  // 監控網路狀態變化
  if ('connection' in navigator) {
    const connection = (navigator as any).connection
    
    const handleConnectionChange = () => {
      console.log('網路狀態變化:', {
        effectiveType: connection.effectiveType,
        downlink: connection.downlink,
        rtt: connection.rtt
      })
      
      // 可以根據網路狀態調整監控策略
      if (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g') {
        // 在慢速網路下降低抽樣率
        console.log('檢測到慢速網路，降低監控頻率')
      }
    }

    connection.addEventListener('change', handleConnectionChange)
    
    // 初始網路狀態
    handleConnectionChange()
  }

  return tracker
}

/**
 * 為開發環境提供調試工具
 */
export function setupImagePerformanceDebug() {
  if (process.env.NODE_ENV !== 'development') {
    return
  }

  // 添加到全域對象以便調試
  (window as any).imagePerformanceDebug = {
    // 手動觸發測試圖片載入
    testImageLoad: (imageUrl: string) => {
      const img = new Image()
      img.onload = () => console.log('測試圖片載入成功:', imageUrl)
      img.onerror = () => console.error('測試圖片載入失敗:', imageUrl)
      img.src = imageUrl
    },
    
    // 模擬不同網路條件
    simulateNetworkCondition: (condition: 'slow-3g' | '3g' | '4g') => {
      console.log(`模擬網路條件: ${condition}`)
      // 這裡可以集成網路模擬工具
    },
    
    // 獲取當前監控統計
    getStats: () => {
      const tracker = (window as any).imagePerformanceTracker
      return tracker ? tracker.getStatistics() : null
    },
    
    // 重置監控數據
    resetStats: () => {
      const tracker = (window as any).imagePerformanceTracker
      if (tracker) {
        tracker.reset()
        console.log('影像效能監控數據已重置')
      }
    }
  }

  console.log('影像效能監控調試工具已啟用，使用 window.imagePerformanceDebug 訪問')
}

/**
 * 為生產環境設置監控
 */
export function setupProductionMonitoring() {
  if (process.env.NODE_ENV !== 'production') {
    return
  }

  // 設置錯誤監控
  window.addEventListener('error', (event) => {
    // 發送錯誤到監控服務
    if (event.target && (event.target as HTMLImageElement).tagName === 'IMG') {
      const img = event.target as HTMLImageElement
      
      // 發送錯誤報告
      fetch('/api/analytics/image-error', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          imageUrl: img.src,
          error: event.message,
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString(),
          page: window.location.pathname
        })
      }).catch(err => {
        console.warn('發送圖片錯誤報告失敗:', err)
      })
    }
  })

  // 設置性能監控
  if ('PerformanceObserver' in window) {
    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        
        // 監控長任務
        const longTasks = entries.filter(entry => 
          entry.entryType === 'longtask' && entry.duration > 50
        )
        
        if (longTasks.length > 0) {
          console.warn('檢測到長任務，可能影響圖片載入:', longTasks)
        }
      })
      
      observer.observe({ entryTypes: ['longtask'] })
    } catch (error) {
      console.warn('無法設置長任務監控:', error)
    }
  }
}

/**
 * 自動初始化函數
 * 在應用程式啟動時調用
 */
export function autoInitializeImagePerformance() {
  try {
    // 初始化監控系統
    const tracker = initializeImagePerformanceSystem()
    
    // 根據環境設置相應功能
    if (process.env.NODE_ENV === 'development') {
      setupImagePerformanceDebug()
    } else {
      setupProductionMonitoring()
    }
    
    // 設置定期清理
    setInterval(() => {
      if (tracker) {
        const stats = tracker.getStatistics()
        if (stats && stats.totalImages > 1000) {
          console.log('影像效能監控數據較多，建議清理舊數據')
        }
      }
    }, 5 * 60 * 1000) // 每 5 分鐘檢查一次
    
    console.log('影像效能監控系統初始化完成')
    
    return tracker
  } catch (error) {
    console.error('影像效能監控系統初始化失敗:', error)
    return null
  }
}

// 導出常用的配置
export const IMAGE_PERFORMANCE_CONFIG = {
  // 縮圖尺寸配置
  THUMBNAIL_SIZES: {
    small: { width: 200, quality: 75 },
    medium: { width: 400, quality: 80 },
    large: { width: 800, quality: 85 }
  },
  
  // 監控配置
  MONITORING: {
    SAMPLE_RATE: 0.1, // 10% 抽樣
    MAX_LOG_ENTRIES: 1000, // 最大日誌條目數
    CLEANUP_INTERVAL: 5 * 60 * 1000, // 5 分鐘清理間隔
    ERROR_THRESHOLD: 0.05 // 5% 錯誤率閾值
  },
  
  // 網路配置
  NETWORK_THRESHOLDS: {
    SLOW_NETWORK: 'slow-2g',
    FAST_NETWORK: '4g',
    GOOD_RTT: 200, // 200ms 以下為良好延遲
    GOOD_DOWNLINK: 1.5 // 1.5 Mbps 以上為良好下載速度
  }
}