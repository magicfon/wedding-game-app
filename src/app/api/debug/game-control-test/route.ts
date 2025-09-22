import { NextResponse } from 'next/server';
import { createSupabaseAdmin } from '@/lib/supabase-admin';

export async function GET() {
  try {
    const supabase = createSupabaseAdmin();
    const results = [];

    // 1. 測試基本連接
    results.push('=== 遊戲控制調試測試 ===');
    
    try {
      const { data: connectionTest, error: connectionError } = await supabase
        .from('users')
        .select('count(*)', { count: 'exact', head: true });
      
      if (connectionError) {
        results.push(`❌ 數據庫連接失敗: ${connectionError.message}`);
        return NextResponse.json({ results, success: false });
      }
      results.push('✅ 數據庫連接成功');
    } catch (err) {
      results.push(`❌ 數據庫連接異常: ${err}`);
      return NextResponse.json({ results, success: false });
    }

    // 2. 檢查 game_state 表格是否存在
    try {
      const { data: gameStateExists, error: gameStateError } = await supabase
        .from('game_state')
        .select('*')
        .limit(1);

      if (gameStateError) {
        results.push(`❌ game_state 表格錯誤: ${gameStateError.message}`);
        results.push(`錯誤代碼: ${gameStateError.code}`);
        results.push(`錯誤詳情: ${JSON.stringify(gameStateError.details)}`);
      } else {
        results.push('✅ game_state 表格存在');
        results.push(`當前記錄: ${JSON.stringify(gameStateExists, null, 2)}`);
      }
    } catch (err) {
      results.push(`❌ game_state 表格檢查異常: ${err}`);
    }

    // 3. 檢查 questions 表格
    try {
      const { data: questions, error: questionsError } = await supabase
        .from('questions')
        .select('id, question_text, is_active')
        .eq('is_active', true)
        .limit(5);

      if (questionsError) {
        results.push(`❌ questions 表格錯誤: ${questionsError.message}`);
      } else {
        results.push(`✅ questions 表格存在，活躍題目數: ${questions?.length || 0}`);
        if (questions && questions.length > 0) {
          results.push(`第一題: ${JSON.stringify(questions[0], null, 2)}`);
        }
      }
    } catch (err) {
      results.push(`❌ questions 表格檢查異常: ${err}`);
    }

    // 4. 檢查 admin_line_ids 表格
    try {
      const { data: admins, error: adminsError } = await supabase
        .from('admin_line_ids')
        .select('line_id, display_name')
        .limit(3);

      if (adminsError) {
        results.push(`❌ admin_line_ids 表格錯誤: ${adminsError.message}`);
      } else {
        results.push(`✅ admin_line_ids 表格存在，管理員數: ${admins?.length || 0}`);
      }
    } catch (err) {
      results.push(`❌ admin_line_ids 表格檢查異常: ${err}`);
    }

    // 5. 測試遊戲狀態初始化
    try {
      results.push('\n=== 測試遊戲狀態初始化 ===');
      
      const { data: initResult, error: initError } = await supabase
        .from('game_state')
        .upsert({
          id: 1,
          is_game_active: false,
          is_paused: false,
          current_question_id: null,
          completed_questions: 0,
          game_session_id: `test_${Date.now()}`
        })
        .select();

      if (initError) {
        results.push(`❌ 遊戲狀態初始化失敗: ${initError.message}`);
        results.push(`錯誤代碼: ${initError.code}`);
        results.push(`錯誤詳情: ${JSON.stringify(initError.details)}`);
      } else {
        results.push('✅ 遊戲狀態初始化成功');
        results.push(`結果: ${JSON.stringify(initResult, null, 2)}`);
      }
    } catch (err) {
      results.push(`❌ 遊戲狀態初始化異常: ${err}`);
    }

    // 6. 測試查找第一題
    try {
      results.push('\n=== 測試查找第一題 ===');
      
      const { data: firstQuestion, error: firstQuestionError } = await supabase
        .from('questions')
        .select('id, question_text, is_active')
        .eq('is_active', true)
        .order('created_at', { ascending: true })
        .limit(1)
        .single();

      if (firstQuestionError) {
        results.push(`❌ 查找第一題失敗: ${firstQuestionError.message}`);
        results.push(`錯誤代碼: ${firstQuestionError.code}`);
      } else {
        results.push('✅ 找到第一題');
        results.push(`第一題: ${JSON.stringify(firstQuestion, null, 2)}`);
      }
    } catch (err) {
      results.push(`❌ 查找第一題異常: ${err}`);
    }

    // 7. 環境變數檢查
    results.push('\n=== 環境變數檢查 ===');
    results.push(`SUPABASE_SERVICE_ROLE_KEY 存在: ${!!process.env.SUPABASE_SERVICE_ROLE_KEY}`);
    results.push(`NEXT_PUBLIC_SUPABASE_URL 存在: ${!!process.env.NEXT_PUBLIC_SUPABASE_URL}`);
    
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      results.push(`Service Key 長度: ${process.env.SUPABASE_SERVICE_ROLE_KEY.length}`);
    }

    return NextResponse.json({ 
      results, 
      success: true,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Game control test error:', error);
    return NextResponse.json({ 
      error: '測試執行失敗', 
      details: error instanceof Error ? error.message : String(error),
      results: ['❌ 測試執行異常']
    }, { status: 500 });
  }
}
