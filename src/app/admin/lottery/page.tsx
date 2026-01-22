'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import AdminLayout from '@/components/AdminLayout'
import { useLiff } from '@/hooks/useLiff'
import { extractOriginalUrl } from '@/lib/photo-utils'
import {
  Gift,
  Users,
  History,
  Play,
  RefreshCw,
  Trash2,
  CheckCircle,
  XCircle,
  ExternalLink,
  Shuffle,

  Droplets,
  Trophy,
  Bell,
  BellOff,
  Box
} from 'lucide-react'

// 動畫模式類型和資訊
type AnimationMode = 'fast_shuffle' | 'waterfall' | 'tournament' | 'lottery_machine'

const ANIMATION_MODES: { mode: AnimationMode; name: string; icon: React.ReactNode; description: string }[] = [
  { mode: 'fast_shuffle', name: '快速切換', icon: <Shuffle className="w-6 h-6" />, description: '單張照片快速隨機切換' },

  { mode: 'waterfall', name: '瀑布流', icon: <Droplets className="w-6 h-6" />, description: '照片如雨滴般流動' },
  { mode: 'tournament', name: '淘汰賽', icon: <Trophy className="w-6 h-6" />, description: '多輪淘汰賽制揭曉' },
  { mode: 'lottery_machine', name: '彩票機', icon: <Box className="w-6 h-6" />, description: '照片在腔體內彈跳，依序抽出得獎者' },
]

interface EligibleUser {
  line_id: string
  display_name: string
  avatar_url: string
  photo_count: number
}

interface LotteryHistory {
  id: number
  winner_line_id: string
  winner_display_name: string
  winner_avatar_url: string
  photo_count: number
  draw_time: string
  admin_id: string
  admin_name: string
  participants_count: number
  notes: string
  winner_photo_id: number | null
  winner_photo_url: string | null
}

interface LotteryState {
  is_lottery_active: boolean
  is_drawing: boolean
  current_draw_id: number | null
  max_photos_for_lottery: number
  animation_mode?: AnimationMode
  notify_winner_enabled?: boolean
  winners_per_draw?: number
}

export default function LotteryManagePage() {
  const [eligibleUsers, setEligibleUsers] = useState<EligibleUser[]>([])
  const [lotteryHistory, setLotteryHistory] = useState<LotteryHistory[]>([])
  const [lotteryState, setLotteryState] = useState<LotteryState>({
    is_lottery_active: false,
    is_drawing: false,
    current_draw_id: null,
    max_photos_for_lottery: 5,
    notify_winner_enabled: true,
    winners_per_draw: 1
  })
  const [loading, setLoading] = useState(true)
  const [drawing, setDrawing] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [maxPhotosInput, setMaxPhotosInput] = useState<number>(5)
  const [winnersPerDrawInput, setWinnersPerDrawInput] = useState<number>(1)
  const [animationMode, setAnimationMode] = useState<AnimationMode>('fast_shuffle')
  const [updatingMode, setUpdatingMode] = useState(false)

  const { isLoggedIn, isAdmin, profile, loading: liffLoading, adminLoading } = useLiff()
  const router = useRouter()

  // 檢查管理員權限
  useEffect(() => {
    if (liffLoading || adminLoading) return
    if (!isLoggedIn || !isAdmin) {
      router.push('/')
    }
  }, [liffLoading, adminLoading, isLoggedIn, isAdmin, router])

  // 載入資料
  useEffect(() => {
    if (isLoggedIn && isAdmin) {
      fetchData()
    }
  }, [isLoggedIn, isAdmin])

  const fetchData = async () => {
    await Promise.all([
      fetchEligibleUsers(),
      fetchLotteryState(),
      fetchLotteryHistory()
    ])
    setLoading(false)
  }

  const fetchEligibleUsers = async () => {
    try {
      const response = await fetch('/api/lottery/check-eligibility')
      const data = await response.json()

      if (data.success) {
        setEligibleUsers(data.eligible_users || [])
      } else {
        showMessage('error', data.error || '獲取符合資格用戶失敗')
      }
    } catch (error) {
      console.error('獲取符合資格用戶失敗:', error)
      showMessage('error', '獲取符合資格用戶失敗')
    }
  }

  const fetchLotteryState = async () => {
    try {
      const response = await fetch('/api/lottery/control')
      const data = await response.json()

      if (data.success) {
        setLotteryState(data.state)
        setMaxPhotosInput(data.state.max_photos_for_lottery || 5)
        setWinnersPerDrawInput(data.state.winners_per_draw || 1)
        if (data.state.animation_mode) {
          setAnimationMode(data.state.animation_mode)
        }
      }
    } catch (error) {
      console.error('獲取抽獎狀態失敗:', error)
    }
  }

  const fetchLotteryHistory = async () => {
    try {
      const response = await fetch('/api/lottery/history?limit=20')
      const data = await response.json()

      if (data.success) {
        setLotteryHistory(data.history || [])
      } else {
        showMessage('error', data.error || '獲取抽獎歷史失敗')
      }
    } catch (error) {
      console.error('獲取抽獎歷史失敗:', error)
      showMessage('error', '獲取抽獎歷史失敗')
    }
  }

  const handleDraw = async () => {
    if (eligibleUsers.length === 0) {
      showMessage('error', '沒有符合資格的用戶（需至少上傳1張公開照片）')
      return
    }

    if (drawing) return

    setDrawing(true)
    showMessage('success', '正在抽獎中...')

    try {
      const response = await fetch('/api/lottery/draw', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          admin_id: profile?.userId,
          admin_name: profile?.displayName
        }),
      })

      const data = await response.json()

      if (data.success) {
        showMessage('success', data.message || '抽獎完成！')

        // 重新載入資料
        await fetchData()
      } else {
        showMessage('error', data.error || '抽獎失敗')
      }
    } catch (error) {
      console.error('抽獎失敗:', error)
      showMessage('error', '抽獎失敗')
    } finally {
      setDrawing(false)
    }
  }

  const handleToggleLotteryMode = async () => {
    try {
      const response = await fetch('/api/lottery/control', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          is_lottery_active: !lotteryState.is_lottery_active,
          admin_id: profile?.userId
        }),
      })

      const data = await response.json()

      if (data.success) {
        setLotteryState(data.state)
        showMessage('success', data.message)
      } else {
        showMessage('error', data.error || '操作失敗')
      }
    } catch (error) {
      console.error('切換抽獎模式失敗:', error)
      showMessage('error', '切換抽獎模式失敗')
    }
  }

  const handleReset = async () => {
    if (!confirm('確定要重置當前抽獎狀態嗎？')) return

    try {
      const response = await fetch('/api/lottery/control', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          admin_id: profile?.userId
        }),
      })

      const data = await response.json()

      if (data.success) {
        setLotteryState(data.state)
        showMessage('success', '抽獎狀態已重置')
      } else {
        showMessage('error', data.error || '重置失敗')
      }
    } catch (error) {
      console.error('重置失敗:', error)
      showMessage('error', '重置失敗')
    }
  }

  const handleUpdateMaxPhotos = async () => {
    if (maxPhotosInput < 0) {
      showMessage('error', '請輸入有效的數字（0 或以上）')
      return
    }

    try {
      const response = await fetch('/api/lottery/control', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          max_photos_for_lottery: maxPhotosInput,
          admin_id: profile?.userId
        }),
      })

      const data = await response.json()

      if (data.success) {
        setLotteryState(data.state)
        showMessage('success', data.message || '加權設定已更新')
      } else {
        showMessage('error', data.error || '更新失敗')
      }
    } catch (error) {
      console.error('更新加權設定失敗:', error)
      showMessage('error', '更新失敗')
    }
  }

  const handleUpdateAnimationMode = async (mode: AnimationMode) => {
    if (updatingMode) return
    setUpdatingMode(true)

    try {
      const response = await fetch('/api/lottery/control', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          animation_mode: mode,
          admin_id: profile?.userId
        }),
      })

      const data = await response.json()

      if (data.success) {
        setAnimationMode(mode)
        setLotteryState(prev => ({ ...prev, animation_mode: mode }))
        showMessage('success', data.message || '動畫模式已更新')
      } else {
        showMessage('error', data.error || '更新失敗')
      }
    } catch (error) {
      console.error('更新動畫模式失敗:', error)
      showMessage('error', '更新失敗')
    } finally {
      setUpdatingMode(false)
    }
  }

  const handleDeleteHistory = async (lotteryId: number) => {
    if (!confirm('確定要刪除這筆抽獎記錄嗎？')) return

    try {
      const response = await fetch('/api/lottery/history', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          lottery_id: lotteryId,
          admin_id: profile?.userId
        }),
      })

      const data = await response.json()

      if (data.success) {
        showMessage('success', '抽獎記錄已刪除')
        await fetchLotteryHistory()
      } else {
        showMessage('error', data.error || '刪除失敗')
      }
    } catch (error) {
      console.error('刪除失敗:', error)
      showMessage('error', '刪除失敗')
    }
  }

  const handleClearAllHistory = async () => {
    if (!confirm('⚠️ 確定要清除所有抽獎歷史記錄嗎？\n此操作無法復原！')) return

    try {
      const response = await fetch('/api/lottery/history', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clear_all: true,
          admin_id: profile?.userId
        }),
      })

      const data = await response.json()

      if (data.success) {
        showMessage('success', '所有抽獎記錄已清除')
        await fetchLotteryHistory()
      } else {
        showMessage('error', data.error || '清除失敗')
      }
    } catch (error) {
      console.error('清除失敗:', error)
      showMessage('error', '清除失敗')
    }
  }

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 5000)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (liffLoading || adminLoading || loading) {
    return (
      <AdminLayout title="照片摸彩">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500"></div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout title="照片摸彩">
      <div className="space-y-6">
        {/* 訊息提示 */}
        {message && (
          <div className={`p-4 rounded-lg ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            }`}>
            <div className="flex items-center space-x-2">
              {message.type === 'success' ? (
                <CheckCircle className="w-5 h-5" />
              ) : (
                <XCircle className="w-5 h-5" />
              )}
              <span>{message.text}</span>
            </div>
          </div>
        )}

        {/* 控制面板 */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <Gift className="w-8 h-8 text-pink-500" />
              <div>
                <h2 className="text-2xl font-bold text-gray-800">照片摸彩</h2>
                <p className="text-gray-600">符合資格：{eligibleUsers.length} 人</p>
              </div>
            </div>

            <button
              onClick={() => window.open('/lottery-live', '_blank')}
              className="flex items-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              <span>開啟大螢幕</span>
            </button>
          </div>

          {/* 操作按鈕 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <button
              onClick={handleDraw}
              disabled={drawing || eligibleUsers.length === 0 || lotteryState.is_drawing}
              className="flex items-center justify-center space-x-2 px-6 py-4 bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 disabled:from-gray-300 disabled:to-gray-400 text-white rounded-lg transition-all duration-200 transform hover:scale-105 disabled:scale-100 disabled:cursor-not-allowed shadow-lg font-semibold"
            >
              <Play className="w-5 h-5" />
              <span>{drawing ? '抽獎中...' : '開始抽獎'}</span>
            </button>

            <button
              onClick={handleToggleLotteryMode}
              className={`flex items-center justify-center space-x-2 px-6 py-4 rounded-lg transition-colors font-semibold ${lotteryState.is_lottery_active
                ? 'bg-green-500 hover:bg-green-600 text-white'
                : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                }`}
            >
              <Gift className="w-5 h-5" />
              <span>{lotteryState.is_lottery_active ? '抽獎模式：開啟' : '抽獎模式：關閉'}</span>
            </button>

            <button
              onClick={handleReset}
              className="flex items-center justify-center space-x-2 px-6 py-4 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors font-semibold"
            >
              <RefreshCw className="w-5 h-5" />
              <span>重置狀態</span>
            </button>

            <button
              onClick={() => setShowHistory(!showHistory)}
              className="flex items-center justify-center space-x-2 px-6 py-4 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors font-semibold"
            >
              <History className="w-5 h-5" />
              <span>抽獎歷史</span>
            </button>
          </div>

          {/* 加權設定 */}
          <div className="mt-6 border-t pt-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">⚖️ 加權抽獎設定</h3>
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    每人最多計算照片數量
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={maxPhotosInput}
                      onChange={(e) => setMaxPhotosInput(parseInt(e.target.value) || 0)}
                      className="w-32 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-black"
                    />
                    <span className="text-gray-600">張</span>
                    <button
                      onClick={handleUpdateMaxPhotos}
                      className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors font-medium"
                    >
                      更新設定
                    </button>
                  </div>
                  <p className="mt-2 text-xs text-gray-600">
                    {maxPhotosInput === 0 ? (
                      <>
                        <span className="font-semibold text-orange-600">平等機率模式：</span>
                        每人機率相同，不論上傳多少照片
                      </>
                    ) : (
                      <>
                        <span className="font-semibold text-blue-600">加權機率模式：</span>
                        上傳越多照片，中獎機率越高（最多計算 {maxPhotosInput} 張）
                      </>
                    )}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-600 mb-1">目前設定</div>
                  <div className="text-3xl font-bold text-purple-600">
                    {lotteryState.max_photos_for_lottery}
                  </div>
                  <div className="text-xs text-gray-500">
                    {lotteryState.max_photos_for_lottery === 0 ? '平等' : '加權'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 每次抽獎人數設定 */}
          <div className="mt-6 border-t pt-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">🎯 每次抽獎人數</h3>
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg p-4">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    一次抽獎抽出幾位中獎者
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={winnersPerDrawInput}
                      onChange={(e) => setWinnersPerDrawInput(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-32 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-black"
                    />
                    <span className="text-gray-600">位</span>
                    <button
                      onClick={async () => {
                        try {
                          const response = await fetch('/api/lottery/control', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              winners_per_draw: winnersPerDrawInput,
                              admin_id: profile?.userId
                            }),
                          })
                          const data = await response.json()
                          if (data.success) {
                            setLotteryState(data.state)
                            showMessage('success', `每次抽獎人數已設為 ${winnersPerDrawInput} 位`)
                          } else {
                            showMessage('error', data.error || '更新失敗')
                          }
                        } catch {
                          showMessage('error', '更新失敗')
                        }
                      }}
                      className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors font-medium"
                    >
                      更新設定
                    </button>
                  </div>
                  <p className="mt-2 text-xs text-gray-600">
                    設定每次點擊「開始抽獎」時，一次抽出多少位中獎者
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-600 mb-1">目前設定</div>
                  <div className="text-3xl font-bold text-orange-600">
                    {lotteryState.winners_per_draw || 1}
                  </div>
                  <div className="text-xs text-gray-500">位/次</div>
                </div>
              </div>
            </div>
          </div>

          {/* 動畫模式選擇 */}
          <div className="mt-6 border-t pt-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">🎬 抽獎動畫模式</h3>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              {ANIMATION_MODES.map(({ mode, name, icon, description }) => (
                <button
                  key={mode}
                  onClick={() => handleUpdateAnimationMode(mode)}
                  disabled={updatingMode}
                  className={`relative p-4 rounded-xl border-2 transition-all duration-200 text-left ${animationMode === mode
                    ? 'border-purple-500 bg-purple-50 shadow-lg'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    } ${updatingMode ? 'opacity-50 cursor-wait' : ''}`}
                >
                  {/* 選中指示器 */}
                  {animationMode === mode && (
                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center">
                      <CheckCircle className="w-4 h-4 text-white" />
                    </div>
                  )}

                  <div className={`mb-2 ${animationMode === mode ? 'text-purple-600' : 'text-gray-600'}`}>
                    {icon}
                  </div>
                  <div className={`font-semibold ${animationMode === mode ? 'text-purple-700' : 'text-gray-800'}`}>
                    {name}
                  </div>
                  <div className="text-xs text-gray-500 mt-1 line-clamp-2">
                    {description}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* 中獎通知設定 */}
          <div className="mt-6 border-t pt-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">📱 中獎通知設定</h3>
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {lotteryState.notify_winner_enabled ? (
                    <Bell className="w-6 h-6 text-green-600" />
                  ) : (
                    <BellOff className="w-6 h-6 text-gray-400" />
                  )}
                  <div>
                    <div className="font-medium text-gray-800">
                      LINE 中獎通知
                    </div>
                    <p className="text-sm text-gray-600">
                      {lotteryState.notify_winner_enabled
                        ? '中獎時會自動發送 LINE 訊息通知中獎者'
                        : '中獎時不會發送 LINE 訊息通知'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={async () => {
                    try {
                      const response = await fetch('/api/lottery/control', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          notify_winner_enabled: !lotteryState.notify_winner_enabled,
                          admin_id: profile?.userId
                        }),
                      })
                      const data = await response.json()
                      if (data.success) {
                        setLotteryState(data.state)
                        showMessage('success', data.state.notify_winner_enabled ? '中獎通知已開啟' : '中獎通知已關閉')
                      } else {
                        showMessage('error', data.error || '更新失敗')
                      }
                    } catch {
                      showMessage('error', '更新失敗')
                    }
                  }}
                  className={`relative w-14 h-8 rounded-full transition-colors duration-200 ${lotteryState.notify_winner_enabled ? 'bg-green-500' : 'bg-gray-300'
                    }`}
                >
                  <div
                    className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow transition-transform duration-200 ${lotteryState.notify_winner_enabled ? 'translate-x-7' : 'translate-x-1'
                      }`}
                  />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 符合資格用戶列表 */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <Users className="w-6 h-6 text-gray-600" />
              <h3 className="text-xl font-semibold text-gray-800">
                符合資格用戶 ({eligibleUsers.length})
              </h3>
            </div>
            <button
              onClick={fetchEligibleUsers}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <RefreshCw className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          {eligibleUsers.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              暫無符合資格的用戶（需至少上傳1張公開照片）
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
              {eligibleUsers.map((user) => (
                <div
                  key={user.line_id}
                  className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <img
                    src={user.avatar_url || '/default-avatar.png'}
                    alt={user.display_name}
                    className="w-12 h-12 rounded-full"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{user.display_name}</div>
                    <div className="text-sm text-gray-500">
                      {user.photo_count} 張公開照片
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 抽獎歷史 */}
        {showHistory && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <History className="w-6 h-6 text-gray-600" />
                <h3 className="text-xl font-semibold text-gray-800">
                  抽獎歷史 ({lotteryHistory.length})
                </h3>
              </div>
              {lotteryHistory.length > 0 && (
                <button
                  onClick={handleClearAllHistory}
                  className="flex items-center space-x-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors font-medium"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>清除所有記錄</span>
                </button>
              )}
            </div>

            {lotteryHistory.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                暫無抽獎記錄
              </div>
            ) : (
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {lotteryHistory.map((record) => (
                  <div
                    key={record.id}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex items-center space-x-4">
                      <img
                        src={record.winner_avatar_url || '/default-avatar.png'}
                        alt={record.winner_display_name}
                        className="w-12 h-12 rounded-full"
                      />
                      {/* 中獎照片 */}
                      {record.winner_photo_url && (
                        <img
                          src={extractOriginalUrl(record.winner_photo_url) || record.winner_photo_url}
                          alt="中獎照片"
                          className="w-16 h-16 rounded-lg object-cover border-2 border-yellow-400"
                        />
                      )}
                      <div>
                        <div className="font-medium text-gray-900">
                          🎉 {record.winner_display_name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {record.photo_count} 張照片 • {formatDate(record.draw_time)}
                        </div>
                        <div className="text-xs text-gray-400">
                          參與人數: {record.participants_count} • 管理員: {record.admin_name}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteHistory(record.id)}
                      className="p-2 hover:bg-red-100 text-red-600 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
