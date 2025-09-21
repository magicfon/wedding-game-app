'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowser } from '@/lib/supabase'
import { useLiff } from '@/hooks/useLiff'
import UserStatus from '@/components/UserStatus'
import { Heart, Users, Trophy, Camera, HelpCircle, Play } from 'lucide-react'

export default function Home() {
  const [user, setUser] = useState<{
    id: string
    user_metadata?: {
      full_name?: string
      avatar_url?: string
    }
  } | null>(null)
  const router = useRouter()
  const supabase = createSupabaseBrowser()
  const { isReady, isInLiff, isLoggedIn, profile, login, loading: liffLoading } = useLiff()

  useEffect(() => {
    const getUser = async () => {
      // 優先使用 LIFF 用戶資料
      if (isReady && isLoggedIn && profile) {
        setUser({
          id: profile.userId,
          user_metadata: {
            full_name: profile.displayName,
            avatar_url: profile.pictureUrl
          }
        })
      } else {
        // 回退到 Supabase 認證
        const { data: { user } } = await supabase.auth.getUser()
        setUser(user)
      }
    }

    if (isReady) {
      getUser()
    }
  }, [isReady, isLoggedIn, profile, supabase.auth])

  const menuItems = [
    {
      title: '🎮 遊戲實況',
      description: '觀看正在進行的遊戲',
      href: '/game-live',
      icon: Play,
      color: 'bg-blue-500'
    },
    {
      title: '❓ 快問快答',
      description: '參與答題競賽',
      href: '/quiz',
      icon: HelpCircle,
      color: 'bg-green-500'
    },
    {
      title: '📸 照片上傳',
      description: '上傳美好回憶',
      href: '/photo-upload',
      icon: Camera,
      color: 'bg-purple-500'
    },
    {
      title: '🖼️ 照片牆',
      description: '瀏覽和投票',
      href: '/photo-wall',
      icon: Heart,
      color: 'bg-pink-500'
    },
    {
      title: '❤️ 快門傳情',
      description: '輪播觀看照片',
      href: '/photo-slideshow',
      icon: Heart,
      color: 'bg-red-500'
    },
    {
      title: '🏆 排行榜',
      description: '查看積分排名',
      href: '/leaderboard',
      icon: Trophy,
      color: 'bg-yellow-500'
    }
  ]

  if (liffLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-100 to-purple-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500 mx-auto mb-4"></div>
          <p className="text-gray-600">載入中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-100 via-purple-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-pink-200">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full flex items-center justify-center">
                <Heart className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-800">婚禮互動遊戲</h1>
                <p className="text-sm text-gray-600">讓愛更加精彩</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Users className="w-5 h-5 text-gray-600" />
              <span className="text-sm text-gray-600">在線賓客</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* 用戶狀態顯示 */}
        <UserStatus />
        
        {!user ? (
          <div className="text-center py-16">
            <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md mx-auto">
              <Heart className="w-16 h-16 text-pink-500 mx-auto mb-6" />
              <h2 className="text-2xl font-bold text-gray-800 mb-4">歡迎參加婚禮</h2>
              <p className="text-gray-600 mb-6">請透過 Line 登入來參與互動遊戲</p>
              {isInLiff ? (
                <button
                  onClick={login}
                  className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
                >
                  Line 登入
                </button>
              ) : (
                <button
                  onClick={() => router.push('/auth/line')}
                  className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
                >
                  Line 登入
                </button>
              )}
            </div>
          </div>
        ) : (
          <div>
            {/* Welcome Section */}
            <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
              <div className="flex items-center space-x-4">
                <img
                  src={user.user_metadata?.avatar_url || '/default-avatar.png'}
                  alt="Avatar"
                  className="w-12 h-12 rounded-full"
                />
                <div>
                  <h2 className="text-xl font-semibold text-gray-800">
                    歡迎，{user.user_metadata?.full_name || '賓客'}！
                  </h2>
                  <p className="text-gray-600">準備好參與精彩的婚禮遊戲了嗎？</p>
                </div>
              </div>
            </div>

            {/* Menu Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {menuItems.map((item, index) => (
                <div
                  key={index}
                  onClick={() => router.push(item.href)}
                  className="bg-white rounded-2xl shadow-lg p-6 cursor-pointer transform transition-all duration-200 hover:scale-105 hover:shadow-xl"
                >
                  <div className="flex items-center space-x-4 mb-4">
                    <div className={`w-12 h-12 ${item.color} rounded-xl flex items-center justify-center`}>
                      <item.icon className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800">{item.title}</h3>
                      <p className="text-sm text-gray-600">{item.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

                    {/* Admin Access */}
                    <div className="mt-8 text-center">
                      <button
                        onClick={() => router.push('/admin/line-auth')}
                        className="text-sm text-blue-600 hover:text-blue-700 underline font-medium"
                      >
                        管理員入口
                      </button>
                    </div>
          </div>
        )}
      </main>
    </div>
  )
}