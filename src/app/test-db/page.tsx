'use client'

import { useState, useEffect } from 'react'
import { useLiff } from '@/hooks/useLiff'
import { CheckCircle, XCircle, Database, User, AlertCircle } from 'lucide-react'

export default function TestDBPage() {
  const { isLoggedIn, profile } = useLiff()
  const [dbStatus, setDbStatus] = useState<'testing' | 'success' | 'error' | null>(null)
  const [dbError, setDbError] = useState<string | null>(null)
  const [userInDb, setUserInDb] = useState<any>(null)

  const testDatabase = async () => {
    if (!profile) return

    setDbStatus('testing')
    setDbError(null)

    try {
      const response = await fetch('/api/auth/liff-sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ profile }),
      })

      const data = await response.json()

      if (response.ok) {
        setDbStatus('success')
        setUserInDb(data.user)
      } else {
        setDbStatus('error')
        setDbError(data.error || '未知錯誤')
      }
    } catch (error) {
      setDbStatus('error')
      setDbError(error instanceof Error ? error.message : '網路錯誤')
    }
  }

  useEffect(() => {
    if (isLoggedIn && profile) {
      testDatabase()
    }
  }, [isLoggedIn, profile])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 to-purple-100 p-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="flex items-center space-x-3 mb-6">
            <Database className="w-8 h-8 text-blue-500" />
            <h1 className="text-2xl font-bold text-gray-800">資料庫連接測試</h1>
          </div>

          {/* LIFF 狀態 */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h2 className="font-semibold text-gray-800 mb-3">LIFF 登入狀態</h2>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span>登入狀態:</span>
                {isLoggedIn ? (
                  <div className="flex items-center space-x-1 text-green-600">
                    <CheckCircle className="w-4 h-4" />
                    <span>已登入</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-1 text-red-600">
                    <XCircle className="w-4 h-4" />
                    <span>未登入</span>
                  </div>
                )}
              </div>
              
              {profile && (
                <div className="flex items-center space-x-2">
                  <User className="w-4 h-4 text-gray-500" />
                  <span className="text-sm">{profile.displayName} ({profile.userId})</span>
                </div>
              )}
            </div>
          </div>

          {/* 資料庫測試結果 */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h2 className="font-semibold text-gray-800 mb-3">資料庫同步測試</h2>
            
            {dbStatus === 'testing' && (
              <div className="flex items-center space-x-2 text-blue-600">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                <span>測試資料庫連接中...</span>
              </div>
            )}

            {dbStatus === 'success' && (
              <div className="space-y-3">
                <div className="flex items-center space-x-2 text-green-600">
                  <CheckCircle className="w-5 h-5" />
                  <span className="font-medium">資料庫連接成功！</span>
                </div>
                
                {userInDb && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <h3 className="font-medium text-green-800 mb-2">用戶資料已同步</h3>
                    <div className="text-sm text-green-700 space-y-1">
                      <div><strong>Line ID:</strong> {userInDb.line_id}</div>
                      <div><strong>顯示名稱:</strong> {userInDb.display_name}</div>
                      <div><strong>總分:</strong> {userInDb.total_score}</div>
                      <div><strong>創建時間:</strong> {new Date(userInDb.created_at).toLocaleString('zh-TW')}</div>
                      <div><strong>是否為新用戶:</strong> {userInDb.isNewUser ? '是' : '否'}</div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {dbStatus === 'error' && (
              <div className="space-y-3">
                <div className="flex items-center space-x-2 text-red-600">
                  <XCircle className="w-5 h-5" />
                  <span className="font-medium">資料庫連接失敗</span>
                </div>
                
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <h3 className="font-medium text-red-800 mb-2">錯誤詳情</h3>
                  <p className="text-sm text-red-700">{dbError}</p>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <div className="flex items-start space-x-2">
                    <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5" />
                    <div className="text-sm text-yellow-800">
                      <p className="font-medium mb-1">可能的解決方案：</p>
                      <ul className="list-disc list-inside space-y-1">
                        <li>檢查 Supabase 環境變數是否正確設置</li>
                        <li>確認資料庫表格是否已建立</li>
                        <li>檢查 Supabase 專案是否正常運行</li>
                        <li>確認網路連接正常</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 重新測試按鈕 */}
          {isLoggedIn && profile && (
            <div className="text-center">
              <button
                onClick={testDatabase}
                disabled={dbStatus === 'testing'}
                className="bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white px-6 py-2 rounded-lg transition-colors"
              >
                {dbStatus === 'testing' ? '測試中...' : '重新測試'}
              </button>
            </div>
          )}

          {!isLoggedIn && (
            <div className="text-center py-8">
              <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">請先通過 LIFF 登入才能測試資料庫連接</p>
              <a 
                href="/"
                className="inline-block mt-4 bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-lg transition-colors"
              >
                回到首頁登入
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
