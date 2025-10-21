'use client'

import { useState, useEffect } from 'react'
import { useLiff } from '@/hooks/useLiff'
import { useRouter } from 'next/navigation'
import AdminLayout from '@/components/AdminLayout'
import { Trophy, Clock, TrendingUp, TrendingDown, Search, Users, Award } from 'lucide-react'

interface User {
  line_id: string
  display_name: string
  quiz_score: number
  total_score: number
  avatar_url?: string
}

interface ScoreHistoryRecord {
  id: string
  type: 'answer' | 'adjustment'
  score_change: number
  description: string
  details: any
  created_at: string
  icon: string
  score_after: number
  score_before: number
}

interface ScoreHistoryResponse {
  success: boolean
  user: {
    line_id: string
    display_name: string
    current_total_score: number
  }
  history: ScoreHistoryRecord[]
  pagination: {
    limit: number
    offset: number
    total_records: number
    has_more: boolean
  }
}

export default function AdminScoreHistoryPage() {
  const [users, setUsers] = useState<User[]>([])
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [history, setHistory] = useState<ScoreHistoryRecord[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [historyLoading, setHistoryLoading] = useState(false)
  
  const { isLoggedIn, isAdmin, loading: liffLoading, adminLoading } = useLiff()
  const router = useRouter()

  // 檢查管理員權限
  useEffect(() => {
    if (liffLoading || adminLoading) return
    if (!isLoggedIn || !isAdmin) {
      router.push('/')
    }
  }, [liffLoading, adminLoading, isLoggedIn, isAdmin, router])

  // 載入用戶列表
  const fetchUsers = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/scores')
      const data = await response.json()
      
      if (data.success) {
        setUsers(data.users || [])
      }
    } catch (error) {
      console.error('載入用戶列表失敗:', error)
    } finally {
      setLoading(false)
    }
  }

  // 載入特定用戶的積分歷史
  const fetchUserHistory = async (userId: string) => {
    try {
      setHistoryLoading(true)
      const response = await fetch(`/api/user/score-history?user_line_id=${userId}&limit=100`)
      const data: ScoreHistoryResponse = await response.json()
      
      if (data.success) {
        setHistory(data.history)
      } else {
        setHistory([])
      }
    } catch (error) {
      console.error('載入積分歷史失敗:', error)
      setHistory([])
    } finally {
      setHistoryLoading(false)
    }
  }

  useEffect(() => {
    if (isLoggedIn && isAdmin) {
      fetchUsers()
    }
  }, [isLoggedIn, isAdmin])

  // 處理用戶選擇
  const handleUserSelect = (user: User) => {
    setSelectedUser(user)
    fetchUserHistory(user.line_id)
  }

  // 格式化日期
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('zh-TW', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // 格式化答題時間
  const formatAnswerTime = (timeMs: number) => {
    const seconds = Math.floor(timeMs / 1000)
    return `${seconds}秒`
  }

  // 過濾用戶
  const filteredUsers = users.filter(user =>
    user.display_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.line_id.includes(searchTerm)
  )

  if (liffLoading || adminLoading || loading) {
    return (
      <AdminLayout title="積分歷史查看">
        <div className="flex justify-center items-center py-12">
          <div className="text-gray-500">載入中...</div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout title="積分歷史查看">
      <div className="max-w-7xl mx-auto">
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* 用戶列表 */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md">
              <div className="px-6 py-4 bg-gray-50 border-b">
                <div className="flex items-center space-x-2 mb-4">
                  <Users className="w-5 h-5 text-gray-600" />
                  <h3 className="text-lg font-semibold">選擇用戶</h3>
                </div>
                
                {/* 搜尋框 */}
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="搜尋用戶名稱或ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                  />
                </div>
              </div>
              
              {/* 用戶列表 */}
              <div className="max-h-96 overflow-y-auto">
                {filteredUsers.length === 0 ? (
                  <div className="p-6 text-center text-gray-500">
                    沒有找到用戶
                  </div>
                ) : (
                  filteredUsers.map((user) => (
                    <div
                      key={user.line_id}
                      onClick={() => handleUserSelect(user)}
                      className={`p-4 border-b cursor-pointer hover:bg-gray-50 transition-colors ${
                        selectedUser?.line_id === user.line_id ? 'bg-blue-50 border-blue-200' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          {user.avatar_url ? (
                            <img 
                              src={user.avatar_url} 
                              alt={user.display_name}
                              className="w-8 h-8 rounded-full"
                            />
                          ) : (
                            <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                              <Users className="w-4 h-4 text-gray-600" />
                            </div>
                          )}
                          <div>
                            <div className="font-medium text-gray-900">
                              {user.display_name}
                            </div>
                            <div className="text-xs text-gray-500 truncate">
                              {user.line_id}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-blue-600">
                            {user.total_score}
                          </div>
                          <div className="text-xs text-gray-500">積分</div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* 積分歷史詳情 */}
          <div className="lg:col-span-2">
            {!selectedUser ? (
              <div className="bg-white rounded-lg shadow-md p-12 text-center">
                <Award className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">選擇用戶查看積分歷史</h3>
                <p className="text-gray-500">從左側列表選擇一個用戶來查看其詳細的積分變動歷史</p>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-md">
                {/* 用戶資訊頭部 */}
                <div className="px-6 py-4 bg-gradient-to-r from-purple-500 to-blue-600 text-white rounded-t-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {selectedUser.avatar_url ? (
                        <img 
                          src={selectedUser.avatar_url} 
                          alt={selectedUser.display_name}
                          className="w-12 h-12 rounded-full border-2 border-white"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                          <Users className="w-6 h-6 text-white" />
                        </div>
                      )}
                      <div>
                        <h2 className="text-xl font-bold">{selectedUser.display_name}</h2>
                        <p className="text-sm opacity-80">{selectedUser.line_id}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-bold">{selectedUser.total_score}</div>
                      <div className="text-sm opacity-80">目前總分</div>
                    </div>
                  </div>
                </div>

                {/* 積分歷史列表 */}
                <div className="p-6">
                  {historyLoading ? (
                    <div className="text-center py-8">
                      <Clock className="w-8 h-8 mx-auto mb-2 text-gray-400 animate-spin" />
                      <p className="text-gray-500">載入積分歷史中...</p>
                    </div>
                  ) : history.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Trophy className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                      <p>該用戶還沒有積分變動記錄</p>
                    </div>
                  ) : (
                    <div className="space-y-4 max-h-96 overflow-y-auto">
                      {history.map((record) => (
                        <div key={record.id} className="flex items-start space-x-4 p-4 bg-gray-50 rounded-lg">
                          {/* 圖示 */}
                          <div className="flex-shrink-0">
                            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-lg shadow-sm">
                              {record.icon}
                            </div>
                          </div>

                          {/* 內容 */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="text-sm font-medium text-gray-900">
                                {record.description}
                              </h4>
                              <div className={`flex items-center space-x-1 text-sm font-medium ${
                                record.score_change > 0 ? 'text-green-600' : 'text-red-600'
                              }`}>
                                {record.score_change > 0 ? (
                                  <TrendingUp className="w-4 h-4" />
                                ) : (
                                  <TrendingDown className="w-4 h-4" />
                                )}
                                <span>
                                  {record.score_change > 0 ? '+' : ''}{record.score_change}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center justify-between text-xs text-gray-500">
                              <div className="flex items-center space-x-4">
                                <span>{formatDate(record.created_at)}</span>
                                
                                {/* 詳細資訊 */}
                                {record.type === 'answer' && record.details && (
                                  <>
                                    <span>答案: {record.details.selected_answer || '未答題'}</span>
                                    {record.details.answer_time && (
                                      <span>用時: {formatAnswerTime(record.details.answer_time)}</span>
                                    )}
                                    <span className={`px-2 py-1 rounded-full text-xs ${
                                      record.details.is_correct ? 'bg-green-100 text-green-800' :
                                      record.details.is_timeout ? 'bg-red-100 text-red-800' :
                                      'bg-gray-100 text-gray-800'
                                    }`}>
                                      {record.details.is_correct ? '答對' : 
                                       record.details.is_timeout ? '超時' : '答錯'}
                                    </span>
                                  </>
                                )}

                                {record.type === 'adjustment' && record.details?.reason && (
                                  <span>原因: {record.details.reason}</span>
                                )}
                              </div>
                              
                              <span>總分: {record.score_after}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
