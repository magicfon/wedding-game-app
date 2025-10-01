'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useLiff } from '@/hooks/useLiff'
import { Shield } from 'lucide-react'

export default function AdminRedirectPage() {
  const router = useRouter()
  const { isLoggedIn, profile, isAdmin, loading: liffLoading, adminLoading } = useLiff()

  useEffect(() => {
    // 等待 LIFF 載入完成
    if (liffLoading || adminLoading) {
      return
    }

    // 如果未登入，跳轉首頁
    if (!isLoggedIn || !profile?.userId) {
      router.push('/')
      return
    }

    // 如果是管理員，直接跳轉到 dashboard
    if (isAdmin) {
      router.push('/admin/dashboard')
      return
    }

    // 不是管理員，跳轉回首頁
    router.push('/')
  }, [isLoggedIn, profile, isAdmin, liffLoading, adminLoading, router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 to-purple-100">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md text-center">
        <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
          <Shield className="w-8 h-8 text-white" />
        </div>
        
        <h1 className="text-2xl font-bold text-gray-800 mb-2">管理員認證</h1>
        <p className="text-gray-600 mb-8">正在驗證您的管理員權限...</p>
        
        <div className="flex items-center justify-center space-x-2 mb-6">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
          <span className="text-gray-600">請稍候</span>
        </div>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            💡 使用 LINE 帳號自動認證，快速又安全！
          </p>
        </div>
      </div>
    </div>
  )
}