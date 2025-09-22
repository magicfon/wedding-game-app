import { NextResponse } from 'next/server';
import { createSupabaseAdmin } from '@/lib/supabase-admin';

export async function GET() {
  try {
    const results = [];
    
    results.push('=== 遊戲狀態數據庫測試 ===');
    
    // 1. 檢查環境變數
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    results.push(`Supabase URL: ${supabaseUrl ? '✅ 存在' : '❌ 缺失'}`);
    results.push(`Service Key: ${serviceKey ? '✅ 存在' : '❌ 缺失'}`);
    
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ 
        results: [...results, '❌ 環境變數缺失，無法繼續測試'],
        success: false 
      });
    }
    
    // 2. 創建 Supabase 客戶端
    let supabase;
    try {
      supabase = createSupabaseAdmin();
      results.push('✅ Supabase Admin 客戶端創建成功');
    } catch (error) {
      results.push(`❌ Supabase Admin 客戶端創建失敗: ${error}`);
      return NextResponse.json({ results, success: false });
    }
    
    // 3. 測試基本連接
    try {
      const { data: connectionTest, error: connectionError } = await supabase
        .from('users')
        .select('count(*)', { count: 'exact', head: true });
      
      if (connectionError) {
        results.push(`❌ 數據庫連接失敗: ${connectionError.message}`);
        results.push(`錯誤代碼: ${connectionError.code}`);
      } else {
        results.push('✅ 數據庫連接成功');
      }
    } catch (error) {
      results.push(`❌ 數據庫連接異常: ${error}`);
    }
    
    // 4. 檢查 game_state 表格
    try {
      results.push('\n=== 檢查 game_state 表格 ===');
      
      const { data: gameStateData, error: gameStateError } = await supabase
        .from('game_state')
        .select('*')
        .limit(1);
      
      if (gameStateError) {
        results.push(`❌ game_state 表格錯誤: ${gameStateError.message}`);
        results.push(`錯誤代碼: ${gameStateError.code}`);
        
        if (gameStateError.code === '42P01') {
          results.push('🔍 表格不存在，需要執行數據庫設置腳本');
        }
      } else {
        results.push('✅ game_state 表格存在');
        results.push(`記錄數: ${gameStateData?.length || 0}`);
        if (gameStateData && gameStateData.length > 0) {
          results.push(`第一條記錄: ${JSON.stringify(gameStateData[0], null, 2)}`);
        }
      }
    } catch (error) {
      results.push(`❌ game_state 表格檢查異常: ${error}`);
    }
    
    // 5. 檢查 questions 表格
    try {
      results.push('\n=== 檢查 questions 表格 ===');
      
      const { data: questionsData, error: questionsError } = await supabase
        .from('questions')
        .select('id, question_text, is_active')
        .eq('is_active', true)
        .limit(3);
      
      if (questionsError) {
        results.push(`❌ questions 表格錯誤: ${questionsError.message}`);
        results.push(`錯誤代碼: ${questionsError.code}`);
      } else {
        results.push(`✅ questions 表格存在，活躍題目數: ${questionsData?.length || 0}`);
        if (questionsData && questionsData.length > 0) {
          questionsData.forEach((q, index) => {
            results.push(`題目 ${index + 1}: ${q.question_text}`);
          });
        }
      }
    } catch (error) {
      results.push(`❌ questions 表格檢查異常: ${error}`);
    }
    
    // 6. 檢查 admin_line_ids 表格
    try {
      results.push('\n=== 檢查 admin_line_ids 表格 ===');
      
      const { data: adminData, error: adminError } = await supabase
        .from('admin_line_ids')
        .select('line_id, display_name')
        .limit(3);
      
      if (adminError) {
        results.push(`❌ admin_line_ids 表格錯誤: ${adminError.message}`);
        results.push(`錯誤代碼: ${adminError.code}`);
      } else {
        results.push(`✅ admin_line_ids 表格存在，管理員數: ${adminData?.length || 0}`);
      }
    } catch (error) {
      results.push(`❌ admin_line_ids 表格檢查異常: ${error}`);
    }
    
    // 7. 嘗試初始化 game_state
    try {
      results.push('\n=== 嘗試初始化 game_state ===');
      
      const { data: initData, error: initError } = await supabase
        .from('game_state')
        .upsert({
          id: 1,
          is_game_active: false,
          is_paused: false,
          current_question_id: null,
          completed_questions: 0,
          game_session_id: `init_${Date.now()}`
        })
        .select();
      
      if (initError) {
        results.push(`❌ game_state 初始化失敗: ${initError.message}`);
        results.push(`錯誤代碼: ${initError.code}`);
      } else {
        results.push('✅ game_state 初始化成功');
        results.push(`初始化結果: ${JSON.stringify(initData, null, 2)}`);
      }
    } catch (error) {
      results.push(`❌ game_state 初始化異常: ${error}`);
    }
    
    return NextResponse.json({ 
      results, 
      success: true,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Game state test error:', error);
    return NextResponse.json({ 
      error: '測試執行失敗', 
      details: error instanceof Error ? error.message : String(error),
      results: ['❌ 測試執行異常']
    }, { status: 500 });
  }
}
