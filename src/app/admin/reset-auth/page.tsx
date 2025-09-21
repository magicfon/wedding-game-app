'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw, CheckCircle, Trash2 } from 'lucide-react'

export default function ResetAuthPage() {
  const [cleared, setCleared] = useState(false)
  const router = useRouter()

  const clearAllAuth = () => {
    // 清除所有管理員相關的存儲
    localStorage.removeItem('admin_line_id')
    localStorage.removeItem('admin_info')
    localStorage.removeItem('admin_verified')
    localStorage.removeItem('admin_verified_time')
    sessionStorage.removeItem('admin_authenticating')
    
    setCleared(true)
    
    // 3 秒後跳轉
    setTimeout(() => {
      router.push('/admin/line-auth')
    }, 3000)
  }

  useEffect(() => {
    clearAllAuth()
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-100 to-pink-100">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md text-center">
        <div className="w-16 h-16 bg-gradient-to-r from-red-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-6">
          <RefreshCw className="w-8 h-8 text-white animate-spin" />
        </div>
        
        <h1 className="text-2xl font-bold text-gray-800 mb-2">重置認證狀態</h1>
        <p className="text-gray-600 mb-8">清除所有管理員認證資料...</p>
        
        {cleared ? (
          <div className="space-y-4">
            <div className="flex items-center justify-center space-x-2 text-green-600">
              <CheckCircle className="w-6 h-6" />
              <span className="font-medium">認證狀態已清除</span>
            </div>
            
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm text-green-800">
                所有本地認證資料已清除，正在跳轉到登入頁面...
              </p>
            </div>
            
            <button
              onClick={() => router.push('/admin/line-auth')}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              立即前往登入
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-center space-x-2">
              <Trash2 className="w-5 h-5 text-red-500" />
              <span className="text-gray-600">正在清除認證資料...</span>
            </div>
            
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                如果遇到重複跳轉問題，此頁面將清除所有本地認證狀態
              </p>
            </div>
          </div>
        )}
        
        <div className="mt-6 text-center">
          <button
            onClick={() => router.push('/')}
            className="text-sm text-gray-500 hover:text-gray-700 underline"
          >
            返回首頁
          </button>
        </div>
      </div>
    </div>
  )
}
