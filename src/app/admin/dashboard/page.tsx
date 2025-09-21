'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowser } from '@/lib/supabase'
import { 
  Users, 
  HelpCircle, 
  Camera, 
  Trophy, 
  Settings, 
  Play, 
  Pause, 
  SkipForward,
  Eye,
  EyeOff,
  Shield
} from 'lucide-react'

interface Stats {
  totalUsers: number
  totalQuestions: number
  totalPhotos: number
  activeGame: boolean
}

export default function AdminDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalQuestions: 0,
    totalPhotos: 0,
    activeGame: false
  })
  const [gameState, setGameState] = useState<any>(null)
  const router = useRouter()
  const supabase = createSupabaseBrowser()

  // 檢查管理員認證
  useEffect(() => {
    const token = localStorage.getItem('admin_token')
    if (!token) {
      router.push('/admin')
      return
    }

    // 這裡應該驗證 token 的有效性
    setIsAuthenticated(true)
    setLoading(false)
    fetchStats()
    fetchGameState()
  }, [router])

  const fetchStats = async () => {
    try {
      // 獲取用戶總數
      const { count: userCount } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })

      // 獲取題目總數
      const { count: questionCount } = await supabase
        .from('questions')
        .select('*', { count: 'exact', head: true })

      // 獲取照片總數
      const { count: photoCount } = await supabase
        .from('photos')
        .select('*', { count: 'exact', head: true })

      // 獲取遊戲狀態
      const { data: gameData } = await supabase
        .from('game_state')
        .select('is_game_active')
        .single()

      setStats({
        totalUsers: userCount || 0,
        totalQuestions: questionCount || 0,
        totalPhotos: photoCount || 0,
        activeGame: gameData?.is_game_active || false
      })
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

  const fetchGameState = async () => {
    try {
      const { data } = await supabase
        .from('game_state')
        .select('*')
        .single()
      
      setGameState(data)
    } catch (error) {
      console.error('Error fetching game state:', error)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('admin_token')
    router.push('/admin')
  }

  const toggleGame = async () => {
    try {
      const { error } = await supabase
        .from('game_state')
        .update({ is_game_active: !stats.activeGame })
        .eq('id', gameState.id)

      if (error) throw error
      
      setStats(prev => ({ ...prev, activeGame: !prev.activeGame }))
    } catch (error) {
      console.error('Error toggling game:', error)
      alert('操作失敗')
    }
  }

  const toggleVoting = async () => {
    try {
      const { error } = await supabase
        .from('game_state')
        .update({ voting_enabled: !gameState.voting_enabled })
        .eq('id', gameState.id)

      if (error) throw error
      
      setGameState((prev: any) => ({ ...prev, voting_enabled: !prev.voting_enabled }))
    } catch (error) {
      console.error('Error toggling voting:', error)
      alert('操作失敗')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  const menuItems = [
    { name: '快問快答管理', href: '/admin/quiz', icon: HelpCircle, color: 'bg-green-500' },
    { name: '照片管理', href: '/admin/photos', icon: Camera, color: 'bg-purple-500' },
    { name: '用戶管理', href: '/admin/users', icon: Users, color: 'bg-blue-500' },
    { name: '系統設定', href: '/admin/settings', icon: Settings, color: 'bg-gray-500' },
  ]

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-800">管理後台</h1>
                <p className="text-sm text-gray-600">婚禮互動遊戲管理系統</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors"
            >
              登出
            </button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* 統計卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">總用戶數</p>
                <p className="text-2xl font-bold text-gray-800">{stats.totalUsers}</p>
              </div>
              <Users className="w-12 h-12 text-blue-500" />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">題目數量</p>
                <p className="text-2xl font-bold text-gray-800">{stats.totalQuestions}</p>
              </div>
              <HelpCircle className="w-12 h-12 text-green-500" />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">照片數量</p>
                <p className="text-2xl font-bold text-gray-800">{stats.totalPhotos}</p>
              </div>
              <Camera className="w-12 h-12 text-purple-500" />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">遊戲狀態</p>
                <p className={`text-2xl font-bold ${stats.activeGame ? 'text-green-600' : 'text-red-600'}`}>
                  {stats.activeGame ? '進行中' : '已停止'}
                </p>
              </div>
              <Trophy className="w-12 h-12 text-yellow-500" />
            </div>
          </div>
        </div>

        {/* 快速控制 */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-800 mb-6">快速控制</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={toggleGame}
              className={`flex items-center justify-center space-x-2 py-3 px-6 rounded-lg font-semibold transition-colors ${
                stats.activeGame
                  ? 'bg-red-500 hover:bg-red-600 text-white'
                  : 'bg-green-500 hover:bg-green-600 text-white'
              }`}
            >
              {stats.activeGame ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
              <span>{stats.activeGame ? '停止遊戲' : '開始遊戲'}</span>
            </button>

            <button
              onClick={toggleVoting}
              className={`flex items-center justify-center space-x-2 py-3 px-6 rounded-lg font-semibold transition-colors ${
                gameState?.voting_enabled
                  ? 'bg-orange-500 hover:bg-orange-600 text-white'
                  : 'bg-blue-500 hover:bg-blue-600 text-white'
              }`}
            >
              {gameState?.voting_enabled ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              <span>{gameState?.voting_enabled ? '關閉投票' : '開啟投票'}</span>
            </button>

            <button
              onClick={() => router.push('/game-live')}
              className="flex items-center justify-center space-x-2 py-3 px-6 bg-purple-500 hover:bg-purple-600 text-white rounded-lg font-semibold transition-colors"
            >
              <SkipForward className="w-5 h-5" />
              <span>查看實況</span>
            </button>
          </div>
        </div>

        {/* 管理選單 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {menuItems.map((item, index) => (
            <div
              key={index}
              onClick={() => router.push(item.href)}
              className="bg-white rounded-xl shadow-lg p-6 cursor-pointer transform transition-all duration-200 hover:scale-105 hover:shadow-xl"
            >
              <div className="flex items-center space-x-4">
                <div className={`w-12 h-12 ${item.color} rounded-xl flex items-center justify-center`}>
                  <item.icon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">{item.name}</h3>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
