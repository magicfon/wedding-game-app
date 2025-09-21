'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useLiff } from '@/hooks/useLiff'
import { Shield, CheckCircle, XCircle, Loader2, User, ArrowRight } from 'lucide-react'

export default function SimpleAdminAuth() {
  const [step, setStep] = useState<'loading' | 'checking' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')
  const [adminInfo, setAdminInfo] = useState<any>(null)
  const { isReady, isLoggedIn, profile } = useLiff()
  const router = useRouter()

  useEffect(() => {
    console.log('SimpleAdminAuth - Effect triggered', { isReady, isLoggedIn, profile })
    
    if (!isReady) {
      setMessage('初始化 LIFF...')
      return
    }

    if (!isLoggedIn) {
      setMessage('請先登入 Line')
      return
    }

    if (!profile?.userId) {
      setMessage('獲取用戶資料中...')
      return
    }

    // 開始檢查管理員權限
    checkAdmin(profile.userId)
  }, [isReady, isLoggedIn, profile])

  const checkAdmin = async (lineId: string) => {
    console.log('Starting admin check for:', lineId)
    setStep('checking')
    setMessage('檢查管理員權限...')

    try {
      const response = await fetch('/api/admin/check-line-admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ lineId }),
      })

      console.log('Admin check response status:', response.status)
      const data = await response.json()
      console.log('Admin check response data:', data)

      if (response.ok && data.isAdmin) {
        setStep('success')
        setAdminInfo(data.adminInfo)
        setMessage('認證成功！')
        
        // 簡單的跳轉，不使用 localStorage
        console.log('Admin verified, redirecting to dashboard')
        setTimeout(() => {
          router.push('/admin/dashboard')
        }, 2000)
      } else {
        setStep('error')
        setMessage(`權限不足: ${data.error || '您沒有管理員權限'}`)
      }
    } catch (error) {
      console.error('Admin check error:', error)
      setStep('error')
      setMessage('檢查權限時發生錯誤')
    }
  }

  const renderContent = () => {
    switch (step) {
      case 'loading':
        return (
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-blue-500" />
            <p className="text-gray-600">{message}</p>
          </div>
        )

      case 'checking':
        return (
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-blue-500" />
            <p className="text-gray-600">{message}</p>
            {profile && (
              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  檢查用戶: {profile.displayName}
                </p>
                <p className="text-xs text-blue-600">
                  Line ID: {profile.userId}
                </p>
              </div>
            )}
          </div>
        )

      case 'success':
        return (
          <div className="text-center">
            <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-500" />
            <h3 className="text-lg font-semibold text-gray-800 mb-2">認證成功！</h3>
            <p className="text-gray-600 mb-4">{message}</p>
            
            {adminInfo && (
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
            )}
            
            <p className="text-sm text-gray-500 mb-4">正在跳轉到管理控制台...</p>
            
            <button
              onClick={() => router.push('/admin/dashboard')}
              className="flex items-center justify-center space-x-2 w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              <span>立即進入</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )

      case 'error':
        return (
          <div className="text-center">
            <XCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />
            <h3 className="text-lg font-semibold text-gray-800 mb-2">認證失敗</h3>
            <p className="text-red-600 mb-6">{message}</p>
            
            {profile && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-yellow-800 mb-2">
                  <strong>您的資訊:</strong>
                </p>
                <p className="text-sm text-yellow-700">
                  姓名: {profile.displayName}
                </p>
                <p className="text-sm text-yellow-700">
                  Line ID: {profile.userId}
                </p>
                <p className="text-xs text-yellow-600 mt-2">
                  請聯繫系統管理員將此 Line ID 添加到管理員列表中
                </p>
              </div>
            )}
            
            <div className="space-y-3">
              <button
                onClick={() => window.location.reload()}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
              >
                重新嘗試
              </button>
              
              <button
                onClick={() => router.push('/')}
                className="w-full bg-gray-500 hover:bg-gray-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
              >
                返回首頁
              </button>
            </div>
          </div>
        )
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 to-purple-100 p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800">管理員認證</h1>
          <p className="text-gray-600 mt-2">簡化版認證流程</p>
        </div>

        {renderContent()}

        {/* 調試信息 */}
        <details className="mt-8 text-xs text-gray-500">
          <summary className="cursor-pointer hover:text-gray-700">調試信息</summary>
          <pre className="mt-2 p-2 bg-gray-100 rounded overflow-auto">
            {JSON.stringify({ 
              step, 
              isReady, 
              isLoggedIn, 
              profile: profile ? {
                userId: profile.userId,
                displayName: profile.displayName
              } : null
            }, null, 2)}
          </pre>
        </details>
      </div>
    </div>
  )
}
