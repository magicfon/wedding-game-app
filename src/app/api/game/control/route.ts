import { NextResponse } from 'next/server';
import { createSupabaseAdmin } from '@/lib/supabase-admin';

// 遊戲控制 API - 開始/暫停/下一題/重置遊戲
export async function POST(request: Request) {
  try {
    const { action, questionId, adminLineId } = await request.json();
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
        // 開始遊戲 - 設定第一題
        const { data: firstQuestion } = await supabase
          .from('questions')
          .select('id')
          .eq('is_active', true)
          .order('created_at', { ascending: true })
          .limit(1)
          .single();

        if (!firstQuestion) {
          return NextResponse.json({ error: '沒有可用的題目' }, { status: 400 });
        }

        const sessionId = `game_${Date.now()}_${Math.random().toString(36).substring(2)}`;
        
        result = await supabase
          .from('game_state')
          .upsert({
            id: 1,
            current_question_id: firstQuestion.id,
            is_game_active: true,
            is_paused: false,
            question_start_time: new Date().toISOString(),
            completed_questions: 0,
            game_session_id: sessionId
          });

        actionDetails = { question_id: firstQuestion.id };
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
        // 下一題
        const { data: currentState } = await supabase
          .from('game_state')
          .select('current_question_id, completed_questions')
          .eq('id', 1)
          .single();

        if (!currentState) {
          return NextResponse.json({ error: '遊戲狀態不存在' }, { status: 400 });
        }

        // 找到下一題
        const { data: nextQuestion } = await supabase
          .from('questions')
          .select('id')
          .eq('is_active', true)
          .gt('id', currentState.current_question_id)
          .order('id', { ascending: true })
          .limit(1)
          .single();

        if (!nextQuestion) {
          // 沒有下一題，結束遊戲
          result = await supabase
            .from('game_state')
            .update({
              is_game_active: false,
              is_paused: false,
              current_question_id: null,
              updated_at: new Date().toISOString()
            })
            .eq('id', 1);
          
          actionDetails = { game_ended: true };
        } else {
          // 設定下一題
          result = await supabase
            .from('game_state')
            .update({
              current_question_id: nextQuestion.id,
              question_start_time: new Date().toISOString(),
              completed_questions: (currentState.completed_questions || 0) + 1,
              updated_at: new Date().toISOString()
            })
            .eq('id', 1);

          actionDetails = { 
            previous_question_id: currentState.current_question_id,
            next_question_id: nextQuestion.id 
          };
        }
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
        break;

      case 'reset_game':
        // 重置遊戲 - 清空所有答題記錄
        await supabase
          .from('user_answers')
          .delete()
          .neq('id', 0); // 刪除所有記錄

        // 重置用戶分數
        await supabase
          .from('users')
          .update({ 
            total_score: 0,
            quiz_score: 0 
          })
          .neq('line_id', '');

        result = await supabase
          .from('game_state')
          .update({
            is_game_active: false,
            is_paused: false,
            current_question_id: null,
            completed_questions: 0,
            game_session_id: `reset_${Date.now()}_${Math.random().toString(36).substring(2)}`,
            updated_at: new Date().toISOString()
          })
          .eq('id', 1);

        actionDetails = { reset_complete: true };
        break;

      default:
        return NextResponse.json({ error: '無效的操作' }, { status: 400 });
    }

    if (result?.error) {
      console.error('Database error:', result.error);
      return NextResponse.json({ error: '資料庫操作失敗' }, { status: 500 });
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

    return NextResponse.json({
      success: true,
      gameState: {
        ...gameState,
        total_questions: totalQuestions || 0,
        time_remaining: timeRemaining
      }
    });

  } catch (error) {
    console.error('Get game state error:', error);
    return NextResponse.json({ error: '獲取遊戲狀態失敗' }, { status: 500 });
  }
}
