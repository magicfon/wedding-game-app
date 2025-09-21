'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useLiff } from '@/hooks/useLiff'
import { Shield, CheckCircle, XCircle, Loader2, Home } from 'lucide-react'

export default function TestDashboardPage() {
  const { isLoggedIn, profile, isAdmin, adminInfo, loading: liffLoading, adminLoading } = useLiff()
  const router = useRouter()
  const [debugInfo, setDebugInfo] = useState<string[]>([])

  const addDebugInfo = (message: string) => {
    setDebugInfo(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`])
  }

  useEffect(() => {
    addDebugInfo(`LIFF Loading: ${liffLoading}, Admin Loading: ${adminLoading}`)
    addDebugInfo(`Is Logged In: ${isLoggedIn}, Is Admin: ${isAdmin}`)
    addDebugInfo(`Profile: ${profile ? profile.displayName : 'null'}`)
    addDebugInfo(`Admin Info: ${adminInfo ? adminInfo.displayName : 'null'}`)
  }, [liffLoading, adminLoading, isLoggedIn, isAdmin, profile, adminInfo])

  const isStillLoading = liffLoading || adminLoading

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-4 flex items-center">
            <Shield className="w-6 h-6 text-blue-500 mr-2" />
            管理員控制台測試頁面
          </h1>

          {/* 狀態顯示 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-700 mb-2">LIFF 狀態</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span>載入中:</span>
                  <span className={liffLoading ? 'text-yellow-600' : 'text-green-600'}>
                    {liffLoading ? '是' : '否'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>已登入:</span>
                  <span className={isLoggedIn ? 'text-green-600' : 'text-red-600'}>
                    {isLoggedIn ? '是' : '否'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>用戶名:</span>
                  <span className="text-gray-600">{profile?.displayName || '無'}</span>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-700 mb-2">管理員狀態</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span>檢查中:</span>
                  <span className={adminLoading ? 'text-yellow-600' : 'text-green-600'}>
                    {adminLoading ? '是' : '否'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>是管理員:</span>
                  <span className={isAdmin ? 'text-green-600' : 'text-red-600'}>
                    {isAdmin ? '是' : '否'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>管理員名:</span>
                  <span className="text-gray-600">{adminInfo?.displayName || '無'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* 載入狀態 */}
          {isStillLoading && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-center">
                <Loader2 className="w-5 h-5 animate-spin text-blue-500 mr-2" />
                <span className="text-blue-700">正在載入管理員資料...</span>
              </div>
            </div>
          )}

          {/* 結果顯示 */}
          {!isStillLoading && (
            <div className="mb-6">
              {!isLoggedIn ? (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <XCircle className="w-5 h-5 text-red-500 mr-2" />
                    <span className="text-red-700">未登入 - 需要先登入 Line</span>
                  </div>
                </div>
              ) : !isAdmin ? (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <XCircle className="w-5 h-5 text-yellow-500 mr-2" />
                    <span className="text-yellow-700">無管理員權限</span>
                  </div>
                </div>
              ) : (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                    <span className="text-green-700">
                      管理員驗證成功 - 歡迎 {adminInfo?.displayName}！
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 操作按鈕 */}
          <div className="flex space-x-4">
            <button
              onClick={() => router.push('/')}
              className="flex items-center px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors"
            >
              <Home className="w-4 h-4 mr-2" />
              返回首頁
            </button>

            {!isStillLoading && isAdmin && (
              <button
                onClick={() => router.push('/admin/dashboard')}
                className="flex items-center px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
              >
                <Shield className="w-4 h-4 mr-2" />
                前往真正的控制台
              </button>
            )}
          </div>

          {/* 調試信息 */}
          <div className="mt-6">
            <h3 className="font-semibold text-gray-700 mb-2">調試信息</h3>
            <div className="bg-gray-900 text-green-400 p-4 rounded-lg text-sm font-mono max-h-64 overflow-y-auto">
              {debugInfo.map((info, index) => (
                <div key={index}>{info}</div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
