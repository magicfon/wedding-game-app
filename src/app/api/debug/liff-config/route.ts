import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const results = [];
    
    results.push('=== LIFF 配置檢查 ===');
    
    // 檢查環境變數
    const liffId = process.env.NEXT_PUBLIC_LIFF_ID;
    const lineChannelId = process.env.LINE_LOGIN_CHANNEL_ID;
    const lineChannelSecret = process.env.LINE_LOGIN_CHANNEL_SECRET;
    const lineChannelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;
    const lineChannelSecretBot = process.env.LINE_CHANNEL_SECRET;
    
    results.push(`NEXT_PUBLIC_LIFF_ID: ${liffId ? '✅ 存在' : '❌ 缺失'}`);
    if (liffId) {
      results.push(`  值: ${liffId}`);
      results.push(`  長度: ${liffId.length}`);
    }
    
    results.push(`LINE_LOGIN_CHANNEL_ID: ${lineChannelId ? '✅ 存在' : '❌ 缺失'}`);
    if (lineChannelId) {
      results.push(`  長度: ${lineChannelId.length}`);
    }
    
    results.push(`LINE_LOGIN_CHANNEL_SECRET: ${lineChannelSecret ? '✅ 存在' : '❌ 缺失'}`);
    if (lineChannelSecret) {
      results.push(`  長度: ${lineChannelSecret.length}`);
    }
    
    results.push(`LINE_CHANNEL_ACCESS_TOKEN: ${lineChannelAccessToken ? '✅ 存在' : '❌ 缺失'}`);
    if (lineChannelAccessToken) {
      results.push(`  長度: ${lineChannelAccessToken.length}`);
    }
    
    results.push(`LINE_CHANNEL_SECRET (Bot): ${lineChannelSecretBot ? '✅ 存在' : '❌ 缺失'}`);
    if (lineChannelSecretBot) {
      results.push(`  長度: ${lineChannelSecretBot.length}`);
    }
    
    // 檢查 LIFF ID 格式
    if (liffId) {
      const liffIdPattern = /^\d+-\w+$/;
      const isValidFormat = liffIdPattern.test(liffId);
      results.push(`LIFF ID 格式: ${isValidFormat ? '✅ 正確' : '❌ 格式錯誤'}`);
      
      if (!isValidFormat) {
        results.push('  正確格式應該是: 1234567890-abcdefgh');
      }
    }
    
    // 提供設置指引
    results.push('\n=== 設置指引 ===');
    if (!liffId) {
      results.push('❌ 請在 Vercel 環境變數中設置 NEXT_PUBLIC_LIFF_ID');
      results.push('  1. 前往 LINE Developers Console');
      results.push('  2. 選擇您的 LIFF 應用');
      results.push('  3. 複製 LIFF ID');
      results.push('  4. 在 Vercel Dashboard > Settings > Environment Variables 中添加');
      results.push('  5. 變數名: NEXT_PUBLIC_LIFF_ID');
      results.push('  6. 值: 您的 LIFF ID (格式: 1234567890-abcdefgh)');
    }
    
    if (!lineChannelId) {
      results.push('❌ 請設置 LINE_LOGIN_CHANNEL_ID');
    }
    
    if (!lineChannelSecret) {
      results.push('❌ 請設置 LINE_LOGIN_CHANNEL_SECRET');
    }
    
    // 檢查瀏覽器環境變數可見性
    results.push('\n=== 瀏覽器可見性檢查 ===');
    results.push('注意: NEXT_PUBLIC_LIFF_ID 必須以 NEXT_PUBLIC_ 開頭才能在瀏覽器中使用');
    results.push('其他 LINE 相關變數只在服務器端使用，不需要 NEXT_PUBLIC_ 前綴');
    
    return NextResponse.json({ 
      results, 
      success: true,
      config: {
        hasLiffId: !!liffId,
        hasLineChannelId: !!lineChannelId,
        hasLineChannelSecret: !!lineChannelSecret,
        hasLineChannelAccessToken: !!lineChannelAccessToken,
        hasLineBotChannelSecret: !!lineChannelSecretBot,
        liffIdFormat: liffId ? /^\d+-\w+$/.test(liffId) : false
      }
    });

  } catch (error) {
    console.error('LIFF config check error:', error);
    return NextResponse.json({ 
      error: 'LIFF 配置檢查失敗', 
      details: error instanceof Error ? error.message : String(error),
      results: ['❌ 檢查執行異常']
    }, { status: 500 });
  }
}
