'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useLiff } from '@/hooks/useLiff'
import { 
  Users, 
  HelpCircle, 
  Camera, 
  Settings, 
  Play,
  Trophy,
  BarChart3,
  Shield,
  Home,
  LogOut,
  UserCheck,
  Activity,
  Clock
} from 'lucide-react'

interface AdminInfo {
  lineId: string
  displayName: string
}

export default function AdminDashboard() {
  const [adminInfo, setAdminInfo] = useState<AdminInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeQuestions: 0,
    totalPhotos: 0,
    gameActive: false
  })
  const { isLoggedIn, profile } = useLiff()
  const router = useRouter()

  // 檢查管理員身份
  const checkAdminStatus = useCallback(async () => {
    if (!profile?.userId) {
      router.push('/admin/line-auth')
      return
    }

    // 檢查本地存儲的驗證狀態
    const adminVerified = localStorage.getItem('admin_verified')
    const adminVerifiedTime = localStorage.getItem('admin_verified_time')
    const adminLineId = localStorage.getItem('admin_line_id')
    const adminInfoStr = localStorage.getItem('admin_info')

    // 如果本地有有效的驗證狀態且是同一個用戶
    if (adminVerified === 'true' && adminLineId === profile.userId && adminInfoStr) {
      const verifiedTime = parseInt(adminVerifiedTime || '0')
      const now = Date.now()
      
      // 驗證狀態有效期為 1 小時
      if (now - verifiedTime < 60 * 60 * 1000) {
        try {
          const adminInfo = JSON.parse(adminInfoStr)
          setAdminInfo(adminInfo)
          loadStats()
          setLoading(false)
          return
        } catch (error) {
          console.error('Parse admin info error:', error)
        }
      }
    }

    // 如果本地驗證已過期或無效，重新驗證
    try {
      const response = await fetch('/api/admin/check-line-admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ lineId: profile.userId }),
      })

      const data = await response.json()
      
      if (data.isAdmin) {
        setAdminInfo(data.adminInfo)
        
        // 更新本地存儲
        localStorage.setItem('admin_verified', 'true')
        localStorage.setItem('admin_verified_time', Date.now().toString())
        localStorage.setItem('admin_line_id', profile.userId)
        localStorage.setItem('admin_info', JSON.stringify(data.adminInfo))
        
        loadStats()
      } else {
        // 清除本地存儲並跳轉
        localStorage.removeItem('admin_verified')
        localStorage.removeItem('admin_verified_time')
        localStorage.removeItem('admin_line_id')
        localStorage.removeItem('admin_info')
        router.push('/admin/line-auth')
      }
    } catch (error) {
      console.error('Admin check error:', error)
      router.push('/admin/line-auth')
    } finally {
      setLoading(false)
    }
  }, [profile, router])

  // 載入統計數據
  const loadStats = async () => {
    try {
      // 這裡可以添加實際的統計 API 調用
      // 目前使用模擬數據
      setStats({
        totalUsers: 25,
        activeQuestions: 5,
        totalPhotos: 12,
        gameActive: false
      })
    } catch (error) {
      console.error('Load stats error:', error)
    }
  }

  useEffect(() => {
    if (isLoggedIn && profile) {
      checkAdminStatus()
    } else if (!isLoggedIn) {
      router.push('/admin/line-auth')
    }
  }, [isLoggedIn, profile, checkAdminStatus, router])

  const menuItems = [
    {
      title: '用戶管理',
      description: '查看和管理註冊用戶',
      icon: Users,
      href: '/admin/users',
      color: 'bg-blue-500'
    },
    {
      title: '問題管理',
      description: '管理快問快答題目',
      icon: HelpCircle,
      href: '/admin/questions',
      color: 'bg-green-500'
    },
    {
      title: '遊戲控制',
      description: '開始/暫停遊戲',
      icon: Play,
      href: '/admin/game-control',
      color: 'bg-purple-500'
    },
    {
      title: '照片管理',
      description: '管理上傳的照片',
      icon: Camera,
      href: '/admin/photos',
      color: 'bg-pink-500'
    },
    {
      title: '排行榜',
      description: '查看分數排行',
      icon: Trophy,
      href: '/admin/leaderboard',
      color: 'bg-yellow-500'
    },
    {
      title: '統計報告',
      description: '查看詳細統計',
      icon: BarChart3,
      href: '/admin/analytics',
      color: 'bg-indigo-500'
    },
    {
      title: '管理員設置',
      description: '管理管理員權限',
      icon: Shield,
      href: '/admin/settings',
      color: 'bg-red-500'
    },
    {
      title: '系統設置',
      description: '系統配置和設置',
      icon: Settings,
      href: '/admin/system',
      color: 'bg-gray-500'
    }
  ]

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">載入管理控制台...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">管理控制台</h1>
                <p className="text-sm text-gray-600">婚禮互動遊戲管理系統</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {adminInfo && (
                <div className="flex items-center space-x-2">
                  <UserCheck className="w-5 h-5 text-green-500" />
                  <span className="text-sm text-gray-700">
                    {adminInfo.displayName || '管理員'}
                  </span>
                </div>
              )}
              
              <button
                onClick={() => router.push('/')}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <Home className="w-4 h-4" />
                <span className="text-sm">返回首頁</span>
              </button>
              
              <button
                onClick={() => {
                  // 清除所有管理員相關的本地存儲
                  localStorage.removeItem('admin_line_id')
                  localStorage.removeItem('admin_info')
                  localStorage.removeItem('admin_verified')
                  localStorage.removeItem('admin_verified_time')
                  router.push('/')
                }}
                className="flex items-center space-x-2 text-red-600 hover:text-red-700 px-3 py-2 rounded-lg hover:bg-red-50 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span className="text-sm">登出</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 統計卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">總用戶數</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalUsers}</p>
              </div>
              <Users className="w-8 h-8 text-blue-500" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">活躍問題</p>
                <p className="text-2xl font-bold text-gray-900">{stats.activeQuestions}</p>
              </div>
              <HelpCircle className="w-8 h-8 text-green-500" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">上傳照片</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalPhotos}</p>
              </div>
              <Camera className="w-8 h-8 text-pink-500" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">遊戲狀態</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.gameActive ? '進行中' : '已暫停'}
                </p>
              </div>
              {stats.gameActive ? (
                <Activity className="w-8 h-8 text-green-500" />
              ) : (
                <Clock className="w-8 h-8 text-gray-500" />
              )}
            </div>
          </div>
        </div>

        {/* 快速操作 */}
        <div className="bg-white rounded-lg shadow mb-8 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">快速操作</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => router.push('/admin/game-control')}
              className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Play className="w-6 h-6 text-green-500" />
              <div className="text-left">
                <p className="font-medium text-gray-900">開始遊戲</p>
                <p className="text-sm text-gray-600">啟動快問快答</p>
              </div>
            </button>
            
            <button
              onClick={() => router.push('/admin/questions')}
              className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <HelpCircle className="w-6 h-6 text-blue-500" />
              <div className="text-left">
                <p className="font-medium text-gray-900">管理問題</p>
                <p className="text-sm text-gray-600">編輯題目內容</p>
              </div>
            </button>
            
            <button
              onClick={() => router.push('/admin/leaderboard')}
              className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Trophy className="w-6 h-6 text-yellow-500" />
              <div className="text-left">
                <p className="font-medium text-gray-900">查看排行</p>
                <p className="text-sm text-gray-600">即時分數統計</p>
              </div>
            </button>
          </div>
        </div>

        {/* 功能選單 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">管理功能</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {menuItems.map((item, index) => (
              <div
                key={index}
                onClick={() => router.push(item.href)}
                className="cursor-pointer group"
              >
                <div className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-all duration-200 group-hover:border-gray-300">
                  <div className="flex items-center space-x-4 mb-4">
                    <div className={`w-12 h-12 ${item.color} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-200`}>
                      <item.icon className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}