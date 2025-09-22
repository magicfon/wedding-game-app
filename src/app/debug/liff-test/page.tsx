'use client'

import { useEffect, useState } from 'react'

export default function LiffTest() {
  const [debugInfo, setDebugInfo] = useState<any>({})

  useEffect(() => {
    const checkLiffConfig = async () => {
      const info: any = {}
      
      // 檢查環境變數
      info.liffId = process.env.NEXT_PUBLIC_LIFF_ID
      info.supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      
      // 檢查是否在瀏覽器中
      info.isBrowser = typeof window !== 'undefined'
      
      if (typeof window !== 'undefined') {
        info.userAgent = navigator.userAgent
        info.currentUrl = window.location.href
        
        // 嘗試調用 LIFF 配置 API
        try {
          const response = await fetch('/api/debug/liff-config')
          const data = await response.json()
          info.apiResult = data
        } catch (err) {
          info.apiError = err instanceof Error ? err.message : String(err)
        }
      }
      
      setDebugInfo(info)
    }

    checkLiffConfig()
  }, [])

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">LIFF 配置診斷</h1>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">診斷結果</h2>
          
          <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
            {JSON.stringify(debugInfo, null, 2)}
          </pre>
          
          <div className="mt-6 space-y-4">
            <div>
              <h3 className="font-medium">LIFF ID 狀態</h3>
              <p className={`text-sm ${debugInfo.liffId ? 'text-green-600' : 'text-red-600'}`}>
                {debugInfo.liffId ? `✅ 找到: ${debugInfo.liffId}` : '❌ 未找到 NEXT_PUBLIC_LIFF_ID'}
              </p>
            </div>
            
            <div>
              <h3 className="font-medium">Supabase URL 狀態</h3>
              <p className={`text-sm ${debugInfo.supabaseUrl ? 'text-green-600' : 'text-red-600'}`}>
                {debugInfo.supabaseUrl ? `✅ 找到: ${debugInfo.supabaseUrl}` : '❌ 未找到 NEXT_PUBLIC_SUPABASE_URL'}
              </p>
            </div>
          </div>
          
          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded">
            <h3 className="font-medium text-yellow-800">修復步驟</h3>
            <ol className="text-sm text-yellow-700 mt-2 space-y-1">
              <li>1. 前往 Vercel Dashboard</li>
              <li>2. 選擇項目 → Settings → Environment Variables</li>
              <li>3. 添加 NEXT_PUBLIC_LIFF_ID（確保以 NEXT_PUBLIC_ 開頭）</li>
              <li>4. 值從 LINE Developers Console 複製</li>
              <li>5. 重新部署應用</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  )
}
