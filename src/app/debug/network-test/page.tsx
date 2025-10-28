'use client'

import { useState, useEffect, useRef } from 'react'
import Layout from '@/components/Layout'
import TrackedImage, { ThumbnailImage } from '@/components/TrackedImage'
import { useImagePerformanceTracking } from '@/lib/image-performance-analytics'
import { Wifi, Smartphone, Monitor, Activity, Clock, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react'

interface NetworkCondition {
  name: string
  effectiveType: string
  downlink: number
  rtt: number
  description: string
  color: string
}

interface TestResult {
  condition: NetworkCondition
  imageSize: 'small' | 'medium' | 'large'
  loadTime: number
  success: boolean
  error?: string
  timestamp: number
}

const networkConditions: NetworkCondition[] = [
  {
    name: 'Fast 4G',
    effectiveType: '4g',
    downlink: 10,
    rtt: 50,
    description: '高速 4G 網路 (10 Mbps, 50ms 延遲)',
    color: 'bg-green-100 text-green-800'
  },
  {
    name: 'Standard 4G',
    effectiveType: '4g',
    downlink: 5,
    rtt: 100,
    description: '標準 4G 網路 (5 Mbps, 100ms 延遲)',
    color: 'bg-blue-100 text-blue-800'
  },
  {
    name: '3G',
    effectiveType: '3g',
    downlink: 2,
    rtt: 200,
    description: '3G 網路 (2 Mbps, 200ms 延遲)',
    color: 'bg-yellow-100 text-yellow-800'
  },
  {
    name: 'Slow 2G',
    effectiveType: 'slow-2g',
    downlink: 0.1,
    rtt: 1000,
    description: '慢速 2G 網路 (0.1 Mbps, 1000ms 延遲)',
    color: 'bg-red-100 text-red-800'
  }
]

const testImages = [
  {
    id: 'test-1',
    url: 'https://picsum.photos/800/600?random=1',
    size: 'small' as const,
    description: '小尺寸縮圖 (200px)'
  },
  {
    id: 'test-2',
    url: 'https://picsum.photos/1200/900?random=2',
    size: 'medium' as const,
    description: '中等尺寸縮圖 (400px)'
  },
  {
    id: 'test-3',
    url: 'https://picsum.photos/1600/1200?random=3',
    size: 'large' as const,
    description: '大尺寸縮圖 (800px)'
  }
]

export default function NetworkTestPage() {
  const [selectedCondition, setSelectedCondition] = useState<NetworkCondition>(networkConditions[1])
  const [isTestRunning, setIsTestRunning] = useState(false)
  const [testResults, setTestResults] = useState<TestResult[]>([])
  const [currentTest, setCurrentTest] = useState(0)
  const [networkStats, setNetworkStats] = useState<any>(null)
  const [isSimulating, setIsSimulating] = useState(false)
  
  const { trackVercelImage, getStatistics } = useImagePerformanceTracking({
    enableVercelAnalytics: false,
    enableConsoleLogging: true,
    sampleRate: 1.0
  })

  // 模擬網路條件
  const simulateNetworkCondition = async (condition: NetworkCondition) => {
    setIsSimulating(true)
    
    try {
      // 這裡我們使用 Chrome DevTools Protocol 或其他方法來模擬網路條件
      // 由於瀏覽器限制，我們主要通過延遲來模擬
      console.log(`模擬網路條件: ${condition.name}`)
      
      // 實際應用中，這裡會調用網路模擬 API
      // 目前我們只記錄條件並讓用戶手動測試
      
      setSelectedCondition(condition)
      
      // 等待一秒讓用戶看到變化
      await new Promise(resolve => setTimeout(resolve, 1000))
      
    } catch (error) {
      console.error('模擬網路條件失敗:', error)
    } finally {
      setIsSimulating(false)
    }
  }

  // 執行單個測試
  const runSingleTest = async (image: typeof testImages[0], condition: NetworkCondition) => {
    return new Promise<TestResult>((resolve) => {
      const startTime = performance.now()
      
      const handleLoad = () => {
        const endTime = performance.now()
        const loadTime = endTime - startTime
        
        resolve({
          condition,
          imageSize: image.size,
          loadTime,
          success: true,
          timestamp: Date.now()
        })
      }
      
      const handleError = () => {
        const endTime = performance.now()
        const loadTime = endTime - startTime
        
        resolve({
          condition,
          imageSize: image.size,
          loadTime,
          success: false,
          error: 'Image load failed',
          timestamp: Date.now()
        })
      }
      
      // 創建測試圖片
      const img = new Image()
      img.onload = handleLoad
      img.onerror = handleError
      
      // 使用 Vercel Image Optimization URL
      const width = image.size === 'small' ? 200 : image.size === 'medium' ? 400 : 800
      const quality = image.size === 'small' ? 75 : image.size === 'medium' ? 80 : 85
      const encodedUrl = encodeURIComponent(image.url)
      const vercelUrl = `/_vercel/image?url=${encodedUrl}&w=${width}&q=${quality}&f=auto`
      
      // 添加延遲來模擬網路條件
      setTimeout(() => {
        img.src = vercelUrl
      }, condition.rtt / 2) // 使用一半的 RTT 作為延遲
    })
  }

  // 執行完整測試
  const runFullTest = async () => {
    setIsTestRunning(true)
    setTestResults([])
    setCurrentTest(0)
    
    const results: TestResult[] = []
    
    for (let i = 0; i < networkConditions.length; i++) {
      const condition = networkConditions[i]
      
      for (let j = 0; j < testImages.length; j++) {
        const image = testImages[j]
        setCurrentTest(i * testImages.length + j + 1)
        
        const result = await runSingleTest(image, condition)
        results.push(result)
        
        // 短暫停以避免過載
        await new Promise(resolve => setTimeout(resolve, 500))
      }
    }
    
    setTestResults(results)
    setIsTestRunning(false)
    setCurrentTest(0)
  }

  // 獲取網路統計
  const getNetworkStats = () => {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection
      setNetworkStats({
        effectiveType: connection.effectiveType,
        downlink: connection.downlink,
        rtt: connection.rtt,
        saveData: connection.saveData,
        downlinkMax: connection.downlinkMax
      })
    }
  }

  // 重置測試
  const resetTests = () => {
    setTestResults([])
    setCurrentTest(0)
    setNetworkStats(null)
  }

  // 生成測試摘要
  const generateTestSummary = () => {
    const summary = {
      totalTests: testResults.length,
      successfulTests: testResults.filter(r => r.success).length,
      failedTests: testResults.filter(r => !r.success).length,
      averageLoadTimeByCondition: {} as Record<string, number>,
      averageLoadTimeBySize: {} as Record<string, number>,
      performanceByCondition: {} as Record<string, {
        successRate: number;
        averageLoadTime: number;
        totalTests: number;
      }>
    }
    
    // 計算各條件下的平均載入時間
    for (const condition of networkConditions) {
      const conditionResults = testResults.filter(r => r.condition.name === condition.name)
      const successfulResults = conditionResults.filter(r => r.success)
      
      if (successfulResults.length > 0) {
        summary.averageLoadTimeByCondition[condition.name] =
          successfulResults.reduce((sum, r) => sum + r.loadTime, 0) / successfulResults.length
      }
    }
    
    // 計算各尺寸下的平均載入時間
    const sizes: ('small' | 'medium' | 'large')[] = ['small', 'medium', 'large']
    for (const size of sizes) {
      const sizeResults = testResults.filter(r => r.imageSize === size && r.success)
      
      if (sizeResults.length > 0) {
        summary.averageLoadTimeBySize[size] =
          sizeResults.reduce((sum, r) => sum + r.loadTime, 0) / sizeResults.length
      }
    }
    
    // 計算各條件下的性能表現
    for (const condition of networkConditions) {
      const conditionResults = testResults.filter(r => r.condition.name === condition.name)
      const successfulResults = conditionResults.filter(r => r.success)
      
      if (conditionResults.length > 0) {
        summary.performanceByCondition[condition.name] = {
          successRate: (successfulResults.length / conditionResults.length) * 100,
          averageLoadTime: successfulResults.reduce((sum, r) => sum + r.loadTime, 0) / successfulResults.length,
          totalTests: conditionResults.length
        }
      }
    }
    
    return summary
  }

  // 導出測試結果
  const exportResults = () => {
    const report = {
      timestamp: new Date().toISOString(),
      networkConditions: networkConditions.map(c => ({
        name: c.name,
        effectiveType: c.effectiveType,
        downlink: c.downlink,
        rtt: c.rtt
      })),
      testImages: testImages.map(img => ({
        id: img.id,
        size: img.size,
        description: img.description
      })),
      results: testResults,
      summary: generateTestSummary()
    }
    
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `network-test-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  useEffect(() => {
    getNetworkStats()
  }, [])

  return (
    <Layout title="網路環境測試">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* 當前網路狀態 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4 text-black">當前網路狀態</h2>
          {networkStats ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <Wifi className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                <div className="text-sm text-gray-600">連接類型</div>
                <div className="font-medium text-black">{networkStats.effectiveType || 'Unknown'}</div>
              </div>
              
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <TrendingUp className="w-8 h-8 text-green-500 mx-auto mb-2" />
                <div className="text-sm text-gray-600">下載速度</div>
                <div className="font-medium text-black">{networkStats.downlink || 0} Mbps</div>
              </div>
              
              <div className="text-center p-4 bg-yellow-50 rounded-lg">
                <Clock className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
                <div className="text-sm text-gray-600">延遲</div>
                <div className="font-medium text-black">{networkStats.rtt || 0} ms</div>
              </div>
              
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <Activity className="w-8 h-8 text-purple-500 mx-auto mb-2" />
                <div className="text-sm text-gray-600">狀態</div>
                <div className="font-medium text-black">已連接</div>
              </div>
            </div>
          ) : (
            <div className="text-center text-gray-500 py-8">
              瀏覽器不支援網路資訊 API
            </div>
          )}
        </div>

        {/* 網路條件選擇 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4 text-black">網路條件模擬</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {networkConditions.map((condition, index) => (
              <button
                key={index}
                onClick={() => simulateNetworkCondition(condition)}
                disabled={isSimulating}
                className={`p-4 rounded-lg border-2 transition-all ${
                  selectedCondition.name === condition.name 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 hover:border-gray-300'
                } ${isSimulating ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <div className={`text-sm font-medium mb-2 ${selectedCondition.name === condition.name ? 'text-blue-800' : 'text-gray-700'}`}>
                  {condition.name}
                </div>
                <div className={`text-xs p-2 rounded ${condition.color}`}>
                  {condition.description}
                </div>
              </button>
            ))}
          </div>
          
          {isSimulating && (
            <div className="mt-4 text-center">
              <div className="inline-flex items-center space-x-2 text-blue-600">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span>正在模擬網路條件...</span>
              </div>
            </div>
          )}
        </div>

        {/* 測試控制 */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-black">載入測試</h2>
            <div className="flex space-x-3">
              <button
                onClick={runFullTest}
                disabled={isTestRunning}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Activity className="w-4 h-4" />
                <span>{isTestRunning ? '測試中...' : '開始測試'}</span>
              </button>
              
              <button
                onClick={resetTests}
                disabled={isTestRunning}
                className="flex items-center space-x-2 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                重置
              </button>
              
              <button
                onClick={exportResults}
                disabled={testResults.length === 0}
                className="flex items-center space-x-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                導出結果
              </button>
            </div>
          </div>
          
          {/* 測試進度 */}
          {isTestRunning && (
            <div className="mb-4">
              <div className="flex items-center space-x-3">
                <span className="text-sm text-gray-600">測試進度:</span>
                <div className="flex-1 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(currentTest / (networkConditions.length * testImages.length)) * 100}%` }}
                  />
                </div>
                <span className="text-sm font-medium">{currentTest}/{networkConditions.length * testImages.length}</span>
              </div>
            </div>
          )}
          
          {/* 測試圖片預覽 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {testImages.map((image, index) => (
              <div key={image.id} className="text-center">
                <div className="text-sm font-medium text-gray-700 mb-2">{image.description}</div>
                <div className="w-full h-32 bg-gray-100 rounded-lg mb-2">
                  {selectedCondition && (
                    <TrackedImage
                      src={image.url}
                      alt={`Test ${image.id}`}
                      width={image.size === 'small' ? 200 : image.size === 'medium' ? 400 : 800}
                      quality={image.size === 'small' ? 75 : image.size === 'medium' ? 80 : 85}
                      thumbnailSize={image.size}
                      className="w-full h-full object-cover rounded-lg"
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 測試結果 */}
        {testResults.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4 text-black">測試結果</h3>
            
            {/* 結果摘要 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{testResults.length}</div>
                <div className="text-sm text-gray-600">總測試數</div>
              </div>
              
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {testResults.filter(r => r.success).length}
                </div>
                <div className="text-sm text-gray-600">成功測試</div>
              </div>
              
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-600">
                  {testResults.filter(r => !r.success).length}
                </div>
                <div className="text-sm text-gray-600">失敗測試</div>
              </div>
            </div>
            
            {/* 詳細結果表格 */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">網路條件</th>
                    <th className="text-left p-2">圖片尺寸</th>
                    <th className="text-left p-2">載入時間</th>
                    <th className="text-left p-2">狀態</th>
                    <th className="text-left p-2">性能評級</th>
                  </tr>
                </thead>
                <tbody>
                  {testResults.map((result, index) => (
                    <tr key={index} className="border-b hover:bg-gray-50">
                      <td className="p-2">
                        <span className={`px-2 py-1 rounded text-xs ${result.condition.color}`}>
                          {result.condition.name}
                        </span>
                      </td>
                      <td className="p-2">{result.imageSize}</td>
                      <td className="p-2">{result.loadTime.toFixed(0)}ms</td>
                      <td className="p-2">
                        {result.success ? (
                          <span className="text-green-600">✓ 成功</span>
                        ) : (
                          <span className="text-red-600">✗ 失敗</span>
                        )}
                      </td>
                      <td className="p-2">
                        {getPerformanceGrade(result.loadTime, result.imageSize)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 測試說明 */}
        <div className="bg-blue-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-3 text-black">測試說明</h3>
          <ul className="space-y-2 text-sm text-black">
            <li>• <strong>測試目的:</strong> 評估不同網路條件下各尺寸縮圖的載入性能</li>
            <li>• <strong>網路條件:</strong> 模擬從慢速 2G 到高速 4G 的不同網路環境</li>
            <li>• <strong>測試圖片:</strong> 使用不同尺寸的測試圖片來模擬真實使用場景</li>
            <li>• <strong>性能指標:</strong> 載入時間、成功率、用戶體驗</li>
            <li>• <strong>預期結果:</strong> 網路速度越快，載入時間越短；圖片尺寸越小，載入越快</li>
          </ul>
        </div>
      </div>
    </Layout>
  )

  // 性能評級函數
  function getPerformanceGrade(loadTime: number, imageSize: string): string {
    const thresholds = {
      small: { excellent: 200, good: 500, fair: 1000 },
      medium: { excellent: 400, good: 1000, fair: 2000 },
      large: { excellent: 800, good: 2000, fair: 4000 }
    }
    
    const threshold = thresholds[imageSize as keyof typeof thresholds]
    
    if (loadTime <= threshold.excellent) return '🟢 優秀'
    if (loadTime <= threshold.good) return '🟡 良好'
    if (loadTime <= threshold.fair) return '🟠 一般'
    return '🔴 較慢'
  }
}