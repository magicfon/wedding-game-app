'use client'

import { useState, useEffect } from 'react'
import { useLiff } from '@/hooks/useLiff'
import { 
  UserPlus, 
  UserMinus, 
  Users, 
  Shield, 
  Trash2, 
  Plus,
  CheckCircle,
  XCircle,
  AlertTriangle
} from 'lucide-react'

interface Admin {
  id: number
  line_id: string
  display_name: string
  created_at: string
  created_by: string
  is_active: boolean
  notes?: string
}

export default function AdminSettingsPage() {
  const [admins, setAdmins] = useState<Admin[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [newAdminData, setNewAdminData] = useState({
    lineId: '',
    displayName: '',
    notes: ''
  })
  const { profile } = useLiff()

  // 獲取管理員列表
  const fetchAdmins = async () => {
    if (!profile?.userId) return

    try {
      const response = await fetch(`/api/admin/manage-admins?requester=${profile.userId}`)
      const data = await response.json()
      
      if (response.ok) {
        setAdmins(data.admins)
      } else {
        setError(data.error || '獲取管理員列表失敗')
      }
    } catch (error) {
      setError('網路錯誤')
    } finally {
      setLoading(false)
    }
  }

  // 添加管理員
  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile?.userId) return

    try {
      const response = await fetch('/api/admin/manage-admins', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requesterLineId: profile.userId,
          newAdminLineId: newAdminData.lineId,
          displayName: newAdminData.displayName,
          notes: newAdminData.notes
        }),
      })

      const data = await response.json()
      
      if (response.ok) {
        setNewAdminData({ lineId: '', displayName: '', notes: '' })
        setShowAddForm(false)
        fetchAdmins() // 重新獲取列表
      } else {
        setError(data.error || '添加管理員失敗')
      }
    } catch (error) {
      setError('網路錯誤')
    }
  }

  // 移除管理員
  const handleRemoveAdmin = async (lineId: string) => {
    if (!profile?.userId) return
    if (!confirm('確定要移除此管理員嗎？')) return

    try {
      const response = await fetch('/api/admin/manage-admins', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requesterLineId: profile.userId,
          targetLineId: lineId
        }),
      })

      const data = await response.json()
      
      if (response.ok) {
        fetchAdmins() // 重新獲取列表
      } else {
        setError(data.error || '移除管理員失敗')
      }
    } catch (error) {
      setError('網路錯誤')
    }
  }

  useEffect(() => {
    fetchAdmins()
  }, [profile])

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-4xl mx-auto">
        {/* 標題 */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Shield className="w-8 h-8 text-blue-500" />
              <div>
                <h1 className="text-2xl font-bold text-gray-800">管理員設置</h1>
                <p className="text-gray-600">管理系統管理員權限</p>
              </div>
            </div>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="flex items-center space-x-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>添加管理員</span>
            </button>
          </div>
        </div>

        {/* 錯誤提示 */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center space-x-2">
              <XCircle className="w-5 h-5 text-red-500" />
              <span className="text-red-700">{error}</span>
            </div>
          </div>
        )}

        {/* 添加管理員表單 */}
        {showAddForm && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">添加新管理員</h3>
            <form onSubmit={handleAddAdmin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Line ID *
                </label>
                <input
                  type="text"
                  value={newAdminData.lineId}
                  onChange={(e) => setNewAdminData({ ...newAdminData, lineId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="輸入 Line ID"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  顯示名稱
                </label>
                <input
                  type="text"
                  value={newAdminData.displayName}
                  onChange={(e) => setNewAdminData({ ...newAdminData, displayName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="輸入顯示名稱"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  備註
                </label>
                <textarea
                  value={newAdminData.notes}
                  onChange={(e) => setNewAdminData({ ...newAdminData, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="輸入備註信息"
                  rows={3}
                />
              </div>
              <div className="flex space-x-3">
                <button
                  type="submit"
                  className="flex items-center space-x-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>添加</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  取消
                </button>
              </div>
            </form>
          </div>
        )}

        {/* 管理員列表 */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center space-x-3 mb-6">
            <Users className="w-6 h-6 text-gray-600" />
            <h2 className="text-xl font-semibold text-gray-800">
              管理員列表 ({admins.length})
            </h2>
          </div>

          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
              <p className="text-gray-600 mt-2">載入中...</p>
            </div>
          ) : admins.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">暫無管理員</p>
            </div>
          ) : (
            <div className="space-y-4">
              {admins.map((admin) => (
                <div
                  key={admin.id}
                  className={`border rounded-lg p-4 ${
                    admin.is_active ? 'border-gray-200' : 'border-red-200 bg-red-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        admin.is_active ? 'bg-blue-100' : 'bg-red-100'
                      }`}>
                        <Shield className={`w-5 h-5 ${
                          admin.is_active ? 'text-blue-600' : 'text-red-600'
                        }`} />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className="font-semibold text-gray-800">
                            {admin.display_name || '未設置名稱'}
                          </h3>
                          {admin.is_active ? (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-500" />
                          )}
                        </div>
                        <p className="text-sm text-gray-600">ID: {admin.line_id}</p>
                        {admin.notes && (
                          <p className="text-sm text-gray-500 mt-1">{admin.notes}</p>
                        )}
                        <p className="text-xs text-gray-400 mt-1">
                          創建時間: {new Date(admin.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    
                    {admin.is_active && admin.line_id !== profile?.userId && (
                      <button
                        onClick={() => handleRemoveAdmin(admin.line_id)}
                        className="flex items-center space-x-2 bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>移除</span>
                      </button>
                    )}
                    
                    {admin.line_id === profile?.userId && (
                      <div className="text-sm text-blue-600 font-medium">
                        目前登入
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 說明 */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-6">
          <div className="flex items-start space-x-2">
            <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
            <div className="text-sm text-yellow-800">
              <p className="font-medium mb-1">使用說明：</p>
              <ul className="list-disc list-inside space-y-1">
                <li>管理員可以通過 Line ID 自動認證，無需輸入密碼</li>
                <li>添加新管理員需要對方的完整 Line ID</li>
                <li>移除的管理員將無法訪問管理功能</li>
                <li>您無法移除自己的管理員權限</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
