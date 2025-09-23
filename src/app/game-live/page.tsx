'use client'

import { useState, useEffect, useCallback } from 'react'
import { createSupabaseBrowser } from '@/lib/supabase'
import { useRealtimeGameState } from '@/hooks/useRealtimeGameState'
import Layout from '@/components/Layout'
import { Play, Pause, Users, Clock, HelpCircle, Zap } from 'lucide-react'

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
  
  const [answerDistribution, setAnswerDistribution] = useState<AnswerDistribution[]>([])
  const [topPlayers, setTopPlayers] = useState<TopPlayer[]>([])
  const [timeLeft, setTimeLeft] = useState<number>(0)
  const [displayTimeLeft, setDisplayTimeLeft] = useState<number>(0)
  const [currentQuestionAnswerCount, setCurrentQuestionAnswerCount] = useState<number>(0)
  // 從 localStorage 初始化狀態，以防組件重新載入
  const [showingCorrectOnly, setShowingCorrectOnly] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('game-live-showing-correct-only');
      return saved === 'true';
    }
    return false;
  })
  
  const supabase = createSupabaseBrowser()
  
  // 使用統一的即時遊戲狀態
  const { gameState, currentQuestion, loading, calculateTimeLeft } = useRealtimeGameState()

  // 同步 showingCorrectOnly 狀態到 localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('game-live-showing-correct-only', showingCorrectOnly.toString());
    }
  }, [showingCorrectOnly])

  // 獲取當前題目答題人數
  const fetchCurrentQuestionAnswerCount = useCallback(async () => {
    if (!currentQuestion) {
      console.log('fetchCurrentQuestionAnswerCount: No current question')
      setCurrentQuestionAnswerCount(0)
      return
    }

    console.log('fetchCurrentQuestionAnswerCount: Fetching for question ID:', currentQuestion.id)

    try {
      const { count, error } = await supabase
        .from('answer_records')
        .select('*', { count: 'exact', head: true })
        .eq('question_id', currentQuestion.id)

      if (error) throw error
      
      console.log('fetchCurrentQuestionAnswerCount: Count result:', count)
      setCurrentQuestionAnswerCount(count || 0)
    } catch (error) {
      console.error('Error fetching current question answer count:', error)
      setCurrentQuestionAnswerCount(0)
    }
  }, [currentQuestion, supabase])

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
          display_name: (a.users as any).display_name,
          avatar_url: (a.users as any).avatar_url
        })) || []
      }))

      setAnswerDistribution(distribution)
    } catch (error) {
      console.error('Error fetching answer distribution:', error)
    }
  }, [currentQuestion, supabase])

  // 獲取答題速度前十名
  const fetchTopPlayers = useCallback(async (onlyCorrect = false) => {
    if (!currentQuestion) return

    try {
      let query = supabase
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

      // 如果只要正確答案，添加過濾條件
      if (onlyCorrect) {
        query = query.eq('is_correct', true)
      }

      const { data: topAnswers, error } = await query

      if (error) throw error

      const players: TopPlayer[] = topAnswers?.map(record => ({
        display_name: (record.users as any).display_name,
        avatar_url: (record.users as any).avatar_url,
        answer_time: record.answer_time,
        selected_answer: record.selected_answer,
        is_correct: record.is_correct
      })) || []

      setTopPlayers(players)
    } catch (error) {
      console.error('Error fetching top players:', error)
    }
  }, [currentQuestion, supabase])

  // 當遊戲狀態改變時更新計時器
  useEffect(() => {
    if (gameState && currentQuestion) {
      const currentTime = calculateTimeLeft()
      setTimeLeft(currentTime)
      setDisplayTimeLeft(currentTime)
    }
  }, [gameState, currentQuestion, calculateTimeLeft])

  // 移除答錯者的函數
  const removeWrongPlayers = useCallback(async () => {
    setShowingCorrectOnly(true);
    
    // 直接從數據庫重新獲取只有正確答案的玩家
    await fetchTopPlayers(true); // 傳入 true 表示只要正確答案
  }, [fetchTopPlayers]);

  // 處理答案公布後的淡出和移除邏輯
  useEffect(() => {
    if (timeLeft === 0 && topPlayers.length > 0 && !showingCorrectOnly) {
      // 答案公布後，延遲2秒後只顯示答對的玩家
      const timer = setTimeout(() => {
        removeWrongPlayers();
      }, 2000);

      return () => {
        clearTimeout(timer);
      };
    }
  }, [timeLeft, showingCorrectOnly, topPlayers.length, removeWrongPlayers])

  // 當題目改變時重置狀態和獲取答題資料
  useEffect(() => {
    if (currentQuestion) {
      // 強制重置狀態並清除 localStorage
      setShowingCorrectOnly(false)
      if (typeof window !== 'undefined') {
        localStorage.setItem('game-live-showing-correct-only', 'false');
      }
      
      fetchAnswerDistribution()
      fetchTopPlayers(false) // 新題目開始時獲取所有玩家
      fetchCurrentQuestionAnswerCount()

      // 訂閱答題記錄變化
      const answerSubscription = supabase
        .channel('answer_records_live')
        .on('postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'answer_records', filter: `question_id=eq.${currentQuestion.id}` },
          () => {
            // 本機增加計數，避免頻繁查詢資料庫
            setCurrentQuestionAnswerCount(prev => prev + 1)
            
            fetchAnswerDistribution()
            fetchTopPlayers(showingCorrectOnly) // 根據當前狀態決定是否只獲取正確答案
            // 移除 fetchCurrentQuestionAnswerCount() - 用本機計數取代
          }
        )
        .subscribe()

      return () => {
        answerSubscription.unsubscribe()
      }
    } else {
      // 如果沒有當前題目，重置答題人數
      setCurrentQuestionAnswerCount(0)
    }
  }, [currentQuestion, fetchAnswerDistribution, fetchTopPlayers, supabase])

  // 伺服器同步計時器（每秒同步一次實際時間）
  useEffect(() => {
    if (!gameState?.is_game_active || gameState?.is_paused) return

    const syncTimer = setInterval(() => {
      const newTimeLeft = calculateTimeLeft() // 從伺服器獲取精確時間
      setTimeLeft(newTimeLeft)
      setDisplayTimeLeft(newTimeLeft) // 重置顯示時間
      
      // 當時間到達0時，立即獲取最新的答題分佈和排行榜
      if (newTimeLeft <= 0) {
        fetchAnswerDistribution()
        fetchTopPlayers(false) // 倒數結束時先獲取所有玩家
        // 移除 fetchCurrentQuestionAnswerCount() - 時間結束後不會再有新答題
      }
    }, 1000) // 每秒同步一次

    return () => clearInterval(syncTimer)
  }, [gameState, calculateTimeLeft, fetchAnswerDistribution, fetchTopPlayers])

  // 本機顯示計時器（100ms更新顯示，模擬毫秒變化）
  useEffect(() => {
    if (!gameState?.is_game_active || gameState?.is_paused) return

    const displayTimer = setInterval(() => {
      setDisplayTimeLeft(prev => Math.max(0, prev - 100)) // 每100ms減少100ms
    }, 100)

    return () => clearInterval(displayTimer)
  }, [gameState])

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
            
            {currentQuestion && (
              <div className="flex items-center space-x-4">
                {gameState?.is_game_active && !gameState?.is_paused && (
                  <div className={`w-20 h-20 rounded-full flex items-center justify-center text-sm font-bold ${
                    displayTimeLeft > 10000 ? 'bg-green-100 text-green-700' :
                    displayTimeLeft > 5000 ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    <div className="text-center">
                      <div className="text-lg">{Math.floor(displayTimeLeft / 1000)}</div>
                      <div className="text-xs">.{String(displayTimeLeft % 1000).padStart(3, '0')}</div>
                    </div>
                  </div>
                )}
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{currentQuestionAnswerCount}</div>
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
                <div className="bg-white rounded-2xl shadow-lg p-6">
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
                          {/* 選項標題和統計 */}
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center space-x-4 flex-1">
                              <div className={`w-16 h-16 ${option.color} text-white rounded-full flex items-center justify-center text-2xl font-bold shadow-lg`}>
                                {option.key}
                              </div>
                              <div className="flex-1">
                                <div className="text-3xl font-bold text-gray-800">{distribution?.count || 0}</div>
                                <div className="text-sm text-gray-600">人選擇</div>
                                {isCorrect && (
                                  <div className="text-green-600 font-semibold text-sm mt-1">✅ 正確答案</div>
                                )}
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0 max-w-xs">
                              <div className="text-lg font-medium text-gray-700 leading-tight">{option.text}</div>
                            </div>
                          </div>

                          {/* 顯示選擇此答案的用戶 */}
                          {distribution && distribution.users.length > 0 && (
                            <div className="mt-6">
                              <div className="flex flex-wrap gap-4">
                                {distribution.users.slice(0, 6).map((user, index) => (
                                    <div key={index} className="flex items-center space-x-3 bg-white rounded-xl px-4 py-3 shadow-md border border-gray-200">
                                      {user.avatar_url ? (
                                        <img 
                                          src={user.avatar_url} 
                                          alt={user.display_name || 'User'} 
                                          className="w-12 h-12 rounded-full border-2 border-gray-100"
                                          onError={(e) => {
                                            e.currentTarget.style.display = 'none';
                                          }}
                                        />
                                      ) : (
                                        <div className="w-12 h-12 rounded-full bg-gray-400 flex items-center justify-center text-lg font-semibold text-white">
                                          {user.display_name?.charAt(0) || '?'}
                                        </div>
                                      )}
                                      <span className="text-base font-semibold text-gray-800">{user.display_name}</span>
                                    </div>
                                ))}
                                {distribution.users.length > 6 && (
                                  <div className="flex items-center px-4 py-3 text-base font-medium text-gray-600 bg-gray-100 rounded-xl">
                                    +{distribution.users.length - 6}人
                                  </div>
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
                
                <div className="space-y-3">
                  {topPlayers.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <HelpCircle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                      <p>等待玩家答題...</p>
                    </div>
                  ) : (
                    topPlayers.map((player, index) => {
                      // 答案公布後，答錯的玩家要淡出（但還沒移除時）
                      const shouldFadeOut = timeLeft === 0 && !player.is_correct && !showingCorrectOnly;
                      
                      return (
                        <div
                          key={`${player.display_name}-${player.answer_time}`}
                          className={`flex items-center space-x-3 p-4 rounded-xl transition-all duration-1000 ${
                            shouldFadeOut 
                              ? 'opacity-30 scale-95 blur-sm' 
                              : 'opacity-100 scale-100'
                          } ${
                            index === 0 ? 'bg-yellow-100 border-2 border-yellow-300' :
                            index === 1 ? 'bg-gray-100 border-2 border-gray-300' :
                            index === 2 ? 'bg-orange-100 border-2 border-orange-300' :
                            'bg-gray-50'
                          }`}
                        >
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold ${
                            index === 0 ? 'bg-yellow-500 text-white' :
                            index === 1 ? 'bg-gray-500 text-white' :
                            index === 2 ? 'bg-orange-500 text-white' :
                            'bg-gray-300 text-gray-700'
                          }`}>
                            {index + 1}
                          </div>
                          
                          {player.avatar_url ? (
                            <img 
                              src={player.avatar_url} 
                              alt={player.display_name} 
                              className="w-14 h-14 rounded-full border-2 border-white shadow-md" 
                            />
                          ) : (
                            <div className="w-14 h-14 rounded-full bg-gray-400 flex items-center justify-center text-lg font-bold text-white">
                              {player.display_name?.charAt(0) || '?'}
                            </div>
                          )}
                          
                          <div className="flex-1 min-w-0">
                            <div className="text-lg font-bold text-gray-800 truncate">
                              {player.display_name}
                            </div>
                            <div className="text-base text-gray-700 font-medium">
                              ⏱️ {(player.answer_time / 1000).toFixed(3)}秒
                              {timeLeft === 0 && (
                                <span className={`ml-2 ${player.is_correct ? 'text-green-600' : 'text-red-500'}`}>
                                  {player.is_correct ? '✅ 答對了' : '❌ 答錯了'}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
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
