'use client'

import { useState } from 'react'

export default function MediaColumnsDebugPage() {
  const [status, setStatus] = useState<string>('未檢查')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)

  const checkMediaColumns = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/debug/add-media-columns')
      const data = await response.json()
      setResult(data)
      setStatus(data.has_media_columns ? '✅ 媒體欄位已存在' : '❌ 需要添加媒體欄位')
    } catch (error) {
      setStatus('❌ 檢查失敗')
      console.error('檢查錯誤:', error)
    } finally {
      setLoading(false)
    }
  }

  const addMediaColumns = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/debug/add-media-columns', {
        method: 'POST'
      })
      const data = await response.json()
      setResult(data)
      if (data.success) {
        setStatus('✅ 媒體欄位添加成功')
      } else {
        setStatus('❌ 媒體欄位添加失敗')
      }
    } catch (error) {
      setStatus('❌ 添加失敗')
      console.error('添加錯誤:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">媒體欄位診斷工具</h1>
        
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">當前狀態</h2>
          <p className="text-lg mb-4">
            狀態: <span className="font-mono">{status}</span>
          </p>
          
          <div className="space-x-4">
            <button
              onClick={checkMediaColumns}
              disabled={loading}
              className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg disabled:opacity-50"
            >
              {loading ? '檢查中...' : '檢查媒體欄位'}
            </button>
            
            <button
              onClick={addMediaColumns}
              disabled={loading}
              className="bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-lg disabled:opacity-50"
            >
              {loading ? '添加中...' : '添加媒體欄位'}
            </button>
          </div>
        </div>

        {result && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">詳細結果</h2>
            <pre className="bg-gray-100 p-4 rounded-lg overflow-auto text-sm">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}
