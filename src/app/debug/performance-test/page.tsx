'use client'

import { useState, useEffect, useRef } from 'react'
import Layout from '@/components/Layout'
import TrackedImage, { ThumbnailImage } from '@/components/TrackedImage'
import { useImagePerformanceTracking } from '@/lib/image-performance-analytics'
import { Play, Pause, RotateCcw, Download, Clock, TrendingUp, Activity } from 'lucide-react'

interface TestImage {
  id: string
  url: string
  size: 'small' | 'medium' | 'large'
  expectedLoadTime: number
  actualLoadTime?: number
  success?: boolean
}

interface PerformanceMetrics {
  totalTests: number
  successfulTests: number
  failedTests: number
  averageLoadTime: number
  fastestLoadTime: number
  slowestLoadTime: number
  totalDataTransferred: number
}

export default function PerformanceTestPage() {
  const [isRunning, setIsRunning] = useState(false)
  const [currentTest, setCurrentTest] = useState(0)
  const [testImages, setTestImages] = useState<TestImage[]>([])
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    totalTests: 0,
    successfulTests: 0,
    failedTests: 0,
    averageLoadTime: 0,
    fastestLoadTime: 0,
    slowestLoadTime: 0,
    totalDataTransferred: 0
  })
  const [testResults, setTestResults] = useState<any[]>([])
  
  const { trackVercelImage, getStatistics } = useImagePerformanceTracking({
    enableVercelAnalytics: false,
    enableConsoleLogging: true,
    sampleRate: 1.0 // 100% 抽樣用於測試
  })

  // 測試圖片列表
  const testImageUrls = [
    'https://picsum.photos/800/600?random=1',
    'https://picsum.photos/1200/900?random=2',
    'https://picsum.photos/1600/1200?random=3',
    'https://picsum.photos/2000/1500?random=4',
    'https://picsum.photos/2400/1800?random=5'
  ]

  // 初始化測試圖片
  useEffect(() => {
    const images: TestImage[] = testImageUrls.map((url, index) => ({
      id: `test-${index}`,
      url,
      size: index < 2 ? 'small' : index < 4 ? 'medium' : 'large',
      expectedLoadTime: index < 2 ? 500 : index < 4 ? 1000 : 2000
    }))
    
    setTestImages(images)
  }, [])

  // 執行單個測試
  const runSingleTest = async (image: TestImage) => {
    return new Promise<void>((resolve) => {
      const startTime = performance.now()
      
      const handleLoad = () => {
        const endTime = performance.now()
        const loadTime = endTime - startTime
        
        setTestImages(prev => prev.map(img => 
          img.id === image.id 
            ? { ...img, actualLoadTime: loadTime, success: true }
            : img
        ))
        
        resolve()
      }
      
      const handleError = () => {
        const endTime = performance.now()
        const loadTime = endTime - startTime
        
        setTestImages(prev => prev.map(img => 
          img.id === image.id 
            ? { ...img, actualLoadTime: loadTime, success: false }
            : img
        ))
        
        resolve()
      }
      
      // 創建測試圖片元素
      const img = new Image()
      img.onload = handleLoad
      img.onerror = handleError
      
      // 使用 Vercel Image Optimization URL
      const width = image.size === 'small' ? 200 : image.size === 'medium' ? 400 : 800
      const quality = image.size === 'small' ? 75 : image.size === 'medium' ? 80 : 85
      const encodedUrl = encodeURIComponent(image.url)
      const vercelUrl = `/_vercel/image?url=${encodedUrl}&w=${width}&q=${quality}&f=auto`
      
      img.src = vercelUrl
    })
  }

  // 執行所有測試
  const runAllTests = async () => {
    setIsRunning(true)
    setCurrentTest(0)
    
    for (let i = 0; i < testImages.length; i++) {
      setCurrentTest(i + 1)
      await runSingleTest(testImages[i])
      
      // 短暫停以避免過載
      await new Promise(resolve => setTimeout(resolve, 500))
    }
    
    setIsRunning(false)
    updateMetrics()
  }

  // 更新指標
  const updateMetrics = () => {
    const successfulTests = testImages.filter(img => img.success === true)
    const failedTests = testImages.filter(img => img.success === false)
    const loadTimes = successfulTests.map(img => img.actualLoadTime || 0).filter(time => time > 0)
    
    const newMetrics: PerformanceMetrics = {
      totalTests: testImages.length,
      successfulTests: successfulTests.length,
      failedTests: failedTests.length,
      averageLoadTime: loadTimes.length > 0 ? loadTimes.reduce((sum, time) => sum + time, 0) / loadTimes.length : 0,
      fastestLoadTime: loadTimes.length > 0 ? Math.min(...loadTimes) : 0,
      slowestLoadTime: loadTimes.length > 0 ? Math.max(...loadTimes) : 0,
      totalDataTransferred: testImages.length * 500 // 估算數據傳輸量
    }
    
    setMetrics(newMetrics)
  }

  // 重置測試
  const resetTests = () => {
    setTestImages(prev => prev.map(img => ({
      ...img,
      actualLoadTime: undefined,
      success: undefined
    })))
    setMetrics({
      totalTests: 0,
      successfulTests: 0,
      failedTests: 0,
      averageLoadTime: 0,
      fastestLoadTime: 0,
      slowestLoadTime: 0,
      totalDataTransferred: 0
    })
    setCurrentTest(0)
    setTestResults([])
  }

  // 導出測試結果
  const exportResults = () => {
    const results = {
      timestamp: new Date().toISOString(),
      metrics,
      testImages: testImages.map(img => ({
        id: img.id,
        url: img.url,
        size: img.size,
        expectedLoadTime: img.expectedLoadTime,
        actualLoadTime: img.actualLoadTime,
        success: img.success,
        performance: img.actualLoadTime ? ((img.expectedLoadTime / img.actualLoadTime) * 100).toFixed(1) + '%' : 'N/A'
      }))
    }
    
    const blob = new Blob([JSON.stringify(results, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `performance-test-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  // 獲取追蹤統計
  const getTrackingStats = () => {
    const stats = getStatistics()
    if (stats) {
      setTestResults([stats])
    }
  }

  return (
    <Layout title="效能測試">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* 控制面板 */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-black">影像載入效能測試</h2>
            <div className="flex space-x-3">
              <button
                onClick={runAllTests}
                disabled={isRunning}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Play className="w-4 h-4" />
                <span>{isRunning ? '測試中...' : '開始測試'}</span>
              </button>
              
              <button
                onClick={resetTests}
                disabled={isRunning}
                className="flex items-center space-x-2 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RotateCcw className="w-4 h-4" />
                <span>重置</span>
              </button>
              
              <button
                onClick={exportResults}
                className="flex items-center space-x-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
              >
                <Download className="w-4 h-4" />
                <span>導出結果</span>
              </button>
            </div>
          </div>
          
          {/* 測試進度 */}
          {isRunning && (
            <div className="mb-4">
              <div className="flex items-center space-x-3">
                <span className="text-sm text-gray-600">測試進度:</span>
                <div className="flex-1 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(currentTest / testImages.length) * 100}%` }}
                  />
                </div>
                <span className="text-sm font-medium">{currentTest}/{testImages.length}</span>
              </div>
            </div>
          )}
        </div>

        {/* 效能指標 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4 text-black">效能指標</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{metrics.totalTests}</div>
              <div className="text-sm text-gray-600">總測試數</div>
            </div>
            
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{metrics.successfulTests}</div>
              <div className="text-sm text-gray-600">成功測試</div>
            </div>
            
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-600">{metrics.failedTests}</div>
              <div className="text-sm text-gray-600">失敗測試</div>
            </div>
            
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">{metrics.averageLoadTime.toFixed(0)}ms</div>
              <div className="text-sm text-gray-600">平均載入時間</div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <div className="text-xl font-bold text-yellow-600">{metrics.fastestLoadTime}ms</div>
              <div className="text-sm text-gray-600">最快載入時間</div>
            </div>
            
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <div className="text-xl font-bold text-orange-600">{metrics.slowestLoadTime}ms</div>
              <div className="text-sm text-gray-600">最慢載入時間</div>
            </div>
            
            <div className="text-center p-4 bg-indigo-50 rounded-lg">
              <div className="text-xl font-bold text-indigo-600">{(metrics.totalDataTransferred / 1024).toFixed(1)}KB</div>
              <div className="text-sm text-gray-600">總數據傳輸量</div>
            </div>
          </div>
        </div>

        {/* 測試結果詳情 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4 text-black">測試結果詳情</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">ID</th>
                  <th className="text-left p-2">尺寸</th>
                  <th className="text-left p-2">預期時間</th>
                  <th className="text-left p-2">實際時間</th>
                  <th className="text-left p-2">狀態</th>
                  <th className="text-left p-2">性能</th>
                  <th className="text-left p-2">預覽</th>
                </tr>
              </thead>
              <tbody>
                {testImages.map((image, index) => (
                  <tr key={image.id} className="border-b hover:bg-gray-50">
                    <td className="p-2">{image.id}</td>
                    <td className="p-2">
                      <span className={`px-2 py-1 rounded text-xs ${
                        image.size === 'small' ? 'bg-blue-100 text-blue-800' :
                        image.size === 'medium' ? 'bg-green-100 text-green-800' :
                        'bg-purple-100 text-purple-800'
                      }`}>
                        {image.size}
                      </span>
                    </td>
                    <td className="p-2">{image.expectedLoadTime}ms</td>
                    <td className="p-2">
                      {image.actualLoadTime ? `${image.actualLoadTime.toFixed(0)}ms` : '-'}
                    </td>
                    <td className="p-2">
                      {image.success === undefined ? (
                        <span className="text-gray-500">等待中</span>
                      ) : image.success ? (
                        <span className="text-green-600">✓ 成功</span>
                      ) : (
                        <span className="text-red-600">✗ 失敗</span>
                      )}
                    </td>
                    <td className="p-2">
                      {image.actualLoadTime && image.success ? (
                        <span className={
                          image.actualLoadTime <= image.expectedLoadTime ? 'text-green-600' : 'text-red-600'
                        }>
                          {((image.expectedLoadTime / image.actualLoadTime) * 100).toFixed(1)}%
                        </span>
                      ) : '-'}
                    </td>
                    <td className="p-2">
                      <div className="w-16 h-16 bg-gray-100 rounded">
                        {image.url && (
                          <img 
                            src={image.url}
                            alt={`Test ${image.id}`}
                            className="w-full h-full object-cover rounded"
                            loading="lazy"
                          />
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 追蹤統計 */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-black">追蹤統計</h3>
            <button
              onClick={getTrackingStats}
              className="flex items-center space-x-2 px-3 py-1 bg-indigo-500 text-white rounded hover:bg-indigo-600"
            >
              <Activity className="w-4 h-4" />
              <span>獲取統計</span>
            </button>
          </div>
          
          {testResults.length > 0 && (
            <div className="space-y-4">
              {testResults.map((result, index) => (
                <div key={index} className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-black mb-2">統計結果 #{index + 1}</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">總圖片數:</span>
                      <span className="font-medium ml-1">{result.totalImages || 0}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">成功率:</span>
                      <span className="font-medium ml-1">{result.successRate?.toFixed(1) || 0}%</span>
                    </div>
                    <div>
                      <span className="text-gray-600">平均時間:</span>
                      <span className="font-medium ml-1">{result.averageLoadTime?.toFixed(0) || 0}ms</span>
                    </div>
                    <div>
                      <span className="text-gray-600">P95 時間:</span>
                      <span className="font-medium ml-1">{result.p95LoadTime?.toFixed(0) || 0}ms</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 測試說明 */}
        <div className="bg-blue-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-3 text-black">測試說明</h3>
          <ul className="space-y-2 text-sm text-black">
            <li>• <strong>測試目標:</strong> 驗證不同尺寸縮圖的載入效能</li>
            <li>• <strong>測試方法:</strong> 使用 Vercel Image Optimization 生成不同尺寸的縮圖</li>
            <li>• <strong>性能指標:</strong> 載入時間、成功率、數據傳輸量</li>
            <li>• <strong>預期結果:</strong> 小尺寸圖片載入最快，大尺寸圖片載入較慢</li>
            <li>• <strong>網路影響:</strong> 測試結果會受到當前網路條件影響</li>
          </ul>
        </div>
      </div>
    </Layout>
  )
}