'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useLiff } from '@/hooks/useLiff'
import { 
  Shield, 
  CheckCircle, 
  XCircle, 
  Loader2, 
  User, 
  ArrowRight,
  AlertTriangle
} from 'lucide-react'

interface AdminInfo {
  lineId: string
  displayName: string
}

export default function AdminLineAuthPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [adminInfo, setAdminInfo] = useState<AdminInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const { isReady, isLoggedIn, profile, login } = useLiff()
  const router = useRouter()

  // 檢查管理員身份
  const checkAdminStatus = async (lineId: string) => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/check-line-admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ lineId }),
      })

      const data = await response.json()
      
      if (data.isAdmin) {
        setIsAuthenticated(true)
        setAdminInfo(data.adminInfo)
        
        // 儲存管理員狀態
        localStorage.setItem('admin_line_id', lineId)
        localStorage.setItem('admin_info', JSON.stringify(data.adminInfo))
        
        // 3 秒後自動跳轉到管理後台
        setTimeout(() => {
          router.push('/admin/dashboard')
        }, 3000)
      } else {
        setError('您的 Line 帳號沒有管理員權限')
      }
    } catch (error) {
      setError('檢查權限時發生錯誤')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isReady && isLoggedIn && profile?.userId) {
      checkAdminStatus(profile.userId)
    } else if (isReady && !isLoggedIn) {
      setLoading(false)
    }
  }, [isReady, isLoggedIn, profile])

  const handleManualRedirect = () => {
    router.push('/admin/dashboard')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 to-purple-100 p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800">管理員認證</h1>
          <p className="text-gray-600 mt-2">使用 Line 帳號進行管理員認證</p>
        </div>

        {loading && (
          <div className="text-center py-8">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-500" />
            <p className="text-gray-600">
              {!isReady ? '初始化 LIFF...' : 
               !isLoggedIn ? '等待登入...' : 
               '檢查管理員權限...'}
            </p>
          </div>
        )}

        {!loading && !isLoggedIn && (
          <div className="text-center py-8">
            <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-800 mb-2">需要 Line 登入</h3>
            <p className="text-gray-600 mb-6">請先登入您的 Line 帳號以驗證管理員身份</p>
            <button
              onClick={login}
              className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
            >
              Line 登入
            </button>
          </div>
        )}

        {!loading && isLoggedIn && !isAuthenticated && error && (
          <div className="text-center py-8">
            <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-800 mb-2">權限不足</h3>
            <p className="text-red-600 mb-6">{error}</p>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-yellow-800">
                <strong>您的 Line ID:</strong> {profile?.userId}
              </p>
              <p className="text-sm text-yellow-700 mt-2">
                請聯繫系統管理員將此 Line ID 添加到管理員列表中
              </p>
            </div>
            <button
              onClick={() => router.push('/')}
              className="w-full bg-gray-500 hover:bg-gray-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
            >
              返回首頁
            </button>
          </div>
        )}

        {!loading && isAuthenticated && adminInfo && (
          <div className="text-center py-8">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-800 mb-2">認證成功！</h3>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-center space-x-2 mb-2">
                <User className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-green-800">
                  {adminInfo.displayName || '管理員'}
                </span>
              </div>
              <p className="text-xs text-green-600">
                Line ID: {adminInfo.lineId}
              </p>
            </div>
            <p className="text-gray-600 mb-6">正在跳轉到管理後台...</p>
            <button
              onClick={handleManualRedirect}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2"
            >
              <span>立即進入管理後台</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {isLoggedIn && profile && (
          <div className="mt-8 pt-6 border-t border-gray-200">
            <div className="text-center">
              <p className="text-xs text-gray-500 mb-2">當前登入帳號</p>
              <div className="flex items-center justify-center space-x-2">
                {profile.pictureUrl && (
                  <img 
                    src={profile.pictureUrl} 
                    alt="Avatar" 
                    className="w-6 h-6 rounded-full"
                  />
                )}
                <span className="text-sm text-gray-700">{profile.displayName}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
