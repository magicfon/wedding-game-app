'use client'

import { useState, useEffect } from 'react'
import Layout from '@/components/AdminLayout'
import { Clock, CheckCircle, XCircle, Monitor, Smartphone, Tablet, Wifi, Activity, TrendingUp, TrendingDown } from 'lucide-react'

interface PerformanceStats {
  totalImages: number
  successfulLoads: number
  failedLoads: number
  successRate: number
  averageLoadTime: number
  medianLoadTime: number
  p95LoadTime: number
  byThumbnailSize: Record<string, any>
  byDeviceType: Record<string, any>
  byConnectionType: Record<string, any>
}

interface TimeSeriesData {
  date: string
  totalImages: number
  successRate: number
  avgLoadTime: number
}

export default function ImagePerformancePage() {
  const [stats, setStats] = useState<PerformanceStats | null>(null)
  const [timeSeriesData, setTimeSeriesData] = useState<TimeSeriesData[]>([])
  const [timeRange, setTimeRange] = useState('7d')
  const [selectedThumbnailSize, setSelectedThumbnailSize] = useState('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchPerformanceStats()
  }, [timeRange, selectedThumbnailSize])

  const fetchPerformanceStats = async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams({
        timeRange,
        ...(selectedThumbnailSize !== 'all' && { thumbnailSize: selectedThumbnailSize })
      })

      const response = await fetch(`/api/analytics/image-performance?${params}`)
      const result = await response.json()

      if (result.success) {
        setStats(result.data.stats)
        
        // 轉換時間序列數據格式
        const timeSeries = result.data.rawData
          .filter((item: any) => item.success) // 只包含成功的載入
          .reduce((acc: any, item: any) => {
            const date = new Date(item.timestamp).toLocaleDateString()
            const existing = acc.find((d: any) => d.date === date)
            
            if (existing) {
              existing.totalImages++
              existing.avgLoadTime = (existing.avgLoadTime + item.load_time) / 2
            } else {
              acc.push({
                date,
                totalImages: 1,
                successRate: 100,
                avgLoadTime: item.load_time
              })
            }
            
            return acc
          }, [])
          .slice(-7) // 只顯示最近 7 天
        
        setTimeSeriesData(timeSeries)
      } else {
        setError(result.error || '獲取數據失敗')
      }
    } catch (error) {
      console.error('獲取效能統計失敗:', error)
      setError('獲取效能統計失敗')
    } finally {
      setLoading(false)
    }
  }

  const formatLoadTime = (time: number) => {
    return `${time.toFixed(0)}ms`
  }

  const formatPercentage = (percentage: number) => {
    return `${percentage.toFixed(1)}%`
  }

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType) {
      case 'mobile': return <Smartphone className="w-4 h-4" />
      case 'tablet': return <Tablet className="w-4 h-4" />
      default: return <Monitor className="w-4 h-4" />
    }
  }

  const getConnectionIcon = (connectionType: string) => {
    return <Wifi className="w-4 h-4" />
  }

  const getTrendIcon = (current: number, previous: number) => {
    if (current > previous) {
      return <TrendingUp className="w-4 h-4 text-red-500" />
    } else {
      return <TrendingDown className="w-4 h-4 text-green-500" />
    }
  }

  const getSimpleBarChart = (data: any[], valueKey: string, maxBarWidth: number = 100) => {
    const maxValue = Math.max(...data.map(d => d[valueKey]))
    
    return (
      <div className="space-y-2">
        {data.map((item, index) => {
          const percentage = (item[valueKey] / maxValue) * 100
          const barWidth = (percentage / 100) * maxBarWidth
          
          return (
            <div key={index} className="flex items-center space-x-3">
              <div className="w-20 text-sm text-gray-600 truncate">{item.name || 'unknown'}</div>
              <div className="flex-1">
                <div className="relative">
                  <div className="w-full bg-gray-200 rounded-full h-6">
                    <div 
                      className="bg-blue-500 h-6 rounded-full transition-all duration-300"
                      style={{ width: `${barWidth}px` }}
                    />
                  </div>
                  <span className="absolute inset-0 flex items-center justify-center text-xs text-white font-medium">
                    {valueKey === 'avgLoadTime' ? formatLoadTime(item[valueKey]) : 
                     valueKey === 'successRate' ? formatPercentage(item[valueKey]) : 
                     item[valueKey]}
                  </span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  if (loading) {
    return (
      <Layout title="影像效能分析">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </Layout>
    )
  }

  if (error) {
    return (
      <Layout title="影像效能分析">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <XCircle className="w-5 h-5 text-red-500" />
            <span className="text-red-700">{error}</span>
          </div>
        </div>
      </Layout>
    )
  }

  if (!stats) {
    return (
      <Layout title="影像效能分析">
        <div className="text-center text-gray-500 py-8">
          暫無數據
        </div>
      </Layout>
    )
  }

  // 準備圖表數據
  const thumbnailSizeData = Object.entries(stats.byThumbnailSize).map(([size, data]: [string, any]) => ({
    name: size || 'unknown',
    count: data.count,
    avgLoadTime: data.avgLoadTime,
    successRate: data.successRate
  }))

  const deviceTypeData = Object.entries(stats.byDeviceType).map(([type, data]: [string, any]) => ({
    name: type,
    count: data.count,
    avgLoadTime: data.avgLoadTime,
    successRate: data.successRate
  }))

  const connectionTypeData = Object.entries(stats.byConnectionType).map(([type, data]: [string, any]) => ({
    name: type || 'unknown',
    count: data.count,
    avgLoadTime: data.avgLoadTime,
    successRate: data.successRate
  }))

  return (
    <Layout title="影像效能分析">
      <div className="space-y-6">
        {/* 控制面板 */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="text-xl font-bold text-black">影像載入效能統計</h2>
            
            <div className="flex flex-wrap gap-3">
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="24h">過去 24 小時</option>
                <option value="7d">過去 7 天</option>
                <option value="30d">過去 30 天</option>
              </select>
              
              <select
                value={selectedThumbnailSize}
                onChange={(e) => setSelectedThumbnailSize(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">所有尺寸</option>
                <option value="small">小尺寸 (200px)</option>
                <option value="medium">中等尺寸 (400px)</option>
                <option value="large">大尺寸 (800px)</option>
              </select>
            </div>
          </div>
        </div>

        {/* 總體統計卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">總圖片數量</p>
                <p className="text-2xl font-bold text-black">{stats.totalImages}</p>
              </div>
              <Activity className="w-8 h-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">成功率</p>
                <p className="text-2xl font-bold text-green-600">{formatPercentage(stats.successRate)}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">平均載入時間</p>
                <p className="text-2xl font-bold text-blue-600">{formatLoadTime(stats.averageLoadTime)}</p>
              </div>
              <Clock className="w-8 h-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">P95 載入時間</p>
                <p className="text-2xl font-bold text-orange-600">{formatLoadTime(stats.p95LoadTime)}</p>
              </div>
              <Activity className="w-8 h-8 text-orange-500" />
            </div>
          </div>
        </div>

        {/* 時間序列數據 */}
        {timeSeriesData.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4 text-black">載入時間趨勢</h3>
            <div className="space-y-3">
              {timeSeriesData.map((day, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="font-medium text-black">{day.date}</div>
                  <div className="flex items-center space-x-6">
                    <div className="text-sm">
                      <span className="text-gray-600">圖片數量:</span>
                      <span className="font-medium ml-1">{day.totalImages}</span>
                    </div>
                    <div className="text-sm">
                      <span className="text-gray-600">平均時間:</span>
                      <span className="font-medium ml-1">{formatLoadTime(day.avgLoadTime)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 縮圖尺寸統計 */}
        {thumbnailSizeData.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4 text-black">按縮圖尺寸分析</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-black mb-3">圖片數量</h4>
                {getSimpleBarChart(thumbnailSizeData, 'count')}
              </div>
              <div>
                <h4 className="font-medium text-black mb-3">平均載入時間</h4>
                {getSimpleBarChart(thumbnailSizeData, 'avgLoadTime')}
              </div>
            </div>
          </div>
        )}

        {/* 設備類型統計 */}
        {deviceTypeData.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4 text-black">按設備類型分析</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {deviceTypeData.map((device, index) => (
                <div key={device.name} className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-3">
                    {getDeviceIcon(device.name)}
                    <span className="font-medium text-black capitalize">{device.name}</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">圖片數量:</span>
                      <span className="font-medium">{device.count}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">成功率:</span>
                      <span className="font-medium">{formatPercentage(device.successRate)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">平均時間:</span>
                      <span className="font-medium">{formatLoadTime(device.avgLoadTime)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 網路連接類型統計 */}
        {connectionTypeData.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4 text-black">按網路連接類型分析</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {connectionTypeData.map((connection, index) => (
                <div key={connection.name} className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    {getConnectionIcon(connection.name)}
                    <span className="font-medium text-black capitalize">{connection.name}</span>
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm text-gray-600">
                      圖片數量: <span className="font-medium">{connection.count}</span>
                    </div>
                    <div className="text-sm text-gray-600">
                      成功率: <span className="font-medium">{formatPercentage(connection.successRate)}</span>
                    </div>
                    <div className="text-sm text-gray-600">
                      平均時間: <span className="font-medium">{formatLoadTime(connection.avgLoadTime)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}