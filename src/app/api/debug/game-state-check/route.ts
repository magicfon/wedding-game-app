import { NextResponse } from 'next/server';
import { createSupabaseAdmin } from '@/lib/supabase-admin';

export async function GET() {
  try {
    const supabase = createSupabaseAdmin();

    // 檢查 game_state 表格是否存在
    console.log('🔍 檢查 game_state 表格...');
    
    const { data: gameState, error: gameStateError } = await supabase
      .from('game_state')
      .select('*')
      .limit(5);

    console.log('📊 game_state 查詢結果:', { data: gameState, error: gameStateError });

    // 嘗試插入初始資料（如果不存在）
    if (!gameStateError && (!gameState || gameState.length === 0)) {
      console.log('📝 插入初始 game_state 資料...');
      
      const { data: insertResult, error: insertError } = await supabase
        .from('game_state')
        .insert({
          is_game_active: false,
          is_waiting_for_players: true,
          is_paused: false,
          total_questions: 0
        })
        .select();

      console.log('✅ 插入結果:', { data: insertResult, error: insertError });
    }

    // 再次檢查
    const { data: finalState, error: finalError } = await supabase
      .from('game_state')
      .select('*');

    return NextResponse.json({
      success: true,
      checks: {
        initial_query: { data: gameState, error: gameStateError },
        final_state: { data: finalState, error: finalError }
      }
    });

  } catch (error) {
    console.error('🚨 game_state 檢查錯誤:', error);
    return NextResponse.json({ 
      error: '檢查失敗', 
      details: error 
    }, { status: 500 });
  }
}
