'use client'

import { useState, useEffect } from 'react'
import { createSupabaseBrowser } from '@/lib/supabase'
import Layout from '@/components/Layout'
import { Trophy, Medal, Crown, Star } from 'lucide-react'

interface UserScore {
  line_id: string
  display_name: string
  avatar_url: string
  quiz_score: number
  total_score: number
  join_time: string
}

export default function LeaderboardPage() {
  const [users, setUsers] = useState<UserScore[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<{
    id: string
    email?: string
  } | null>(null)
  const supabase = createSupabaseBrowser()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUser(user)
    }

    getUser()
  }, [supabase.auth])

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .order('quiz_score', { ascending: false })
          .order('join_time', { ascending: true })
          .limit(50)

        if (error) throw error
        setUsers(data as UserScore[])
      } catch (error) {
        console.error('Error fetching leaderboard:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchLeaderboard()

    // 訂閱分數變化
    const subscription = supabase
      .channel('leaderboard')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'users'
      }, () => {
        fetchLeaderboard()
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'answer_records'
      }, () => {
        fetchLeaderboard()
      })
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase])

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="w-6 h-6 text-yellow-500" />
      case 2:
        return <Medal className="w-6 h-6 text-gray-400" />
      case 3:
        return <Medal className="w-6 h-6 text-amber-600" />
      default:
        return <Trophy className="w-6 h-6 text-gray-400" />
    }
  }

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1:
        return 'bg-gradient-to-r from-yellow-400 to-yellow-500 text-white'
      case 2:
        return 'bg-gradient-to-r from-gray-400 to-gray-500 text-white'
      case 3:
        return 'bg-gradient-to-r from-amber-500 to-amber-600 text-white'
      default:
        return 'bg-white border border-gray-200'
    }
  }

  const getCurrentUserRank = () => {
    if (!currentUser) return null
    const userIndex = users.findIndex(user => user.line_id === currentUser.id)
    return userIndex !== -1 ? userIndex + 1 : null
  }

  if (loading) {
    return (
      <Layout title="排行榜">
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500"></div>
        </div>
      </Layout>
    )
  }

  const currentUserRank = getCurrentUserRank()

  return (
    <Layout title="排行榜">
      <div className="max-w-4xl mx-auto">
        {/* 標題 */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="text-center">
            <Trophy className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-3xl font-bold text-gray-800 mb-2">🏆 積分排行榜</h2>
            <p className="text-gray-600">快問快答積分競賽</p>
          </div>
        </div>

        {/* 當前用戶排名 */}
        {currentUser && currentUserRank && (
          <div className="bg-gradient-to-r from-pink-100 to-purple-100 rounded-2xl p-6 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Star className="w-6 h-6 text-pink-500" />
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">您的排名</h3>
                  <p className="text-gray-600">在 {users.length} 位參與者中</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-pink-600">第 {currentUserRank} 名</div>
                <div className="text-sm text-gray-600">
                  {users.find(u => u.line_id === currentUser.id)?.total_score || 0} 分
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 排行榜 */}
        {users.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <Trophy className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-800 mb-2">還沒有參與者</h3>
            <p className="text-gray-600 mb-6">快去參與快問快答遊戲吧！</p>
            <a
              href="/quiz"
              className="bg-pink-500 hover:bg-pink-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
            >
              開始答題
            </a>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-xl font-semibold text-gray-800">
                總共 {users.length} 位參與者
              </h3>
            </div>

            <div className="divide-y divide-gray-200">
              {users.map((user, index) => {
                const rank = index + 1
                const isCurrentUser = currentUser && user.line_id === currentUser.id

                return (
                  <div
                    key={user.line_id}
                    className={`p-6 ${getRankColor(rank)} ${
                      isCurrentUser ? 'ring-2 ring-pink-500' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        {/* 排名 */}
                        <div className="flex items-center justify-center w-12 h-12">
                          {rank <= 3 ? (
                            getRankIcon(rank)
                          ) : (
                            <span className="text-xl font-bold text-gray-600">
                              {rank}
                            </span>
                          )}
                        </div>

                        {/* 用戶資訊 */}
                        <div className="flex items-center space-x-3">
                          <img
                            src={user.avatar_url || '/default-avatar.png'}
                            alt="Avatar"
                            className="w-12 h-12 rounded-full"
                          />
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className={`font-semibold ${
                                rank <= 3 ? 'text-white' : 'text-gray-800'
                              }`}>
                                {user.display_name}
                              </span>
                              {isCurrentUser && (
                                <span className="bg-pink-500 text-white text-xs px-2 py-1 rounded-full">
                                  您
                                </span>
                              )}
                            </div>
                            <p className={`text-sm ${
                              rank <= 3 ? 'text-white/80' : 'text-gray-500'
                            }`}>
                              加入時間：{new Date(user.join_time).toLocaleDateString('zh-TW')}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* 分數 */}
                      <div className="text-right">
                        <div className={`text-2xl font-bold ${
                          rank <= 3 ? 'text-white' : 'text-gray-800'
                        }`}>
                          {user.quiz_score}
                        </div>
                        <p className={`text-sm ${
                          rank <= 3 ? 'text-white/80' : 'text-gray-500'
                        }`}>
                          分
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* 底部提示 */}
        <div className="bg-blue-50 rounded-xl p-4 mt-6 text-center">
          <p className="text-blue-700 text-sm">
            💡 排行榜會即時更新，快去參與快問快答遊戲賺取更多積分吧！
          </p>
        </div>
      </div>
    </Layout>
  )
}
