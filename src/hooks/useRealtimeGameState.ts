import { useState, useEffect, useCallback, useRef } from 'react'
import { createSupabaseBrowser, Question } from '@/lib/supabase'

interface GameState {
  id: number
  current_question_id: number | null
  is_game_active: boolean
  is_waiting_for_players: boolean
  is_paused: boolean
  question_start_time: string | null
  total_questions: number
  qr_code_url: string | null
  created_at: string
  updated_at: string
  question_display_duration?: number
  question_time_limit?: number
  display_phase?: 'question' | 'options' | 'rankings'
  completed_questions?: number
  has_next_question?: boolean
  active_question_set?: string
}

export function useRealtimeGameState() {
  const [gameState, setGameState] = useState<GameState | null>(null)
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 追蹤上一次的 question_id，避免重複獲取
  const lastQuestionIdRef = useRef<number | null>(null)
  // 追蹤是否已初始化
  const initializedRef = useRef(false)

  const supabase = createSupabaseBrowser()

  // 輕量級：只獲取題目資料
  const fetchQuestionOnly = useCallback(async (questionId: number | null) => {
    if (!questionId) {
      setCurrentQuestion(null)
      lastQuestionIdRef.current = null
      return
    }

    // 如果題目 ID 相同，跳過獲取
    if (lastQuestionIdRef.current === questionId) {
      return
    }

    try {
      const { data, error } = await supabase
        .from('questions')
        .select('*')
        .eq('id', questionId)
        .single()

      if (error) throw error
      setCurrentQuestion(data)
      lastQuestionIdRef.current = questionId
    } catch (err) {
      console.error('Error fetching question:', err)
    }
  }, [supabase])

  // 完整獲取：初始化時使用
  const fetchGameState = useCallback(async () => {
    try {
      setError(null)

      const response = await fetch('/api/game/control')
      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || '獲取遊戲狀態失敗')
      }

      const gameData = data.gameState
      setGameState(gameData)

      // 設定當前題目（API 回傳中已包含題目資訊）
      if (gameData?.questions) {
        setCurrentQuestion(gameData.questions)
        lastQuestionIdRef.current = gameData.current_question_id
      } else if (gameData?.current_question_id) {
        await fetchQuestionOnly(gameData.current_question_id)
      } else {
        setCurrentQuestion(null)
        lastQuestionIdRef.current = null
      }
    } catch (error: any) {
      console.error('Error fetching game state:', error)
      setError(error.message || '獲取遊戲狀態失敗')
    } finally {
      setLoading(false)
    }
  }, [supabase, fetchQuestionOnly])

  // 處理 realtime 更新：直接使用 payload，避免 API 調用
  const handleGameStateChange = useCallback((payload: any) => {
    console.log('Game state changed (realtime):', payload.eventType)

    const newData = payload.new as GameState
    if (!newData) {
      // DELETE 事件，重新獲取
      fetchGameState()
      return
    }

    setGameState(prev => {
      const prevQuestionId = prev?.current_question_id
      const newQuestionId = newData.current_question_id

      // 如果題目 ID 變更，獲取新題目
      if (newQuestionId !== prevQuestionId) {
        fetchQuestionOnly(newQuestionId)
      }

      // 合併更新：保留 API 計算的欄位（如 has_next_question, total_questions）
      // 只在關鍵欄位變更時才需要完整重新獲取
      const needsFullRefetch =
        newData.is_game_active !== prev?.is_game_active ||
        newData.current_question_id !== prev?.current_question_id

      if (needsFullRefetch) {
        // 延遲獲取 has_next_question 等計算欄位
        setTimeout(() => {
          fetch('/api/game/control')
            .then(res => res.json())
            .then(data => {
              if (data.success && data.gameState) {
                setGameState(current => {
                  if (!current) return current
                  return {
                    ...current,
                    has_next_question: data.gameState.has_next_question,
                    total_questions: data.gameState.total_questions
                  }
                })
              }
            })
            .catch(console.error)
        }, 100)
      }

      return { ...prev, ...newData }
    })
  }, [fetchGameState, fetchQuestionOnly])

  // 計算剩餘時間（精確到毫秒）
  // 總答題時間 = 每題個別的顯示時間 + 全域答題時間
  const calculateTimeLeft = useCallback((): number => {
    const isWaitingForPlayers = gameState?.is_waiting_for_players !== undefined
      ? gameState.is_waiting_for_players
      : !gameState?.current_question_id;

    if (isWaitingForPlayers || !gameState?.question_start_time || gameState.is_paused) {
      return 0
    }

    // 題目顯示時間（每題個別設定），預設 5 秒
    const displayTime = currentQuestion?.time_limit || 5
    // 全域答題時間，預設 15 秒
    const answerTime = gameState.question_time_limit || 15
    // 總答題時間 = 顯示時間 + 答題時間
    const effectiveTimeLimit = displayTime + answerTime

    const startTime = new Date(gameState.question_start_time).getTime()
    const now = Date.now()
    const elapsedMs = now - startTime
    const totalTimeMs = effectiveTimeLimit * 1000
    const remainingMs = Math.max(0, totalTimeMs - elapsedMs)

    return remainingMs
  }, [gameState, currentQuestion])

  useEffect(() => {
    // 只在首次載入時獲取完整狀態
    if (!initializedRef.current) {
      initializedRef.current = true
      fetchGameState()
    }

    // 訂閱遊戲狀態變化
    const channel = supabase
      .channel('realtime_game_state')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'game_state'
      }, handleGameStateChange)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'questions'
      }, (payload) => {
        // 只有當更新的是當前題目時才更新
        if (payload.new && (payload.new as any).id === lastQuestionIdRef.current) {
          console.log('Current question updated')
          setCurrentQuestion(payload.new as Question)
        }
      })
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [supabase, fetchGameState, handleGameStateChange])

  return {
    gameState,
    currentQuestion,
    loading,
    error,
    calculateTimeLeft,
    refetch: fetchGameState
  }
}
