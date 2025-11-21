'use client'

import { useState, useEffect, useCallback } from 'react'
import { createSupabaseBrowser } from '@/lib/supabase'
import { useRealtimeGameState } from '@/hooks/useRealtimeGameState'
import { useSoundEffects } from '@/hooks/useSoundEffects'
import { SoundToggle } from '@/components/SoundToggle'
import { subscribeToVoteEvents } from '@/lib/vote-events'
import Layout from '@/components/Layout'
import { Play, Pause, Users, Clock, HelpCircle, Zap, QrCode, UserPlus, Trophy } from 'lucide-react'

interface AnswerDistribution {
  answer: string
  count: number
  users: { display_name: string; avatar_url?: string }[]
}

interface TopPlayer {
  display_name: string
  avatar_url?: string
  answer_time: number
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

  // 顯示階段控制
  const [displayPhase, setDisplayPhase] = useState<'question' | 'options' | 'rankings'>('question')
  const [phaseTimer, setPhaseTimer] = useState<NodeJS.Timeout | null>(null)

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

  // 使用音效系統
  const { isSoundEnabled, toggleSound, playSound, preloadSounds, isLoaded } = useSoundEffects()

  // 同步 showingCorrectOnly 狀態到 localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('game-live-showing-correct-only', showingCorrectOnly.toString());
    }
  }, [showingCorrectOnly])

  // 預載音效
  useEffect(() => {
    preloadSounds()
  }, [preloadSounds])

  // 控制顯示階段切換
  useEffect(() => {
    if (!currentQuestion || !gameState?.is_game_active || gameState?.is_paused) {
      return
    }

    // 清除之前的計時器
    if (phaseTimer) {
      clearTimeout(phaseTimer)
    }

    // 重置為題目階段
    setDisplayPhase('question')

    // 根據媒體類型設定切換時間
    let switchDelay = 3000 // 預設3秒（圖片或純文字）

    if (currentQuestion.media_type === 'video' && currentQuestion.media_duration) {
      // 如果有影片長度資訊，使用影片長度
      switchDelay = currentQuestion.media_duration * 1000
    } else if (currentQuestion.media_type === 'video') {
      // 沒有長度資訊的影片，預設5秒
      switchDelay = 5000
    }

    // 設定切換到選項階段的計時器
    const timer = setTimeout(() => {
      setDisplayPhase('options')
    }, switchDelay)

    setPhaseTimer(timer)

    // 清理函數
    return () => {
      if (timer) {
        clearTimeout(timer)
      }
    }
  }, [currentQuestion?.id, gameState?.is_game_active, gameState?.is_paused])

  // 遊戲開始音效
  useEffect(() => {
    if (gameState?.is_game_active && !gameState?.is_paused && displayPhase === 'question') {
      playSound('GAME_START')
    }
  }, [gameState?.is_game_active, gameState?.is_paused, displayPhase, playSound])

  // 清理計時器
  useEffect(() => {
    return () => {
      if (phaseTimer) {
        clearTimeout(phaseTimer)
      }
    }
  }, [])

  // 監聽時間結束，獲取最終答題數據並準備顯示排行榜
  useEffect(() => {
    if (displayPhase === 'options' && timeLeft <= 0 && currentQuestion) {
      // 時間結束，重新獲取最新的答題數據以顯示最終結果
      fetchAnswerDistribution()
      fetchCurrentQuestionAnswerCount()
      console.log('倒數結束：重新獲取答題數據以顯示最終分佈')

      // 5秒後顯示分數排行榜
      const rankingTimer = setTimeout(() => {
        setDisplayPhase('rankings')
        fetchScoreRankings()
      }, 5000)

      return () => clearTimeout(rankingTimer)
    }
  }, [displayPhase, timeLeft, currentQuestion])

  // 時間結束音效
  useEffect(() => {
    if (displayPhase === 'options' && timeLeft <= 0 && currentQuestion) {
      playSound('TIME_UP')
    }
  }, [displayPhase, timeLeft, currentQuestion, playSound])

  // 正確答案音效
  useEffect(() => {
    if (displayPhase === 'options' && timeLeft <= 0 && currentQuestion) {
      // 延遲一點時間播放正確答案音效，讓時間結束音效先播放
      setTimeout(() => {
        playSound('CORRECT_ANSWER')
      }, 500)
    }
  }, [displayPhase, timeLeft, currentQuestion, playSound])

  // 排行榜音效
  useEffect(() => {
    if (displayPhase === 'rankings') {
      playSound('LEADERBOARD')
    }
  }, [displayPhase, playSound])

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

      console.log('🏆 分數排行榜數據:', data)
      setScoreRankings(data || [])
    } catch (error) {
      console.error('Error fetching score rankings:', error)
      setScoreRankings([])
    }
  }, [supabase])

  // 獲取答題分佈
  const fetchAnswerDistribution = useCallback(async () => {
    if (!currentQuestion) {
      console.log('fetchAnswerDistribution: No current question')
      return
    }

    console.log('fetchAnswerDistribution: Fetching for question ID:', currentQuestion.id)

    try {
      // 先獲取答題記錄
      const { data: answerRecords, error: answerError } = await supabase
        .from('answer_records')
        .select('selected_answer, user_line_id')
        .eq('question_id', currentQuestion.id)

      if (answerError) throw answerError

      console.log('fetchAnswerDistribution: Answer records:', answerRecords)

      if (!answerRecords || answerRecords.length === 0) {
        console.log('fetchAnswerDistribution: No answer records found')
        setAnswerDistribution(['A', 'B', 'C', 'D'].map(option => ({
          answer: option,
          count: 0,
          users: []
        })))
        return
      }

      // 獲取所有相關用戶的資料
      const lineIds = [...new Set(answerRecords.map(record => record.user_line_id))]
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('line_id, display_name, avatar_url')
        .in('line_id', lineIds)

      if (usersError) throw usersError

      console.log('fetchAnswerDistribution: Users data:', users)

      // 創建用戶查找映射
      const userMap = new Map()
      users?.forEach(user => {
        userMap.set(user.line_id, user)
      })

      // 統計每個答案的分佈
      const distribution = ['A', 'B', 'C', 'D'].map(option => {
        const optionAnswers = answerRecords.filter(record => record.selected_answer === option)
        const optionUsers = optionAnswers.map(record => {
          const user = userMap.get(record.user_line_id)
          return {
            display_name: user?.display_name || '未知用戶',
            avatar_url: user?.avatar_url || null
          }
        }).filter(user => user.display_name !== '未知用戶') // 過濾掉無效用戶

        return {
          answer: option,
          count: optionUsers.length,
          users: optionUsers
        }
      })

      console.log('fetchAnswerDistribution: Final distribution:', distribution)
      console.log('fetchAnswerDistribution: Distribution summary:', distribution.map(d => ({
        answer: d.answer,
        count: d.count,
        userCount: d.users.length,
        userNames: d.users.map(u => u.display_name)
      })))
      setAnswerDistribution(distribution)
    } catch (error) {
      console.error('Error fetching answer distribution:', error)
      setAnswerDistribution([])
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
          answer,
          users!inner(display_name, avatar_url)
        `)
        .eq('question_id', currentQuestion.id)
        .order('answer_time', { ascending: true })
        .limit(10)

      if (onlyCorrect) {
        query = query.eq('answer', currentQuestion.correct_answer)
      }

      const { data: topAnswers, error } = await query

      if (error) throw error

      const players = topAnswers?.map(record => ({
        display_name: (record.users as any).display_name,
        avatar_url: (record.users as any).avatar_url,
        answer_time: record.answer_time,
        is_correct: record.answer === currentQuestion.correct_answer
      })) || []

      setTopPlayers(players)
    } catch (error) {
      console.error('Error fetching top players:', error)
      setTopPlayers([])
    }
  }, [currentQuestion, supabase])

  // 初始化數據獲取
  useEffect(() => {
    if (currentQuestion) {
      fetchAnswerDistribution()
      fetchTopPlayers(showingCorrectOnly)
      fetchCurrentQuestionAnswerCount()
    }
  }, [fetchAnswerDistribution, fetchTopPlayers, calculateTimeLeft])

  // 移除答錯玩家的邏輯
  const removeWrongPlayers = useCallback(() => {
    setTopPlayers(prev => prev.filter(player => player.is_correct));
  }, []);

  useEffect(() => {
    if (timeLeft <= 0 && topPlayers.length > 0 && !showingCorrectOnly) {
      const timer = setTimeout(() => {
        removeWrongPlayers();
      }, 2000);

      return () => {
        clearTimeout(timer);
      };
    }
  }, [timeLeft, showingCorrectOnly, topPlayers.length, removeWrongPlayers])

  // 處理新答案
  const handleNewAnswer = useCallback(() => {
    fetchAnswerDistribution()
    fetchTopPlayers(showingCorrectOnly)
    fetchCurrentQuestionAnswerCount()
  }, [fetchAnswerDistribution, fetchTopPlayers, showingCorrectOnly, fetchCurrentQuestionAnswerCount])

  // 訂閱答題記錄變化
  useEffect(() => {
    if (currentQuestion) {
      const answerSubscription = supabase
        .channel(`answer-records-${currentQuestion.id}`)
        .on('postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'answer_records', filter: `question_id=eq.${currentQuestion.id}` },
          handleNewAnswer
        )
        .subscribe()

      return () => {
        answerSubscription.unsubscribe()
      }
    } else {
      console.log('No current question, not subscribing to answer records')
    }
  }, [currentQuestion, fetchAnswerDistribution, fetchTopPlayers, supabase, handleNewAnswer])

  // 監聽投票事件並播放投票音效
  useEffect(() => {
    if (!isSoundEnabled) return

    const voteSubscription = subscribeToVoteEvents((event) => {
      console.log('🗳️ 收到投票事件:', event)
      playSound('VOTE')
    })

    return () => {
      voteSubscription.unsubscribe()
    }
  }, [isSoundEnabled, playSound])

  // 伺服器同步計時器（每秒同步一次實際時間）
  useEffect(() => {
    if (!gameState?.is_game_active || gameState?.is_paused) return

    const syncTimer = setInterval(() => {
      const newTimeLeft = calculateTimeLeft() // 從伺服器獲取精確時間
      setTimeLeft(newTimeLeft)
      setDisplayTimeLeft(newTimeLeft)

      // 每5秒重新獲取數據
      if (newTimeLeft % 5000 === 0) {
        fetchAnswerDistribution()
        fetchTopPlayers(showingCorrectOnly)
        fetchCurrentQuestionAnswerCount()

        // 延遲獲取分數排行榜
        setTimeout(() => {
          fetchScoreRankings()
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
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      {/* 音效控制 */}
      <div className="fixed top-4 right-4 z-50">
        <SoundToggle isEnabled={isSoundEnabled} onToggle={toggleSound} />
      </div>

      {/* 音效載入狀態指示 */}
      {!isLoaded && (
        <div className="fixed bottom-4 right-4 bg-white bg-opacity-20 text-white px-4 py-2 rounded-lg text-sm backdrop-blur-sm border border-white border-opacity-30">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
            <span>音效載入中...</span>
          </div>
        </div>
      )}

      {/* 遊戲暫停提示 */}
      {gameState?.is_paused && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50 bg-yellow-500 bg-opacity-90 border border-yellow-400 text-white px-6 py-3 rounded-lg shadow-lg backdrop-blur-sm">
          ⏸️ 遊戲暫停中，請等待主持人繼續遊戲
        </div>
      )}

      {gameState?.is_game_active && (gameState?.is_waiting_for_players !== undefined ? gameState.is_waiting_for_players : !gameState?.current_question_id) ? (
        <WaitingStage gameState={gameState} />
      ) : currentQuestion && gameState?.is_game_active && !gameState?.is_paused ? (
        <div className="h-screen flex flex-col">
          {displayPhase === 'question' ? (
            // 題目階段 - 滿版顯示
            <div className="flex-1 flex items-center justify-center p-8">
              <div className="w-full max-w-6xl text-center">
                {/* 題目文字 */}
                <h1 className="text-4xl md:text-6xl lg:text-8xl font-bold text-white mb-8 leading-tight">
                  {currentQuestion.question_text}
                </h1>

                {/* 媒體內容 - 滿版顯示 */}
                {currentQuestion.media_url && (
                  <div className="flex justify-center">
                    {currentQuestion.media_type === 'image' && (
                      <img
                        src={currentQuestion.media_url}
                        alt={currentQuestion.media_alt_text || '題目圖片'}
                        className="max-w-full max-h-[60vh] object-contain rounded-2xl shadow-2xl"
                      />
                    )}
                    {currentQuestion.media_type === 'video' && (
                      <video
                        key={currentQuestion.id}
                        src={currentQuestion.media_url}
                        poster={currentQuestion.media_thumbnail_url}
                        controls
                        autoPlay
                        muted
                        loop
                        playsInline
                        className="max-w-full max-h-[60vh] object-contain rounded-2xl shadow-2xl"
                        ref={(video) => {
                          if (video) {
                            const handleCanPlay = () => {
                              video.play().then(() => {
                                console.log('影片自動播放成功')
                                video.muted = false
                              }).catch((error) => {
                                console.log('自動播放失敗:', error)
                              })
                            }
                            video.addEventListener('canplay', handleCanPlay, { once: true })
                          }
                        }}
                      >
                        您的瀏覽器不支援影片播放
                      </video>
                    )}
                  </div>
                )}

                {/* 階段指示器 */}
                <div className="mt-8">
                  <div className="inline-flex items-center space-x-2 bg-black bg-opacity-40 rounded-full px-6 py-3 backdrop-blur-sm border border-white border-opacity-30">
                    <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
                    <span className="text-white text-lg font-medium">
                      {currentQuestion.media_type === 'video' ? '影片播放中...' : '題目展示中...'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : displayPhase === 'options' ? (
            // 選項階段 - 滿版顯示選項
            <div className="flex-1 p-8">
              {/* 題目標題（縮小版） */}
              <div className="text-center mb-8">
                <h2 className="text-2xl md:text-4xl font-bold text-white mb-4">
                  {currentQuestion.question_text}
                </h2>

                {/* 倒數計時或結果顯示 */}
                {timeLeft > 0 ? (
                  <div className="inline-flex items-center space-x-4 bg-black bg-opacity-40 rounded-full px-6 py-3 backdrop-blur-sm border border-white border-opacity-30">
                    <div className="text-white text-xl font-bold">
                      ⏱️ {Math.ceil(displayTimeLeft / 1000)}秒
                    </div>
                    <div className="text-white text-lg">
                      已答題: {currentQuestionAnswerCount} 人
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="inline-flex items-center space-x-4 bg-green-600 bg-opacity-90 rounded-full px-6 py-3 backdrop-blur-sm border border-green-400 border-opacity-50">
                      <div className="text-white text-xl font-bold">
                        ✅ 正確答案：{currentQuestion.correct_answer}
                      </div>
                    </div>
                    <div className="inline-flex items-center space-x-4 bg-black bg-opacity-40 rounded-full px-6 py-3 backdrop-blur-sm border border-white border-opacity-30">
                      <div className="text-white text-lg">
                        總共 {currentQuestionAnswerCount} 人參與答題
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* 四個選項 - 2x2 網格滿版 */}
              <div className="grid grid-cols-2 gap-6 h-[calc(100vh-200px)]">
                {[
                  { key: 'A', text: currentQuestion.option_a, color: 'from-red-500 to-red-600' },
                  { key: 'B', text: currentQuestion.option_b, color: 'from-blue-500 to-blue-600' },
                  { key: 'C', text: currentQuestion.option_c, color: 'from-green-500 to-green-600' },
                  { key: 'D', text: currentQuestion.option_d, color: 'from-yellow-500 to-yellow-600' }
                ].map((option) => {
                  const distribution = answerDistribution.find(d => d.answer === option.key)
                  const isCorrect = currentQuestion.correct_answer === option.key
                  const percentage = distribution ? Math.round((distribution.count / Math.max(currentQuestionAnswerCount, 1)) * 100) : 0

                  return (
                    <div
                      key={option.key}
                      className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${option.color} shadow-2xl transform transition-all duration-500 hover:scale-105 flex items-center justify-center ${timeLeft <= 0 && isCorrect ? 'ring-8 ring-white ring-opacity-80 animate-pulse' : ''
                        }`}
                    >
                      {/* 答題進度條 - 只在倒數結束後顯示 */}
                      {timeLeft <= 0 && distribution && distribution.count > 0 && (
                        <div
                          className="absolute bottom-0 left-0 bg-opacity-30 transition-all duration-1000"
                          style={{
                            height: `${Math.max(percentage, 5)}%`,
                            width: '100%'
                          }}
                        />
                      )}

                      {/* 選項內容 */}
                      <div className="relative z-10 flex flex-col h-full p-6">
                        {/* 選項標題區域 */}
                        <div className="text-center flex-shrink-0">
                          <div className="text-4xl md:text-6xl font-black text-white mb-2">
                            {option.key}
                          </div>
                          <div className="text-lg md:text-2xl font-bold text-white leading-tight mb-4">
                            {option.text}
                          </div>
                        </div>

                        {/* 答題統計 - 只在倒數結束後顯示 */}
                        {timeLeft <= 0 && (
                          <div className="text-center mb-4">
                            <div className="bg-white bg-opacity-20 rounded-full px-4 py-2 inline-block">
                              <span className="text-black font-bold text-lg">
                                {distribution?.count || 0} 人 ({percentage}%)
                              </span>
                            </div>
                          </div>
                        )}

                        {/* 選擇此選項的玩家頭像 - 即時顯示 */}
                        <div className="flex-1 flex flex-col justify-center">
                          {distribution && distribution.users && distribution.users.length > 0 ? (
                            <div className="grid grid-cols-4 gap-2 justify-items-center">
                              {distribution.users.slice(0, 12).map((user, userIndex) => (
                                <div key={userIndex} className="flex flex-col items-center">
                                  {user.avatar_url ? (
                                    <img
                                      src={user.avatar_url}
                                      alt={user.display_name}
                                      className="w-8 h-8 rounded-full object-cover border-2 border-white"
                                    />
                                  ) : (
                                    <div className="w-8 h-8 bg-white bg-opacity-30 rounded-full flex items-center justify-center text-black font-bold text-xs border-2 border-white">
                                      {user.display_name?.charAt(0) || '?'}
                                    </div>
                                  )}

                                </div>
                              ))}
                              {distribution.users.length > 12 && (
                                <div className="flex flex-col items-center">
                                  <div className="w-8 h-8 bg-white bg-opacity-50 rounded-full flex items-center justify-center text-black font-bold text-xs border-2 border-white">
                                    +{distribution.users.length - 12}
                                  </div>
                                  <span className="text-xs text-black mt-1">更多</span>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="text-center text-white opacity-60">
                              <div className="text-lg">暫無人選擇</div>
                            </div>
                          )}
                        </div>

                        {/* 正確答案標示 */}
                        {timeLeft <= 0 && isCorrect && (
                          <div className="absolute -top-4 -right-4 bg-white text-green-600 rounded-full p-4 shadow-lg">
                            <span className="text-2xl">✓</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : displayPhase === 'rankings' ? (
            // 排行榜階段 - 顯示分數排行榜
            <div className="flex-1 p-8">
              <div className="text-center mb-8">
                <h2 className="text-4xl md:text-6xl font-bold text-white mb-4">
                  🏆 目前排行榜
                </h2>
                <div className="text-xl text-white opacity-80">
                  前 10 名玩家
                </div>
              </div>

              {/* 分數排行榜 */}
              <div className="max-w-4xl mx-auto space-y-4">
                {scoreRankings.map((player, index) => (
                  <div
                    key={player.line_id}
                    className={`flex items-center space-x-6 bg-white bg-opacity-10 backdrop-blur-md rounded-2xl p-6 ${index < 3 ? 'ring-2 ring-yellow-400 ring-opacity-60' : ''
                      }`}
                  >
                    {/* 排名 */}
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center font-bold text-2xl ${index === 0 ? 'bg-yellow-500 text-black' :
                        index === 1 ? 'bg-gray-400 text-black' :
                          index === 2 ? 'bg-orange-600 text-black' :
                            'bg-white bg-opacity-20 text-black'
                      }`}>
                      {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1}
                    </div>

                    {/* 玩家頭像 */}
                    {player.avatar_url ? (
                      <img
                        src={player.avatar_url}
                        alt={player.display_name}
                        className="w-16 h-16 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-16 h-16 bg-white bg-opacity-30 rounded-full flex items-center justify-center text-black font-bold text-xl">
                        {player.display_name?.charAt(0) || '?'}
                      </div>
                    )}

                    {/* 玩家資訊 */}
                    <div className="flex-1">
                      <div className="text-2xl font-bold text-black">
                        {player.display_name}
                      </div>
                    </div>

                    {/* 分數 */}
                    <div className="text-3xl font-bold text-black">
                      {player.quiz_score} 分
                    </div>
                  </div>
                ))}

                {scoreRankings.length === 0 && (
                  <div className="text-center text-black text-xl opacity-60 py-8">
                    暫無排行榜資料
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="flex items-center justify-center h-screen">
          <div className="text-center text-white">
            <Users className="w-24 h-24 mx-auto mb-6 opacity-50" />
            <h3 className="text-4xl font-bold mb-4">等待中</h3>
            <p className="text-xl mb-8">目前沒有進行中的題目</p>
            <a
              href="/quiz"
              className="inline-flex items-center space-x-3 bg-white bg-opacity-20 hover:bg-opacity-30 text-black font-bold py-4 px-8 rounded-2xl transition-all duration-200 backdrop-blur-sm"
            >
              <HelpCircle className="w-6 h-6" />
              <span>參與答題</span>
            </a>
          </div>
        </div>
      )}
    </div>
  )
}

// 等待階段組件 - 更新為滿版設計
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
      const response = await fetch('/api/qr-code?url=' + encodeURIComponent(`${window.location.origin}/quiz`))
      const data = await response.json()
      console.log('QR Code API response:', data) // 添加調試日誌
      if (data.success && (data.qrCodeDataURL || data.qrCode)) {
        setQrCodeDataURL(data.qrCodeDataURL || data.qrCode)
      } else {
        console.error('QR Code generation failed:', data)
      }
    } catch (error) {
      console.error('Error generating QR code:', error)
    }
  }, [])

  useEffect(() => {
    fetchJoinedPlayers()
    generateQRCode()

    const interval = setInterval(fetchJoinedPlayers, 5000) // 每5秒更新一次

    // 訂閱用戶狀態變化
    const playersSubscription = supabase
      .channel('waiting-players')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'users' },
        () => {
          fetchJoinedPlayers()
        }
      )
      .subscribe()

    return () => {
      clearInterval(interval)
      playersSubscription.unsubscribe()
    }
  }, [fetchJoinedPlayers, generateQRCode, supabase])

  return (
    <div className="h-screen flex items-center justify-center p-8">
      <div className="w-full max-w-6xl text-center">
        {/* 主標題 */}
        <div className="mb-12">
          <h1 className="text-6xl md:text-8xl font-black text-white mb-6">
            快問快答
          </h1>
          <p className="text-2xl md:text-3xl text-white opacity-80">
            掃描 QR Code 加入遊戲
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* 左側：玩家列表 */}
          <div className="bg-white bg-opacity-10 backdrop-blur-md rounded-3xl p-8">
            <div className="flex items-center justify-center space-x-4 mb-8">
              <Users className="w-12 h-12 text-white" />
              <h2 className="text-4xl font-bold text-black">
                已加入玩家 ({playerCount})
              </h2>
            </div>

            <div className="max-h-96 overflow-y-auto space-y-4">
              {joinedPlayers.length > 0 ? (
                joinedPlayers.map((player, index) => (
                  <div key={player.line_id} className="flex items-center space-x-4 bg-white bg-opacity-20 rounded-2xl p-4">
                    <div className="w-12 h-12 bg-white bg-opacity-30 rounded-full flex items-center justify-center text-black font-bold text-lg">
                      {index + 1}
                    </div>
                    {player.avatar_url ? (
                      <img
                        src={player.avatar_url}
                        alt={player.display_name}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-white bg-opacity-30 rounded-full flex items-center justify-center text-black font-bold">
                        {player.display_name?.charAt(0) || '?'}
                      </div>
                    )}
                    <span className="text-xl font-semibold text-black flex-1 text-left">
                      {player.display_name}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-black text-xl opacity-60 py-8">
                  等待玩家加入...
                </div>
              )}
            </div>
          </div>

          {/* 右側：QR Code */}
          <div className="bg-white bg-opacity-10 backdrop-blur-md rounded-3xl p-8">
            <QrCode className="w-16 h-16 text-white mx-auto mb-6" />
            <h3 className="text-3xl font-bold text-black mb-8">掃描加入遊戲</h3>
            <div className="w-80 h-80 bg-white rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl">
              {qrCodeDataURL ? (
                <img
                  src={qrCodeDataURL}
                  alt="QR Code"
                  className="w-full h-full rounded-3xl object-contain p-4"
                />
              ) : (
                <div className="text-center text-black">
                  <QrCode className="w-24 h-24 mx-auto mb-4 text-gray-600" />
                  <p className="text-lg font-semibold text-black">QR Code 載入中...</p>
                </div>
              )}
            </div>
            <p className="text-black text-xl opacity-80">
              使用 LINE 掃描 QR Code<br />
              進入快問快答遊戲
            </p>
          </div>
        </div>

        {/* 等待提示 */}
        <div className="mt-12 bg-white bg-opacity-10 backdrop-blur-md rounded-3xl p-8">
          <div className="flex items-center justify-center space-x-6">
            <div className="animate-pulse">
              <Users className="w-12 h-12 text-white" />
            </div>
            <p className="text-3xl text-white font-bold">
              等待主持人開始出題...
            </p>
            <div className="animate-pulse">
              <Clock className="w-12 h-12 text-white" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
