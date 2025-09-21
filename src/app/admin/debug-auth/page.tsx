'use client'

import { useState } from 'react'
import { useLiff } from '@/hooks/useLiff'
import { RefreshCw, CheckCircle, XCircle, AlertTriangle, Eye } from 'lucide-react'

interface DebugStep {
  step: string
  status: 'pending' | 'success' | 'error' | 'info'
  message: string
  data?: unknown
  timestamp: string
}

export default function DebugAuthPage() {
  const [steps, setSteps] = useState<DebugStep[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const { isReady, isInLiff, isLoggedIn, profile, error, loading } = useLiff()

  const addStep = (step: string, status: DebugStep['status'], message: string, data?: unknown) => {
    const newStep: DebugStep = {
      step,
      status,
      message,
      data,
      timestamp: new Date().toLocaleTimeString()
    }
    setSteps(prev => [...prev, newStep])
  }

  const clearSteps = () => {
    setSteps([])
  }

  const testFullFlow = async () => {
    setIsRunning(true)
    clearSteps()

    // 步驟 1: 檢查 LIFF 狀態
    addStep('LIFF_STATUS', 'info', '檢查 LIFF 狀態', {
      isReady,
      isInLiff,
      isLoggedIn,
      loading,
      error
    })

    // 步驟 2: 檢查用戶資料
    if (profile) {
      addStep('USER_PROFILE', 'success', '獲取到用戶資料', profile)
    } else {
      addStep('USER_PROFILE', 'error', '沒有用戶資料')
      setIsRunning(false)
      return
    }

    // 步驟 3: 檢查本地存儲
    const localStorage_data = {
      admin_line_id: localStorage.getItem('admin_line_id'),
      admin_info: localStorage.getItem('admin_info'),
      admin_verified: localStorage.getItem('admin_verified'),
      admin_verified_time: localStorage.getItem('admin_verified_time')
    }
    
    const sessionStorage_data = {
      admin_authenticating: sessionStorage.getItem('admin_authenticating')
    }

    addStep('LOCAL_STORAGE', 'info', '檢查本地存儲', {
      localStorage: localStorage_data,
      sessionStorage: sessionStorage_data
    })

    // 步驟 4: 測試管理員 API
    try {
      addStep('API_CALL', 'pending', '調用管理員檢查 API...')
      
      const response = await fetch('/api/admin/check-line-admin-debug', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ lineId: profile.userId }),
      })

      const responseData = await response.json()
      
      if (response.ok) {
        addStep('API_CALL', 'success', 'API 調用成功', {
          status: response.status,
          data: responseData
        })
        
        if (responseData.isAdmin) {
          addStep('ADMIN_CHECK', 'success', '確認為管理員', responseData.adminInfo)
        } else {
          addStep('ADMIN_CHECK', 'error', '不是管理員')
        }
      } else {
        addStep('API_CALL', 'error', 'API 調用失敗', {
          status: response.status,
          error: responseData
        })
      }
    } catch (error) {
      addStep('API_CALL', 'error', 'API 調用異常', error)
    }

    // 步驟 5: 檢查環境變數
    try {
      const envResponse = await fetch('/api/debug/env')
      const envData = await envResponse.json()
      addStep('ENV_CHECK', 'info', '環境變數檢查', envData)
    } catch (error) {
      addStep('ENV_CHECK', 'error', '環境變數檢查失敗', error)
    }

    // 步驟 6: 檢查資料庫連接
    try {
      const dbResponse = await fetch('/api/debug/db-test')
      const dbData = await dbResponse.json()
      addStep('DB_CHECK', dbData.success ? 'success' : 'error', '資料庫連接檢查', dbData)
    } catch (error) {
      addStep('DB_CHECK', 'error', '資料庫檢查失敗', error)
    }

    setIsRunning(false)
  }

  const clearAllAuth = () => {
    localStorage.removeItem('admin_line_id')
    localStorage.removeItem('admin_info')
    localStorage.removeItem('admin_verified')
    localStorage.removeItem('admin_verified_time')
    sessionStorage.removeItem('admin_authenticating')
    addStep('CLEAR_AUTH', 'success', '已清除所有認證資料')
  }

  const getStatusIcon = (status: DebugStep['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />
      case 'pending':
        return <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />
      case 'info':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />
    }
  }

  const getStatusColor = (status: DebugStep['status']) => {
    switch (status) {
      case 'success':
        return 'border-green-200 bg-green-50'
      case 'error':
        return 'border-red-200 bg-red-50'
      case 'pending':
        return 'border-blue-200 bg-blue-50'
      case 'info':
        return 'border-yellow-200 bg-yellow-50'
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">管理員認證調試工具</h1>
          
          <div className="flex space-x-4 mb-6">
            <button
              onClick={testFullFlow}
              disabled={isRunning}
              className="flex items-center space-x-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg transition-colors"
            >
              <Eye className="w-4 h-4" />
              <span>{isRunning ? '測試中...' : '開始完整測試'}</span>
            </button>
            
            <button
              onClick={clearAllAuth}
              className="flex items-center space-x-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              <span>清除認證資料</span>
            </button>
            
            <button
              onClick={clearSteps}
              className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
            >
              清除日誌
            </button>
          </div>

          {/* 當前狀態概覽 */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-gray-800 mb-2">當前狀態</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-gray-600">LIFF 就緒:</span>
                <span className={`ml-2 ${isReady ? 'text-green-600' : 'text-red-600'}`}>
                  {isReady ? '是' : '否'}
                </span>
              </div>
              <div>
                <span className="text-gray-600">已登入:</span>
                <span className={`ml-2 ${isLoggedIn ? 'text-green-600' : 'text-red-600'}`}>
                  {isLoggedIn ? '是' : '否'}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Line 內建:</span>
                <span className={`ml-2 ${isInLiff ? 'text-blue-600' : 'text-gray-600'}`}>
                  {isInLiff ? '是' : '否'}
                </span>
              </div>
              <div>
                <span className="text-gray-600">載入中:</span>
                <span className={`ml-2 ${loading ? 'text-blue-600' : 'text-gray-600'}`}>
                  {loading ? '是' : '否'}
                </span>
              </div>
            </div>
            
            {profile && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <span className="text-gray-600">用戶:</span>
                <span className="ml-2 font-medium">{profile.displayName}</span>
                <span className="ml-2 text-gray-500 text-xs">({profile.userId})</span>
              </div>
            )}
            
            {error && (
              <div className="mt-3 pt-3 border-t border-red-200">
                <span className="text-red-600">錯誤:</span>
                <span className="ml-2 text-red-600">{error}</span>
              </div>
            )}
          </div>
        </div>

        {/* 測試步驟日誌 */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">測試步驟日誌</h2>
          
          {steps.length === 0 ? (
            <p className="text-gray-500 text-center py-8">點擊 &quot;開始完整測試&quot; 來診斷認證問題</p>
          ) : (
            <div className="space-y-4">
              {steps.map((step, index) => (
                <div
                  key={index}
                  className={`border rounded-lg p-4 ${getStatusColor(step.status)}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(step.status)}
                      <span className="font-medium text-gray-800">{step.step}</span>
                      <span className="text-xs text-gray-500">{step.timestamp}</span>
                    </div>
                  </div>
                  
                  <p className="text-gray-700 mb-2">{step.message}</p>
                  
                  {step.data != null && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-800">
                        查看詳細資料
                      </summary>
                      <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto">
                        {JSON.stringify(step.data, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
