'use client'

import { useLiff } from '@/hooks/useLiff'
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react'

export default function SimpleUserStatus() {
  const { isReady, isInLiff, isLoggedIn, profile, loading } = useLiff()

  if (loading) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
          <span className="text-sm text-blue-700">檢查登入狀態中...</span>
        </div>
      </div>
    )
  }

  if (!isReady) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
        <div className="flex items-center space-x-2">
          <XCircle className="w-4 h-4 text-red-500" />
          <span className="text-sm text-red-700">LIFF 初始化失敗</span>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 mb-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {isLoggedIn ? (
            <>
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span className="text-sm text-green-700">
                已登入 {profile?.displayName && `- ${profile.displayName}`}
              </span>
            </>
          ) : (
            <>
              <XCircle className="w-4 h-4 text-red-500" />
              <span className="text-sm text-red-700">未登入</span>
            </>
          )}
        </div>
        
        <div className="flex items-center space-x-1">
          {isInLiff ? (
            <>
              <CheckCircle className="w-3 h-3 text-green-500" />
              <span className="text-xs text-green-600">Line內</span>
            </>
          ) : (
            <>
              <AlertCircle className="w-3 h-3 text-orange-500" />
              <span className="text-xs text-orange-600">外部</span>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
