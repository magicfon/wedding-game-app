'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import AdminLayout from '@/components/AdminLayout'
import { useLiff } from '@/hooks/useLiff'
import {
  Gift,
  Settings,
  Save,
  Trash2,
  RefreshCw,
  ExternalLink,
  CheckCircle,
  XCircle
} from 'lucide-react'

interface Photo {
  id: number
  image_url: string
  user_id: string
  display_name: string
  avatar_url: string
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

interface TrackConfig {
  chamberWidth: number
  chamberHeight: number
  ballDiameter: number
  startPoint: { x: number; y: number }
  endPoint: { x: number; y: number }
  nodes: Array<{ id: number; x: number; y: number }>
}

interface PhysicsConfig {
  gravity: number
  airForce: number
  lateralAirForce: number
  maxVelocity: number
}

export default function LotteryMachineLiveAdminPage() {
  const [eligibleUsers, setEligibleUsers] = useState<Photo[]>([])
  const [lotteryHistory, setLotteryHistory] = useState<LotteryHistory[]>([])
  const [trackConfig, setTrackConfig] = useState<TrackConfig>({
    chamberWidth: 480,
    chamberHeight: 220,
    ballDiameter: 42,
    startPoint: { x: 50, y: 75 },
    endPoint: { x: 15, y: 8 },
    nodes: [
      { id: 1, x: 95, y: 75 },
      { id: 2, x: 95, y: 55 },
      { id: 3, x: 5, y: 55 },
      { id: 4, x: 5, y: 25 },
      { id: 5, x: 25, y: 25 }
    ]
  })
  const [physics, setPhysics] = useState<PhysicsConfig>({
    gravity: 0.35,
    airForce: 0.8,
    lateralAirForce: 0.2,
    maxVelocity: 15
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  const { isLoggedIn, isAdmin, profile, loading: liffLoading, adminLoading } = useLiff()
  const router = useRouter()

  useEffect(() => {
    if (liffLoading || adminLoading) return
    if (!isLoggedIn || !isAdmin) {
      router.push('/')
    }
  }, [liffLoading, adminLoading, isLoggedIn, isAdmin, router])

  useEffect(() => {
    if (isLoggedIn && isAdmin) {
      fetchData()
    }
  }, [isLoggedIn, isAdmin])

  const fetchData = async () => {
    await Promise.all([
      fetchPhotos(),
      fetchConfig(),
      fetchLotteryHistory()
    ])
    setLoading(false)
  }

  const fetchPhotos = async () => {
    try {
      const response = await fetch('/api/lottery-machine/photos')
      const data = await response.json()

      if (data.success) {
        setEligibleUsers(data.photos || [])
      } else {
        showMessage('error', data.error || '獲取照片失敗')
      }
    } catch (error) {
      console.error('獲取照片失敗:', error)
      showMessage('error', '獲取照片失敗')
    }
  }

  const fetchConfig = async () => {
    try {
      const response = await fetch('/api/lottery-machine/config')
      const data = await response.json()

      if (data.success && data.config) {
        if (data.config.trackConfig) {
          setTrackConfig(data.config.trackConfig)
        }
        if (data.config.physics) {
          setPhysics(data.config.physics)
        }
      }
    } catch (error) {
      console.error('載入設定失敗:', error)
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

  const saveConfig = async () => {
    setSaving(true)
    try {
      const response = await fetch('/api/lottery-machine/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          trackConfig,
          physics,
          admin_id: profile?.userId
        })
      })

      const data = await response.json()

      if (data.success) {
        showMessage('success', '設定已儲存')
      } else {
        showMessage('error', data.error || '儲存設定失敗')
      }
    } catch (error) {
      console.error('儲存設定失敗:', error)
      showMessage('error', '儲存設定失敗')
    } finally {
      setSaving(false)
    }
  }

  const addNode = () => {
    const newId = trackConfig.nodes.length + 1
    const lastNode = trackConfig.nodes[trackConfig.nodes.length - 1] || trackConfig.startPoint
    setTrackConfig(prev => ({
      ...prev,
      nodes: [
        ...prev.nodes,
        {
          id: newId,
          x: Math.min(95, lastNode.x + 10),
          y: Math.max(5, lastNode.y - 10)
        }
      ]
    }))
  }

  const removeNode = (index: number) => {
    setTrackConfig(prev => ({
      ...prev,
      nodes: prev.nodes.filter((_, i) => i !== index).map((n, i) => ({ ...n, id: i + 1 }))
    }))
  }

  const updateNode = (index: number, field: 'x' | 'y', value: number) => {
    setTrackConfig(prev => ({
      ...prev,
      nodes: prev.nodes.map((n, i) => 
        i === index ? { ...n, [field]: value } : n
      )
    }))
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
      <AdminLayout title="彩票機管理">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500"></div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout title="彩票機管理">
      <div className="space-y-6">
        {/* 訊息提示 */}
        {message && (
          <div className={`p-4 rounded-lg ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
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

        {/* 概況面板 */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <Gift className="w-8 h-8 text-pink-500" />
              <div>
                <h2 className="text-2xl font-bold text-gray-800">彩票機</h2>
                <p className="text-gray-600">符合資格：{eligibleUsers.length} 人</p>
              </div>
            </div>
            <button
              onClick={() => window.open('/lottery-machine-live', '_blank')}
              className="flex items-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              <span>開啟大螢幕</span>
            </button>
          </div>

          {/* 彩球與物理設定 */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <Settings className="w-5 h-5 mr-2 text-pink-500" />
              彩球與物理
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  彩球直徑
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="range"
                    min="25"
                    max="80"
                    value={trackConfig.ballDiameter}
                    onChange={(e) => setTrackConfig(prev => ({ ...prev, ballDiameter: parseInt(e.target.value) }))}
                    className="flex-1"
                  />
                  <span className="text-sm text-gray-600 w-12">{trackConfig.ballDiameter}px</span>
                </div>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  重力
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="range"
                    min="0.1"
                    max="1.0"
                    step="0.05"
                    value={physics.gravity}
                    onChange={(e) => setPhysics(prev => ({ ...prev, gravity: parseFloat(e.target.value) }))}
                    className="flex-1"
                  />
                  <span className="text-sm text-gray-600 w-12">{physics.gravity}</span>
                </div>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  氣流力
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="range"
                    min="0.2"
                    max="2.0"
                    step="0.1"
                    value={physics.airForce}
                    onChange={(e) => setPhysics(prev => ({ ...prev, airForce: parseFloat(e.target.value) }))}
                    className="flex-1"
                  />
                  <span className="text-sm text-gray-600 w-12">{physics.airForce}</span>
                </div>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  側向氣流力
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="range"
                    min="0"
                    max="1.0"
                    step="0.05"
                    value={physics.lateralAirForce}
                    onChange={(e) => setPhysics(prev => ({ ...prev, lateralAirForce: parseFloat(e.target.value) }))}
                    className="flex-1"
                  />
                  <span className="text-sm text-gray-600 w-12">{physics.lateralAirForce}</span>
                </div>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  最大速度
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="range"
                    min="5"
                    max="30"
                    step="1"
                    value={physics.maxVelocity}
                    onChange={(e) => setPhysics(prev => ({ ...prev, maxVelocity: parseInt(e.target.value) }))}
                    className="flex-1"
                  />
                  <span className="text-sm text-gray-600 w-12">{physics.maxVelocity}</span>
                </div>
              </div>
            </div>
          </div>

          {/* 軌道設定 */}
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">📍 軌道設定</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  起點 (漏斗)
                </label>
                <div className="flex items-center space-x-2">
                  <span>X:</span>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={trackConfig.startPoint.x}
                    onChange={(e) => setTrackConfig(prev => ({ ...prev, startPoint: { ...prev.startPoint, x: parseInt(e.target.value) || 0 } }))}
                    className="w-20 px-2 py-1 border border-gray-300 rounded"
                  />
                  <span>%</span>
                  <span>Y:</span>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={trackConfig.startPoint.y}
                    onChange={(e) => setTrackConfig(prev => ({ ...prev, startPoint: { ...prev.startPoint, y: parseInt(e.target.value) || 0 } }))}
                    className="w-20 px-2 py-1 border-gray-300 rounded"
                  />
                  <span>%</span>
                </div>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  終點 (平台)
                </label>
                <div className="flex items-center space-x-2">
                  <span>X:</span>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={trackConfig.endPoint.x}
                    onChange={(e) => setTrackConfig(prev => ({ ...prev, endPoint: { ...prev.endPoint, x: parseInt(e.target.value) || 0 } }))}
                    className="w-20 px-2 py-1 border-gray-300 rounded"
                  />
                  <span>%</span>
                  <span>Y:</span>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={trackConfig.endPoint.y}
                    onChange={(e) => setTrackConfig(prev => ({ ...prev, endPoint: { ...prev.endPoint, y: parseInt(e.target.value) || 0 } }))}
                    className="w-20 px-2 py-1 border-gray-300 rounded"
                  />
                  <span>%</span>
                </div>
              </div>
            </div>
          </div>

          {/* 軌道節點編輯器 */}
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">🔗 軌道節點</h3>
            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-600 mb-4">
                起點 → {trackConfig.nodes.map(n => n.id).join(' → ')} → 終點
              </div>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {trackConfig.nodes.map((node, index) => (
                <div key={node.id} className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg">
                  <span className="bg-pink-500 text-white px-2 py-1 rounded font-semibold w-8 text-center">
                    {node.id}
                  </span>
                  <span>X:</span>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={node.x}
                    onChange={(e) => updateNode(index, 'x', parseInt(e.target.value) || 0)}
                    className="w-20 px-2 py-1 border border-gray-300 rounded"
                  />
                  <span>%</span>
                  <span>Y:</span>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={node.y}
                    onChange={(e) => updateNode(index, 'y', parseInt(e.target.value) || 0)}
                    className="w-20 px-2 py-1 border border-gray-300 rounded"
                  />
                  <span>%</span>
                  <button
                    onClick={() => removeNode(index)}
                    className="p-2 bg-red-500 hover:bg-red-600 text-white rounded transition-colors"
                  >
                    刪除
                  </button>
                </div>
              ))}
            </div>
            <button
              onClick={addNode}
              className="w-full py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors font-semibold"
            >
              ➕ 新增節點
            </button>
          </div>

          {/* 操作按鈕 */}
          <div className="flex gap-4">
            <button
              onClick={saveConfig}
              disabled={saving}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white rounded-lg transition-all duration-200 font-semibold disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
            >
              <Save className="w-5 h-5 mr-2" />
              {saving ? '儲存中...' : '儲存設定'}
            </button>
            <button
              onClick={fetchData}
              className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors font-semibold"
            >
              <RefreshCw className="w-5 h-5 mr-2" />
              重新載入
            </button>
          </div>

          {/* 抽獎歷史 */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <Gift className="w-6 h-6 text-gray-600" />
                <h3 className="text-lg font-semibold text-gray-800">抽獎歷史</h3>
              </div>
            </div>

            {lotteryHistory.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                暫無抽獎記錄
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {lotteryHistory.map((record) => (
                  <div
                    key={record.id}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center space-x-4">
                      <img
                        src={record.winner_avatar_url || '/default-avatar.png'}
                        alt={record.winner_display_name}
                        className="w-12 h-12 rounded-full"
                      />
                      <div>
                        <div className="font-medium text-gray-900">
                          🎉 {record.winner_display_name}
                        </div>
                        <div className="text-sm text-gray-600">
                          {record.photo_count} 張照片 • {formatDate(record.draw_time)}
                        </div>
                        <div className="text-xs text-gray-500">
                          管理員：{record.admin_name} • 參與人數：{record.participants_count}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={async () => {
                        if (!confirm('確定要刪除這筆抽獎記錄嗎？')) return
                        
                        try {
                          const response = await fetch('/api/lottery/history', {
                            method: 'DELETE',
                            headers: {
                              'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                              lottery_id: record.id,
                              admin_id: profile?.userId
                            })
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
                      }}
                      className="p-2 hover:bg-red-100 text-red-600 rounded transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
