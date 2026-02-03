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
  Clock,
  Pause,
  SkipForward,
  Square,
  RotateCcw,
  PlayCircle,
  Gift,
  HardDrive,
  Monitor
} from 'lucide-react'

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true)
  const { isLoggedIn, profile, isAdmin, loading: liffLoading, adminLoading } = useLiff()
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

  const [questionTimeLimit, setQuestionTimeLimit] = useState<number>(15)
  const [activeQuestionSet, setActiveQuestionSet] = useState<'formal' | 'test' | 'backup'>('formal')
  const [savingSettings, setSavingSettings] = useState(false)

  // 當 gameState 載入時，更新設定
  useEffect(() => {
    if (gameState?.question_time_limit) {
      setQuestionTimeLimit(gameState.question_time_limit)
    }
    if (gameState?.active_question_set) {
      setActiveQuestionSet(gameState.active_question_set)
    }
  }, [gameState?.question_time_limit, gameState?.active_question_set])

  const handleUpdateSettings = async () => {
    setSavingSettings(true)
    try {
      const success = await updateSettings({
        question_time_limit: questionTimeLimit,
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

    // 是管理員，載入 dashboard
    console.log('User is admin, loading dashboard')
    setLoading(false)
  }, [liffLoading, adminLoading, isLoggedIn, profile, isAdmin, router])

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
      title: '用戶管理',
      description: '管理賓客桌次和名單',
      icon: Users,
      href: '/admin/guests',
      color: 'bg-purple-600'
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
      title: '計分規則',
      description: '設定遊戲計分規則',
      icon: Settings,
      href: '/admin/scoring-rules',
      color: 'bg-teal-500'
    },
    {
      title: 'Rich Menu 管理',
      description: '管理 LINE Rich Menu 分頁和圖片',
      icon: Settings,
      href: '/admin/richmenu',
      color: 'bg-cyan-500'
    },
    {
      title: '系統設定',
      description: '系統配置和管理員設置',
      icon: Settings,
      href: '/admin/system-settings',
      color: 'bg-red-500'
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
        <div className="space-y-6">
          {/* 遊戲控制面板 - 手機直式螢幕友善設計 */}
          <div className="bg-white rounded-lg shadow p-4 md:p-6">
            {/* 遊戲狀態標籤 */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
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

              {/* 控制按鈕 - 手機直式螢幕友善設計 */}
            <div className="space-y-3 mb-4">
              {!isGameActive ? (
                <>
                  <button
                    onClick={() => controlGame('start_game')}
                    disabled={gameLoading}
                    className="w-full flex items-center justify-center space-x-2 bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white px-4 py-4 rounded-lg transition-colors text-base font-medium"
                  >
                    <PlayCircle className="w-5 h-5" />
                    <span>遊戲開始</span>
                  </button>
                  {/* 遊戲停止時顯示排行榜按鈕 */}
                  <button
                    onClick={() => controlGame('show_rankings')}
                    disabled={gameLoading}
                    className="w-full flex items-center justify-center space-x-2 px-4 py-3 rounded-lg transition-colors bg-orange-500 hover:bg-orange-600 text-white text-sm"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-trophy w-4 h-4" aria-hidden="true">
                      <path d="M10 14.66v1.626a2 2 0 0 1-.976 1.696A5 5 0 0 0 7 21.978"></path>
                      <path d="M14 14.66v1.626a2 2 0 0 0 .976 1.696A5 5 0 0 1 17 21.978"></path>
                      <path d="M18 9h1.5a1 1 0 0 0 0-5H18"></path>
                      <path d="M4 22h16"></path>
                      <path d="M6 9a6 6 0 0 0 12 0V3a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1z"></path>
                      <path d="M6 9H4.5a1 1 0 0 1 0-5H6"></path>
                    </svg>
                    <span>排行榜</span>
                  </button>
                </>
              ) : !gameState?.current_question_id ? (
                // 等待階段：遊戲已開始但尚無當前題目，顯示開始出題按鈕
                <>
                  {gameError && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg mb-2">
                      <p className="text-sm text-red-600">{gameError}</p>
                    </div>
                  )}
                  <button
                    onClick={() => controlGame('start_first_question')}
                    disabled={gameLoading}
                    className="w-full flex items-center justify-center space-x-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white px-4 py-4 rounded-lg transition-colors text-base font-medium"
                  >
                    <Play className="w-5 h-5" />
                    <span>開始出題</span>
                  </button>
                </>
              ) : (
                // 答題階段：有當前題目，顯示傳統控制按鈕
                <>
                  <div className="grid grid-cols-2 gap-3">
                    {isPaused ? (
                      <button
                        onClick={() => controlGame('resume_game')}
                        disabled={gameLoading}
                        className="flex items-center justify-center space-x-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white px-4 py-4 rounded-lg transition-colors text-base font-medium"
                      >
                        <Play className="w-5 h-5" />
                        <span>繼續遊戲</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => controlGame('pause_game')}
                        disabled={gameLoading}
                        className="flex items-center justify-center space-x-2 bg-yellow-500 hover:bg-yellow-600 disabled:bg-gray-400 text-white px-4 py-4 rounded-lg transition-colors text-base font-medium"
                      >
                        <Pause className="w-5 h-5" />
                        <span>暫停遊戲</span>
                      </button>
                    )}
                    {/* 排行榜/下一題/遊戲結束按鈕 - 嚴格條件控制防止誤觸 */}
                    {/* 進入排行榜按鈕 - 只有在時間結束後且尚未進入排行榜才能點擊 */}
                    {timeRemaining <= 0 && gameState?.display_phase !== 'rankings' ? (
                      <button
                        onClick={() => controlGame('show_rankings')}
                        disabled={gameLoading}
                        className="flex items-center justify-center space-x-2 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-400 text-white px-4 py-4 rounded-lg transition-colors text-base font-medium"
                      >
                        <Trophy className="w-5 h-5" />
                        <span>進入排行榜</span>
                      </button>
                    ) : gameState?.display_phase === 'rankings' && gameState?.has_next_question === false ? (
                      // 已在排行榜階段且沒有下一題：顯示「遊戲結束」按鈕
                      <button
                        onClick={() => controlGame('end_game')}
                        disabled={gameLoading}
                        className="flex items-center justify-center space-x-2 bg-red-500 hover:bg-red-600 disabled:bg-gray-400 text-white px-4 py-4 rounded-lg transition-colors text-base font-medium"
                      >
                        <Square className="w-5 h-5" />
                        <span>遊戲結束</span>
                      </button>
                    ) : gameState?.display_phase === 'rankings' ? (
                      // 已在排行榜階段且還有下一題：顯示「下一題」按鈕
                      <button
                        onClick={() => controlGame('next_question')}
                        disabled={gameLoading}
                        className="flex items-center justify-center space-x-2 bg-purple-500 hover:bg-purple-600 disabled:bg-gray-400 text-white px-4 py-4 rounded-lg transition-colors text-base font-medium"
                      >
                        <SkipForward className="w-5 h-5" />
                        <span>下一題</span>
                      </button>
                    ) : (
                      // 倒數進行中：顯示禁用的「下一題」按鈕（提示需要先進入排行榜）
                      <button
                        disabled={true}
                        className="flex items-center justify-center space-x-2 bg-gray-400 cursor-not-allowed text-white px-4 py-4 rounded-lg transition-colors text-base font-medium"
                        title="請先等待時間結束並進入排行榜"
                      >
                        <SkipForward className="w-5 h-5" />
                        <span>下一題</span>
                      </button>
                    )}
                  </div>
                </>
              )}

              {/* 結束遊戲按鈕 - 遊戲進行中時總是顯示 */}
              {isGameActive && (
                <button
                  onClick={() => controlGame('end_game')}
                  disabled={gameLoading}
                  className="w-full flex items-center justify-center space-x-2 bg-red-500 hover:bg-red-600 disabled:bg-gray-400 text-white px-4 py-3 rounded-lg transition-colors text-sm"
                >
                  <Square className="w-4 h-4" />
                  <span>結束遊戲</span>
                </button>
              )}

              {/* 重置遊戲按鈕 */}
              <button
                onClick={() => controlGame('reset_game')}
                disabled={gameLoading}
                className="w-full flex items-center justify-center space-x-2 bg-gray-500 hover:bg-gray-600 disabled:bg-gray-400 text-white px-4 py-3 rounded-lg transition-colors text-sm"
              >
                <RotateCcw className="w-4 h-4" />
                <span>重置遊戲</span>
              </button>
            </div>

            {/* 當前題目資訊 */}
            {currentQuestion && (
              <div className="bg-blue-50 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-blue-900">
                    當前題目
                    <span className="ml-2 text-sm text-blue-600">
                      （第 {(gameState?.completed_questions || 0) + 1} 題 / 共 {gameState?.total_questions || 0} 題）
                    </span>
                  </h3>
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
            <div className="grid grid-cols-3 gap-2 mb-4 text-sm">
              <div className="text-center p-2 bg-gray-50 rounded">
                <div className="font-medium text-gray-900">{gameState?.completed_questions || 0}</div>
                <div className="text-gray-600 text-xs">已完成題目</div>
              </div>
              <div className="text-center p-2 bg-gray-50 rounded">
                <div className="font-medium text-gray-900">{gameState?.total_questions || 0}</div>
                <div className="text-gray-600 text-xs">題目總數</div>
              </div>
              <div className="text-center p-2 bg-gray-50 rounded">
                <div className="font-medium text-gray-900">
                  {(gameState?.is_waiting_for_players !== undefined ? gameState.is_waiting_for_players : !gameState?.current_question_id) ? '等待玩家' : gameState?.current_question_id ? '答題中' : '未開始'}
                </div>
                <div className="text-gray-600 text-xs">遊戲階段</div>
              </div>
            </div>

            {/* 設定區域 */}
            <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <h3 className="text-sm font-medium text-gray-700 mb-3">遊戲參數設定</h3>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1">
                  <label className="block text-xs text-gray-500 mb-1">全域答題時間 (秒)</label>
                  <div className="flex items-center">
                    <input
                      type="number"
                      min="5"
                      max="300"
                      value={questionTimeLimit}
                      onChange={(e) => setQuestionTimeLimit(parseInt(e.target.value) || 15)}
                      className="w-full sm:w-20 px-3 py-2 border border-gray-300 rounded-md text-sm text-black focus:ring-blue-500 focus:border-blue-500"
                    />
                    <span className="ml-2 text-xs text-gray-500">秒作答時間</span>
                  </div>
                </div>

                <div className="flex-1">
                  <label className="block text-xs text-gray-500 mb-1">當前題庫</label>
                  <select
                    value={activeQuestionSet}
                    onChange={(e) => setActiveQuestionSet(e.target.value as 'formal' | 'test' | 'backup')}
                    className="w-full sm:w-auto px-3 py-2 border border-gray-300 rounded-md text-sm text-black focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="formal">正式題目</option>
                    <option value="test">測試題目</option>
                    <option value="backup">備用題目</option>
                  </select>
                </div>

                <button
                  onClick={handleUpdateSettings}
                  disabled={savingSettings || loading}
                  className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors self-end"
                >
                  {savingSettings ? '儲存中...' : '儲存設定'}
                </button>
              </div>
              <p className="mt-2 text-xs text-gray-500">
                「題目顯示時間」使用每道題目的個別設定；「全域答題時間」會加到每題的顯示時間上。總答題時間 = 題目顯示時間 + 全域答題時間
              </p>
            </div>

            {/* 開啟遊戲實況和照片輪播按鈕 */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => {
                  const width = window.screen.width;
                  const height = window.screen.height;
                  window.open(
                    '/game-live',
                    'game-live-window',
                    `width=${width},height=${height},top=0,left=0,fullscreen=yes,menubar=no,toolbar=no,location=no,status=no`
                  );
                }}
                className="flex items-center justify-center space-x-2 px-4 py-3 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded-lg transition-colors shadow-sm"
              >
                <Monitor className="w-4 h-4" />
                <span>開啟遊戲實況</span>
              </button>

              <button
                onClick={() => {
                  const width = window.screen.width;
                  const height = window.screen.height;
                  window.open(
                    '/photo-slideshow',
                    'photo-slideshow-window',
                    `width=${width},height=${height},top=0,left=0,fullscreen=yes,menubar=no,toolbar=no,location=no,status=no`
                  );
                }}
                className="flex items-center justify-center space-x-2 px-4 py-3 bg-pink-500 hover:bg-pink-600 text-white text-sm rounded-lg transition-colors shadow-sm"
              >
                <Camera className="w-4 h-4" />
                <span>照片輪播</span>
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