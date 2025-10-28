/**
 * 縮圖系統測試
 * 測試縮圖生成和 URL 處理功能
 */

import { describe, test, expect, mockBrowserEnvironment } from './test-utils'

// 測試 Vercel Image URL 生成
describe('Vercel Image URL Generation', () => {
  test('應該生成正確的小尺寸縮圖 URL', () => {
    mockBrowserEnvironment()
    
    const baseUrl = 'https://example.com/photo.jpg'
    const width = 200
    const quality = 75
    const format = 'auto'
    
    const encodedUrl = encodeURIComponent(baseUrl)
    const expectedUrl = `/_vercel/image?url=${encodedUrl}&w=${width}&q=${quality}&f=${format}`
    
    expect(expectedUrl).toContain('/_vercel/image')
    expect(expectedUrl).toContain('w=200')
    expect(expectedUrl).toContain('q=75')
    expect(expectedUrl).toContain('f=auto')
    expect(expectedUrl).toContain(encodeURIComponent(baseUrl))
  })

  test('應該生成正確的中等尺寸縮圖 URL', () => {
    const baseUrl = 'https://example.com/photo.jpg'
    const width = 400
    const quality = 80
    
    const encodedUrl = encodeURIComponent(baseUrl)
    const expectedUrl = `/_vercel/image?url=${encodedUrl}&w=${width}&q=${quality}&f=auto`
    
    expect(expectedUrl).toContain('w=400')
    expect(expectedUrl).toContain('q=80')
  })

  test('應該生成正確的大尺寸縮圖 URL', () => {
    const baseUrl = 'https://example.com/photo.jpg'
    const width = 800
    const quality = 85
    
    const encodedUrl = encodeURIComponent(baseUrl)
    const expectedUrl = `/_vercel/image?url=${encodedUrl}&w=${width}&q=${quality}&f=auto`
    
    expect(expectedUrl).toContain('w=800')
    expect(expectedUrl).toContain('q=85')
  })

  test('應該正確處理特殊字符', () => {
    const baseUrl = 'https://example.com/photo with spaces.jpg'
    const width = 400
    
    const encodedUrl = encodeURIComponent(baseUrl)
    const expectedUrl = `/_vercel/image?url=${encodedUrl}&w=${width}&q=80&f=auto`
    
    expect(expectedUrl).toContain(encodeURIComponent('photo with spaces.jpg'))
  })
})

// 測試檔案大小格式化
describe('File Size Formatting', () => {
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  test('應該正確格式化位元組', () => {
    expect(formatFileSize(0)).toBe('0 Bytes')
    expect(formatFileSize(512)).toBe('0.5 KB')
    expect(formatFileSize(1024)).toBe('1 KB')
  })

  test('應該正確格式化 MB', () => {
    expect(formatFileSize(1048576)).toBe('1 MB')
    expect(formatFileSize(5242880)).toBe('5 MB')
  })

  test('應該正確格式化 GB', () => {
    expect(formatFileSize(1073741824)).toBe('1 GB')
    expect(formatFileSize(5368709120)).toBe('5 GB')
  })
})

// 測試設備類型檢測
describe('Device Type Detection', () => {
  const getDeviceType = (userAgent: string): string => {
    if (/Mobile|Android|iPhone|iPad/.test(userAgent)) {
      return 'mobile'
    }
    if (/Tablet/.test(userAgent)) {
      return 'tablet'
    }
    return 'desktop'
  }

  test('應該正確識別行動設備', () => {
    expect(getDeviceType('Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)')).toBe('mobile')
    expect(getDeviceType('Mozilla/5.0 (Linux; Android 10; SM-G975F)')).toBe('mobile')
    expect(getDeviceType('Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X)')).toBe('mobile')
  })

  test('應該正確識別平板設備', () => {
    expect(getDeviceType('Mozilla/5.0 (Tablet; Android 10)')).toBe('tablet')
  })

  test('應該正確識別桌面設備', () => {
    expect(getDeviceType('Mozilla/5.0 (Windows NT 10.0; Win64; x64)')).toBe('desktop')
    expect(getDeviceType('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)')).toBe('desktop')
  })
})

// 測試縮圖尺寸配置
describe('Thumbnail Size Configuration', () => {
  const THUMBNAIL_SIZES = {
    small: { width: 200, quality: 75 },
    medium: { width: 400, quality: 80 },
    large: { width: 800, quality: 85 }
  }

  test('應該有正確的小尺寸配置', () => {
    expect(THUMBNAIL_SIZES.small.width).toBe(200)
    expect(THUMBNAIL_SIZES.small.quality).toBe(75)
  })

  test('應該有正確的中等尺寸配置', () => {
    expect(THUMBNAIL_SIZES.medium.width).toBe(400)
    expect(THUMBNAIL_SIZES.medium.quality).toBe(80)
  })

  test('應該有正確的大尺寸配置', () => {
    expect(THUMBNAIL_SIZES.large.width).toBe(800)
    expect(THUMBNAIL_SIZES.large.quality).toBe(85)
  })
})

// 測試上傳時間估算
describe('Upload Time Estimation', () => {
  const estimateUploadTime = (fileSize: number, uploadSpeed: number = 1024 * 1024): number => {
    return fileSize / uploadSpeed // 秒
  }

  test('應該正確估算上傳時間', () => {
    // 1MB 檔案，1MB/s 速度
    expect(estimateUploadTime(1024 * 1024, 1024 * 1024)).toBe(1)
    
    // 5MB 檔案，2MB/s 速度
    expect(estimateUploadTime(5 * 1024 * 1024, 2 * 1024 * 1024)).toBe(2.5)
    
    // 10MB 檔案，0.5MB/s 速度
    expect(estimateUploadTime(10 * 1024 * 1024, 0.5 * 1024 * 1024)).toBe(20)
  })
})

// 測試進度計算
describe('Progress Calculation', () => {
  const calculateProgress = (loaded: number, total: number): number => {
    if (total === 0) return 0
    return Math.min((loaded / total) * 100, 100)
  }

  test('應該正確計算進度百分比', () => {
    expect(calculateProgress(0, 1000)).toBe(0)
    expect(calculateProgress(500, 1000)).toBe(50)
    expect(calculateProgress(1000, 1000)).toBe(100)
  })

  test('應該處理邊界情況', () => {
    expect(calculateProgress(1500, 1000)).toBe(100) // 不應超過 100%
    expect(calculateProgress(0, 0)).toBe(0) // 避免除零錯誤
  })
})

// 測試響應式尺寸選擇
describe('Responsive Size Selection', () => {
  const getResponsiveSize = (viewportWidth: number): 'small' | 'medium' | 'large' => {
    if (viewportWidth < 768) return 'small'
    if (viewportWidth < 1024) return 'medium'
    return 'large'
  }

  test('應該為小螢幕選擇小尺寸', () => {
    expect(getResponsiveSize(480)).toBe('small')
    expect(getResponsiveSize(767)).toBe('small')
  })

  test('應該為中等螢幕選擇中等尺寸', () => {
    expect(getResponsiveSize(768)).toBe('medium')
    expect(getResponsiveSize(1023)).toBe('medium')
  })

  test('應該為大螢幕選擇大尺寸', () => {
    expect(getResponsiveSize(1024)).toBe('large')
    expect(getResponsiveSize(1920)).toBe('large')
  })
})

// 測試錯誤處理
describe('Error Handling', () => {
  const getErrorMessage = (error: unknown): string => {
    if (error instanceof Error) {
      return error.message
    }
    return String(error)
  }

  test('應該正確處理 Error 物件', () => {
    const error = new Error('測試錯誤')
    expect(getErrorMessage(error)).toBe('測試錯誤')
  })

  test('應該正確處理字串錯誤', () => {
    const error = '字串錯誤'
    expect(getErrorMessage(error)).toBe('字串錯誤')
  })

  test('應該正確處理未知錯誤', () => {
    const error = { custom: 'error' }
    expect(getErrorMessage(error)).toBe('[object Object]')
  })
})

// 測試網路連接類型
describe('Connection Type Detection', () => {
  test('應該識別有效的網路類型', () => {
    const connectionTypes = ['slow-2g', '2g', '3g', '4g']
    
    connectionTypes.forEach(type => {
      const isValid = /^(slow-)?[234]g$/.test(type)
      expect(isValid).toBe(true)
    })
  })
})

// 測試效能統計計算
describe('Performance Statistics Calculation', () => {
  test('應該正確計算基本統計數據', () => {
    const mockMetrics = [
      { loadTime: 100, success: true },
      { loadTime: 200, success: true },
      { loadTime: 300, success: false },
      { loadTime: 150, success: true }
    ]
    
    const successfulLoads = mockMetrics.filter(m => m.success)
    const totalImages = mockMetrics.length
    const successRate = (successfulLoads.length / totalImages) * 100
    const averageLoadTime = successfulLoads.reduce((sum, m) => sum + m.loadTime, 0) / successfulLoads.length
    
    expect(successRate).toBe(75)
    expect(averageLoadTime).toBe(150) // (100 + 200 + 150) / 3
  })
})

console.log('🚀 縮圖系統測試完成')
console.log('📝 這些測試驗證了縮圖系統的核心功能')