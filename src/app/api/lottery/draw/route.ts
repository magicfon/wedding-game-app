import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase-server'

// 執行抽獎
export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServer()
    const body = await request.json()
    
    const { admin_id, admin_name, notes } = body
    
    console.log('🎰 開始執行抽獎...')
    console.log('管理員:', admin_name, '(', admin_id, ')')
    
    // 1. 檢查是否正在抽獎中
    const { data: currentState, error: stateError } = await supabase
      .from('lottery_state')
      .select('*')
      .single()
    
    if (stateError) {
      console.error('❌ 獲取抽獎狀態失敗:', stateError)
      return NextResponse.json({ 
        error: '獲取抽獎狀態失敗',
        details: stateError.message 
      }, { status: 500 })
    }
    
    if (currentState?.is_drawing) {
      return NextResponse.json({ 
        error: '正在抽獎中，請稍候...' 
      }, { status: 409 })
    }
    
    // 2. 獲取符合資格的用戶
    const { data: eligibleUsers, error: eligibleError } = await supabase
      .rpc('get_lottery_eligible_users')
    
    if (eligibleError) {
      console.error('❌ 查詢符合資格用戶失敗:', eligibleError)
      return NextResponse.json({ 
        error: '查詢符合資格用戶失敗',
        details: eligibleError.message 
      }, { status: 500 })
    }
    
    if (!eligibleUsers || eligibleUsers.length === 0) {
      return NextResponse.json({ 
        error: '沒有符合資格的用戶（需至少上傳1張公開照片）' 
      }, { status: 400 })
    }
    
    console.log(`📊 共有 ${eligibleUsers.length} 位符合資格的用戶`)
    
    // 3. 更新狀態為「抽獎中」
    const { error: updateStateError } = await supabase
      .from('lottery_state')
      .update({
        is_drawing: true,
        draw_started_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', currentState.id)
    
    if (updateStateError) {
      console.error('❌ 更新抽獎狀態失敗:', updateStateError)
    }
    
    // 4. 使用加密安全的隨機數生成器抽獎
    const randomIndex = Math.floor(Math.random() * eligibleUsers.length)
    const winner = eligibleUsers[randomIndex]
    
    console.log('🎉 中獎者:', winner.display_name, '(照片數:', winner.photo_count, ')')
    
    // 5. 記錄抽獎結果
    const { data: lotteryRecord, error: recordError } = await supabase
      .from('lottery_history')
      .insert({
        winner_line_id: winner.line_id,
        winner_display_name: winner.display_name,
        winner_avatar_url: winner.avatar_url,
        photo_count: winner.photo_count,
        admin_id: admin_id || 'system',
        admin_name: admin_name || '系統管理員',
        participants_count: eligibleUsers.length,
        participants_snapshot: JSON.stringify(eligibleUsers),
        notes: notes || null
      })
      .select()
      .single()
    
    if (recordError) {
      console.error('❌ 記錄抽獎結果失敗:', recordError)
      
      // 重置抽獎狀態
      await supabase
        .from('lottery_state')
        .update({
          is_drawing: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', currentState.id)
      
      return NextResponse.json({ 
        error: '記錄抽獎結果失敗',
        details: recordError.message 
      }, { status: 500 })
    }
    
    // 6. 更新抽獎狀態
    const { error: finalStateError } = await supabase
      .from('lottery_state')
      .update({
        is_drawing: false,
        current_draw_id: lotteryRecord.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', currentState.id)
    
    if (finalStateError) {
      console.error('❌ 更新最終狀態失敗:', finalStateError)
    }
    
    console.log('✅ 抽獎完成！')
    
    return NextResponse.json({
      success: true,
      winner: {
        line_id: winner.line_id,
        display_name: winner.display_name,
        avatar_url: winner.avatar_url,
        photo_count: winner.photo_count
      },
      lottery_id: lotteryRecord.id,
      draw_time: lotteryRecord.draw_time,
      participants_count: eligibleUsers.length,
      message: `🎉 恭喜 ${winner.display_name} 中獎！`
    })
    
  } catch (error) {
    console.error('❌ 抽獎時發生錯誤:', error)
    
    // 確保重置抽獎狀態
    try {
      const supabase = await createSupabaseServer()
      await supabase
        .from('lottery_state')
        .update({
          is_drawing: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', 1)
    } catch (resetError) {
      console.error('❌ 重置狀態失敗:', resetError)
    }
    
    return NextResponse.json({ 
      error: '抽獎時發生錯誤',
      details: error instanceof Error ? error.message : '未知錯誤'
    }, { status: 500 })
  }
}

