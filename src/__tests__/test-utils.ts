/**
 * 測試工具函數
 * 提供基本的測試框架功能
 */

// 簡單的測試框架
export const describe = (name: string, fn: () => void) => {
  console.log(`\n📋 測試套件: ${name}`)
  fn()
}

export const test = (name: string, fn: () => void) => {
  try {
    fn()
    console.log(`  ✅ ${name}`)
  } catch (error: any) {
    console.error(`    ❌ 失敗: ${error.message}`)
  }
}

export const expect = (actual: any) => ({
  toBe: (expected: any) => {
    if (actual !== expected) {
      throw new Error(`期望 ${expected}，但得到 ${actual}`)
    }
  },
  toContain: (expected: any) => {
    if (!actual.includes(expected)) {
      throw new Error(`期望包含 ${expected}`)
    }
  },
  toBeGreaterThan: (expected: any) => {
    if (actual <= expected) {
      throw new Error(`期望大於 ${expected}，但得到 ${actual}`)
    }
  },
  toBeDefined: () => {
    if (actual === undefined) {
      throw new Error('期望已定義')
    }
  },
  toBeNull: () => {
    if (actual !== null) {
      throw new Error('期望為 null')
    }
  }
})

// 模擬函數
export const mockFn = () => {
  const mock = (...args: any[]) => {
    mock.calls.push(args)
    return mock.returnValue
  }
  mock.calls = [] as any[]
  mock.returnValue = undefined
  return mock
}

// 模擬瀏覽器環境
export const mockBrowserEnvironment = () => {
  global.performance = {
    now: () => Date.now(),
    getEntriesByType: () => [],
    mark: () => {},
    measure: () => {}
  } as any

  global.navigator = {
    userAgent: 'Mozilla/5.0 (Test Browser)',
    connection: {
      effectiveType: '4g',
      downlink: 10,
      rtt: 50
    }
  } as any

  global.window = {
    innerWidth: 1920,
    innerHeight: 1080,
    devicePixelRatio: 1,
    va: () => {}
  } as any
}

// 測試數據生成器
export const generateMockImageData = () => ({
  imageUrl: 'https://example.com/test.jpg',
  loadTime: 150,
  thumbnailSize: 'medium',
  deviceInfo: {
    userAgent: 'Test Browser',
    viewport: { width: 1920, height: 1080 },
    devicePixelRatio: 1
  },
  timestamp: Date.now(),
  success: true
})

export const generateMockPerformanceData = () => [
  { loadTime: 100, success: true },
  { loadTime: 200, success: true },
  { loadTime: 300, success: false },
  { loadTime: 150, success: true }
]