'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createSupabaseBrowser } from '@/lib/supabase'
import { 
  Menu, 
  X, 
  Home, 
  Play, 
  HelpCircle, 
  Camera, 
  Heart, 
  Trophy, 
  Settings,
  LogOut
} from 'lucide-react'

interface LayoutProps {
  children: React.ReactNode
  title?: string
  showNavigation?: boolean
}

export default function Layout({ children, title, showNavigation = true }: LayoutProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [user, setUser] = useState<{
    id: string
    email?: string
    user_metadata?: {
      full_name?: string
      avatar_url?: string
    }
  } | null>(null)
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createSupabaseBrowser()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    }

    getUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null)
      }
    )

    return () => subscription.unsubscribe()
  }, [supabase.auth])

  const menuItems = [
    { name: '首頁', href: '/', icon: Home },
    { name: '遊戲實況', href: '/game-live', icon: Play },
    { name: '快問快答', href: '/quiz', icon: HelpCircle },
    { name: '照片上傳', href: '/photo-upload', icon: Camera },
    { name: '照片牆', href: '/photo-wall', icon: Heart },
    { name: '快門傳情', href: '/photo-slideshow', icon: Heart },
    { name: '排行榜', href: '/leaderboard', icon: Trophy },
  ]

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-100 via-purple-50 to-indigo-100">
      {/* Header */}
      {showNavigation && (
        <header className="bg-white/80 backdrop-blur-sm border-b border-pink-200 sticky top-0 z-40">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {/* Menu Button - 在所有螢幕尺寸都顯示 */}
                <button
                  onClick={() => setIsMenuOpen(true)}
                  className="p-2 rounded-lg hover:bg-pink-100 transition-colors"
                >
                  <Menu className="w-6 h-6 text-gray-700" />
                </button>
                
                {/* Logo */}
                <div 
                  className="flex items-center space-x-3 cursor-pointer"
                  onClick={() => router.push('/')}
                >
                  <div className="w-10 h-10 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full flex items-center justify-center">
                    <Heart className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold text-gray-800">
                      {title || '婚禮互動遊戲'}
                    </h1>
                    <p className="text-sm text-gray-600">讓愛更加精彩</p>
                  </div>
                </div>
              </div>

              {/* User Info */}
              {user && (
                <div className="flex items-center space-x-3">
                  <img
                    src={user.user_metadata?.avatar_url || '/default-avatar.png'}
                    alt="Avatar"
                    className="w-8 h-8 rounded-full"
                  />
                  <span className="text-sm text-gray-700 hidden sm:block">
                    {user.user_metadata?.full_name || '賓客'}
                  </span>
                </div>
              )}
            </div>
          </div>
        </header>
      )}

      {/* Side Menu Overlay - 在所有螢幕尺寸都可用 */}
      {isMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-50"
          onClick={() => setIsMenuOpen(false)}
        >
          <div 
            className="fixed left-0 top-0 h-full w-80 bg-white shadow-xl transform transition-transform"
            onClick={e => e.stopPropagation()}
          >
            {/* Menu Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full flex items-center justify-center">
                  <Heart className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-lg font-semibold text-gray-800">選單</h2>
              </div>
              <button
                onClick={() => setIsMenuOpen(false)}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X className="w-6 h-6 text-gray-700" />
              </button>
            </div>

            {/* Menu Items */}
            <nav className="p-4 space-y-2">
              {menuItems.map((item) => (
                <button
                  key={item.href}
                  onClick={() => {
                    router.push(item.href)
                    setIsMenuOpen(false)
                  }}
                  className={`w-full flex items-center space-x-3 p-3 rounded-lg transition-colors text-left ${
                    pathname === item.href
                      ? 'bg-pink-100 text-pink-700'
                      : 'hover:bg-gray-100 text-gray-700'
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  <span>{item.name}</span>
                </button>
              ))}

              {/* Admin Link */}
              <button
                onClick={() => {
                  router.push('/admin')
                  setIsMenuOpen(false)
                }}
                className="w-full flex items-center space-x-3 p-3 rounded-lg transition-colors text-left hover:bg-gray-100 text-gray-700"
              >
                <Settings className="w-5 h-5" />
                <span>管理員</span>
              </button>

              {/* Sign Out */}
              {user && (
                <button
                  onClick={() => {
                    handleSignOut()
                    setIsMenuOpen(false)
                  }}
                  className="w-full flex items-center space-x-3 p-3 rounded-lg transition-colors text-left hover:bg-red-100 text-red-700"
                >
                  <LogOut className="w-5 h-5" />
                  <span>登出</span>
                </button>
              )}
            </nav>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  )
}
