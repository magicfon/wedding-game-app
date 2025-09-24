import { NextResponse } from 'next/server';
import { createSupabaseAdmin } from '@/lib/supabase-admin';

export async function POST() {
  try {
    const supabase = createSupabaseAdmin();

    console.log('🚀 開始遷移用戶在線狀態追蹤欄位...');

    // 1. 檢查並添加 last_active_at 欄位
    try {
      const { data: testLastActive, error: testError1 } = await supabase
        .from('users')
        .select('last_active_at')
        .limit(1);

      if (testError1 && testError1.message.includes('column "last_active_at" does not exist')) {
        console.log('❌ last_active_at 欄位不存在，需要手動添加到資料庫');
        return NextResponse.json({
          error: '需要執行資料庫遷移',
          instructions: '請在 Supabase SQL Editor 中執行 database/add-online-status-tracking.sql',
          missingColumns: ['last_active_at', 'is_in_quiz_page']
        }, { status: 400 });
      }
    } catch (error) {
      console.log('⚠️ 無法檢查 last_active_at 欄位:', error);
    }

    // 2. 檢查並添加 is_in_quiz_page 欄位
    try {
      const { data: testInQuiz, error: testError2 } = await supabase
        .from('users')
        .select('is_in_quiz_page')
        .limit(1);

      if (testError2 && testError2.message.includes('column "is_in_quiz_page" does not exist')) {
        console.log('❌ is_in_quiz_page 欄位不存在，需要手動添加到資料庫');
        return NextResponse.json({
          error: '需要執行資料庫遷移',
          instructions: '請在 Supabase SQL Editor 中執行 database/add-online-status-tracking.sql',
          missingColumns: ['is_in_quiz_page']
        }, { status: 400 });
      }
    } catch (error) {
      console.log('⚠️ 無法檢查 is_in_quiz_page 欄位:', error);
    }

    // 3. 如果欄位存在，更新現有用戶的預設值
    const { data: updateResult, error: updateError } = await supabase
      .from('users')
      .update({
        last_active_at: new Date().toISOString(),
        is_in_quiz_page: false
      })
      .is('last_active_at', null)
      .select();

    if (updateError) {
      console.error('❌ 更新用戶預設值失敗:', updateError);
      return NextResponse.json({
        error: '更新用戶預設值失敗',
        details: updateError
      }, { status: 500 });
    }

    console.log('✅ 更新用戶預設值成功:', updateResult?.length || 0, '筆記錄');

    // 4. 測試新功能
    const { data: onlineUsers, error: queryError } = await supabase
      .from('users')
      .select('line_id, display_name, last_active_at, is_in_quiz_page')
      .eq('is_in_quiz_page', true)
      .limit(5);

    if (queryError) {
      console.error('❌ 測試查詢失敗:', queryError);
      return NextResponse.json({
        error: '測試查詢失敗',
        details: queryError
      }, { status: 500 });
    }

    console.log('🎉 遷移完成！目前在線用戶:', onlineUsers?.length || 0);

    return NextResponse.json({
      success: true,
      message: '用戶在線狀態追蹤欄位遷移成功',
      updatedUsers: updateResult?.length || 0,
      currentOnlineUsers: onlineUsers?.length || 0,
      sampleOnlineUsers: onlineUsers
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
    message: '使用 POST 方法執行在線狀態追蹤遷移',
    instructions: '發送 POST 請求到此端點以執行用戶在線狀態追蹤遷移'
  });
}
