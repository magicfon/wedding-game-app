'use client'

import { useState, useEffect } from 'react'
import { useLiff } from '@/hooks/useLiff'
import { useRouter } from 'next/navigation'
import Layout from '@/components/Layout'
import { Trophy, TrendingUp, TrendingDown, Calendar, Award } from 'lucide-react'

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

export default function ScoreHistoryPage() {
  const [history, setHistory] = useState<ScoreHistoryRecord[]>([])
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const { isLoggedIn, profile, loading: liffLoading } = useLiff()
  const router = useRouter()

  // 檢查登入狀態
  useEffect(() => {
    if (liffLoading) return
    if (!isLoggedIn || !profile) {
      router.push('/')
    }
  }, [liffLoading, isLoggedIn, profile, router])

  // 載入積分歷史
  const fetchScoreHistory = async () => {
    if (!profile?.userId) return

    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/user/score-history?user_line_id=${profile.userId}&limit=50`)
      const data: ScoreHistoryResponse = await response.json()
      
      if (data.success) {
        setHistory(data.history)
        setUser(data.user)
      } else {
        setError('載入積分歷史失敗')
      }
    } catch (error) {
      console.error('載入積分歷史錯誤:', error)
      setError('載入積分歷史失敗')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isLoggedIn && profile?.userId) {
      fetchScoreHistory()
    }
  }, [isLoggedIn, profile])

  // 格式化日期
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return '剛剛'
    if (diffMins < 60) return `${diffMins}分鐘前`
    if (diffHours < 24) return `${diffHours}小時前`
    if (diffDays < 7) return `${diffDays}天前`
    
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

  if (liffLoading || loading) {
    return (
      <Layout title="積分歷史">
        <div className="flex justify-center items-center py-12">
          <div className="text-gray-500">載入中...</div>
        </div>
      </Layout>
    )
  }

  if (error) {
    return (
      <Layout title="積分歷史">
        <div className="text-center py-12">
          <div className="text-red-500 mb-4">{error}</div>
          <button 
            onClick={fetchScoreHistory}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
          >
            重試
          </button>
        </div>
      </Layout>
    )
  }

  return (
    <Layout title="積分歷史">
      <div className="max-w-4xl mx-auto">
        
        {/* 用戶總分卡片 */}
        {user && (
          <div className="bg-gradient-to-r from-purple-500 to-blue-600 text-white p-6 rounded-lg shadow-lg mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold mb-2">👋 {user.display_name}</h2>
                <div className="flex items-center space-x-2">
                  <Trophy className="w-5 h-5" />
                  <span className="text-lg">目前總分</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold">{user.current_total_score}</div>
                <div className="text-sm opacity-80">積分</div>
              </div>
            </div>
          </div>
        )}

        {/* 積分歷史列表 */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="px-6 py-4 bg-gray-50 border-b">
            <div className="flex items-center space-x-2">
              <Calendar className="w-5 h-5 text-gray-600" />
              <h3 className="text-lg font-semibold">積分變動歷史</h3>
            </div>
          </div>

          {history.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Award className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>還沒有積分變動記錄</p>
              <p className="text-sm mt-2">開始答題來獲得積分吧！</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {history.map((record) => (
                <div key={record.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4 flex-1">
                      {/* 圖示和類型 */}
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-lg">
                          {record.icon}
                        </div>
                      </div>

                      {/* 描述和詳情 */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <h4 className="text-sm font-medium text-gray-900 truncate">
                            {record.description}
                          </h4>
                          <span className="text-xs text-gray-500">
                            {formatDate(record.created_at)}
                          </span>
                        </div>

                        {/* 詳細資訊 */}
                        {record.type === 'answer' && record.details && (
                          <div className="text-xs text-gray-500 space-y-1">
                            <div className="flex items-center space-x-4">
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
                            </div>
                          </div>
                        )}

                        {record.type === 'adjustment' && record.details?.reason && (
                          <div className="text-xs text-gray-500">
                            原因: {record.details.reason}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 分數變動和總分 */}
                    <div className="flex-shrink-0 text-right ml-4">
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
                      <div className="text-xs text-gray-500 mt-1">
                        總分: {record.score_after}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 統計資訊 */}
        {history.length > 0 && (
          <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-lg shadow-md text-center">
              <div className="text-2xl font-bold text-blue-600">
                {history.length}
              </div>
              <div className="text-sm text-gray-500">總記錄數</div>
            </div>
            
            <div className="bg-white p-4 rounded-lg shadow-md text-center">
              <div className="text-2xl font-bold text-green-600">
                {history.filter(r => r.score_change > 0).length}
              </div>
              <div className="text-sm text-gray-500">獲得積分次數</div>
            </div>
            
            <div className="bg-white p-4 rounded-lg shadow-md text-center">
              <div className="text-2xl font-bold text-red-600">
                {history.filter(r => r.score_change < 0).length}
              </div>
              <div className="text-sm text-gray-500">扣除積分次數</div>
            </div>
            
            <div className="bg-white p-4 rounded-lg shadow-md text-center">
              <div className="text-2xl font-bold text-purple-600">
                {history.filter(r => r.type === 'answer' && r.details?.is_correct).length}
              </div>
              <div className="text-sm text-gray-500">答對題數</div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}
