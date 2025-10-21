'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useLiff } from '@/hooks/useLiff'
import { 
  Trash2, 
  HardDrive, 
  FileImage, 
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Home,
  ArrowLeft
} from 'lucide-react'
import AdminLayout from '@/components/AdminLayout'

interface MediaAnalysis {
  total_files: number
  used_files: number
  unused_files: number
  total_size_bytes: number
  unused_size_bytes: number
  total_size_mb: string
  unused_size_mb: string
  space_utilization: string
}

interface UnusedFile {
  name: string
  size: number
  size_mb: string
  created_at: string
  last_modified: string
}

interface CleanupResult {
  success: boolean
  message: string
  deleted_count: number
  total_files: number
  used_files: number
  remaining_files: number
  total_size_saved: number
  size_saved_mb: string
  deleted_files: Array<{
    name: string
    size: number
    created_at: string
  }>
}

export default function MediaCleanupPage() {
  const [analysis, setAnalysis] = useState<MediaAnalysis | null>(null)
  const [unusedFiles, setUnusedFiles] = useState<UnusedFile[]>([])
  const [loading, setLoading] = useState(false)
  const [cleanupResult, setCleanupResult] = useState<CleanupResult | null>(null)
  const [lastCleanup, setLastCleanup] = useState<string | null>(null)
  
  const { isLoggedIn, isAdmin, loading: liffLoading, adminLoading } = useLiff()
  const router = useRouter()

  // 檢查管理員權限
  useEffect(() => {
    if (liffLoading || adminLoading) return
    if (!isLoggedIn || !isAdmin) {
      router.push('/')
    }
  }, [liffLoading, adminLoading, isLoggedIn, isAdmin, router])

  // 載入媒體分析
  const loadAnalysis = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/media/cleanup')
      const data = await response.json()
      
      if (data.success) {
        setAnalysis(data.analysis)
        setUnusedFiles(data.unused_files || [])
      } else {
        console.error('分析失敗:', data.error)
        alert('載入分析失敗：' + data.error)
      }
    } catch (error) {
      console.error('載入分析錯誤:', error)
      alert('載入分析時發生錯誤')
    } finally {
      setLoading(false)
    }
  }

  // 執行清理
  const performCleanup = async () => {
    if (!confirm(`確定要刪除 ${unusedFiles.length} 個未使用的媒體檔案嗎？\n\n這個操作無法撤銷！`)) {
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/admin/media/cleanup', {
        method: 'POST'
      })
      const data = await response.json()
      
      if (data.success) {
        setCleanupResult(data)
        setLastCleanup(new Date().toLocaleString('zh-TW'))
        // 重新載入分析
        await loadAnalysis()
      } else {
        console.error('清理失敗:', data.error)
        alert('清理失敗：' + data.error)
      }
    } catch (error) {
      console.error('清理錯誤:', error)
      alert('清理時發生錯誤')
    } finally {
      setLoading(false)
    }
  }

  // 初始載入
  useEffect(() => {
    if (!liffLoading && !adminLoading && isAdmin) {
      loadAnalysis()
    }
  }, [liffLoading, adminLoading, isAdmin])

  if (liffLoading || adminLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (!isAdmin) {
    return null
  }

  return (
    <AdminLayout title="媒體檔案清理">
      <div className="max-w-7xl mx-auto">
          {/* 控制面板 */}
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">儲存空間分析</h2>
              <button
                onClick={loadAnalysis}
                disabled={loading}
                className="flex items-center space-x-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                <span>{loading ? '分析中...' : '重新分析'}</span>
              </button>
            </div>

            {lastCleanup && (
              <div className="mb-4 p-3 bg-green-100 border border-green-300 rounded-lg">
                <p className="text-green-800 text-sm">
                  <CheckCircle className="w-4 h-4 inline mr-1" />
                  上次清理時間：{lastCleanup}
                </p>
              </div>
            )}

            {analysis && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <FileImage className="w-5 h-5 text-blue-600" />
                    <span className="text-sm font-medium text-blue-900">總檔案數</span>
                  </div>
                  <p className="text-2xl font-bold text-blue-900">{analysis.total_files}</p>
                  <p className="text-sm text-blue-700">{analysis.total_size_mb} MB</p>
                </div>

                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="text-sm font-medium text-green-900">使用中</span>
                  </div>
                  <p className="text-2xl font-bold text-green-900">{analysis.used_files}</p>
                  <p className="text-sm text-green-700">{analysis.space_utilization}% 利用率</p>
                </div>

                <div className="bg-orange-50 p-4 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <AlertTriangle className="w-5 h-5 text-orange-600" />
                    <span className="text-sm font-medium text-orange-900">未使用</span>
                  </div>
                  <p className="text-2xl font-bold text-orange-900">{analysis.unused_files}</p>
                  <p className="text-sm text-orange-700">{analysis.unused_size_mb} MB</p>
                </div>

                <div className="bg-red-50 p-4 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <Trash2 className="w-5 h-5 text-red-600" />
                    <span className="text-sm font-medium text-red-900">可清理</span>
                  </div>
                  <p className="text-2xl font-bold text-red-900">{unusedFiles.length}</p>
                  <p className="text-sm text-red-700">節省 {analysis.unused_size_mb} MB</p>
                </div>
              </div>
            )}
          </div>

          {/* 清理結果 */}
          {cleanupResult && (
            <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">清理結果</h2>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="text-green-900 font-medium">{cleanupResult.message}</p>
                    <div className="mt-2 text-sm text-green-800">
                      <p>• 刪除檔案：{cleanupResult.deleted_count} 個</p>
                      <p>• 節省空間：{cleanupResult.size_saved_mb} MB</p>
                      <p>• 剩餘檔案：{cleanupResult.remaining_files} 個</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 未使用檔案列表 */}
          {unusedFiles.length > 0 && (
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">
                  未使用的檔案 ({unusedFiles.length} 個)
                </h2>
                <button
                  onClick={performCleanup}
                  disabled={loading}
                  className="flex items-center space-x-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>{loading ? '清理中...' : '清理所有未使用檔案'}</span>
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        檔案名稱
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        大小
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        上傳時間
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        最後修改
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {unusedFiles.map((file, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">
                          {file.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {file.size_mb} MB
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(file.created_at).toLocaleString('zh-TW')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(file.last_modified).toLocaleString('zh-TW')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 無未使用檔案 */}
          {analysis && unusedFiles.length === 0 && (
            <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">儲存空間已優化</h3>
              <p className="text-gray-600">所有媒體檔案都在使用中，無需清理</p>
            </div>
          )}
      </div>
    </AdminLayout>
  )
}
