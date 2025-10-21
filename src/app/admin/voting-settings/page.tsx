'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useLiff } from '@/hooks/useLiff'
import AdminLayout from '@/components/AdminLayout'
import { Trophy, Save, RefreshCw, CheckCircle, XCircle, RotateCcw, AlertTriangle } from 'lucide-react'

export default function VotingSettingsPage() {
  const [votingEnabled, setVotingEnabled] = useState(false)
  const [votesPerUser, setVotesPerUser] = useState(3)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null)
  const [stats, setStats] = useState({
    totalVotes: 0,
    totalPhotos: 0,
    activeVoters: 0
  })
  
  const router = useRouter()
  const { isLoggedIn, profile, isAdmin, loading: liffLoading } = useLiff()

  // 檢查管理員權限
  useEffect(() => {
    if (!liffLoading && (!isLoggedIn || !isAdmin)) {
      router.push('/')
    }
  }, [isLoggedIn, isAdmin, liffLoading, router])

  // 載入投票設定
  useEffect(() => {
    if (isAdmin && profile) {
      loadSettings()
      loadStats()
    }
  }, [isAdmin, profile])

  const loadSettings = async () => {
    try {
      const response = await fetch('/api/admin/voting-settings/get')
      const data = await response.json()
      
      if (data.success) {
        setVotingEnabled(data.settings.voting_enabled)
        setVotesPerUser(data.settings.votes_per_user)
      }
    } catch (error) {
      console.error('載入設定失敗:', error)
      showMessage('error', '載入設定失敗')
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      const response = await fetch('/api/admin/voting-settings/stats')
      const data = await response.json()
      
      if (data.success) {
        setStats(data.stats)
      }
    } catch (error) {
      console.error('載入統計失敗:', error)
    }
  }

  const saveSettings = async () => {
    setSaving(true)
    try {
      const response = await fetch('/api/admin/voting-settings/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          votingEnabled,
          votesPerUser
        })
      })

      const data = await response.json()

      if (data.success) {
        showMessage('success', '設定儲存成功！')
        loadStats() // 重新載入統計
      } else {
        showMessage('error', data.error || '儲存失敗')
      }
    } catch (error) {
      console.error('儲存設定失敗:', error)
      showMessage('error', '儲存設定失敗')
    } finally {
      setSaving(false)
    }
  }

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 3000)
  }

  const resetAllVotes = async () => {
    setResetting(true)
    try {
      const response = await fetch('/api/admin/voting-settings/reset', {
        method: 'POST'
      })

      const data = await response.json()

      if (data.success) {
        showMessage('success', '已成功重置所有投票！')
        loadStats() // 重新載入統計
        setShowResetConfirm(false)
      } else {
        showMessage('error', data.error || '重置失敗')
      }
    } catch (error) {
      console.error('重置投票失敗:', error)
      showMessage('error', '重置投票失敗')
    } finally {
      setResetting(false)
    }
  }

  if (loading || liffLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500"></div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto">
        {/* 頁面標題 */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex items-center space-x-3">
            <Trophy className="w-8 h-8 text-pink-500" />
            <div>
              <h1 className="text-2xl font-bold text-gray-800">投票設定</h1>
              <p className="text-gray-600">管理照片牆投票功能</p>
            </div>
          </div>
        </div>

        {/* 成功/錯誤訊息 */}
        {message && (
          <div className={`rounded-lg p-4 mb-6 flex items-center space-x-2 ${
            message.type === 'success' 
              ? 'bg-green-100 text-green-700' 
              : 'bg-red-100 text-red-700'
          }`}>
            {message.type === 'success' ? (
              <CheckCircle className="w-5 h-5" />
            ) : (
              <XCircle className="w-5 h-5" />
            )}
            <span>{message.text}</span>
          </div>
        )}

        {/* 統計卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="text-sm text-gray-600 mb-2">總投票數</div>
            <div className="text-3xl font-bold text-gray-800">{stats.totalVotes}</div>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="text-sm text-gray-600 mb-2">公開照片數</div>
            <div className="text-3xl font-bold text-gray-800">{stats.totalPhotos}</div>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="text-sm text-gray-600 mb-2">參與投票人數</div>
            <div className="text-3xl font-bold text-gray-800">{stats.activeVoters}</div>
          </div>
        </div>

        {/* 設定表單 */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-6">投票功能設定</h2>

          {/* 開啟/關閉投票 */}
          <div className="mb-6">
            <label className="flex items-center space-x-3 cursor-pointer">
              <div className="relative">
                <input
                  type="checkbox"
                  checked={votingEnabled}
                  onChange={(e) => setVotingEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-14 h-8 bg-gray-300 rounded-full peer-checked:bg-green-500 transition-colors"></div>
                <div className="absolute left-1 top-1 w-6 h-6 bg-white rounded-full transition-transform peer-checked:translate-x-6"></div>
              </div>
              <div>
                <div className="font-medium text-gray-800">
                  {votingEnabled ? '投票功能已開啟' : '投票功能已關閉'}
                </div>
                <div className="text-sm text-gray-600">
                  {votingEnabled 
                    ? '賓客可以對照片投票' 
                    : '賓客無法進行投票'
                  }
                </div>
              </div>
            </label>
          </div>

          {/* 每人票數設定 */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              每人可投票數
            </label>
            <div className="flex items-center space-x-4">
              <input
                type="number"
                min="1"
                max="20"
                value={votesPerUser}
                onChange={(e) => setVotesPerUser(parseInt(e.target.value) || 1)}
                className="w-24 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 text-black"
              />
              <span className="text-gray-600">票</span>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              每位賓客總共可以投 {votesPerUser} 票（可對同一張照片重複投票）
            </p>
          </div>

          {/* 快速設定按鈕 */}
          <div className="mb-6">
            <div className="text-sm font-medium text-gray-700 mb-2">快速設定</div>
            <div className="flex flex-wrap gap-2">
              {[1, 3, 5, 10].map((count) => (
                <button
                  key={count}
                  onClick={() => setVotesPerUser(count)}
                  className={`px-4 py-2 rounded-lg border transition-colors ${
                    votesPerUser === count
                      ? 'bg-pink-500 text-white border-pink-500'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-pink-500'
                  }`}
                >
                  {count} 票
                </button>
              ))}
            </div>
          </div>

          {/* 儲存按鈕 */}
          <div className="flex items-center space-x-3">
            <button
              onClick={saveSettings}
              disabled={saving}
              className="flex items-center space-x-2 bg-pink-500 hover:bg-pink-600 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg transition-colors font-semibold"
            >
              {saving ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>儲存中...</span>
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  <span>儲存設定</span>
                </>
              )}
            </button>

            <button
              onClick={() => {
                loadSettings()
                loadStats()
              }}
              disabled={saving}
              className="flex items-center space-x-2 bg-gray-500 hover:bg-gray-600 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg transition-colors"
            >
              <RefreshCw className="w-5 h-5" />
              <span>重新載入</span>
            </button>
          </div>
        </div>

        {/* 危險操作區域 */}
        <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-6 mt-6">
          <div className="flex items-center space-x-2 mb-4">
            <AlertTriangle className="w-6 h-6 text-red-600" />
            <h3 className="font-semibold text-red-900">危險操作</h3>
          </div>
          
          <div className="bg-white rounded-xl p-4 mb-4">
            <h4 className="font-medium text-gray-800 mb-2">重置所有投票</h4>
            <p className="text-sm text-gray-600 mb-4">
              此操作會刪除所有賓客的投票記錄，並將所有照片的票數歸零。此操作無法復原！
            </p>
            
            {!showResetConfirm ? (
              <button
                onClick={() => setShowResetConfirm(true)}
                className="flex items-center space-x-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                <span>重置所有投票</span>
              </button>
            ) : (
              <div className="space-y-3">
                <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-3">
                  <p className="text-sm text-yellow-800 font-medium">
                    ⚠️ 確定要重置所有投票嗎？
                  </p>
                  <p className="text-sm text-yellow-700 mt-1">
                    目前有 <strong>{stats.totalVotes}</strong> 筆投票記錄，來自 <strong>{stats.activeVoters}</strong> 位賓客
                  </p>
                </div>
                
                <div className="flex items-center space-x-3">
                  <button
                    onClick={resetAllVotes}
                    disabled={resetting}
                    className="flex items-center space-x-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg transition-colors font-semibold"
                  >
                    {resetting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>重置中...</span>
                      </>
                    ) : (
                      <>
                        <RotateCcw className="w-4 h-4" />
                        <span>確認重置</span>
                      </>
                    )}
                  </button>
                  
                  <button
                    onClick={() => setShowResetConfirm(false)}
                    disabled={resetting}
                    className="px-4 py-2 bg-gray-200 hover:bg-gray-300 disabled:bg-gray-100 text-gray-700 rounded-lg transition-colors"
                  >
                    取消
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 說明卡片 */}
        <div className="bg-blue-50 rounded-xl p-6 mt-6">
          <h3 className="font-semibold text-blue-900 mb-3">💡 使用說明</h3>
          <ul className="space-y-2 text-sm text-blue-800">
            <li>• 開啟投票功能後，賓客可在照片牆對照片投票</li>
            <li>• 每位賓客可投票數量由您設定，可以重複投給同一張照片</li>
            <li>• 投票數會即時更新在照片牆和快門傳情頁面</li>
            <li>• 關閉投票功能後，投票按鈕會隱藏但已投的票數仍會保留</li>
            <li>• 可隨時調整每人票數，新設定會立即生效</li>
            <li>• 如需測試投票功能，可使用「重置所有投票」清空所有記錄</li>
          </ul>
        </div>
      </div>
    </AdminLayout>
  )
}

