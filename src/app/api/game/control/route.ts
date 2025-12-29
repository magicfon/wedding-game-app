import { NextResponse } from 'next/server';
import { createSupabaseAdmin } from '@/lib/supabase-admin';

// 遊戲控制 API - 開始/暫停/下一題/重置遊戲
export async function POST(request: Request) {
  try {
    const { action, questionId, adminLineId, settings } = await request.json();
    const supabase = createSupabaseAdmin();

    // 驗證管理員身份
    const { data: isAdmin } = await supabase
      .from('admin_line_ids')
      .select('line_id')
      .eq('line_id', adminLineId)
      .single();

    if (!isAdmin) {
      return NextResponse.json({ error: '無管理員權限' }, { status: 403 });
    }

    let result;
    let actionDetails = {};

    switch (action) {
      case 'start_game':
        // 開始遊戲 - 進入等待玩家階段
        // 使用現有表格結構，先檢查是否有新欄位
        const { data: currentGameState } = await supabase
          .from('game_state')
          .select('*')
          .eq('id', 1)
          .single();

        // 準備更新資料，根據表格結構動態調整
        const updateData: any = {
          id: 1,
          is_game_active: true,
          is_paused: false,
          current_question_id: null,
          question_start_time: null,
          updated_at: new Date().toISOString()
        };

        // 如果表格有新欄位，則加入
        if (currentGameState && 'is_waiting_for_players' in currentGameState) {
          updateData.is_waiting_for_players = true;
        }
        if (currentGameState && 'qr_code_url' in currentGameState) {
          updateData.qr_code_url = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/quiz`;
        }

        console.log('🎮 開始遊戲，更新資料:', updateData);

        result = await supabase
          .from('game_state')
          .upsert(updateData);

        actionDetails = { stage: 'waiting_for_players' };
        break;

      case 'start_first_question':
        // 獲取當前遊戲設定的題庫組
        const { data: currentSettings } = await supabase
          .from('game_state')
          .select('active_question_set')
          .eq('id', 1)
          .single();

        const activeSet = currentSettings?.active_question_set || 'formal';

        // 開始第一題 - 從等待階段進入答題階段，按 display_order 排序
        const { data: firstQuestion } = await supabase
          .from('questions')
          .select('id, display_order')
          .eq('is_active', true)
          .eq('category', activeSet)
          .order('display_order', { ascending: true })
          .order('id', { ascending: true }) // 備用排序，以防 display_order 相同
          .limit(1)
          .single();

        if (!firstQuestion) {
          return NextResponse.json({ error: '沒有可用的題目' }, { status: 400 });
        }

        // 檢查表格結構
        const { data: gameStateForQuestion } = await supabase
          .from('game_state')
          .select('*')
          .eq('id', 1)
          .single();

        const questionUpdateData: any = {
          current_question_id: firstQuestion.id,
          question_start_time: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        // 如果有新欄位，則設定
        if (gameStateForQuestion && 'is_waiting_for_players' in gameStateForQuestion) {
          questionUpdateData.is_waiting_for_players = false;
        }

        result = await supabase
          .from('game_state')
          .update(questionUpdateData)
          .eq('id', 1);

        actionDetails = { question_id: firstQuestion.id, stage: 'first_question_started' };
        break;

      case 'pause_game':
        // 暫停遊戲
        result = await supabase
          .from('game_state')
          .update({
            is_paused: true,
            updated_at: new Date().toISOString()
          })
          .eq('id', 1);
        break;

      case 'resume_game':
        // 繼續遊戲
        result = await supabase
          .from('game_state')
          .update({
            is_paused: false,
            question_start_time: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', 1);
        break;

      case 'next_question':
        // 下一題 - 改進排序邏輯，處理相同 display_order 的情況
        const { data: currentState } = await supabase
          .from('game_state')
          .select('current_question_id, completed_questions, active_question_set')
          .eq('id', 1)
          .single();

        const currentActiveSet = currentState?.active_question_set || 'formal';

        if (!currentState) {
          return NextResponse.json({ error: '遊戲狀態不存在' }, { status: 400 });
        }

        // 先獲取當前題目的 display_order 和 id
        const { data: currentQuestion } = await supabase
          .from('questions')
          .select('id, display_order')
          .eq('id', currentState.current_question_id)
          .single();

        if (!currentQuestion) {
          return NextResponse.json({ error: '當前題目不存在' }, { status: 400 });
        }

        // 尋找下一題：
        // 1. 先找 display_order 相同但 id 更大的（處理排序相同的情況）
        let { data: nextQuestion } = await supabase
          .from('questions')
          .select('id, display_order')
          .eq('is_active', true)
          .eq('category', currentActiveSet)
          .eq('display_order', currentQuestion.display_order)
          .gt('id', currentQuestion.id)
          .order('id', { ascending: true })
          .limit(1)
          .single();

        // 2. 如果沒找到，找 display_order 更大的第一題
        if (!nextQuestion) {
          const { data: nextOrderQuestion } = await supabase
            .from('questions')
            .select('id, display_order')
            .eq('is_active', true)
            .eq('category', currentActiveSet)
            .gt('display_order', currentQuestion.display_order)
            .order('display_order', { ascending: true })
            .order('id', { ascending: true })
            .limit(1)
            .single();

          nextQuestion = nextOrderQuestion;
        }

        if (!nextQuestion) {
          // 沒有下一題，結束遊戲
          result = await supabase
            .from('game_state')
            .update({
              is_game_active: false,
              is_paused: false,
              current_question_id: null,
              display_phase: 'question',
              updated_at: new Date().toISOString()
            })
            .eq('id', 1);

          actionDetails = { game_ended: true };
        } else {
          // 設定下一題，同時重置 display_phase 為 'question'
          result = await supabase
            .from('game_state')
            .update({
              current_question_id: nextQuestion.id,
              question_start_time: new Date().toISOString(),
              completed_questions: (currentState.completed_questions || 0) + 1,
              display_phase: 'question',
              updated_at: new Date().toISOString()
            })
            .eq('id', 1);

          actionDetails = {
            previous_question_id: currentState.current_question_id,
            next_question_id: nextQuestion.id
          };
        }
        break;

      case 'show_rankings':
        // 顯示排行榜 - 設定 display_phase 為 'rankings'
        result = await supabase
          .from('game_state')
          .update({
            display_phase: 'rankings',
            updated_at: new Date().toISOString()
          })
          .eq('id', 1);

        actionDetails = { display_phase: 'rankings' };
        break;

      case 'jump_to_question':
        // 跳到指定題目
        if (!questionId) {
          return NextResponse.json({ error: '必須提供題目ID' }, { status: 400 });
        }

        // 驗證題目存在且啟用
        const { data: targetQuestion } = await supabase
          .from('questions')
          .select('id')
          .eq('id', questionId)
          .eq('is_active', true)
          .single();

        if (!targetQuestion) {
          return NextResponse.json({ error: '題目不存在或未啟用' }, { status: 400 });
        }

        result = await supabase
          .from('game_state')
          .update({
            current_question_id: questionId,
            question_start_time: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', 1);

        actionDetails = { jumped_to_question_id: questionId };
        break;

      case 'end_game':
        // 結束遊戲
        result = await supabase
          .from('game_state')
          .update({
            is_game_active: false,
            is_paused: false,
            current_question_id: null,
            updated_at: new Date().toISOString()
          })
          .eq('id', 1);

        // 清空所有用戶的加入狀態（向下兼容）
        try {
          await supabase
            .from('users')
            .update({
              is_in_quiz_page: false,
              updated_at: new Date().toISOString()
            })
            .neq('line_id', ''); // 更新所有用戶
        } catch (error) {
          // 如果 is_in_quiz_page 欄位不存在，忽略錯誤
          console.log('⚠️ is_in_quiz_page 欄位可能不存在，跳過清空加入狀態');
        }

        actionDetails = { game_ended: true, cleared_join_status: true };
        break;

      case 'reset_game':
        // 重置遊戲 - 清空所有答題記錄，回到等待階段
        await supabase
          .from('answer_records')
          .delete()
          .neq('id', 0); // 刪除所有記錄

        // 清空所有分數調整記錄
        try {
          await supabase
            .from('score_adjustments')
            .delete()
            .neq('id', 0); // 刪除所有分數調整記錄
          console.log('✅ 已清空所有分數調整記錄');
        } catch (error) {
          console.log('⚠️ 清空分數調整記錄時出錯，可能表格不存在:', error);
        }

        // 重置用戶快問快答分數並清空加入狀態（向下兼容）
        try {
          await supabase
            .from('users')
            .update({
              quiz_score: 0,
              is_in_quiz_page: false
            })
            .neq('line_id', '');
          console.log('✅ 已重置所有用戶快問快答分數為 0');
        } catch (error) {
          // 如果 is_in_quiz_page 欄位不存在，只重置分數
          console.log('⚠️ is_in_quiz_page 欄位可能不存在，只重置用戶快問快答分數');
          await supabase
            .from('users')
            .update({
              quiz_score: 0
            })
            .neq('line_id', '');
          console.log('✅ 已重置所有用戶快問快答分數為 0（向下兼容模式）');
        }

        // 檢查表格結構以準備重置資料
        const { data: gameStateForReset } = await supabase
          .from('game_state')
          .select('*')
          .eq('id', 1)
          .single();

        const resetUpdateData: any = {
          is_game_active: true,
          is_paused: false,
          current_question_id: null,
          question_start_time: null,
          updated_at: new Date().toISOString()
        };

        // 如果有新欄位，則設定
        if (gameStateForReset && 'is_waiting_for_players' in gameStateForReset) {
          resetUpdateData.is_waiting_for_players = true;
        }
        if (gameStateForReset && 'qr_code_url' in gameStateForReset) {
          resetUpdateData.qr_code_url = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/quiz`;
        }
        if (gameStateForReset && 'total_questions' in gameStateForReset) {
          resetUpdateData.total_questions = 0;
        }
        // 重置已完成題目數為 0
        if (gameStateForReset && 'completed_questions' in gameStateForReset) {
          resetUpdateData.completed_questions = 0;
        }

        result = await supabase
          .from('game_state')
          .update(resetUpdateData)
          .eq('id', 1);

        actionDetails = {
          reset_complete: true,
          stage: 'waiting_for_players',
          cleared_join_status: true,
          cleared_answer_records: true,
          cleared_score_adjustments: true,
          reset_user_scores: true
        };
        break;

      case 'update_settings':
        // 更新遊戲設定
        if (!settings) {
          return NextResponse.json({ error: '必須提供設定資料' }, { status: 400 });
        }

        const settingsUpdateData: any = {
          updated_at: new Date().toISOString()
        };

        // 只更新允許的欄位
        if (typeof settings.question_display_duration === 'number') {
          settingsUpdateData.question_display_duration = settings.question_display_duration;
        }
        if (settings.active_question_set) {
          settingsUpdateData.active_question_set = settings.active_question_set;
        }

        result = await supabase
          .from('game_state')
          .update(settingsUpdateData)
          .eq('id', 1);

        actionDetails = { settings_updated: true, updated_fields: Object.keys(settingsUpdateData) };
        break;

      default:
        return NextResponse.json({ error: '無效的操作' }, { status: 400 });
    }

    if (result?.error) {
      console.error('Database error:', result.error);
      return NextResponse.json({
        error: '資料庫操作失敗',
        details: result.error,
        action: action
      }, { status: 500 });
    }

    // 記錄管理員操作
    await supabase
      .from('admin_actions')
      .insert({
        admin_line_id: adminLineId,
        action_type: action,
        target_type: 'game',
        target_id: questionId?.toString() || null,
        details: actionDetails
      });

    return NextResponse.json({
      success: true,
      action,
      details: actionDetails
    });

  } catch (error) {
    console.error('Game control error:', error);
    return NextResponse.json({ error: '遊戲控制失敗' }, { status: 500 });
  }
}

// 獲取當前遊戲狀態
export async function GET() {
  try {
    const supabase = createSupabaseAdmin();

    // 獲取遊戲狀態
    const { data: gameState, error: gameError } = await supabase
      .from('game_state')
      .select(`
        *,
        questions:current_question_id (
          id,
          question_text,
          option_a,
          option_b,
          option_c,
          option_d,
          correct_answer,
          points,
          time_limit,
          speed_bonus_enabled,
          max_bonus_points
        )
      `)
      .eq('id', 1)
      .single();

    if (gameError) {
      console.error('Game state error:', gameError);
      return NextResponse.json({ error: '無法獲取遊戲狀態' }, { status: 500 });
    }

    // 獲取總題目數
    const { count: totalQuestions } = await supabase
      .from('questions')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    // 計算剩餘時間
    let timeRemaining = 0;
    if (gameState?.question_start_time && gameState?.questions?.time_limit && !gameState?.is_paused) {
      const startTime = new Date(gameState.question_start_time).getTime();
      const currentTime = new Date().getTime();
      const elapsed = Math.floor((currentTime - startTime) / 1000);
      timeRemaining = Math.max(0, (gameState.questions.time_limit || 30) - elapsed);
    }

    // 檢查是否還有下一題
    let hasNextQuestion = false;
    if (gameState?.current_question_id) {
      // 獲取當前題目的資訊
      const { data: currentQuestionData } = await supabase
        .from('questions')
        .select('id, display_order')
        .eq('id', gameState.current_question_id)
        .single();

      if (currentQuestionData) {
        const activeSet = gameState.active_question_set || 'formal';

        // 檢查是否有 display_order 相同但 id 更大的題目
        const { data: nextSameOrder } = await supabase
          .from('questions')
          .select('id')
          .eq('is_active', true)
          .eq('category', activeSet)
          .eq('display_order', currentQuestionData.display_order)
          .gt('id', currentQuestionData.id)
          .limit(1)
          .single();

        if (nextSameOrder) {
          hasNextQuestion = true;
        } else {
          // 檢查是否有 display_order 更大的題目
          const { data: nextHigherOrder } = await supabase
            .from('questions')
            .select('id')
            .eq('is_active', true)
            .eq('category', activeSet)
            .gt('display_order', currentQuestionData.display_order)
            .limit(1)
            .single();

          hasNextQuestion = !!nextHigherOrder;
        }
      }
    }

    return NextResponse.json({
      success: true,
      gameState: {
        ...gameState,
        total_questions: totalQuestions || 0,
        time_remaining: timeRemaining,
        has_next_question: hasNextQuestion
      }
    });

  } catch (error) {
    console.error('Get game state error:', error);
    return NextResponse.json({ error: '獲取遊戲狀態失敗' }, { status: 500 });
  }
}
