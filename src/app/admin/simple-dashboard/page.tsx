'use client'

import { useState, useEffect } from 'react'
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
  Clock,
  Loader2,
  Gift,
  HardDrive
} from 'lucide-react'

export default function SimpleDashboard() {
  const [isVerified, setIsVerified] = useState(false)
  const [loading, setLoading] = useState(true)
  const [adminInfo, setAdminInfo] = useState<any>(null)
  const [error, setError] = useState('')
  const { isLoggedIn, profile } = useLiff()
  const router = useRouter()

  useEffect(() => {
    console.log('SimpleDashboard - Effect triggered', { isLoggedIn, profile })
    
    if (!isLoggedIn || !profile?.userId) {
      console.log('Not logged in, redirecting to auth')
      router.push('/admin/simple-auth')
      return
    }

    // 直接檢查管理員權限，不使用本地存儲
    verifyAdmin(profile.userId)
  }, [isLoggedIn, profile])

  const verifyAdmin = async (lineId: string) => {
    console.log('Verifying admin for:', lineId)
    
    try {
      const response = await fetch('/api/admin/check-line-admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ lineId }),
      })

      const data = await response.json()
      console.log('Admin verification response:', data)

      if (response.ok && data.isAdmin) {
        setIsVerified(true)
        setAdminInfo(data.adminInfo)
      } else {
        setError('管理員權限驗證失敗')
        setTimeout(() => {
          router.push('/admin/simple-auth')
        }, 2000)
      }
    } catch (error) {
      console.error('Admin verification error:', error)
      setError('驗證過程中發生錯誤')
      setTimeout(() => {
        router.push('/admin/simple-auth')
      }, 2000)
    } finally {
      setLoading(false)
    }
  }

  const menuItems = [
    {
      title: '題目管理',
      description: '管理快問快答題目',
      icon: HelpCircle,
      href: '/admin/questions',
      color: 'bg-green-500'
    },
    {
      title: '照片管理',
      description: '管理上傳的照片',
      icon: Camera,
      href: '/admin/photos',
      color: 'bg-pink-500'
    },
    {
      title: '分數管理',
      description: '查看和管理用戶分數',
      icon: Trophy,
      href: '/admin/scores',
      color: 'bg-yellow-500'
    },
    {
      title: '積分歷史',
      description: '查看用戶積分歷史記錄',
      icon: Trophy,
      href: '/admin/score-history',
      color: 'bg-orange-500'
    },
    {
      title: '照片摸彩',
      description: '管理照片摸彩活動',
      icon: Gift,
      href: '/admin/lottery',
      color: 'bg-purple-500'
    },
    {
      title: '投票設定',
      description: '管理照片投票功能',
      icon: Trophy,
      href: '/admin/voting-settings',
      color: 'bg-indigo-500'
    },
    {
      title: '批量設定',
      description: '批量管理遊戲設定',
      icon: Settings,
      href: '/admin/batch-settings',
      color: 'bg-blue-500'
    },
    {
      title: '計分規則',
      description: '設定遊戲計分規則',
      icon: Settings,
      href: '/admin/scoring-rules',
      color: 'bg-teal-500'
    },
    {
      title: '媒體清理',
      description: '清理無效的媒體文件',
      icon: HardDrive,
      href: '/admin/media-cleanup',
      color: 'bg-gray-500'
    },
    {
      title: 'LINE 選單',
      description: '管理 LINE Bot 選單',
      icon: Settings,
      href: '/admin/line-menu',
      color: 'bg-green-600'
    },
    {
      title: '系統設定',
      description: '系統配置和管理員設置',
      icon: Settings,
      href: '/admin/settings',
      color: 'bg-red-500'
    }
  ]

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-blue-500" />
          <p className="text-gray-600">驗證管理員權限中...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <Shield className="w-16 h-16 mx-auto mb-4 text-red-500" />
          <h2 className="text-xl font-semibold text-gray-800 mb-2">權限驗證失敗</h2>
          <p className="text-red-600 mb-4">{error}</p>
          <p className="text-gray-500">正在重新導向...</p>
        </div>
      </div>
    )
  }

  if (!isVerified) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <Shield className="w-16 h-16 mx-auto mb-4 text-gray-500" />
          <p className="text-gray-600">權限驗證中...</p>
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
                <p className="text-sm text-gray-600">簡化版管理系統</p>
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
                onClick={() => router.push('/')}
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
                <p className="text-2xl font-bold text-gray-900">25</p>
              </div>
              <Users className="w-8 h-8 text-blue-500" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">活躍問題</p>
                <p className="text-2xl font-bold text-gray-900">5</p>
              </div>
              <HelpCircle className="w-8 h-8 text-green-500" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">上傳照片</p>
                <p className="text-2xl font-bold text-gray-900">12</p>
              </div>
              <Camera className="w-8 h-8 text-pink-500" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">遊戲狀態</p>
                <p className="text-2xl font-bold text-gray-900">已暫停</p>
              </div>
              <Clock className="w-8 h-8 text-gray-500" />
            </div>
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

        {/* 調試信息 */}
        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <details>
            <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-800">
              調試信息
            </summary>
            <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto">
              {JSON.stringify({ 
                isVerified, 
                adminInfo, 
                profile: profile ? {
                  userId: profile.userId,
                  displayName: profile.displayName
                } : null
              }, null, 2)}
            </pre>
          </details>
        </div>
      </div>
    </div>
  )
}
