'use client'

import { useState, useEffect, useCallback } from 'react'
import { createSupabaseBrowser } from '@/lib/supabase'
import { useRealtimeGameState } from '@/hooks/useRealtimeGameState'
import Layout from '@/components/Layout'
import { Play, Pause, Users, Clock, HelpCircle, Zap, QrCode, UserPlus, Trophy } from 'lucide-react'

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

interface ScoreRanking {
  line_id: string
  display_name: string
  avatar_url?: string
  quiz_score: number
}

export default function GameLivePage() {
  
  const [answerDistribution, setAnswerDistribution] = useState<AnswerDistribution[]>([])
  const [topPlayers, setTopPlayers] = useState<TopPlayer[]>([])
  const [scoreRankings, setScoreRankings] = useState<ScoreRanking[]>([])
  const [showScoreRankings, setShowScoreRankings] = useState(false)
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

  // 獲取分數排行榜
  const fetchScoreRankings = useCallback(async () => {
    console.log('🏆 開始獲取分數排行榜...')
    try {
      const { data, error } = await supabase
        .from('users')
        .select('line_id, display_name, avatar_url, quiz_score')
        .gte('quiz_score', 0) // 顯示所有用戶，包括0分
        .order('quiz_score', { ascending: false })
        .order('join_time', { ascending: true }) // 同分時以加入時間排序
        .limit(10) // 只顯示前10名
      
      if (error) throw error
      console.log('🏆 分數排行榜資料:', JSON.stringify(data, null, 2))
      setScoreRankings(data || [])
    } catch (error) {
      console.error('❌ 獲取分數排行榜錯誤:', error)
      setScoreRankings([])
    }
  }, [supabase])

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
    if (timeLeft <= 0 && topPlayers.length > 0 && !showingCorrectOnly) {
      // 答案公布後，延遲2秒後只顯示答對的玩家
      const timer = setTimeout(() => {
        removeWrongPlayers();
      }, 2000);

      return () => {
        clearTimeout(timer);
      };
    }
  }, [timeLeft, showingCorrectOnly, topPlayers.length, removeWrongPlayers])

  // 處理新答題記錄的回調函數
  const handleNewAnswer = useCallback(() => {
    // 本機增加計數，避免頻繁查詢資料庫
    setCurrentQuestionAnswerCount(prev => prev + 1)
    
    fetchAnswerDistribution()
    
    // 檢查當前時間，只有在答題期間才更新排行榜
    // 這避免在答案公布後被新答題記錄干擾「只顯示正確答案」的狀態
    const currentTimeLeft = calculateTimeLeft()
    if (currentTimeLeft > 0) {
      // 答題期間：總是更新排行榜以確保即時顯示
      fetchTopPlayers(false)
    }
    // 如果答題時間已結束，不更新排行榜，保持當前的過濾狀態
  }, [fetchAnswerDistribution, fetchTopPlayers, calculateTimeLeft])

  // 當題目改變時重置狀態和獲取答題資料
  useEffect(() => {
    if (currentQuestion) {
      // 強制重置狀態並清除 localStorage
      setShowingCorrectOnly(false)
      setShowScoreRankings(false) // 重置分數排行榜顯示
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
          handleNewAnswer
        )
        .subscribe()

      return () => {
        answerSubscription.unsubscribe()
      }
    } else {
      // 如果沒有當前題目，重置答題人數
      setCurrentQuestionAnswerCount(0)
    }
  }, [currentQuestion, fetchAnswerDistribution, fetchTopPlayers, supabase, handleNewAnswer])

  // 伺服器同步計時器（每秒同步一次實際時間）
  useEffect(() => {
    if (!gameState?.is_game_active || gameState?.is_paused) return

    const syncTimer = setInterval(() => {
      const newTimeLeft = calculateTimeLeft() // 從伺服器獲取精確時間
      const prevTimeLeft = timeLeft
      setTimeLeft(newTimeLeft)
      setDisplayTimeLeft(newTimeLeft) // 重置顯示時間
      
      // 只在時間剛到達0或以下時執行一次，避免重複覆蓋移除邏輯
      if (newTimeLeft <= 0 && prevTimeLeft > 0) {
        fetchAnswerDistribution()
        fetchTopPlayers(false) // 倒數結束時先獲取所有玩家
        // 移除 fetchCurrentQuestionAnswerCount() - 時間結束後不會再有新答題
        
        // 5秒後顯示分數排行榜
        console.log('⏰ 時間結束，5秒後將顯示分數排行榜')
        setTimeout(() => {
          console.log('🏆 5秒已到，開始顯示分數排行榜')
          fetchScoreRankings()
          setShowScoreRankings(true)
        }, 5000) // 5秒延遲
      }
    }, 1000) // 每秒同步一次

    return () => clearInterval(syncTimer)
  }, [gameState, calculateTimeLeft, fetchAnswerDistribution, fetchTopPlayers, fetchScoreRankings, timeLeft])

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
    <Layout title="遊戲實況" showNavigation={false}>
      <div className="max-w-7xl mx-auto">
        {/* 遊戲暫停提示 */}
        {gameState?.is_paused && (
          <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded-lg mb-6">
            ⏸️ 遊戲暫停中，請等待主持人繼續遊戲
          </div>
        )}

        {gameState?.is_game_active && (gameState?.is_waiting_for_players !== undefined ? gameState.is_waiting_for_players : !gameState?.current_question_id) ? (
          <WaitingStage gameState={gameState} />
        ) : currentQuestion && gameState?.is_game_active && !gameState?.is_paused ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 題目和答題分佈 */}
            <div className="lg:col-span-2">
              {/* 當前題目 */}
              <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1 mr-6">
                    <h3 className="text-2xl font-bold text-gray-800 mb-4">
                      {currentQuestion.question_text}
                    </h3>
                    
                    {/* 媒體內容 */}
                    {currentQuestion.media_url && (
                      <div className="mt-4">
                        {currentQuestion.media_type === 'image' && (
                          <img
                            src={currentQuestion.media_url}
                            alt={currentQuestion.media_alt_text || '題目圖片'}
                            className="max-w-full h-auto max-h-80 rounded-lg shadow-md"
                          />
                        )}
                        {currentQuestion.media_type === 'video' && (
                          <video
                            src={currentQuestion.media_url}
                            poster={currentQuestion.media_thumbnail_url}
                            controls
                            autoPlay
                            loop
                            playsInline
                            className="max-w-full h-auto max-h-80 rounded-lg shadow-md"
                          >
                            您的瀏覽器不支援影片播放
                          </video>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center space-x-4">
                    {gameState?.is_game_active && !gameState?.is_paused && (
                      <div className={`w-16 h-16 rounded-full flex items-center justify-center text-sm font-bold ${
                        displayTimeLeft > 10000 ? 'bg-green-100 text-green-700' :
                        displayTimeLeft > 5000 ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        <div className="text-center">
                          <div className="text-base">{Math.floor(displayTimeLeft / 1000)}</div>
                          <div className="text-xs">.{String(displayTimeLeft % 1000).padStart(3, '0')}</div>
                        </div>
                      </div>
                    )}
                    <div className="text-center">
                      <div className="text-xl font-bold text-blue-600">{currentQuestionAnswerCount}</div>
                      <div className="text-xs text-gray-600">已答題</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 答題分佈 */}
              {currentQuestion && (
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
                            timeLeft <= 0 && isCorrect ? 'border-green-400 bg-green-50' : 'border-gray-200'
                          }`}
                        >
                          {/* 選項標題和統計 */}
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center space-x-4 flex-1">
                              <div className={`w-16 h-16 ${option.color} text-white rounded-full flex items-center justify-center text-2xl font-bold shadow-lg`}>
                                {option.key}
                              </div>
                              <div className="flex-1">
                                {/* 只在倒數結束後顯示人數統計 */}
                                {timeLeft <= 0 ? (
                                  <>
                                    <div className="text-3xl font-bold text-gray-800">{distribution?.count || 0}</div>
                                    <div className="text-sm text-gray-600">人選擇</div>
                                  </>
                                ) : (
                                  <div className="text-3xl font-bold text-gray-400">?</div>
                                )}
                                {timeLeft <= 0 && isCorrect && (
                                  <div className="text-green-600 font-semibold text-sm mt-1">✅ 正確答案</div>
                                )}
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0 max-w-xs">
                              <div className="text-3xl font-bold text-gray-800 leading-tight">{option.text}</div>
                            </div>
                          </div>

                          {/* 只在倒數結束後顯示選擇此答案的用戶 */}
                          {timeLeft <= 0 && distribution && distribution.users.length > 0 && (
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

            {/* 排行榜區域 */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-2xl shadow-lg p-6 sticky top-6">
                {showScoreRankings ? (
                  // 分數排行榜
                  <>
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center space-x-2">
                        <Trophy className="w-6 h-6 text-purple-500" />
                        <h4 className="text-xl font-bold text-gray-800">🏆 總分排行榜</h4>
                      </div>
                      <button
                        onClick={() => {
                          console.log('🔄 手動重新載入分數排行榜')
                          fetchScoreRankings()
                        }}
                        className="text-xs bg-purple-100 hover:bg-purple-200 text-purple-700 px-3 py-1 rounded-lg transition-colors"
                      >
                        重新載入
                      </button>
                    </div>
                    
                    <div className="space-y-3">
                      {scoreRankings.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          <Trophy className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                          <p>載入分數排行榜中...</p>
                          <p className="text-xs mt-2">如果持續沒有顯示，可能尚未有分數記錄</p>
                        </div>
                      ) : (
                        scoreRankings.map((player, index) => (
                          <div
                            key={player.line_id}
                            className={`flex items-center space-x-3 p-4 rounded-xl transition-all duration-500 ${
                              index === 0 ? 'bg-gradient-to-r from-yellow-100 to-yellow-200 border-2 border-yellow-400 shadow-lg' :
                              index === 1 ? 'bg-gradient-to-r from-gray-100 to-gray-200 border-2 border-gray-400 shadow-md' :
                              index === 2 ? 'bg-gradient-to-r from-orange-100 to-orange-200 border-2 border-orange-400 shadow-md' :
                              'bg-gray-50 border border-gray-200'
                            }`}
                          >
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold ${
                              index === 0 ? 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-white shadow-lg' :
                              index === 1 ? 'bg-gradient-to-br from-gray-400 to-gray-600 text-white shadow-md' :
                              index === 2 ? 'bg-gradient-to-br from-orange-400 to-orange-600 text-white shadow-md' :
                              'bg-gradient-to-br from-blue-400 to-blue-600 text-white'
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
                              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center text-lg font-bold text-white">
                                {player.display_name?.charAt(0) || '?'}
                              </div>
                            )}
                            
                            <div className="flex-1 min-w-0">
                              <div className="text-lg font-bold text-gray-800 truncate">
                                {player.display_name}
                              </div>
                              <div className="text-xl font-bold text-purple-600">
                                🎯 {player.quiz_score} 分
                              </div>
                            </div>
                            
                            {index < 3 && (
                              <div className="text-2xl">
                                {index === 0 ? '👑' : index === 1 ? '🥈' : '🥉'}
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </>
                ) : (
                  // 速度排行榜
                  <>
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center space-x-2">
                        <Zap className="w-6 h-6 text-yellow-500" />
                        <h4 className="text-xl font-bold text-gray-800">⚡ 速度排行榜</h4>
                      </div>
                      <button
                        onClick={() => {
                          console.log('🧪 測試：手動切換到分數排行榜')
                          fetchScoreRankings()
                          setShowScoreRankings(true)
                        }}
                        className="text-xs bg-yellow-100 hover:bg-yellow-200 text-yellow-700 px-3 py-1 rounded-lg transition-colors"
                      >
                        測試分數榜
                      </button>
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
                      const shouldFadeOut = timeLeft <= 0 && !player.is_correct && !showingCorrectOnly;
                      
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
                              {timeLeft <= 0 && (
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
                  </>
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

// 等待階段組件
function WaitingStage({ gameState }: { gameState: any }) {
  const [joinedPlayers, setJoinedPlayers] = useState<any[]>([])
  const [playerCount, setPlayerCount] = useState(0)
  const [qrCodeDataURL, setQrCodeDataURL] = useState<string | null>(null)
  const supabase = createSupabaseBrowser()

  // 獲取目前在快問快答頁面的玩家
  const fetchJoinedPlayers = useCallback(async () => {
    try {
      // 查詢在過去2分鐘內有心跳且標記為在快問快答頁面的用戶
      const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString()
      
      const { data: players, error } = await supabase
        .from('users')
        .select('line_id, display_name, avatar_url, last_active_at, is_in_quiz_page')
        .eq('is_in_quiz_page', true)
        .gte('last_active_at', twoMinutesAgo)
        .order('last_active_at', { ascending: false })

      if (error) throw error
      
      setJoinedPlayers(players || [])
      setPlayerCount(players?.length || 0)
    } catch (error) {
      console.error('Error fetching joined players:', error)
      
      // 如果新欄位不存在，回退到舊邏輯
      try {
        const { data: fallbackPlayers, error: fallbackError } = await supabase
          .from('users')
          .select('line_id, display_name, avatar_url, join_time')
          .eq('is_active', true)
          .order('join_time', { ascending: true })

        if (!fallbackError) {
          setJoinedPlayers(fallbackPlayers || [])
          setPlayerCount(fallbackPlayers?.length || 0)
        }
      } catch (fallbackErr) {
        console.error('Fallback query also failed:', fallbackErr)
      }
    }
  }, [supabase])

  // 生成 QR code
  const generateQRCode = useCallback(async () => {
    try {
      const quizURL = `${window.location.origin}/quiz`
      const response = await fetch(`/api/qr-code?url=${encodeURIComponent(quizURL)}`)
      const data = await response.json()
      
      if (data.success) {
        setQrCodeDataURL(data.qrCodeDataURL)
      }
    } catch (error) {
      console.error('Error generating QR code:', error)
    }
  }, [])

  useEffect(() => {
    fetchJoinedPlayers()
    generateQRCode()

    // 訂閱玩家加入
    const playersSubscription = supabase
      .channel('waiting_players')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'users' },
        () => {
          fetchJoinedPlayers()
        }
      )
      .subscribe()

    return () => {
      playersSubscription.unsubscribe()
    }
  }, [fetchJoinedPlayers, generateQRCode, supabase])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="max-w-6xl mx-auto text-center">
        {/* 主標題 */}
        <div className="mb-12">
          <h1 className="text-6xl font-bold text-gray-800 mb-4">
            🎮 準備開始遊戲！
          </h1>
          <p className="text-2xl text-gray-600">
            請賓客掃描 QR Code 加入遊戲
          </p>
        </div>

        {/* 玩家統計和QR Code */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-12">
          {/* 左側：玩家統計 */}
          <div className="bg-white rounded-3xl shadow-xl p-8">
            <div className="flex items-center justify-center mb-6">
              <UserPlus className="w-12 h-12 text-blue-500 mr-4" />
              <div>
                <div className="text-5xl font-bold text-blue-600">{playerCount}</div>
                <div className="text-xl text-gray-600">位賓客已加入</div>
              </div>
            </div>
            
            {/* 已加入玩家列表 */}
            {joinedPlayers.length > 0 && (
              <div className="mt-8">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">已加入的賓客：</h3>
                <div className="grid grid-cols-2 gap-4 max-h-96 overflow-y-auto">
                  {joinedPlayers.slice(0, 20).map((player, index) => (
                    <div key={player.line_id} className="flex items-center space-x-3 bg-gray-50 rounded-xl p-3">
                      {player.avatar_url ? (
                        <img 
                          src={player.avatar_url} 
                          alt={player.display_name} 
                          className="w-10 h-10 rounded-full border-2 border-gray-200"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gray-400 flex items-center justify-center text-white font-semibold">
                          {player.display_name?.charAt(0) || '?'}
                        </div>
                      )}
                      <span className="font-medium text-gray-800 truncate">{player.display_name}</span>
                    </div>
                  ))}
                  {joinedPlayers.length > 20 && (
                    <div className="col-span-2 text-center text-gray-500 py-2">
                      還有 {joinedPlayers.length - 20} 位賓客...
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* 右側：QR Code */}
          <div className="bg-white rounded-3xl shadow-xl p-8 flex flex-col items-center justify-center">
            <QrCode className="w-16 h-16 text-gray-400 mb-4" />
            <h3 className="text-2xl font-bold text-gray-800 mb-4">掃描加入遊戲</h3>
            <div className="w-64 h-64 bg-gray-200 rounded-2xl flex items-center justify-center mb-4">
              {qrCodeDataURL ? (
                <img 
                  src={qrCodeDataURL} 
                  alt="QR Code" 
                  className="w-full h-full rounded-2xl"
                />
              ) : (
                <div className="text-center text-gray-500">
                  <QrCode className="w-24 h-24 mx-auto mb-2" />
                  <p>QR Code 載入中...</p>
                </div>
              )}
            </div>
            <p className="text-gray-600 text-center">
              使用 LINE 掃描 QR Code<br />
              進入快問快答遊戲
            </p>
          </div>
        </div>

        {/* 等待提示 */}
        <div className="bg-gradient-to-r from-pink-100 to-purple-100 rounded-3xl p-8">
          <div className="flex items-center justify-center space-x-4">
            <div className="animate-pulse">
              <Users className="w-8 h-8 text-purple-600" />
            </div>
            <p className="text-xl text-purple-800 font-medium">
              等待主持人開始出題...
            </p>
            <div className="animate-pulse">
              <Clock className="w-8 h-8 text-purple-600" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
