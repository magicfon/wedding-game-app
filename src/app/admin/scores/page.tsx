'use client'

import { useState, useEffect } from 'react'
import { createSupabaseBrowser } from '@/lib/supabase'
import AdminLayout from '@/components/AdminLayout'
import { 
  Plus, 
  Minus, 
  Trophy, 
  CheckCircle,
  XCircle,
  History
} from 'lucide-react'

interface UserScore {
  line_id: string
  display_name: string
  avatar_url: string
  quiz_score: number
  total_score: number
  join_time: string
}

interface ScoreAdjustment {
  id: number
  user_line_id: string
  admin_id: string
  adjustment_score: number
  reason: string
  created_at: string
  user?: {
    display_name: string
    avatar_url: string
  }
}

export default function ScoreManagePage() {
  const [users, setUsers] = useState<UserScore[]>([])
  const [adjustments, setAdjustments] = useState<ScoreAdjustment[]>([])
  const [loading, setLoading] = useState(true)
  const [adjustmentLoading, setAdjustmentLoading] = useState(false)
  const [selectedUser, setSelectedUser] = useState<string>('')
  const [adjustmentScore, setAdjustmentScore] = useState<number>(0)
  const [reason, setReason] = useState('')
  const [showHistory, setShowHistory] = useState(false)
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null)

  const supabase = createSupabaseBrowser()

  useEffect(() => {
    fetchUsers()
    fetchAdjustments()
  }, [])

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('quiz_score', { ascending: false })

      if (error) throw error
      setUsers(data as UserScore[])
    } catch (error) {
      console.error('Error fetching users:', error)
      showMessage('error', '載入用戶資料失敗')
    } finally {
      setLoading(false)
    }
  }

  const fetchAdjustments = async () => {
    try {
      const { data, error } = await supabase
        .from('score_adjustments')
        .select(`
          *,
          user:users!score_adjustments_user_line_id_fkey (
            display_name,
            avatar_url
          )
        `)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) throw error
      setAdjustments(data as ScoreAdjustment[])
    } catch (error) {
      console.error('Error fetching adjustments:', error)
    }
  }

  const handleScoreAdjustment = async () => {
    if (!selectedUser || adjustmentScore === 0) {
      showMessage('error', '請選擇用戶並輸入調整分數')
      return
    }

    if (!reason.trim()) {
      showMessage('error', '請輸入調整原因')
      return
    }

    setAdjustmentLoading(true)

    try {
      // 獲取當前用戶資訊（模擬管理員ID）
      const { data: { user } } = await supabase.auth.getUser()
      const adminId = user?.id || 'admin'

      const { error } = await supabase
        .from('score_adjustments')
        .insert({
          user_line_id: selectedUser,
          admin_id: adminId,
          adjustment_score: adjustmentScore,
          reason: reason.trim()
        })

      if (error) throw error

      showMessage('success', `成功調整 ${adjustmentScore > 0 ? '+' : ''}${adjustmentScore} 分`)
      
      // 重置表單
      setSelectedUser('')
      setAdjustmentScore(0)
      setReason('')
      
      // 重新載入資料
      fetchUsers()
      fetchAdjustments()
    } catch (error) {
      console.error('Error adjusting score:', error)
      showMessage('error', '分數調整失敗')
    } finally {
      setAdjustmentLoading(false)
    }
  }

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 3000)
  }

  const quickAdjust = (userId: string, score: number) => {
    setSelectedUser(userId)
    setAdjustmentScore(score)
    setReason(score > 0 ? '獎勵加分' : '扣分處理')
  }

  if (loading) {
    return (
      <AdminLayout title="分數管理">
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500"></div>
          <p className="ml-4 text-gray-600">載入中...</p>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout title="分數管理">
      <div className="space-y-8">
        {/* 訊息提示 */}
        {message && (
          <div className={`p-4 rounded-lg flex items-center space-x-2 ${
            message.type === 'success' 
              ? 'bg-green-100 text-green-800 border border-green-200' 
              : 'bg-red-100 text-red-800 border border-red-200'
          }`}>
            {message.type === 'success' ? (
              <CheckCircle className="w-5 h-5" />
            ) : (
              <XCircle className="w-5 h-5" />
            )}
            <span>{message.text}</span>
          </div>
        )}

        {/* 分數調整表單 */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-bold mb-6 flex items-center">
            <Trophy className="w-6 h-6 mr-2 text-pink-500" />
            手動調整分數
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  選擇用戶
                </label>
                <select
                  value={selectedUser}
                  onChange={(e) => setSelectedUser(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 text-black"
                >
                  <option value="">請選擇用戶</option>
                  {users.map((user) => (
                    <option key={user.line_id} value={user.line_id}>
                      {user.display_name} (快問快答分數: {user.quiz_score})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  調整分數
                </label>
                <div className="flex space-x-2">
                  <input
                    type="number"
                    value={adjustmentScore}
                    onChange={(e) => setAdjustmentScore(parseInt(e.target.value) || 0)}
                    placeholder="輸入分數 (正數加分，負數扣分)"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 text-black"
                  />
                  <button
                    onClick={() => setAdjustmentScore(10)}
                    className="px-3 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
                  >
                    +10
                  </button>
                  <button
                    onClick={() => setAdjustmentScore(-10)}
                    className="px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                  >
                    -10
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  調整原因
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="請輸入調整分數的原因..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 text-black"
                />
              </div>

              <button
                onClick={handleScoreAdjustment}
                disabled={adjustmentLoading || !selectedUser || adjustmentScore === 0 || !reason.trim()}
                className="w-full bg-pink-500 text-white py-3 px-4 rounded-lg hover:bg-pink-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
              >
                {adjustmentLoading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                ) : (
                  <>
                    <Trophy className="w-5 h-5 mr-2" />
                    確認調整分數
                  </>
                )}
              </button>
            </div>

            {/* 預覽區域 */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-medium text-gray-700 mb-3">調整預覽</h3>
              {selectedUser && users.find(u => u.line_id === selectedUser) ? (
                <div className="space-y-2">
                  <div className="flex items-center space-x-3">
                    <img
                      src={users.find(u => u.line_id === selectedUser)?.avatar_url || '/default-avatar.png'}
                      alt="Avatar"
                      className="w-10 h-10 rounded-full"
                    />
                    <div>
                      <p className="font-medium">{users.find(u => u.line_id === selectedUser)?.display_name}</p>
                      <p className="text-sm text-gray-500">
                        快問快答分數: {users.find(u => u.line_id === selectedUser)?.quiz_score}
                      </p>
                    </div>
                  </div>
                  {adjustmentScore !== 0 && (
                    <div className="mt-3 p-3 bg-white rounded border">
                      <p className="text-sm">
                        調整分數: <span className={adjustmentScore > 0 ? 'text-green-600' : 'text-red-600'}>
                          {adjustmentScore > 0 ? '+' : ''}{adjustmentScore}
                        </span>
                      </p>
                      <p className="text-sm">
                        調整後分數: <span className="font-medium">
                          {(users.find(u => u.line_id === selectedUser)?.quiz_score || 0) + adjustmentScore}
                        </span>
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-gray-500 text-sm">請選擇用戶查看預覽</p>
              )}
            </div>
          </div>
        </div>

        {/* 用戶排行榜 */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold flex items-center">
              <Trophy className="w-6 h-6 mr-2 text-pink-500" />
              當前排行榜
            </h2>
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <History className="w-4 h-4" />
              <span>{showHistory ? '隱藏' : '顯示'}調整記錄</span>
            </button>
          </div>

          <div className="space-y-3">
            {users.map((user, index) => (
              <div
                key={user.line_id}
                className={`flex items-center justify-between p-4 rounded-lg ${
                  index === 0 ? 'bg-yellow-50 border-2 border-yellow-200' :
                  index === 1 ? 'bg-gray-50 border-2 border-gray-200' :
                  index === 2 ? 'bg-orange-50 border-2 border-orange-200' :
                  'bg-gray-50'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    index === 0 ? 'bg-yellow-500 text-white' :
                    index === 1 ? 'bg-gray-500 text-white' :
                    index === 2 ? 'bg-orange-500 text-white' :
                    'bg-gray-300 text-gray-700'
                  }`}>
                    {index + 1}
                  </div>
                  <img
                    src={user.avatar_url || '/default-avatar.png'}
                    alt="Avatar"
                    className="w-10 h-10 rounded-full"
                  />
                  <div>
                    <p className="font-medium">{user.display_name}</p>
                    <p className="text-sm text-gray-500">
                      {new Date(user.join_time).toLocaleDateString('zh-TW')}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <p className="text-xl font-bold">{user.quiz_score}</p>
                    <p className="text-sm text-gray-500">分</p>
                  </div>
                  <div className="flex space-x-1">
                    <button
                      onClick={() => quickAdjust(user.line_id, 10)}
                      className="p-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
                      title="快速加10分"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => quickAdjust(user.line_id, -10)}
                      className="p-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                      title="快速扣10分"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 調整記錄 */}
        {showHistory && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold mb-6 flex items-center">
              <History className="w-6 h-6 mr-2 text-pink-500" />
              分數調整記錄
            </h2>

            <div className="space-y-3">
              {adjustments.length === 0 ? (
                <p className="text-center text-gray-500 py-8">暫無調整記錄</p>
              ) : (
                adjustments.map((adjustment) => (
                  <div
                    key={adjustment.id}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <img
                        src={adjustment.user?.avatar_url || '/default-avatar.png'}
                        alt="Avatar"
                        className="w-10 h-10 rounded-full"
                      />
                      <div>
                        <p className="font-medium">{adjustment.user?.display_name || '未知用戶'}</p>
                        <p className="text-sm text-gray-500">{adjustment.reason}</p>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className={`text-lg font-bold ${
                        adjustment.adjustment_score > 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {adjustment.adjustment_score > 0 ? '+' : ''}{adjustment.adjustment_score}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(adjustment.created_at).toLocaleString('zh-TW')}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
