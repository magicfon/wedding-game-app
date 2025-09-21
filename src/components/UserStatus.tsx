'use client'

import { useLiff } from '@/hooks/useLiff'
import { User, CheckCircle, XCircle, Smartphone, Globe, Info } from 'lucide-react'

export default function UserStatus() {
  const { isReady, isInLiff, isLoggedIn, profile, error, loading } = useLiff()

  if (loading) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
          <span className="text-blue-700">正在檢查登入狀態...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
        <div className="flex items-center space-x-2">
          <XCircle className="w-5 h-5 text-red-500" />
          <span className="text-red-700">LIFF 錯誤: {error}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6 shadow-sm">
      <div className="flex items-center space-x-2 mb-3">
        <Info className="w-5 h-5 text-blue-500" />
        <h3 className="font-semibold text-gray-800">登入狀態</h3>
      </div>

      <div className="space-y-2 text-sm">
        {/* LIFF 就緒狀態 */}
        <div className="flex items-center justify-between">
          <span className="text-gray-600">LIFF 就緒:</span>
          <div className="flex items-center space-x-1">
            {isReady ? (
              <>
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-green-600">是</span>
              </>
            ) : (
              <>
                <XCircle className="w-4 h-4 text-red-500" />
                <span className="text-red-600">否</span>
              </>
            )}
          </div>
        </div>

        {/* 是否在 Line 中 */}
        <div className="flex items-center justify-between">
          <span className="text-gray-600">Line 內建瀏覽器:</span>
          <div className="flex items-center space-x-1">
            {isInLiff ? (
              <>
                <Smartphone className="w-4 h-4 text-green-500" />
                <span className="text-green-600">是</span>
              </>
            ) : (
              <>
                <Globe className="w-4 h-4 text-orange-500" />
                <span className="text-orange-600">否 (外部瀏覽器)</span>
              </>
            )}
          </div>
        </div>

        {/* 登入狀態 */}
        <div className="flex items-center justify-between">
          <span className="text-gray-600">登入狀態:</span>
          <div className="flex items-center space-x-1">
            {isLoggedIn ? (
              <>
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-green-600">已登入</span>
              </>
            ) : (
              <>
                <XCircle className="w-4 h-4 text-red-500" />
                <span className="text-red-600">未登入</span>
              </>
            )}
          </div>
        </div>

        {/* 用戶資料 */}
        {profile && (
          <div className="border-t pt-3 mt-3">
            <div className="flex items-center space-x-3">
              <User className="w-8 h-8 text-gray-400" />
              <div>
                <p className="font-medium text-gray-800">{profile.displayName}</p>
                <p className="text-xs text-gray-500">ID: {profile.userId}</p>
              </div>
            </div>
            {profile.pictureUrl && (
              <div className="mt-2">
                <img 
                  src={profile.pictureUrl} 
                  alt="Profile" 
                  className="w-12 h-12 rounded-full"
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* 調試信息 */}
      <details className="mt-4">
        <summary className="cursor-pointer text-xs text-gray-500 hover:text-gray-700">
          顯示調試信息
        </summary>
        <div className="mt-2 p-3 bg-gray-50 rounded text-xs font-mono">
          <pre>{JSON.stringify({
            isReady,
            isInLiff,
            isLoggedIn,
            hasProfile: !!profile,
            profileData: profile ? {
              userId: profile.userId,
              displayName: profile.displayName,
              hasPicture: !!profile.pictureUrl
            } : null,
            userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'N/A'
          }, null, 2)}</pre>
        </div>
      </details>
    </div>
  )
}
