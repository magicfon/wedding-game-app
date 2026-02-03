'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createSupabaseBrowser } from '@/lib/supabase'
import { useRealtimeGameState } from '@/hooks/useRealtimeGameState'
import { useSoundEffects } from '@/hooks/useSoundEffects'
import { useBackgroundMusic } from '@/hooks/useBackgroundMusic'
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
  // 題目過渡狀態（避免顯示上一題內容）
  const [isTransitioning, setIsTransitioning] = useState(false)
  const lastDisplayedQuestionIdRef = useRef<number | null>(null)

  // 音效播放狀態追蹤（防止重複播放）
  const correctAnswerPlayedRef = useRef<number | null>(null)
  const leaderboardPlayedRef = useRef<number | null>(null)
  const timeUpPlayedRef = useRef<number | null>(null)
  const countdownPlayingRef = useRef<boolean>(false)

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
  const { gameState, currentQuestion, loading, calculateTimeLeft, prefetchNextQuestion } = useRealtimeGameState()

  // 使用音效系統
  const { isSoundEnabled, toggleSound, playSound, stopSound, preloadSounds, isLoaded } = useSoundEffects()

  // 背景音樂（遊戲進行時播放）
  const { tryPlay: tryPlayBgm } = useBackgroundMusic({
    url: '/sounds/game-start.mp3',
    enabled: isSoundEnabled && Boolean(gameState?.is_game_active) && !gameState?.is_paused,
    volume: 0.3
  })

  // 處理用戶交互以啟用背景音樂
  useEffect(() => {
    const handleInteraction = () => {
      tryPlayBgm()
      window.removeEventListener('click', handleInteraction)
      window.removeEventListener('keydown', handleInteraction)
    }

    window.addEventListener('click', handleInteraction)
    window.addEventListener('keydown', handleInteraction)

    return () => {
      window.removeEventListener('click', handleInteraction)
      window.removeEventListener('keydown', handleInteraction)
    }
  }, [tryPlayBgm])

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

  // 用戶資料緩存，避免 N+1 查詢
  const userCacheRef = useRef<Map<string, { display_name: string; avatar_url: string | null }>>(new Map())

  // 預先載入所有用戶資料到緩存
  useEffect(() => {
    const fetchAllUsers = async () => {
      try {
        console.log('🔄 開始預載入用戶資料...')
        const { data } = await supabase
          .from('users')
          .select('line_id, display_name, avatar_url')

        if (data) {
          data.forEach(user => {
            userCacheRef.current.set(user.line_id, {
              display_name: user.display_name,
              avatar_url: user.avatar_url
            })

            // 預載入圖片檔案 (Image Pre-loading)
            // 這會強制瀏覽器在背景下載圖片並快取，確保顯示時不會有延遲
            if (user.avatar_url) {
              const img = new Image()
              img.src = user.avatar_url
            }
          })
          console.log(`✅ 已獲得並開始預載入 ${data.length} 位用戶的資料與圖片`)
        }
      } catch (error) {
        console.error('預載入用戶資料失敗:', error)
      }
    }

    fetchAllUsers()
  }, [supabase])

  // 追蹤上一題 ID，用於判斷是否為新題目
  const lastProcessedQuestionIdRef = useRef<number | null>(null)
  // 追蹤問題階段開始時間，用於在狀態更新時恢復計時器
  const phaseStartTimeRef = useRef<number>(0)
  // 追蹤當前顯示階段，用於在 effect 中判斷
  const phaseRef = useRef(displayPhase)
  // 追蹤遊戲是否剛開始（從等待狀態進入第一題）
  const wasWaitingRef = useRef<boolean>(true)

  // 同步 phaseRef
  useEffect(() => {
    phaseRef.current = displayPhase
  }, [displayPhase])

  // 當遊戲從等待狀態進入第一題時，重置所有相關 refs（修復第一題狀態問題）
  useEffect(() => {
    const isWaitingForPlayers = gameState?.is_waiting_for_players !== undefined
      ? gameState.is_waiting_for_players
      : !gameState?.current_question_id

    // 檢測從等待狀態進入遊戲狀態的轉換
    if (wasWaitingRef.current && !isWaitingForPlayers && gameState?.current_question_id) {
      console.log('🎮 遊戲開始，重置所有狀態 refs')
      // 重置所有追蹤 refs
      lastProcessedQuestionIdRef.current = null
      phaseStartTimeRef.current = 0
      correctAnswerPlayedRef.current = null
      leaderboardPlayedRef.current = null
      timeUpPlayedRef.current = null
      countdownPlayingRef.current = false
      // 重置顯示階段為 question
      setDisplayPhase('question')
    }

    wasWaitingRef.current = isWaitingForPlayers
  }, [gameState?.is_waiting_for_players, gameState?.current_question_id])

  // 控制顯示階段切換
  useEffect(() => {
    if (!currentQuestion || !gameState?.is_game_active || gameState?.is_paused) {
      return
    }

    // 判斷是否為新題目
    const isNewQuestion = lastProcessedQuestionIdRef.current !== currentQuestion.id

    // 如果不是新題目，且當前已經不是 question 階段，則直接返回（不重置階段，不設計時器）
    if (!isNewQuestion && phaseRef.current !== 'question') {
      return
    }

    // 清除之前的計時器
    if (phaseTimer) {
      clearTimeout(phaseTimer)
    }

    // 計算總切換時間
    let switchDelay = (currentQuestion.time_limit || 5) * 1000
    if (currentQuestion.media_type === 'video' && currentQuestion.media_duration) {
      switchDelay = currentQuestion.media_duration * 1000
    } else if (currentQuestion.media_type === 'video' && !currentQuestion.media_duration) {
      switchDelay = (currentQuestion.time_limit || 5) * 1000
    }

    let remainingTime = switchDelay

    if (isNewQuestion) {
      // 新題目：重置狀態
      lastProcessedQuestionIdRef.current = currentQuestion.id
      phaseStartTimeRef.current = Date.now()
      setDisplayPhase('question')
      console.log('🔄 新題目：重置為 question 階段，計時：', switchDelay)
    } else {
      // 舊題目（即使狀態更新導致 effect 重跑）：計算剩餘時間
      const elapsed = Date.now() - phaseStartTimeRef.current
      remainingTime = Math.max(0, switchDelay - elapsed)
      console.log('🔄 狀態更新：保持 question 階段，剩餘時間：', remainingTime)

      // 如果時間已經到了，直接切換到 options
      if (remainingTime <= 0) {
        setDisplayPhase('options')
        return
      }
    }

    // 設定切換到選項階段的計時器
    const timer = setTimeout(() => {
      setDisplayPhase('options')
    }, remainingTime)

    setPhaseTimer(timer)

    // 清理函數
    return () => {
      if (timer) {
        clearTimeout(timer)
      }
    }
  }, [currentQuestion?.id, currentQuestion?.time_limit, currentQuestion?.media_type, currentQuestion?.media_duration, gameState?.is_game_active, gameState?.is_paused])

  // 背景音樂現在由 useBackgroundMusic hook 管理，不再需要這段邏輯

  // 清理計時器
  useEffect(() => {
    return () => {
      if (phaseTimer) {
        clearTimeout(phaseTimer)
      }
    }
  }, [])

  // 監聽 display_phase 變化，如果是 rankings 則重新獲取數據
  useEffect(() => {
    if (gameState?.display_phase) {
      const serverPhase = gameState.display_phase;

      if (serverPhase === 'rankings') {
        setDisplayPhase('rankings')
        console.log('切換到排行榜階段')
        console.log('completed:', gameState.completed_questions, 'total:', gameState.total_questions)
        fetchScoreRankings()
        // 進入排行榜時，預載下一題
        prefetchNextQuestion()
      } else if (serverPhase === 'question') {
        // 如果伺服器是 'question'，但本地已經是 'options'（時間到自動切換），則不重置回去
        // 除非題目改變（由另一個 useEffect 處理）
        setDisplayPhase(prev => {
          if (prev === 'options') {
            return prev;
          }
          return 'question';
        });
      } else {
        // 其他情況（如 server 支持 options 階段）直接同步
        setDisplayPhase(serverPhase);
      }
    }
  }, [gameState?.display_phase, gameState?.completed_questions, gameState?.total_questions])

  // 監聽時間結束，獲取最終答題數據（不自動跳轉到排行榜）
  useEffect(() => {
    if (displayPhase === 'options' && timeLeft <= 0 && currentQuestion) {
      // 時間結束，重新獲取最新的答題數據以顯示最終結果
      fetchAnswerDistribution()
      fetchCurrentQuestionAnswerCount()
      fetchCurrentQuestionAnswerCount()
      console.log('倒數結束：重新獲取答題數據以顯示最終分佈')
      // 倒數結束時，預載下一題（以防不進入排行榜直接下一題）
      prefetchNextQuestion()
      // 不再自動跳轉到排行榜，由管理控制台的「排行榜」按鈕手動控制
    }
  }, [displayPhase, timeLeft, currentQuestion])

  // 倒數五秒音效（剩餘5秒時開始播放，時間結束後停止）
  useEffect(() => {
    if (displayPhase === 'options' && currentQuestion) {
      // 當剩餘時間 <= 5秒且 > 0秒時，開始播放倒數音效
      if (timeLeft <= 5000 && timeLeft > 0 && !countdownPlayingRef.current) {
        countdownPlayingRef.current = true
        playSound('COUNTDOWN')
        console.log('🔔 開始播放倒數音效')
      }
      // 當時間結束時，停止倒數音效
      if (timeLeft <= 0 && countdownPlayingRef.current) {
        countdownPlayingRef.current = false
        stopSound('COUNTDOWN')
        console.log('🔔 停止倒數音效')
      }
    }
  }, [displayPhase, timeLeft, currentQuestion, playSound, stopSound])

  // 當題目切換時，重置所有音效狀態和顯示階段（修復上一題殘留和音效過早播放問題）
  useEffect(() => {
    if (currentQuestion?.id) {
      // 檢查是否是新題目（而不是同一題目的狀態更新）
      if (lastDisplayedQuestionIdRef.current !== currentQuestion.id) {
        console.log('🔄 題目切換，開始過渡: ID =', currentQuestion.id)
        // 開始過渡，隱藏內容
        setIsTransitioning(true)
        // 立即重置顯示階段為 question
        setDisplayPhase('question')
        // 重置音效狀態
        countdownPlayingRef.current = false
        timeUpPlayedRef.current = null
        correctAnswerPlayedRef.current = null
        // 重置時間為一個大值，避免 timeLeft <= 0 條件被觸發
        setTimeLeft(999999)
        setDisplayTimeLeft(999999)

        // 短暂延遲後顯示新題目
        setTimeout(() => {
          lastDisplayedQuestionIdRef.current = currentQuestion.id
          setIsTransitioning(false)
          console.log('✅ 過渡完成，顯示新題目')
        }, 50)
      }
    }
  }, [currentQuestion?.id])

  // 當題目變更時，立即初始化時間（修復第一題時間為 0 的問題）
  useEffect(() => {
    if (currentQuestion && gameState?.is_game_active && !gameState?.is_paused && gameState?.question_start_time) {
      const initialTimeLeft = calculateTimeLeft()
      setTimeLeft(initialTimeLeft)
      setDisplayTimeLeft(initialTimeLeft)
      console.log('🕐 題目變更，初始化時間:', initialTimeLeft, 'ms')
    }
  }, [currentQuestion?.id, gameState?.question_start_time])

  // 時間結束音效（使用 ref 防止重複播放）
  // 加入 question_start_time 檢查和 displayPhase 檢查，確保遊戲真正開始後才觸發
  useEffect(() => {
    // 額外檢查：timeLeft 必須是真正經過倒數而不是初始值
    // 且 displayPhase 必須是 'options'（不是 'question' 階段）
    if (displayPhase === 'options' &&
      timeLeft <= 0 &&
      timeLeft !== 999999 &&  // 排除初始重置值
      currentQuestion &&
      gameState?.question_start_time) {
      // 檢查是否已經為這道題播放過 TIME_UP 音效
      if (timeUpPlayedRef.current !== currentQuestion.id) {
        timeUpPlayedRef.current = currentQuestion.id
        playSound('TIME_UP')
        console.log('🔔 播放 TIME_UP 音效')
      }
    }
  }, [displayPhase, timeLeft, currentQuestion, gameState?.question_start_time, playSound])

  // 正確答案音效（使用 ref 防止重複播放）
  // 加入 question_start_time 檢查，確保遊戲真正開始後才觸發
  useEffect(() => {
    if (displayPhase === 'options' &&
      timeLeft <= 0 &&
      timeLeft !== 999999 &&  // 排除初始重置值
      currentQuestion &&
      gameState?.question_start_time) {
      // 檢查是否已經為這道題播放過正確答案音效
      if (correctAnswerPlayedRef.current !== currentQuestion.id) {
        correctAnswerPlayedRef.current = currentQuestion.id
        // 延遲一點時間播放正確答案音效，讓時間結束音效先播放
        setTimeout(() => {
          playSound('CORRECT_ANSWER')
          console.log('✅ 播放 CORRECT_ANSWER 音效')
        }, 500)
      }
    }
  }, [displayPhase, timeLeft, currentQuestion, gameState?.question_start_time, playSound])

  // 排行榜音效（使用 ref 防止重複播放）
  useEffect(() => {
    if (displayPhase === 'rankings' && currentQuestion) {
      // 檢查是否已經為這道題播放過排行榜音效
      if (leaderboardPlayedRef.current !== currentQuestion.id) {
        leaderboardPlayedRef.current = currentQuestion.id
        playSound('LEADERBOARD')
      }
    }
  }, [displayPhase, currentQuestion, playSound])

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
          selected_answer,
          users!inner(display_name, avatar_url)
        `)
        .eq('question_id', currentQuestion.id)
        .order('answer_time', { ascending: true })
        .limit(10)

      if (onlyCorrect) {
        query = query.eq('selected_answer', currentQuestion.correct_answer)
      }

      const { data: topAnswers, error } = await query

      if (error) throw error

      const players = topAnswers?.map(record => ({
        display_name: (record.users as any).display_name,
        avatar_url: (record.users as any).avatar_url,
        answer_time: record.answer_time,
        is_correct: record.selected_answer === currentQuestion.correct_answer
      })) || []

      setTopPlayers(players)
    } catch (error) {
      console.error('Error fetching top players:', error)
      setTopPlayers([])
    }
  }, [currentQuestion, supabase])

  // 當題目 ID 變更時，重置答題數據並獲取新數據（修復第一題答題人數錯誤的問題）
  useEffect(() => {
    if (currentQuestion) {
      // 先重置數據，避免顯示舊題目的數據
      setCurrentQuestionAnswerCount(0)
      setAnswerDistribution(['A', 'B', 'C', 'D'].map(option => ({
        answer: option,
        count: 0,
        users: []
      })))
      setTopPlayers([])

      // 延遲一小段時間再獲取，確保資料庫已經準備好
      const timer = setTimeout(() => {
        fetchAnswerDistribution()
        fetchTopPlayers(showingCorrectOnly)
        fetchCurrentQuestionAnswerCount()
        console.log('📊 題目變更，獲取新答題數據')
      }, 100)

      return () => clearTimeout(timer)
    }
  }, [currentQuestion?.id]) // 只依賴題目 ID，避免不必要的重複獲取

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

  // 處理新答案 - 使用 realtime payload 直接更新，避免重新查詢
  const handleNewAnswerFromPayload = useCallback((payload: any) => {
    const newRecord = payload.new
    if (!newRecord) return

    const answer = newRecord.selected_answer
    const userLineId = newRecord.user_line_id

    // 直接增加答題計數
    setCurrentQuestionAnswerCount(prev => prev + 1)

    // 更新答題分佈（增量更新）
    setAnswerDistribution(prev => prev.map(d =>
      d.answer === answer
        ? { ...d, count: d.count + 1 }
        : d
    ))

    // 使用緩存或獲取用戶資料來更新頭像顯示
    const updateUserData = async () => {
      try {
        let userData = userCacheRef.current.get(userLineId)

        // 如果緩存中沒有，則從資料庫獲取並存入緩存
        if (!userData) {
          console.log(`👤 緩存未命中，獲取用戶資料: ${userLineId}`)
          const { data } = await supabase
            .from('users')
            .select('display_name, avatar_url')
            .eq('line_id', userLineId)
            .single()

          if (data) {
            userData = {
              display_name: data.display_name,
              avatar_url: data.avatar_url
            }
            userCacheRef.current.set(userLineId, userData)
          }
        }

        if (userData) {
          setAnswerDistribution(prev => prev.map(d =>
            d.answer === answer
              ? {
                ...d,
                users: [...d.users, {
                  display_name: userData?.display_name || '未知用戶',
                  avatar_url: userData?.avatar_url || undefined
                }]
              }
              : d
          ))
        }
      } catch (err) {
        console.error('Error fetching/updating user data:', err)
      }
    }

    updateUserData()

    // 僅在需要時更新 top players（延遲執行，優先處理計數更新）
    setTimeout(() => {
      fetchTopPlayers(showingCorrectOnly)
    }, 100)
  }, [supabase, showingCorrectOnly, fetchTopPlayers])

  // 訂閱答題記錄變化
  useEffect(() => {
    if (currentQuestion) {
      const answerSubscription = supabase
        .channel(`answer-records-${currentQuestion.id}`)
        .on('postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'answer_records', filter: `question_id=eq.${currentQuestion.id}` },
          handleNewAnswerFromPayload
        )
        .subscribe()

      return () => {
        answerSubscription.unsubscribe()
      }
    } else {
      console.log('No current question, not subscribing to answer records')
    }
  }, [currentQuestion, supabase, handleNewAnswerFromPayload])

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
  // 移除了每5秒的輪詢，改為依賴 Realtime 事件進行即時更新
  useEffect(() => {
    if (!gameState?.is_game_active || gameState?.is_paused) return

    const syncTimer = setInterval(() => {
      const newTimeLeft = calculateTimeLeft()
      setTimeLeft(newTimeLeft)
      setDisplayTimeLeft(newTimeLeft)
    }, 1000) // 每秒同步一次

    return () => clearInterval(syncTimer)
  }, [gameState, calculateTimeLeft])

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
    <div className="min-h-screen h-screen overflow-hidden bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
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

      {/* 優先顯示排行榜 - 不論遊戲處於什麼階段 */}
      {/* 優先顯示排行榜 - 不論遊戲處於什麼階段 */}
      {gameState?.display_phase === 'rankings' ? (
        <div className={`h-screen flex flex-col overflow-hidden ${gameState?.has_next_question === false && gameState?.is_game_active
          ? 'bg-gradient-to-b from-purple-900 via-red-900 to-black'
          : ''
          }`}>
          <div className="flex-1 p-6 flex flex-col">
            <div className="text-center mb-4 flex-shrink-0">
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-2">
                {gameState?.has_next_question === false && gameState?.is_game_active
                  ? '🎉 最終排行榜 🎉'
                  : '🏆 目前排行榜'}
              </h2>
              <div className="text-lg text-white opacity-80">
                {gameState?.has_next_question === false && gameState?.is_game_active
                  ? '恭喜得獎的賓客!'
                  : '前 10 名玩家'}
              </div>
            </div>

            {/* 分數排行榜 - 固定高度不滾動 */}
            <div className="max-w-4xl mx-auto space-y-2 flex-1 w-full">
              {scoreRankings.map((player, index) => (
                <div
                  key={player.line_id}
                  className={`flex items-center space-x-4 bg-white bg-opacity-10 backdrop-blur-md rounded-lg p-4 ${index < 3 ? 'ring-2 ring-yellow-400 ring-opacity-60' : ''
                    }`}
                >
                  {/* 排名 */}
                  <div className={`w-14 h-14 rounded-full flex items-center justify-center font-bold text-2xl flex-shrink-0 ${index === 0 ? 'bg-yellow-500 text-black' :
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
                      className="w-14 h-14 rounded-full object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-14 h-14 bg-white bg-opacity-30 rounded-full flex items-center justify-center text-black font-bold text-xl flex-shrink-0">
                      {player.display_name?.charAt(0) || '?'}
                    </div>
                  )}

                  {/* 玩家資訊 */}
                  <div className="flex-1 min-w-0">
                    <div className="text-2xl font-bold text-black truncate">
                      {player.display_name}
                    </div>
                  </div>

                  {/* 分數 */}
                  <div className="text-3xl font-bold text-black flex-shrink-0">
                    {player.quiz_score} 分
                  </div>
                </div>
              ))}

              {scoreRankings.length === 0 && (
                <div className="text-center text-black text-2xl opacity-60 py-8">
                  暫無排行榜資料
                </div>
              )}
            </div>
          </div>
        </div>
      ) : gameState?.is_game_active && (gameState?.is_waiting_for_players !== undefined ? gameState.is_waiting_for_players : !gameState?.current_question_id) ? (
        <WaitingStage gameState={gameState} />
      ) : currentQuestion && gameState?.is_game_active && !gameState?.is_paused ? (
        isTransitioning ? (
          // 過渡狀態 - 顯示簡單的載入畫面
          <div className="h-screen flex items-center justify-center">
            <div className="text-center text-white">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-white border-t-transparent mx-auto mb-4"></div>
              <p className="text-xl">下一題...</p>
            </div>
          </div>
        ) : (
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
                </div>
              </div>
            ) : displayPhase === 'options' ? (
              // 選項階段 - 滿版顯示選項
              <div className="flex-1 flex flex-col p-8 overflow-hidden">
                {/* 題目標題（縮小版） */}
                <div className="text-center mb-8 flex-shrink-0">
                  <h2 className="text-4xl md:text-6xl font-bold text-white mb-4">
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
                      <div className="inline-flex items-center space-x-4 bg-gradient-to-r from-fuchsia-600 via-purple-600 to-cyan-500 rounded-full px-10 py-5 backdrop-blur-sm border-4 border-white shadow-[0_0_20px_#ff00ff,0_0_40px_#ff00ff,0_0_60px_#00ffff,0_0_80px_#00ffff] animate-pulse">
                        <div className="text-white text-3xl md:text-4xl font-black drop-shadow-lg">
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

                {/* 內容區域：根據是否有圖片決定佈局 */}
                {currentQuestion.media_type === 'image' && currentQuestion.media_url ? (
                  // 有圖片：左右分欄佈局
                  <div className="flex-1 flex gap-8 min-h-0">
                    {/* 左側：圖片 */}
                    <div className="w-1/2 flex items-center justify-center bg-black bg-opacity-20 rounded-3xl p-4">
                      <img
                        src={currentQuestion.media_url}
                        alt={currentQuestion.media_alt_text || '題目圖片'}
                        className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl"
                      />
                    </div>

                    {/* 右側：選項 (垂直排列) */}
                    <div className="w-1/2 flex flex-col gap-3 h-full min-h-0">
                      {['A', 'B', 'C', 'D'].map((key) => {
                        const option = {
                          key,
                          text: key === 'A' ? currentQuestion.option_a :
                            key === 'B' ? currentQuestion.option_b :
                              key === 'C' ? currentQuestion.option_c :
                                currentQuestion.option_d,
                          color: key === 'A' ? 'from-red-500 to-red-600' :
                            key === 'B' ? 'from-blue-500 to-blue-600' :
                              key === 'C' ? 'from-green-500 to-green-600' :
                                'from-yellow-500 to-yellow-600'
                        }

                        const distribution = answerDistribution.find(d => d.answer === option.key)
                        const isCorrect = currentQuestion.correct_answer === option.key
                        const percentage = distribution ? Math.round((distribution.count / Math.max(currentQuestionAnswerCount, 1)) * 100) : 0

                        return (
                          <div
                            key={option.key}
                            className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${option.color} shadow-lg transform transition-all duration-500 hover:scale-[1.01] flex items-center flex-1 min-h-0 ${timeLeft <= 0 && isCorrect ? 'ring-[10px] ring-fuchsia-400 shadow-[0_0_20px_#ff00ff,0_0_40px_#ff00ff,0_0_60px_#00ffff,0_0_80px_#00ffff] scale-105 animate-pulse' : ''
                              }`}
                          >
                            {/* 答題進度條 */}
                            {timeLeft <= 0 && distribution && distribution.count > 0 && (
                              <div
                                className="absolute bottom-0 left-0 bg-opacity-30 transition-all duration-1000 h-full"
                                style={{
                                  width: `${Math.max(percentage, 5)}%`,
                                  opacity: 0.3
                                }}
                              />
                            )}

                            <div className="relative z-10 flex items-center w-full px-4 py-2 h-full">
                              {/* 選項標號 */}
                              <div className="text-2xl md:text-3xl font-black text-white mr-4 w-12 text-center flex-shrink-0">
                                {option.key}
                              </div>

                              {/* 選項文字 */}
                              <div className="text-3xl md:text-4xl font-bold text-white flex-1 mr-4 line-clamp-2 leading-tight">
                                {option.text}
                              </div>

                              {/* 答題統計 (倒數結束後顯示) */}
                              {timeLeft <= 0 && (
                                <div className="flex-shrink-0 bg-white bg-opacity-20 rounded-full px-2 py-1">
                                  <span className="text-black font-bold text-xs md:text-sm">
                                    {distribution?.count || 0}人 ({percentage}%)
                                  </span>
                                </div>
                              )}

                              {/* 正確答案標示 */}
                              {timeLeft <= 0 && isCorrect && (
                                <div className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-gradient-to-r from-fuchsia-500 to-cyan-400 text-white rounded-full p-3 shadow-[0_0_15px_#ff00ff,0_0_30px_#00ffff] animate-bounce">
                                  <span className="text-2xl font-black">✓</span>
                                </div>
                              )}
                            </div>

                            {/* 玩家頭像預覽 (僅顯示前幾名) */}
                            {distribution && distribution.users && distribution.users.length > 0 && (
                              <div className="absolute bottom-2 left-20 flex -space-x-2 py-1 px-1">
                                {distribution.users.slice(0, 5).map((user, idx) => (
                                  <div key={idx} className="relative inline-block h-10 w-10 rounded-full ring-2 ring-white bg-gray-200 z-10">
                                    {user.avatar_url ? (
                                      <img src={user.avatar_url} alt="" className="h-full w-full rounded-full object-cover" />
                                    ) : (
                                      <div className="h-full w-full flex items-center justify-center text-xs font-bold text-gray-500">
                                        {user.display_name?.charAt(0)}
                                      </div>
                                    )}
                                  </div>
                                ))}
                                {distribution.users.length > 5 && (
                                  <div className="relative inline-block h-10 w-10 rounded-full ring-2 ring-white bg-gray-300 flex items-center justify-center text-xs font-bold text-gray-600 z-0">
                                    +{distribution.users.length - 5}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ) : (
                  // 無圖片：維持原有的 2x2 網格滿版
                  <div className="grid grid-cols-2 gap-6 flex-1 min-h-0">
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
                          className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${option.color} shadow-2xl transform transition-all duration-500 hover:scale-105 flex items-center justify-center ${timeLeft <= 0 && isCorrect ? 'ring-[14px] ring-fuchsia-400 shadow-[0_0_30px_#ff00ff,0_0_60px_#ff00ff,0_0_90px_#00ffff,0_0_120px_#00ffff] scale-105 z-10 animate-pulse' : ''
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
                          <div className="relative z-10 flex flex-col h-full p-4">
                            {/* 選項標題區域 - 左右佈局 */}
                            <div className="flex items-center flex-shrink-0 mb-3">
                              {/* 左側：ABCD 標號 */}
                              <div className="text-3xl md:text-5xl font-black text-white mr-4 w-16 text-center flex-shrink-0">
                                {option.key}
                              </div>
                              {/* 右側：答案敘述 */}
                              <div className="text-3xl md:text-5xl font-bold text-white leading-tight flex-1">
                                {option.text}
                              </div>
                            </div>

                            {/* 答題統計 - 只在倒數結束後顯示 */}
                            {timeLeft <= 0 && (
                              <div className="mb-2 flex-shrink-0">
                                <div className="bg-white bg-opacity-20 rounded-full px-3 py-1 inline-block">
                                  <span className="text-black font-bold text-base">
                                    {distribution?.count || 0} 人 ({percentage}%)
                                  </span>
                                </div>
                              </div>
                            )}

                            {/* 選擇此選項的玩家頭像 - 即時顯示，更大空間 */}
                            <div className="flex-1 flex flex-col justify-start overflow-hidden">
                              {distribution && distribution.users && distribution.users.length > 0 ? (
                                <div className="grid grid-cols-5 gap-2 justify-items-center content-start">
                                  {distribution.users.slice(0, 20).map((user, userIndex) => (
                                    <div key={userIndex} className="flex flex-col items-center">
                                      {user.avatar_url ? (
                                        <img
                                          src={user.avatar_url}
                                          alt={user.display_name}
                                          className="w-10 h-10 md:w-12 md:h-12 rounded-full object-cover border-2 border-white"
                                        />
                                      ) : (
                                        <div className="w-10 h-10 md:w-12 md:h-12 bg-white bg-opacity-30 rounded-full flex items-center justify-center text-black font-bold text-xs md:text-sm border-2 border-white">
                                          {user.display_name?.charAt(0) || '?'}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                  {distribution.users.length > 20 && (
                                    <div className="flex flex-col items-center">
                                      <div className="w-10 h-10 md:w-12 md:h-12 bg-white bg-opacity-50 rounded-full flex items-center justify-center text-black font-bold text-xs md:text-sm border-2 border-white">
                                        +{distribution.users.length - 20}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="text-center text-white opacity-60">
                                  <div className="text-base">暫無人選擇</div>
                                </div>
                              )}
                            </div>

                            {/* 正確答案標示 */}
                            {timeLeft <= 0 && isCorrect && (
                              <div className="absolute -top-4 -right-4 bg-gradient-to-r from-fuchsia-500 to-cyan-400 text-white rounded-full p-4 shadow-[0_0_20px_#ff00ff,0_0_40px_#00ffff] animate-bounce">
                                <span className="text-3xl font-black">✓</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            ) : displayPhase === 'rankings' ? (
              // 排行榜階段 - 顯示分數排行榜
              <div className="flex-1 p-6 flex flex-col">
                <div className="text-center mb-4 flex-shrink-0">
                  <h2 className="text-4xl md:text-5xl font-bold text-white mb-2">
                    🏆 目前排行榜
                  </h2>
                  <div className="text-lg text-white opacity-80">
                    前 10 名玩家
                  </div>
                </div>

                {/* 分數排行榜 - 固定高度不滾動 */}
                <div className="max-w-4xl mx-auto space-y-2 flex-1 w-full">
                  {scoreRankings.map((player, index) => (
                    <div
                      key={player.line_id}
                      className={`flex items-center space-x-4 bg-white bg-opacity-10 backdrop-blur-md rounded-lg p-4 ${index < 3 ? 'ring-2 ring-yellow-400 ring-opacity-60' : ''
                        }`}
                    >
                      {/* 排名 */}
                      <div className={`w-14 h-14 rounded-full flex items-center justify-center font-bold text-2xl flex-shrink-0 ${index === 0 ? 'bg-yellow-500 text-black' :
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
                          className="w-14 h-14 rounded-full object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-14 h-14 bg-white bg-opacity-30 rounded-full flex items-center justify-center text-black font-bold text-xl flex-shrink-0">
                          {player.display_name?.charAt(0) || '?'}
                        </div>
                      )}

                      {/* 玩家資訊 */}
                      <div className="flex-1 min-w-0">
                        <div className="text-2xl font-bold text-black truncate">
                          {player.display_name}
                        </div>
                      </div>

                      {/* 分數 */}
                      <div className="text-3xl font-bold text-black flex-shrink-0">
                        {player.quiz_score} 分
                      </div>
                    </div>
                  ))}

                  {scoreRankings.length === 0 && (
                    <div className="text-center text-black text-2xl opacity-60 py-8">
                      暫無排行榜資料
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        )
      ) : (
        <div className="flex items-center justify-center h-screen">
          <div className="text-center text-white">
            <Users className="w-24 h-24 mx-auto mb-6 opacity-50" />
            <h3 className="text-4xl font-bold mb-4">等待中</h3>
            <p className="text-xl">目前沒有進行中的題目</p>
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

  useEffect(() => {
    fetchJoinedPlayers()

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
  }, [fetchJoinedPlayers, supabase])

  return (
    <div className="h-screen flex items-center justify-center p-4 overflow-hidden">
      <div className="w-full max-w-6xl text-center flex flex-col h-full max-h-full">
        {/* 主標題 */}
        <div className="mb-4 flex-shrink-0">
          <h1 className="text-5xl md:text-6xl font-black text-white mb-2">
            快問快答
          </h1>
          <p className="text-xl md:text-2xl text-white opacity-80">
            掃描 QR Code 加入遊戲
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch flex-1 min-h-0">
          {/* 左側：玩家列表 */}
          <div className="bg-white bg-opacity-10 backdrop-blur-md rounded-2xl p-4 flex flex-col min-h-0">
            <div className="flex items-center justify-center space-x-3 mb-4 flex-shrink-0">
              <Users className="w-8 h-8 text-white" />
              <h2 className="text-2xl font-bold text-black">
                已加入玩家 ({playerCount})
              </h2>
            </div>

            <div className="flex-1 min-h-0">
              {joinedPlayers.length > 0 ? (
                <div className="grid grid-cols-4 gap-2">
                  {joinedPlayers.slice(0, 16).map((player, index) => (
                    <div key={player.line_id} className="flex flex-col items-center bg-white bg-opacity-20 rounded-lg p-2">
                      {player.avatar_url ? (
                        <img
                          src={player.avatar_url}
                          alt={player.display_name}
                          className="w-10 h-10 rounded-full object-cover mb-1"
                        />
                      ) : (
                        <div className="w-10 h-10 bg-white bg-opacity-30 rounded-full flex items-center justify-center text-black font-bold text-sm mb-1">
                          {player.display_name?.charAt(0) || '?'}
                        </div>
                      )}
                      <span className="text-xs font-medium text-black text-center truncate w-full">
                        {player.display_name}
                      </span>
                    </div>
                  ))}
                  {joinedPlayers.length > 16 && (
                    <div className="flex flex-col items-center justify-center bg-white bg-opacity-20 rounded-lg p-2">
                      <div className="w-10 h-10 bg-white bg-opacity-40 rounded-full flex items-center justify-center text-black font-bold text-sm mb-1">
                        +{joinedPlayers.length - 16}
                      </div>
                      <span className="text-xs font-medium text-black">更多</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-black text-base opacity-60 py-4 text-center">
                  等待玩家加入...
                </div>
              )}
            </div>
          </div>

          {/* 右側：QR Code */}
          <div className="bg-white bg-opacity-10 backdrop-blur-md rounded-2xl p-4 flex flex-col items-center">
            <QrCode className="w-10 h-10 text-white mb-3" />
            <h3 className="text-xl font-bold text-black mb-4">掃描加入遊戲</h3>
            <div className="w-72 h-72 bg-white rounded-2xl flex items-center justify-center shadow-xl">
              <img
                src="/line2dcode.png"
                alt="QR Code"
                className="w-full h-full rounded-2xl object-contain p-3"
              />
            </div>
            <p className="text-black text-base opacity-80 mt-3">
              使用 LINE 掃描 QR Code<br />
              進入快問快答遊戲
            </p>
          </div>
        </div>

        {/* 遊戲計分規則 */}
        <div className="mt-4 bg-white bg-opacity-20 backdrop-blur-md rounded-2xl p-4 flex-shrink-0">
          <h3 className="text-xl md:text-2xl font-bold text-black mb-3 flex items-center justify-center gap-2">
            <span>🎲</span> 遊戲計分規則
          </h3>
          <div className="grid grid-cols-2 gap-4 text-black">
            <div className="bg-white bg-opacity-30 rounded-xl p-3 text-center">
              <div className="text-3xl mb-1">✅</div>
              <div className="text-lg font-semibold mb-1">答對</div>
              <div className="text-xl font-bold text-green-600">51~100 分</div>
              <div className="text-xs opacity-80 mt-1">基礎50分 + 隨機骲1~50分</div>
            </div>
            <div className="bg-white bg-opacity-30 rounded-xl p-3 text-center">
              <div className="text-3xl mb-1">🎯</div>
              <div className="text-lg font-semibold mb-1">答錯參與獎</div>
              <div className="text-xl font-bold text-yellow-600">50 分</div>
              <div className="text-xs opacity-80 mt-1">鼓勵大家踴躍答題！</div>
            </div>
          </div>
        </div>


      </div>
    </div>
  )
}
