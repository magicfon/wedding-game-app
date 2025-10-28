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
  console.log(`  ✅ ${name}`)
  try {
    fn()
  } catch (error: unknown) {
    console.error(`    ❌ 失敗: ${error instanceof Error ? error.message : String(error)}`)
  }
}

export const expect = (actual: unknown) => ({
  toBe: (expected: unknown) => {
    if (actual !== expected) {
      throw new Error(`期望 ${expected}，但得到 ${actual}`)
    }
  },
  toBeInstanceOf: (expected: unknown) => {
    if (!(actual instanceof (expected as any))) {
      throw new Error(`期望是 ${(expected as any).name} 的實例`)
    }
  },
  toContain: (expected: unknown) => {
    if (!String(actual).includes(String(expected))) {
      throw new Error(`期望包含 ${expected}`)
    }
  },
  toBeGreaterThan: (expected: unknown) => {
    if (Number(actual) <= Number(expected)) {
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
  },
  toMatch: (expected: RegExp) => {
    if (!expected.test(String(actual))) {
      throw new Error(`期望匹配 ${expected}`)
    }
  }
})

// 模擬函數
export const mockFn = () => {
  const mock = (...args: unknown[]) => {
    mock.calls.push(args)
    return mock.returnValue
  }
  mock.calls = [] as unknown[][]
  mock.returnValue = undefined
  mock.mockImplementation = (impl: Function) => {
    (mock as any).impl = impl
    return mock
  }
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

  global.PerformanceObserver = class MockPerformanceObserver {
    constructor(callback: any) {
      this.callback = callback
    }
    callback: any
    observe() {}
    disconnect() {}
    takeRecords() {
      return []
    }
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