'use client'

import { useState, useEffect } from 'react'
import { createSupabaseAdmin } from '@/lib/supabase-admin'

interface Photo {
  id: number
  image_url: string
  blessing_message: string | null
  is_public: boolean
  vote_count: number
  created_at: string
  user_id: string
}

export default function BatchDeleteTestPage() {
  const [photos, setPhotos] = useState<Photo[]>([])
  const [selectedPhotos, setSelectedPhotos] = useState<number[]>([])
  const [loading, setLoading] = useState(false)
  const [testResult, setTestResult] = useState<string>('')

  // 獲取所有照片
  const fetchPhotos = async () => {
    try {
      const supabaseAdmin = createSupabaseAdmin()
      const { data, error } = await supabaseAdmin
        .from('photos')
        .select('id, image_url, blessing_message, is_public, vote_count, created_at, user_id')
        .order('created_at', { ascending: false })
        .limit(10) // 限制測試數量

      if (error) {
        setTestResult(`獲取照片失敗: ${error.message}`)
      } else {
        setPhotos(data || [])
        setTestResult(`成功獲取 ${data?.length || 0} 張照片`)
      }
    } catch (error) {
      setTestResult(`獲取照片錯誤: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  // 測試批量刪除API
  const testBatchDelete = async () => {
    if (selectedPhotos.length === 0) {
      setTestResult('請先選擇要刪除的照片')
      return
    }

    setLoading(true)
    setTestResult('')

    try {
      const response = await fetch('/api/admin/photos/batch-delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photoIds: selectedPhotos })
      })

      const data = await response.json()

      if (response.ok) {
        setTestResult(`✅ 批量刪除成功！刪除了 ${data.deletedCount} 張照片`)
        setSelectedPhotos([])
        await fetchPhotos() // 重新載入照片列表
      } else {
        setTestResult(`❌ 批量刪除失敗: ${data.error}`)
      }
    } catch (error) {
      setTestResult(`❌ 批量刪除錯誤: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setLoading(false)
    }
  }

  // 切換照片選擇
  const togglePhotoSelection = (photoId: number) => {
    setSelectedPhotos(prev => 
      prev.includes(photoId) 
        ? prev.filter(id => id !== photoId)
        : [...prev, photoId]
    )
  }

  // 全選/取消全選
  const toggleSelectAll = () => {
    if (selectedPhotos.length === photos.length) {
      setSelectedPhotos([])
    } else {
      setSelectedPhotos(photos.map(photo => photo.id))
    }
  }

  useEffect(() => {
    fetchPhotos()
  }, [])

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">批量刪除功能測試</h1>
        
        {/* 測試結果 */}
        {testResult && (
          <div className={`mb-6 p-4 rounded-lg ${
            testResult.includes('✅') ? 'bg-green-100 text-green-800' : 
            testResult.includes('❌') ? 'bg-red-100 text-red-800' : 
            'bg-blue-100 text-blue-800'
          }`}>
            <p className="font-medium">{testResult}</p>
          </div>
        )}

        {/* 操作按鈕 */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">測試操作</h2>
            <div className="flex items-center space-x-4">
              <button
                onClick={fetchPhotos}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                重新載入照片
              </button>
              <button
                onClick={toggleSelectAll}
                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
              >
                {selectedPhotos.length === photos.length ? '取消全選' : '全選'}
              </button>
              <button
                onClick={testBatchDelete}
                disabled={selectedPhotos.length === 0 || loading}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {loading ? '刪除中...' : `刪除選中的 ${selectedPhotos.length} 張照片`}
              </button>
            </div>
          </div>
          
          <div className="text-sm text-gray-600">
            <p>已選擇 {selectedPhotos.length} / {photos.length} 張照片</p>
          </div>
        </div>

        {/* 照片列表 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">照片列表（最多顯示10張）</h2>
          
          {photos.length === 0 ? (
            <p className="text-gray-500 text-center py-8">沒有照片可供測試</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {photos.map((photo) => (
                <div
                  key={photo.id}
                  className={`relative border-2 rounded-lg overflow-hidden cursor-pointer transition-all ${
                    selectedPhotos.includes(photo.id) 
                      ? 'border-blue-500 shadow-lg' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => togglePhotoSelection(photo.id)}
                >
                  {/* 選擇指示器 */}
                  <div className="absolute top-2 left-2 z-10">
                    <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center ${
                      selectedPhotos.includes(photo.id)
                        ? 'bg-blue-500 border-blue-500'
                        : 'bg-white border-gray-300'
                    }`}>
                      {selectedPhotos.includes(photo.id) && (
                        <span className="text-white text-xs">✓</span>
                      )}
                    </div>
                  </div>

                  {/* 照片縮圖 */}
                  <div className="aspect-square w-full relative bg-gray-100">
                    <img
                      src={photo.image_url}
                      alt={photo.blessing_message || '照片'}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect width="100" height="100" fill="%23ddd"/%3E%3C/svg%3E'
                      }}
                    />
                  </div>

                  {/* 照片資訊 */}
                  <div className="p-2">
                    <p className="text-xs text-gray-600 truncate">ID: {photo.id}</p>
                    <p className="text-xs text-gray-500">
                      {photo.is_public ? '公開' : '隱私'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* API 測試說明 */}
        <div className="bg-white rounded-lg shadow p-6 mt-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">API 測試說明</h2>
          <div className="space-y-2 text-sm text-gray-600">
            <p>• 此頁面用於測試批量刪除功能</p>
            <p>• 選擇照片後點擊「刪除選中的照片」按鈕進行測試</p>
            <p>• 刪除操作無法復原，請謹慎操作</p>
            <p>• API端點: <code className="bg-gray-100 px-2 py-1 rounded">DELETE /api/admin/photos/batch-delete</code></p>
            <p>• 請求格式: <code className="bg-gray-100 px-2 py-1 rounded">{"{photoIds: [1, 2, 3]}"}</code></p>
          </div>
        </div>
      </div>
    </div>
  )
}