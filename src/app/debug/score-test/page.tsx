'use client'

import { useState } from 'react'
import Layout from '@/components/Layout'

export default function ScoreTestPage() {
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const checkTriggers = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/debug/check-triggers')
      const data = await response.json()
      setResult(data)
      console.log('🔍 觸發器檢查結果:', data)
    } catch (error) {
      console.error('❌ 檢查失敗:', error)
      setResult({ error: '檢查失敗' })
    } finally {
      setLoading(false)
    }
  }

  const fixScores = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/debug/check-triggers', {
        method: 'POST'
      })
      const data = await response.json()
      setResult(data)
      console.log('🔧 分數修復結果:', data)
    } catch (error) {
      console.error('❌ 修復失敗:', error)
      setResult({ error: '修復失敗' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Layout title="分數測試">
      <div className="max-w-4xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-6">分數系統測試與修復</h1>
        
        <div className="space-y-4 mb-6">
          <button
            onClick={checkTriggers}
            disabled={loading}
            className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg disabled:bg-gray-400"
          >
            {loading ? '檢查中...' : '🔍 檢查觸發器和分數'}
          </button>
          
          <button
            onClick={fixScores}
            disabled={loading}
            className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg disabled:bg-gray-400 ml-4"
          >
            {loading ? '修復中...' : '🔧 手動修復所有分數'}
          </button>
        </div>

        {result && (
          <div className="bg-gray-100 p-6 rounded-lg">
            <h2 className="text-lg font-bold mb-4">檢查結果：</h2>
            <pre className="text-sm overflow-x-auto whitespace-pre-wrap">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
        
        <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h3 className="font-bold text-yellow-800 mb-2">使用說明：</h3>
          <ul className="text-sm text-yellow-700 space-y-1">
            <li>1. 點擊「檢查觸發器和分數」查看目前狀況</li>
            <li>2. 如果發現分數不一致，點擊「手動修復所有分數」</li>
            <li>3. 檢查結果會顯示在下方，也會輸出到控制台</li>
            <li>4. 修復後重新檢查分數排行榜是否正常</li>
          </ul>
        </div>
      </div>
    </Layout>
  )
}
