'use client'

import { useEffect, useState } from 'react'

declare global {
  interface Window {
    liff: any;
  }
}

export default function LiffInitTest() {
  const [logs, setLogs] = useState<string[]>([])
  const [liffState, setLiffState] = useState<any>({})

  const addLog = (message: string) => {
    console.log(message)
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`])
  }

  useEffect(() => {
    const testLiffInit = async () => {
      addLog('開始 LIFF 初始化測試...')
      
      try {
        // 1. 檢查環境變數
        const liffId = process.env.NEXT_PUBLIC_LIFF_ID
        addLog(`LIFF ID: ${liffId}`)
        
        if (!liffId) {
          addLog('❌ LIFF ID 不存在')
          return
        }
        
        // 2. 載入 LIFF SDK
        addLog('載入 LIFF SDK...')
        if (!window.liff) {
          const script = document.createElement('script')
          script.src = 'https://static.line-scdn.net/liff/edge/2/sdk.js'
          script.async = true
          
          await new Promise((resolve, reject) => {
            script.onload = () => {
              addLog('✅ LIFF SDK 載入成功')
              resolve(void 0)
            }
            script.onerror = (error) => {
              addLog(`❌ LIFF SDK 載入失敗: ${error}`)
              reject(error)
            }
            document.head.appendChild(script)
          })
        } else {
          addLog('✅ LIFF SDK 已存在')
        }
        
        // 3. 初始化 LIFF
        addLog(`初始化 LIFF，ID: ${liffId}`)
        
        try {
          await window.liff.init({ liffId })
          addLog('✅ LIFF 初始化成功')
          
          // 4. 檢查 LIFF 狀態
          const isInClient = window.liff.isInClient()
          const isLoggedIn = window.liff.isLoggedIn()
          
          addLog(`環境檢查: ${isInClient ? 'LINE App' : 'External Browser'}`)
          addLog(`登入狀態: ${isLoggedIn ? '已登入' : '未登入'}`)
          
          setLiffState({
            isInClient,
            isLoggedIn,
            ready: true
          })
          
          // 5. 如果已登入，獲取用戶資料
          if (isLoggedIn) {
            try {
              const profile = await window.liff.getProfile()
              addLog(`✅ 用戶資料: ${JSON.stringify(profile)}`)
            } catch (profileError) {
              addLog(`❌ 獲取用戶資料失敗: ${profileError}`)
            }
          }
          
        } catch (initError: any) {
          addLog(`❌ LIFF 初始化失敗: ${initError.message || initError}`)
          
          // 詳細錯誤分析
          if (initError.message) {
            if (initError.message.includes('client_id')) {
              addLog('🔍 這是 client_id 相關錯誤')
              addLog('可能原因:')
              addLog('1. LIFF 應用的 Endpoint URL 設置錯誤')
              addLog('2. LIFF 應用已被刪除或停用')
              addLog('3. LIFF ID 不正確')
            }
            
            if (initError.message.includes('network')) {
              addLog('🔍 這是網路相關錯誤')
            }
          }
          
          addLog(`完整錯誤對象: ${JSON.stringify(initError)}`)
        }
        
      } catch (error: any) {
        addLog(`❌ 測試過程發生錯誤: ${error.message || error}`)
      }
    }
    
    testLiffInit()
  }, [])

  const testLogin = async () => {
    addLog('測試登入...')
    
    if (!window.liff) {
      addLog('❌ LIFF 未初始化')
      return
    }
    
    try {
      addLog('呼叫 liff.login()...')
      window.liff.login()
    } catch (error: any) {
      addLog(`❌ 登入失敗: ${error.message || error}`)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">LIFF 初始化測試</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 狀態面板 */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">LIFF 狀態</h2>
            
            <div className="space-y-2">
              <div>
                <span className="font-medium">LIFF ID:</span>
                <span className="ml-2 text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                  {process.env.NEXT_PUBLIC_LIFF_ID}
                </span>
              </div>
              
              <div>
                <span className="font-medium">環境:</span>
                <span className={`ml-2 px-2 py-1 rounded text-sm ${
                  liffState.isInClient ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {liffState.isInClient ? 'LINE App' : 'External Browser'}
                </span>
              </div>
              
              <div>
                <span className="font-medium">登入狀態:</span>
                <span className={`ml-2 px-2 py-1 rounded text-sm ${
                  liffState.isLoggedIn ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {liffState.isLoggedIn ? '已登入' : '未登入'}
                </span>
              </div>
              
              <div>
                <span className="font-medium">LIFF 就緒:</span>
                <span className={`ml-2 px-2 py-1 rounded text-sm ${
                  liffState.ready ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {liffState.ready ? '是' : '否'}
                </span>
              </div>
            </div>
            
            {liffState.ready && !liffState.isLoggedIn && (
              <button
                onClick={testLogin}
                className="mt-4 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg"
              >
                測試登入
              </button>
            )}
          </div>
          
          {/* 日誌面板 */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">初始化日誌</h2>
            
            <div className="bg-gray-900 text-green-400 p-4 rounded font-mono text-sm max-h-96 overflow-y-auto">
              {logs.map((log, index) => (
                <div key={index} className="mb-1">
                  {log}
                </div>
              ))}
            </div>
          </div>
        </div>
        
        {/* 修復建議 */}
        <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h3 className="font-semibold text-yellow-800 mb-3">如果出現 client_id 錯誤，請檢查：</h3>
          
          <ol className="text-sm text-yellow-700 space-y-2">
            <li>
              <strong>1. LINE Developers Console 設置：</strong>
              <ul className="ml-4 mt-1 space-y-1">
                <li>• 前往 <a href="https://developers.line.biz/" target="_blank" className="underline">LINE Developers Console</a></li>
                <li>• 選擇您的 LIFF 應用</li>
                <li>• 檢查 <strong>Endpoint URL</strong> 是否設為: <code className="bg-white px-1">https://wedding-game-app.vercel.app</code></li>
                <li>• 確認應用狀態為 <strong>Published</strong></li>
              </ul>
            </li>
            
            <li>
              <strong>2. LIFF 應用設置：</strong>
              <ul className="ml-4 mt-1 space-y-1">
                <li>• Size: Full</li>
                <li>• Scope: profile</li>
                <li>• Bot feature: 可選</li>
              </ul>
            </li>
            
            <li>
              <strong>3. 如果問題持續：</strong>
              <ul className="ml-4 mt-1 space-y-1">
                <li>• 嘗試刪除並重新創建 LIFF 應用</li>
                <li>• 確認 LINE Channel 狀態正常</li>
              </ul>
            </li>
          </ol>
        </div>
      </div>
    </div>
  )
}
