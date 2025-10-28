'use client'

import { useState, useEffect } from 'react'
import { createSupabaseBrowser } from '@/lib/supabase'
import AdminLayout from '@/components/AdminLayout'
import { RefreshCw, Image as ImageIcon, CheckCircle, XCircle, Loader2 } from 'lucide-react'

interface ThumbnailStats {
  totalPhotos: number
  photosWithThumbnails: number
  photosWithoutThumbnails: number
  thumbnailCoverage: string
}

export default function ThumbnailsPage() {
  const [stats, setStats] = useState<ThumbnailStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [batchRefreshing, setBatchRefreshing] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  
  const supabase = createSupabaseBrowser()

  // 獲取縮圖統計
  const fetchStats = async () => {
    try {
      const response = await fetch('/api/admin/thumbnails', {
        headers: {
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'admin'}`
        }
      })
      
      if (!response.ok) {
        throw new Error('獲取統計資訊失敗')
      }
      
      const result = await response.json()
      if (result.success) {
        setStats(result.data)
      } else {
        throw new Error(result.error || '獲取統計資訊失敗')
      }
    } catch (error) {
      console.error('Error fetching stats:', error)
      setMessage({ type: 'error', text: error instanceof Error ? error.message : '獲取統計資訊失敗' })
    } finally {
      setLoading(false)
    }
  }

  // 批量重新生成縮圖
  const handleBatchRefresh = async () => {
    if (!confirm('確定要重新生成所有照片的縮圖嗎？這可能需要一些時間。')) {
      return
    }

    setBatchRefreshing(true)
    setMessage(null)

    try {
      const response = await fetch('/api/admin/thumbnails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'admin'}`
        },
        body: JSON.stringify({
          action: 'batch-refresh'
        })
      })

      if (!response.ok) {
        throw new Error('批量更新失敗')
      }

      const result = await response.json()
      if (result.success) {
        setMessage({ 
          type: 'success', 
          text: `批量更新完成！成功: ${result.data.successCount}, 失敗: ${result.data.errorCount}` 
        })
        await fetchStats() // 重新獲取統計
      } else {
        throw new Error(result.error || '批量更新失敗')
      }
    } catch (error) {
      console.error('Error batch refreshing:', error)
      setMessage({ type: 'error', text: error instanceof Error ? error.message : '批量更新失敗' })
    } finally {
      setBatchRefreshing(false)
    }
  }

  useEffect(() => {
    fetchStats()
  }, [])

  if (loading) {
    return (
      <AdminLayout title="縮圖管理">
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-pink-500" />
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout title="縮圖管理">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* 頂部說明 */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center space-x-3 mb-4">
            <ImageIcon className="w-8 h-8 text-pink-500" />
            <h2 className="text-2xl font-bold text-gray-800">照片縮圖管理</h2>
          </div>
          <p className="text-gray-600">
            使用 Vercel Image Optimization 自動生成和管理照片縮圖，提升載入性能和用戶體驗。
          </p>
        </div>

        {/* 統計卡片 */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">總照片數</p>
                  <p className="text-2xl font-bold text-gray-800">{stats.totalPhotos}</p>
                </div>
                <ImageIcon className="w-8 h-8 text-blue-500" />
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">已有縮圖</p>
                  <p className="text-2xl font-bold text-green-600">{stats.photosWithThumbnails}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">缺少縮圖</p>
                  <p className="text-2xl font-bold text-orange-600">{stats.photosWithoutThumbnails}</p>
                </div>
                <XCircle className="w-8 h-8 text-orange-500" />
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">覆蓋率</p>
                  <p className="text-2xl font-bold text-purple-600">{stats.thumbnailCoverage}</p>
                </div>
                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                  <span className="text-purple-600 text-sm font-bold">%</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 操作按鈕 */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">操作</h3>
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={fetchStats}
              disabled={refreshing}
              className="flex items-center space-x-2 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white font-medium py-3 px-6 rounded-lg transition-colors duration-200"
            >
              <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
              <span>重新整理統計</span>
            </button>

            <button
              onClick={handleBatchRefresh}
              disabled={batchRefreshing || !stats || stats.totalPhotos === 0}
              className="flex items-center space-x-2 bg-pink-500 hover:bg-pink-600 disabled:bg-pink-300 text-white font-medium py-3 px-6 rounded-lg transition-colors duration-200"
            >
              {batchRefreshing ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <RefreshCw className="w-5 h-5" />
              )}
              <span>批量重新生成縮圖</span>
            </button>
          </div>
        </div>

        {/* 訊息顯示 */}
        {message && (
          <div className={`rounded-xl p-4 flex items-center space-x-3 ${
            message.type === 'success' 
              ? 'bg-green-50 border-2 border-green-200 text-green-800' 
              : 'bg-red-50 border-2 border-red-200 text-red-800'
          }`}>
            {message.type === 'success' ? (
              <CheckCircle className="w-6 h-6 flex-shrink-0" />
            ) : (
              <XCircle className="w-6 h-6 flex-shrink-0" />
            )}
            <p className="font-medium">{message.text}</p>
            <button
              onClick={() => setMessage(null)}
              className="ml-auto text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          </div>
        )}

        {/* 說明資訊 */}
        <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-blue-800 mb-3">關於縮圖系統</h3>
          <div className="space-y-2 text-blue-700">
            <p>• 系統使用 Vercel Image Optimization 自動生成多種尺寸的縮圖</p>
            <p>• 小尺寸 (200px): 適合縮圖預覽和行動裝置</p>
            <p>• 中等尺寸 (400px): 適合一般顯示</p>
            <p>• 大尺寸 (800px): 適合高解析度顯示</p>
            <p>• 縮圖會根據用戶設備自動選擇最佳尺寸</p>
            <p>• 所有縮圖都包含自動格式最佳化 (WebP, AVIF)</p>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}