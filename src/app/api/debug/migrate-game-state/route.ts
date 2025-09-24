import { NextResponse } from 'next/server';
import { createSupabaseAdmin } from '@/lib/supabase-admin';

export async function POST() {
  try {
    const supabase = createSupabaseAdmin();

    console.log('🚀 開始遷移 game_state 表格結構...');

    // 由於無法直接執行 ALTER TABLE，我們嘗試插入新欄位
    // 如果欄位不存在，插入操作會失敗，我們可以從錯誤中得知
    console.log('📋 檢查表格結構並嘗試更新...');

    // 3. 更新現有記錄
    const { data: updateResult, error: updateError } = await supabase
      .from('game_state')
      .update({
        is_waiting_for_players: true,
        qr_code_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/quiz`
      })
      .eq('id', 1)
      .select();

    if (updateError) {
      console.error('❌ 更新現有記錄失敗:', updateError);
      return NextResponse.json({ 
        error: '更新現有記錄失敗', 
        details: updateError 
      }, { status: 500 });
    }

    console.log('✅ 更新現有記錄成功:', updateResult);

    // 4. 驗證遷移結果
    const { data: finalState, error: finalError } = await supabase
      .from('game_state')
      .select('*')
      .eq('id', 1)
      .single();

    if (finalError) {
      console.error('❌ 驗證失敗:', finalError);
      return NextResponse.json({ 
        error: '驗證失敗', 
        details: finalError 
      }, { status: 500 });
    }

    console.log('🎉 遷移完成！最終狀態:', finalState);

    return NextResponse.json({
      success: true,
      message: 'game_state 表格遷移成功',
      finalState: finalState,
      hasNewFields: {
        is_waiting_for_players: finalState.is_waiting_for_players !== undefined,
        qr_code_url: finalState.qr_code_url !== undefined
      }
    });

  } catch (error) {
    console.error('🚨 遷移失敗:', error);
    return NextResponse.json({ 
      error: '遷移失敗', 
      details: error 
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: '使用 POST 方法執行遷移',
    instructions: '發送 POST 請求到此端點以執行 game_state 表格遷移'
  });
}
