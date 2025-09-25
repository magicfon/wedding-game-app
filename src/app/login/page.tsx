'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useLiff } from '@/hooks/useLiff'
import { Heart, Loader2, LogIn } from 'lucide-react'

function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { isLoggedIn, profile, loading } = useLiff()
  const [redirectPath, setRedirectPath] = useState<string>('/')

  useEffect(() => {
    // 獲取重定向路徑
    const redirect = searchParams.get('redirect')
    if (redirect) {
      setRedirectPath(`/${redirect}`)
    }
  }, [searchParams])

  useEffect(() => {
    // 如果已經登入，直接重定向
    if (!loading && isLoggedIn && profile) {
      console.log('User already logged in, redirecting to:', redirectPath)
      router.push(redirectPath)
    }
  }, [loading, isLoggedIn, profile, redirectPath, router])

  // LINE Login 處理
  const handleLineLogin = () => {
    const lineLoginUrl = 'https://access.line.me/oauth2/v2.1/authorize'
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: process.env.NEXT_PUBLIC_LINE_LOGIN_CHANNEL_ID || '',
      redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/auth/line`,
      state: redirectPath, // 將重定向路徑作為 state 參數
      scope: 'profile openid',
    })

    const loginUrl = `${lineLoginUrl}?${params.toString()}`
    window.location.href = loginUrl
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-100 via-purple-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="w-12 h-12 mx-auto mb-4 text-purple-600 animate-spin" />
          <h2 className="text-xl font-semibold text-gray-800 mb-2">載入中...</h2>
          <p className="text-gray-600">正在檢查登入狀態</p>
        </div>
      </div>
    )
  }

  if (isLoggedIn && profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-100 via-purple-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="w-12 h-12 mx-auto mb-4 text-green-600 animate-spin" />
          <h2 className="text-xl font-semibold text-gray-800 mb-2">登入成功！</h2>
          <p className="text-gray-600">正在跳轉到目標頁面...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-100 via-purple-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        
        {/* 主卡片 */}
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
          
          {/* 標題和圖示 */}
          <div className="mb-8">
            <div className="w-20 h-20 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Heart className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">
              婚禮互動遊戲
            </h1>
            <p className="text-gray-600">
              歡迎參與我們的婚禮慶典！
            </p>
          </div>

          {/* 功能預覽 */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">精彩活動等著你</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="bg-blue-50 p-3 rounded-lg">
                <div className="text-blue-600 font-medium">🎮 遊戲實況</div>
                <div className="text-gray-600">觀看進行中的遊戲</div>
              </div>
              <div className="bg-green-50 p-3 rounded-lg">
                <div className="text-green-600 font-medium">❓ 快問快答</div>
                <div className="text-gray-600">參與答題競賽</div>
              </div>
              <div className="bg-purple-50 p-3 rounded-lg">
                <div className="text-purple-600 font-medium">📸 照片分享</div>
                <div className="text-gray-600">上傳美好回憶</div>
              </div>
              <div className="bg-orange-50 p-3 rounded-lg">
                <div className="text-orange-600 font-medium">🏆 排行榜</div>
                <div className="text-gray-600">查看積分排名</div>
              </div>
            </div>
          </div>

          {/* 登入按鈕 */}
          <div className="space-y-4">
            <button
              onClick={handleLineLogin}
              className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white py-4 px-6 rounded-xl font-semibold text-lg shadow-lg hover:from-green-600 hover:to-green-700 transition-all duration-200 transform hover:scale-105 flex items-center justify-center space-x-2"
            >
              <LogIn className="w-6 h-6" />
              <span>使用 LINE 登入</span>
            </button>
            
            <p className="text-xs text-gray-500">
              點擊登入即表示您同意使用 LINE 帳號進行身份驗證
            </p>
          </div>

          {/* 重定向提示 */}
          {redirectPath !== '/' && (
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-700">
                登入後將自動跳轉到：
                <span className="font-medium">
                  {redirectPath.replace('/', '') === 'game-live' ? '遊戲實況' :
                   redirectPath.replace('/', '') === 'quiz' ? '快問快答' :
                   redirectPath.replace('/', '') === 'photo-upload' ? '照片上傳' :
                   redirectPath.replace('/', '') === 'photo-wall' ? '照片牆' :
                   redirectPath.replace('/', '') === 'leaderboard' ? '排行榜' :
                   redirectPath.replace('/', '') === 'score-history' ? '積分歷史' :
                   redirectPath}
                </span>
              </p>
            </div>
          )}
        </div>

        {/* 底部說明 */}
        <div className="text-center mt-6 text-sm text-gray-600">
          <p>第一次使用？登入後將自動創建您的遊戲帳號</p>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-pink-100 via-purple-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="w-12 h-12 mx-auto mb-4 text-purple-600 animate-spin" />
          <p className="text-gray-600">載入中...</p>
        </div>
      </div>
    }>
      <LoginContent />
    </Suspense>
  )
}
