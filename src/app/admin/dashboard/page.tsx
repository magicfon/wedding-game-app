'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useLiff } from '@/hooks/useLiff'
import { useGameState } from '@/hooks/useGameState'
import AdminLayout from '@/components/AdminLayout'
import {
  Users,
  HelpCircle,
  Camera,
  Settings,
  Play,
  Trophy,
  Shield,
  Home,
  LogOut,
  UserCheck,
  Activity,
  Clock,
  Pause,
  SkipForward,
  Square,
  RotateCcw,
  PlayCircle,
  Gift,
  HardDrive
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
    totalQuestions: 0,
    totalPhotos: 0,
    gameActive: false,
    totalAnswers: 0,
    activeAdmins: 0
  })
  const { isLoggedIn, profile, isAdmin, adminInfo: liffAdminInfo, loading: liffLoading, adminLoading } = useLiff()
  const router = useRouter()

  // 遊戲控制 Hook
  const {
    gameState,
    loading: gameLoading,
    error: gameError,
    controlGame,
    timeRemaining,
    isGameActive,
    isPaused,
    currentQuestion,
    updateSettings
  } = useGameState(profile?.userId)

  const [displayDuration, setDisplayDuration] = useState<number>(3)
  const [activeQuestionSet, setActiveQuestionSet] = useState<'formal' | 'test' | 'backup'>('formal')
  const [savingSettings, setSavingSettings] = useState(false)

  // 當 gameState 載入時，更新 displayDuration 和 activeQuestionSet
  useEffect(() => {
    if (gameState?.question_display_duration) {
      setDisplayDuration(gameState.question_display_duration)
    }
    if (gameState?.active_question_set) {
      setActiveQuestionSet(gameState.active_question_set)
    }
  }, [gameState?.question_display_duration, gameState?.active_question_set])

  const handleUpdateSettings = async () => {
    setSavingSettings(true)
    try {
      const success = await updateSettings({
        question_display_duration: displayDuration,
        active_question_set: activeQuestionSet
      })
      if (success) {
        console.log('設定更新成功')
      }
    } finally {
      setSavingSettings(false)
    }
  }

  // 簡化的管理員檢查 - 等待所有載入完成後再檢查
  const checkAdminStatus = useCallback(async () => {
    // 如果還在載入中，不做任何操作
    if (liffLoading || adminLoading) {
      return
    }

    // 如果沒有登入，跳轉首頁
    if (!isLoggedIn || !profile?.userId) {
      console.log('Not logged in, redirecting to home')
      router.push('/')
      return
    }

    // 如果不是管理員，跳轉回首頁
    if (!isAdmin) {
      console.log('Not admin, redirecting to home')
      router.push('/')
      return
    }

    // 是管理員，設置管理員資料並載入統計
    console.log('User is admin, loading dashboard')
    if (liffAdminInfo) {
      setAdminInfo(liffAdminInfo)
    }
    loadStats()
    setLoading(false)
  }, [liffLoading, adminLoading, isLoggedIn, profile, isAdmin, liffAdminInfo, router])

  // 載入統計數據
  const loadStats = async () => {
    try {
      console.log('Loading real stats from API...')
      const response = await fetch('/api/admin/stats')
      const data = await response.json()

      if (data.success) {
        console.log('Stats loaded:', data.stats)
        setStats(data.stats)

        if (data.errors && data.errors.length > 0) {
          console.warn('Stats loaded with some errors:', data.errors)
        }
      } else {
        console.error('Failed to load stats:', data.error)
        // 使用預設值
        setStats({
          totalUsers: 0,
          totalQuestions: 0,
          totalPhotos: 0,
          gameActive: false,
          totalAnswers: 0,
          activeAdmins: 0
        })
      }
    } catch (error) {
      console.error('Load stats error:', error)
      // 使用預設值
      setStats({
        totalUsers: 0,
        totalQuestions: 0,
        totalPhotos: 0,
        gameActive: false,
        totalAnswers: 0,
        activeAdmins: 0
      })
    }
  }

  useEffect(() => {
    checkAdminStatus()
  }, [checkAdminStatus])

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
      description: '管理公開和隱私照片',
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
      title: '系統設定',
      description: '系統配置和管理員設置',
      icon: Settings,
      href: '/admin/settings',
      color: 'bg-red-500'
    },
    {
      title: '桌次管理',
      description: '管理賓客桌次和名單',
      icon: Users,
      href: '/admin/guests',
      color: 'bg-purple-600'
    },
    {
      title: 'Rich Menu 管理',
      description: '管理 LINE Rich Menu 分頁和圖片',
      icon: Settings,
      href: '/admin/richmenu',
      color: 'bg-cyan-500'
    }
  ]

  if (loading || liffLoading || adminLoading) {
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
    <AdminLayout title="管理控制台">
      <div className="max-w-7xl mx-auto">
        {/* Admin Info Bar */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
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
                  // 簡單跳轉回首頁，不需要清除任何存儲
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

        <div className="space-y-6">
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
                  <p className="text-sm text-gray-600">題目總數</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalQuestions}</p>
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
                  <p className="text-sm text-gray-600">答題次數</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalAnswers}</p>
                </div>
                <Trophy className="w-8 h-8 text-yellow-500" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">活躍管理員</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.activeAdmins}</p>
                </div>
                <Shield className="w-8 h-8 text-indigo-500" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">遊戲狀態</p>
                  <p className={`text-2xl font-bold ${stats.gameActive ? 'text-green-600' : 'text-red-600'}`}>
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

          {/* 遊戲控制面板 */}
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">遊戲控制</h2>
                <p className="text-sm text-gray-600">控制快問快答遊戲流程</p>
              </div>
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${isGameActive
                ? isPaused
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-green-100 text-green-800'
                : 'bg-gray-100 text-gray-800'
                }`}>
                {isGameActive
                  ? isPaused
                    ? '遊戲暫停中'
                    : '遊戲進行中'
                  : '遊戲未開始'
                }
              </div>
            </div>

            {/* 當前題目資訊 */}
            {currentQuestion && (
              <div className="bg-blue-50 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-blue-900">當前題目</h3>
                  <div className="flex items-center space-x-2">
                    <Clock className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-mono text-blue-600">
                      {timeRemaining}s
                    </span>
                  </div>
                </div>
                <p className="text-sm text-blue-800 mb-2">{currentQuestion.question_text}</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <span>A. {currentQuestion.option_a}</span>
                  <span>B. {currentQuestion.option_b}</span>
                  <span>C. {currentQuestion.option_c}</span>
                  <span>D. {currentQuestion.option_d}</span>
                </div>
                <div className="mt-2 text-xs text-blue-600">
                  正確答案: {currentQuestion.correct_answer} | 分數: {currentQuestion.points}
                </div>
              </div>
            )}

            {/* 遊戲狀態資訊 */}
            <div className="grid grid-cols-3 gap-4 mb-4 text-sm">
              <div className="text-center p-2 bg-gray-50 rounded">
                <div className="font-medium text-gray-900">{gameState?.completed_questions || 0}</div>
                <div className="text-gray-600">已完成題目</div>
              </div>
              <div className="text-center p-2 bg-gray-50 rounded">
                <div className="font-medium text-gray-900">{gameState?.total_questions || 0}</div>
                <div className="text-gray-600">題目總數</div>
              </div>
              <div className="text-center p-2 bg-gray-50 rounded">
                <div className="font-medium text-gray-900">
                  {(gameState?.is_waiting_for_players !== undefined ? gameState.is_waiting_for_players : !gameState?.current_question_id) ? '等待玩家' : gameState?.current_question_id ? '答題中' : '未開始'}
                </div>
                <div className="text-gray-600">遊戲階段</div>
              </div>
            </div>

            {/* 設定區域 */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <h3 className="text-sm font-medium text-gray-700 mb-3">遊戲參數設定</h3>
              <div className="flex items-end space-x-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">題目顯示時間 (秒)</label>
                  <div className="flex items-center">
                    <input
                      type="number"
                      min="1"
                      max="60"
                      value={displayDuration}
                      onChange={(e) => setDisplayDuration(parseInt(e.target.value) || 3)}
                      className="w-20 px-3 py-2 border border-gray-300 rounded-md text-sm text-black focus:ring-blue-500 focus:border-blue-500"
                    />
                    <span className="ml-2 text-xs text-gray-500">秒後顯示選項</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-gray-500 mb-1">當前題庫</label>
                  <select
                    value={activeQuestionSet}
                    onChange={(e) => setActiveQuestionSet(e.target.value as 'formal' | 'test' | 'backup')}
                    className="w-32 px-3 py-2 border border-gray-300 rounded-md text-sm text-black focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="formal">正式題目</option>
                    <option value="test">測試題目</option>
                    <option value="backup">備用題目</option>
                  </select>
                </div>

                <button
                  onClick={handleUpdateSettings}
                  disabled={savingSettings || loading}
                  className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {savingSettings ? '儲存中...' : '儲存設定'}
                </button>
              </div>
              <p className="mt-2 text-xs text-gray-500">
                設定題目顯示多久後才會出現選項。切換題庫後，下一題將從新題庫中選取。
              </p>
            </div>

            {/* 控制按鈕 */}
            <div className="flex flex-wrap gap-3">
              {!isGameActive ? (
                <button
                  onClick={() => controlGame('start_game')}
                  disabled={gameLoading}
                  className="flex items-center space-x-2 bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  <PlayCircle className="w-4 h-4" />
                  <span>遊戲開始</span>
                </button>
              ) : (gameState?.is_waiting_for_players !== undefined ? gameState.is_waiting_for_players : !gameState?.current_question_id) ? (
                // 等待階段：顯示開始出題按鈕
                <button
                  onClick={() => controlGame('start_first_question')}
                  disabled={gameLoading}
                  className="flex items-center space-x-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  <Play className="w-4 h-4" />
                  <span>開始出題</span>
                </button>
              ) : (
                // 答題階段：顯示傳統控制按鈕
                <>
                  {isPaused ? (
                    <button
                      onClick={() => controlGame('resume_game')}
                      disabled={gameLoading}
                      className="flex items-center space-x-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg transition-colors"
                    >
                      <Play className="w-4 h-4" />
                      <span>繼續遊戲</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => controlGame('pause_game')}
                      disabled={gameLoading}
                      className="flex items-center space-x-2 bg-yellow-500 hover:bg-yellow-600 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg transition-colors"
                    >
                      <Pause className="w-4 h-4" />
                      <span>暫停遊戲</span>
                    </button>
                  )}

                  <button
                    onClick={() => controlGame('next_question')}
                    disabled={gameLoading}
                    className="flex items-center space-x-2 bg-purple-500 hover:bg-purple-600 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    <SkipForward className="w-4 h-4" />
                    <span>下一題</span>
                  </button>
                </>
              )}

              {/* 通用控制按鈕 */}
              {isGameActive && (
                <button
                  onClick={() => controlGame('end_game')}
                  disabled={gameLoading}
                  className="flex items-center space-x-2 bg-red-500 hover:bg-red-600 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  <Square className="w-4 h-4" />
                  <span>結束遊戲</span>
                </button>
              )}

              <button
                onClick={() => controlGame('reset_game')}
                disabled={gameLoading}
                className="flex items-center space-x-2 bg-gray-500 hover:bg-gray-600 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                <span>重置遊戲</span>
              </button>

            </div>

            {gameError && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{gameError}</p>
                <details className="mt-2">
                  <summary className="cursor-pointer text-xs text-red-500">查看詳細錯誤</summary>
                  <pre className="mt-2 text-xs bg-red-100 p-2 rounded overflow-auto">
                    {JSON.stringify(gameError, null, 2)}
                  </pre>
                </details>
              </div>
            )}
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
    </AdminLayout>
  )
}