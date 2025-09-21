'use client'

import { useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createSupabaseBrowser } from '@/lib/supabase'
import { Heart, Loader2 } from 'lucide-react'

function LineAuthContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createSupabaseBrowser()

  useEffect(() => {
    const handleLineAuth = async () => {
      const code = searchParams.get('code')
      const state = searchParams.get('state')
      const error = searchParams.get('error')

      if (error) {
        console.error('Line auth error:', error)
        router.push('/?error=auth_failed')
        return
      }

      if (code && state) {
        try {
          // 這裡應該實作 Line Login 的 token 交換邏輯
          // 暫時模擬登入成功
          console.log('Line auth code:', code)
          
          // 模擬用戶資料
          const mockUser = {
            line_id: `line_${Date.now()}`,
            display_name: '測試用戶',
            avatar_url: 'https://via.placeholder.com/150',
          }

          // 在實際實作中，這裡應該：
          // 1. 用 code 向 Line API 交換 access token
          // 2. 用 access token 獲取用戶資料
          // 3. 在 Supabase 中創建或更新用戶
          // 4. 設定 Supabase 認證 session

          router.push('/')
        } catch (error) {
          console.error('Error during Line auth:', error)
          router.push('/?error=auth_failed')
        }
      } else {
        // 重導向到 Line Login
        redirectToLineLogin()
      }
    }

    handleLineAuth()
  }, [searchParams, router, supabase])

  const redirectToLineLogin = () => {
    const lineLoginUrl = 'https://access.line.me/oauth2/v2.1/authorize'
    const clientId = process.env.NEXT_PUBLIC_LINE_LOGIN_CHANNEL_ID
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/auth/line`
    const state = Math.random().toString(36).substring(7)
    const scope = 'profile openid'

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: clientId || '',
      redirect_uri: redirectUri,
      state,
      scope,
    })

    window.location.href = `${lineLoginUrl}?${params.toString()}`
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-100 to-purple-100">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md mx-auto text-center">
        <Heart className="w-16 h-16 text-pink-500 mx-auto mb-6" />
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Line 登入中</h2>
        <div className="flex items-center justify-center space-x-2 text-gray-600">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>正在處理登入...</span>
        </div>
        <p className="text-sm text-gray-500 mt-4">
          如果長時間沒有反應，請重新整理頁面
        </p>
      </div>
    </div>
  )
}

export default function LineAuthPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-100 to-purple-100">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md mx-auto text-center">
          <Heart className="w-16 h-16 text-pink-500 mx-auto mb-6" />
          <h2 className="text-2xl font-bold text-gray-800 mb-4">載入中</h2>
          <div className="flex items-center justify-center space-x-2 text-gray-600">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>正在載入...</span>
          </div>
        </div>
      </div>
    }>
      <LineAuthContent />
    </Suspense>
  )
}
