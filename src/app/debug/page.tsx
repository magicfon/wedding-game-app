'use client'

import { useState, useEffect } from 'react'
import { CheckCircle, XCircle, AlertTriangle, RefreshCw } from 'lucide-react'

interface EnvStatus {
  NEXT_PUBLIC_SUPABASE_URL: boolean
  NEXT_PUBLIC_SUPABASE_ANON_KEY: boolean
  SUPABASE_SERVICE_ROLE_KEY: boolean
  supabaseUrlPrefix: string
  keyLength: number
  NODE_ENV: string
  VERCEL_ENV: string
  allEnvVarsSet: boolean
}

interface DbTestResult {
  success: boolean
  error?: string
  details?: string
  hint?: string
  data?: {
    usersCount: number
    sampleUsers: Array<{
      line_id: string
      display_name: string
      created_at: string
    }>
  }
}

export default function DebugPage() {
  const [envStatus, setEnvStatus] = useState<EnvStatus | null>(null)
  const [dbStatus, setDbStatus] = useState<DbTestResult | null>(null)
  const [loading, setLoading] = useState(false)

  const checkEnvironment = async () => {
    try {
      const response = await fetch('/api/debug/env')
      const data = await response.json()
      setEnvStatus(data.status)
    } catch (error) {
      console.error('Error checking environment:', error)
    }
  }

  const testDatabase = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/debug/db-test')
      const data = await response.json()
      setDbStatus(data)
    } catch (error) {
      setDbStatus({
        success: false,
        error: 'Network error',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    checkEnvironment()
    testDatabase()
  }, [])

  const StatusIcon = ({ status }: { status: boolean }) => (
    status ? (
      <CheckCircle className="w-5 h-5 text-green-500" />
    ) : (
      <XCircle className="w-5 h-5 text-red-500" />
    )
  )

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-6">系統診斷</h1>

          {/* 環境變數狀態 */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-700 mb-4">環境變數狀態</h2>
            {envStatus ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span>NEXT_PUBLIC_SUPABASE_URL</span>
                  <div className="flex items-center space-x-2">
                    <StatusIcon status={envStatus.NEXT_PUBLIC_SUPABASE_URL} />
                    <span className="text-sm text-gray-600">
                      {envStatus.supabaseUrlPrefix}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span>NEXT_PUBLIC_SUPABASE_ANON_KEY</span>
                  <div className="flex items-center space-x-2">
                    <StatusIcon status={envStatus.NEXT_PUBLIC_SUPABASE_ANON_KEY} />
                    <span className="text-sm text-gray-600">
                      長度: {envStatus.keyLength}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span>整體狀態</span>
                  <div className="flex items-center space-x-2">
                    <StatusIcon status={envStatus.allEnvVarsSet} />
                    <span className="text-sm text-gray-600">
                      {envStatus.allEnvVarsSet ? '已配置' : '未完整配置'}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                <p className="text-gray-600 mt-2">檢查環境變數中...</p>
              </div>
            )}
          </div>

          {/* 資料庫連接狀態 */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-700">資料庫連接狀態</h2>
              <button
                onClick={testDatabase}
                disabled={loading}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                <span>重新測試</span>
              </button>
            </div>

            {dbStatus ? (
              <div className="space-y-4">
                <div className={`p-4 rounded-lg ${
                  dbStatus.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                }`}>
                  <div className="flex items-center space-x-2 mb-2">
                    {dbStatus.success ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-500" />
                    )}
                    <span className={`font-medium ${
                      dbStatus.success ? 'text-green-800' : 'text-red-800'
                    }`}>
                      {dbStatus.success ? '資料庫連接成功' : '資料庫連接失敗'}
                    </span>
                  </div>

                  {dbStatus.error && (
                    <div className="mb-2">
                      <p className="text-sm font-medium text-red-700">錯誤:</p>
                      <p className="text-sm text-red-600">{dbStatus.error}</p>
                    </div>
                  )}

                  {dbStatus.details && (
                    <div className="mb-2">
                      <p className="text-sm font-medium text-red-700">詳情:</p>
                      <p className="text-sm text-red-600">{dbStatus.details}</p>
                    </div>
                  )}

                  {dbStatus.hint && (
                    <div className="flex items-start space-x-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                      <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-yellow-800">建議:</p>
                        <p className="text-sm text-yellow-700">{dbStatus.hint}</p>
                      </div>
                    </div>
                  )}

                  {dbStatus.success && dbStatus.data && (
                    <div className="mt-4">
                      <p className="text-sm font-medium text-green-700 mb-2">
                        資料庫中的用戶: {dbStatus.data.usersCount} 個
                      </p>
                      {dbStatus.data.sampleUsers.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-sm text-green-600">範例用戶:</p>
                          {dbStatus.data.sampleUsers.map((user, index) => (
                            <div key={index} className="text-xs bg-green-100 p-2 rounded">
                              <p><strong>名稱:</strong> {user.display_name}</p>
                              <p><strong>Line ID:</strong> {user.line_id}</p>
                              <p><strong>註冊時間:</strong> {new Date(user.created_at).toLocaleString()}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                <p className="text-gray-600 mt-2">測試資料庫連接中...</p>
              </div>
            )}
          </div>

          {/* 設置指南 */}
          {envStatus && !envStatus.allEnvVarsSet && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-lg font-medium text-blue-800 mb-2">設置步驟</h3>
              <ol className="list-decimal list-inside space-y-1 text-sm text-blue-700">
                <li>前往 <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="underline">Supabase</a> 創建項目</li>
                <li>在 Supabase 項目設置中找到 API 設定</li>
                <li>複製 Project URL 和 anon public key</li>
                <li>在 Vercel 項目設置中添加環境變數：
                  <ul className="list-disc list-inside ml-4 mt-1">
                    <li>NEXT_PUBLIC_SUPABASE_URL</li>
                    <li>NEXT_PUBLIC_SUPABASE_ANON_KEY</li>
                  </ul>
                </li>
                <li>在 Supabase SQL Editor 中執行 database/setup.sql</li>
                <li>重新部署 Vercel 項目</li>
              </ol>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
