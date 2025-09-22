'use client'

import { useState, useEffect, useCallback } from 'react'
import { createSupabaseBrowser } from '@/lib/supabase'
import Layout from '@/components/Layout'
import { Play, Pause, Users, Trophy, Clock, HelpCircle, Award, Zap } from 'lucide-react'

interface AnswerDistribution {
  answer: 'A' | 'B' | 'C' | 'D'
  count: number
  users: { display_name: string; avatar_url?: string }[]
}

interface TopPlayer {
  display_name: string
  avatar_url?: string
  answer_time: number
  selected_answer: string
  is_correct: boolean
}

export default function GameLivePage() {
  const [gameState, setGameState] = useState<any>(null)
  const [currentQuestion, setCurrentQuestion] = useState<any>(null)
  const [answerDistribution, setAnswerDistribution] = useState<AnswerDistribution[]>([])
  const [topPlayers, setTopPlayers] = useState<TopPlayer[]>([])
  const [timeLeft, setTimeLeft] = useState<number>(0)
  const [loading, setLoading] = useState(true)
  const supabase = createSupabaseBrowser()

  // 獲取答題分佈
  const fetchAnswerDistribution = useCallback(async () => {
    if (!currentQuestion) return

    try {
      const { data: answers, error } = await supabase
        .from('answer_records')
        .select(`
          selected_answer,
          users!inner (
            display_name,
            avatar_url
          )
        `)
        .eq('question_id', currentQuestion.id)

      if (error) throw error

      const distribution: AnswerDistribution[] = ['A', 'B', 'C', 'D'].map(answer => ({
        answer: answer as 'A' | 'B' | 'C' | 'D',
        count: answers?.filter(a => a.selected_answer === answer).length || 0,
        users: answers?.filter(a => a.selected_answer === answer).map(a => ({
          display_name: a.users.display_name,
          avatar_url: a.users.avatar_url
        })) || []
      }))

      setAnswerDistribution(distribution)
    } catch (error) {
      console.error('Error fetching answer distribution:', error)
    }
  }, [currentQuestion, supabase])

  // 獲取答題速度前十名
  const fetchTopPlayers = useCallback(async () => {
    if (!currentQuestion) return

    try {
      const { data: topAnswers, error } = await supabase
        .from('answer_records')
        .select(`
          answer_time,
          selected_answer,
          is_correct,
          users!inner (
            display_name,
            avatar_url
          )
        `)
        .eq('question_id', currentQuestion.id)
        .order('answer_time', { ascending: true })
        .limit(10)

      if (error) throw error

      const players: TopPlayer[] = topAnswers?.map(record => ({
        display_name: record.users.display_name,
        avatar_url: record.users.avatar_url,
        answer_time: record.answer_time,
        selected_answer: record.selected_answer,
        is_correct: record.is_correct
      })) || []

      setTopPlayers(players)
    } catch (error) {
      console.error('Error fetching top players:', error)
    }
  }, [currentQuestion, supabase])

  useEffect(() => {
    const fetchGameState = async () => {
      try {
        const { data: gameData } = await supabase
          .from('game_state')
          .select('*')
          .single()

        setGameState(gameData)

        if (gameData?.current_question_id) {
          const { data: questionData } = await supabase
            .from('questions')
            .select('*')
            .eq('id', gameData.current_question_id)
            .single()

          setCurrentQuestion(questionData)

          // 計算倒數時間
          if (gameData.question_start_time && questionData) {
            const startTime = new Date(gameData.question_start_time).getTime()
            const now = Date.now()
            const elapsed = Math.floor((now - startTime) / 1000)
            const remaining = Math.max(0, questionData.time_limit - elapsed)
            setTimeLeft(remaining)
          }
        }
      } catch (error) {
        console.error('Error fetching game state:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchGameState()

    // 訂閱即時更新
    const gameSubscription = supabase
      .channel('game_live')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'game_state'
      }, () => {
        fetchGameState()
      })
      .subscribe()

    return () => {
      gameSubscription.unsubscribe()
    }
  }, [supabase])

  // 當題目改變時獲取答題資料
  useEffect(() => {
    if (currentQuestion) {
      fetchAnswerDistribution()
      fetchTopPlayers()

      // 訂閱答題記錄變化
      const answerSubscription = supabase
        .channel('answer_records_live')
        .on('postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'answer_records', filter: `question_id=eq.${currentQuestion.id}` },
          () => {
            fetchAnswerDistribution()
            fetchTopPlayers()
          }
        )
        .subscribe()

      return () => {
        answerSubscription.unsubscribe()
      }
    }
  }, [currentQuestion, fetchAnswerDistribution, fetchTopPlayers, supabase])

  // 倒數計時器
  useEffect(() => {
    if (timeLeft <= 0 || !gameState?.is_game_active || gameState?.is_paused) return

    const timer = setInterval(() => {
      setTimeLeft(prev => Math.max(0, prev - 1))
    }, 1000)

    return () => clearInterval(timer)
  }, [timeLeft, gameState])

  if (loading) {
    return (
      <Layout title="遊戲實況">
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500"></div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout title="遊戲實況">
      <div className="max-w-7xl mx-auto">
        {/* 遊戲狀態和計時器 */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h2 className="text-2xl font-bold text-gray-800">🎮 遊戲實況</h2>
              {gameState?.is_game_active ? (
                <div className="flex items-center space-x-2 text-green-600">
                  <Play className="w-5 h-5" />
                  <span className="font-semibold">遊戲進行中</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2 text-gray-500">
                  <Pause className="w-5 h-5" />
                  <span className="font-semibold">遊戲暫停</span>
                </div>
              )}
            </div>
            
            {currentQuestion && gameState?.is_game_active && !gameState?.is_paused && (
              <div className="flex items-center space-x-4">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold ${
                  timeLeft > 10 ? 'bg-green-100 text-green-700' :
                  timeLeft > 5 ? 'bg-yellow-100 text-yellow-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {timeLeft}
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{answerDistribution.reduce((sum, dist) => sum + dist.count, 0)}</div>
                  <div className="text-sm text-gray-600">已答題</div>
                </div>
              </div>
            )}
          </div>

          {gameState?.is_paused && (
            <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded-lg mt-4">
              ⏸️ 遊戲暫停中，請等待主持人繼續遊戲
            </div>
          )}
        </div>

        {currentQuestion && gameState?.is_game_active && !gameState?.is_paused ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 題目和答題分佈 */}
            <div className="lg:col-span-2">
              {/* 當前題目 */}
              <div className="bg-white rounded-2xl shadow-lg p-8 mb-6">
                <div className="text-center mb-6">
                  <h3 className="text-2xl font-bold text-gray-800 mb-6">
                    {currentQuestion.question_text}
                  </h3>
                </div>
              </div>

              {/* 答題分佈 */}
              {timeLeft === 0 && answerDistribution.length > 0 && (
                <div className="bg-white rounded-2xl shadow-lg p-8">
                  <h4 className="text-xl font-bold text-gray-800 mb-6 text-center">📊 答題分佈</h4>
                  <div className="grid grid-cols-2 gap-6">
                    {[
                      { key: 'A', text: currentQuestion.option_a, color: 'bg-red-500', lightColor: 'bg-red-100 text-red-700' },
                      { key: 'B', text: currentQuestion.option_b, color: 'bg-blue-500', lightColor: 'bg-blue-100 text-blue-700' },
                      { key: 'C', text: currentQuestion.option_c, color: 'bg-green-500', lightColor: 'bg-green-100 text-green-700' },
                      { key: 'D', text: currentQuestion.option_d, color: 'bg-yellow-500', lightColor: 'bg-yellow-100 text-yellow-700' }
                    ].map((option) => {
                      const distribution = answerDistribution.find(d => d.answer === option.key)
                      const isCorrect = currentQuestion.correct_answer === option.key
                      return (
                        <div
                          key={option.key}
                          className={`p-6 rounded-2xl border-4 ${
                            isCorrect ? 'border-green-400 bg-green-50' : 'border-gray-200'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-4">
                            <div className={`w-12 h-12 ${option.color} text-white rounded-full flex items-center justify-center text-xl font-bold`}>
                              {option.key}
                            </div>
                            <div className="text-right">
                              <div className="text-2xl font-bold">{distribution?.count || 0}</div>
                              <div className="text-sm text-gray-600">人選擇</div>
                            </div>
                          </div>
                          <div className="text-lg font-medium mb-2">{option.text}</div>
                          {isCorrect && (
                            <div className="text-green-600 font-semibold text-sm">✅ 正確答案</div>
                          )}
                          {/* 顯示選擇此答案的用戶 */}
                          {distribution && distribution.users.length > 0 && (
                            <div className="mt-4">
                              <div className="flex flex-wrap gap-2">
                                {distribution.users.slice(0, 6).map((user, index) => (
                                  <div key={index} className="flex items-center space-x-1 bg-gray-100 rounded-full px-2 py-1">
                                    {user.avatar_url && (
                                      <img src={user.avatar_url} alt="" className="w-4 h-4 rounded-full" />
                                    )}
                                    <span className="text-xs">{user.display_name}</span>
                                  </div>
                                ))}
                                {distribution.users.length > 6 && (
                                  <div className="text-xs text-gray-500">+{distribution.users.length - 6}人</div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* 答題速度排行榜 */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-2xl shadow-lg p-6 sticky top-6">
                <div className="flex items-center justify-center space-x-2 mb-6">
                  <Zap className="w-6 h-6 text-yellow-500" />
                  <h4 className="text-xl font-bold text-gray-800">⚡ 速度排行榜</h4>
                </div>
                
                {topPlayers.length > 0 ? (
                  <div className="space-y-3">
                    {topPlayers.map((player, index) => (
                      <div
                        key={index}
                        className={`flex items-center space-x-3 p-3 rounded-lg ${
                          index === 0 ? 'bg-yellow-100 border-2 border-yellow-300' :
                          index === 1 ? 'bg-gray-100 border-2 border-gray-300' :
                          index === 2 ? 'bg-orange-100 border-2 border-orange-300' :
                          'bg-gray-50'
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                          index === 0 ? 'bg-yellow-500 text-white' :
                          index === 1 ? 'bg-gray-500 text-white' :
                          index === 2 ? 'bg-orange-500 text-white' :
                          'bg-gray-300 text-gray-700'
                        }`}>
                          {index + 1}
                        </div>
                        
                        {player.avatar_url && (
                          <img src={player.avatar_url} alt="" className="w-8 h-8 rounded-full" />
                        )}
                        
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-800 truncate">
                            {player.display_name}
                          </div>
                          <div className="text-xs text-gray-600">
                            {(player.answer_time / 1000).toFixed(1)}秒 | {player.selected_answer}
                            {player.is_correct && <span className="text-green-600 ml-1">✅</span>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-gray-500 py-8">
                    <Clock className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>等待玩家答題...</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-lg p-8 mb-6 text-center">
            <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-800 mb-2">等待中</h3>
            <p className="text-gray-600 mb-6">目前沒有進行中的題目</p>
            <a
              href="/quiz"
              className="inline-flex items-center space-x-2 bg-pink-500 hover:bg-pink-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
            >
              <HelpCircle className="w-5 h-5" />
              <span>參與答題</span>
            </a>
          </div>
        )}
      </div>
    </Layout>
  )
}
