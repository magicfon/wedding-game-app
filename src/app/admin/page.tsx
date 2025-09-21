'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Shield, ArrowRight } from 'lucide-react'

export default function AdminRedirectPage() {
  const router = useRouter()

  useEffect(() => {
    // 自動重定向到 Line 認證頁面
    const timer = setTimeout(() => {
      router.push('/admin/line-auth')
    }, 2000)

    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 to-purple-100">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md text-center">
        <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-6">
          <Shield className="w-8 h-8 text-white" />
        </div>
        
        <h1 className="text-2xl font-bold text-gray-800 mb-2">管理員認證</h1>
        <p className="text-gray-600 mb-8">正在跳轉到 Line 認證頁面...</p>
        
        <div className="flex items-center justify-center space-x-2 mb-6">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
          <span className="text-gray-600">請稍候</span>
        </div>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-blue-800">
            💡 現在使用 Line 帳號進行管理員認證，無需記憶密碼！
          </p>
        </div>
        
        <button
          onClick={() => router.push('/admin/line-auth')}
          className="flex items-center justify-center space-x-2 w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors mb-4"
        >
          <span>立即前往</span>
          <ArrowRight className="w-4 h-4" />
        </button>
        
        <div className="text-center">
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