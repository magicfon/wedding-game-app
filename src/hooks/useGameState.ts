import { useState, useEffect, useCallback } from 'react';
import { createSupabaseBrowser } from '@/lib/supabase';

export interface GameQuestion {
  id: number;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: 'A' | 'B' | 'C' | 'D';
  points: number;
  time_limit: number;
  speed_bonus_enabled: boolean;
  max_bonus_points: number;
}

export interface GameState {
  id: number;
  current_question_id: number | null;
  is_game_active: boolean;
  is_paused: boolean;
  question_start_time: string | null;
  question_duration: number;
  completed_questions: number;
  total_questions: number;
  game_session_id: string;
  questions: GameQuestion | null;
  time_remaining: number;
  created_at: string;
  updated_at: string;
}

export interface UseGameStateReturn {
  gameState: GameState | null;
  loading: boolean;
  error: string | null;
  refreshGameState: () => Promise<void>;
  controlGame: (action: string, questionId?: number) => Promise<boolean>;
  timeRemaining: number;
  isGameActive: boolean;
  isPaused: boolean;
  currentQuestion: GameQuestion | null;
}

export function useGameState(adminLineId?: string) {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(0);

  const supabase = createSupabaseBrowser();

  // 獲取遊戲狀態
  const refreshGameState = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/game/control');
      const data = await response.json();

      if (data.success) {
        setGameState(data.gameState);
        setTimeRemaining(data.gameState.time_remaining || 0);
        setError(null);
      } else {
        setError(data.error || '獲取遊戲狀態失敗');
      }
    } catch (err) {
      console.error('獲取遊戲狀態錯誤:', err);
      setError('網路錯誤');
    } finally {
      setLoading(false);
    }
  }, []);

  // 控制遊戲
  const controlGame = useCallback(async (action: string, questionId?: number) => {
    if (!adminLineId) {
      setError('需要管理員權限');
      return false;
    }

    try {
      const response = await fetch('/api/game/control', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action,
          questionId,
          adminLineId
        }),
      });

      const data = await response.json();

      if (data.success) {
        // 立即刷新遊戲狀態
        await refreshGameState();
        return true;
      } else {
        setError(data.error || '遊戲控制失敗');
        return false;
      }
    } catch (err) {
      console.error('遊戲控制錯誤:', err);
      setError('網路錯誤');
      return false;
    }
  }, [adminLineId, refreshGameState]);

  // 倒數計時器
  useEffect(() => {
    if (!gameState?.is_game_active || gameState?.is_paused || !gameState?.questions) {
      return;
    }

    const timer = setInterval(() => {
      if (gameState.question_start_time) {
        const startTime = new Date(gameState.question_start_time).getTime();
        const currentTime = new Date().getTime();
        const elapsed = Math.floor((currentTime - startTime) / 1000);
        const remaining = Math.max(0, (gameState.questions.time_limit || 30) - elapsed);
        
        setTimeRemaining(remaining);

        // 時間到了，自動刷新狀態
        if (remaining === 0) {
          refreshGameState();
        }
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [gameState, refreshGameState]);

  // 設置 Supabase 即時監聽
  useEffect(() => {
    const channel = supabase
      .channel('game_state_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'game_state'
        },
        () => {
          // 當遊戲狀態變化時，刷新狀態
          refreshGameState();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, refreshGameState]);

  // 初始載入
  useEffect(() => {
    refreshGameState();
  }, [refreshGameState]);

  return {
    gameState,
    loading,
    error,
    refreshGameState,
    controlGame,
    timeRemaining,
    isGameActive: gameState?.is_game_active || false,
    isPaused: gameState?.is_paused || false,
    currentQuestion: gameState?.questions || null,
  };
}
