import { useState, useEffect, useCallback } from 'react'
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
}

export function useRealtimeGameState() {
  const [gameState, setGameState] = useState<GameState | null>(null)
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const supabase = createSupabaseBrowser()

  const fetchGameState = useCallback(async () => {
    try {
      setError(null)
      
      // 獲取遊戲狀態
      const { data: gameData, error: gameError } = await supabase
        .from('game_state')
        .select('*')
        .single()

      if (gameError) throw gameError
      setGameState(gameData)

      // 如果有當前題目，獲取題目詳情
      if (gameData?.current_question_id) {
        console.log('🔍 Fetching question details for ID:', gameData.current_question_id)
        const { data: questionData, error: questionError } = await supabase
          .from('questions')
          .select('*')
          .eq('id', gameData.current_question_id)
          .single()

        if (questionError) {
          console.error('❌ Question fetch error:', questionError)
          throw questionError
        }
        
        console.log('📝 Question data fetched:', {
          id: questionData?.id,
          question_text: questionData?.question_text?.substring(0, 50) + '...',
          media_type: questionData?.media_type,
          media_url: questionData?.media_url,
          hasMediaUrl: !!questionData?.media_url
        })
        
        setCurrentQuestion(questionData)
      } else {
        setCurrentQuestion(null)
      }
    } catch (error: any) {
      console.error('Error fetching game state:', error)
      setError(error.message || '獲取遊戲狀態失敗')
    } finally {
      setLoading(false)
    }
  }, [supabase])

  // 計算剩餘時間（精確到毫秒）
  const calculateTimeLeft = useCallback((): number => {
    // 如果在等待階段或沒有當前題目，返回 0
    // 兼容舊表格結構：如果沒有 is_waiting_for_players 欄位，檢查 current_question_id 是否為 null
    const isWaitingForPlayers = gameState?.is_waiting_for_players !== undefined 
      ? gameState.is_waiting_for_players 
      : !gameState?.current_question_id;
      
    if (isWaitingForPlayers || !gameState?.question_start_time || !currentQuestion || gameState.is_paused) {
      return 0
    }

    const startTime = new Date(gameState.question_start_time).getTime()
    const now = Date.now()
    const elapsedMs = now - startTime
    const totalTimeMs = currentQuestion.time_limit * 1000
    const remainingMs = Math.max(0, totalTimeMs - elapsedMs)
    
    // 返回毫秒數，讓調用者決定如何顯示
    return remainingMs
  }, [gameState, currentQuestion])

  useEffect(() => {
    fetchGameState()

    // 訂閱遊戲狀態變化
    const channel = supabase
      .channel('realtime_game_state')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'game_state'
      }, (payload) => {
        console.log('Game state changed:', payload)
        fetchGameState()
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'questions'
      }, (payload) => {
        console.log('Questions changed:', payload)
        fetchGameState()
      })
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [fetchGameState, supabase])

  return {
    gameState,
    currentQuestion,
    loading,
    error,
    calculateTimeLeft,
    refetch: fetchGameState
  }
}
