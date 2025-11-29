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

    // 定義用戶類型
    interface EligibleUser {
      line_id: string
      display_name: string
      avatar_url: string
      photo_count: number
    }

    // 3. 排除已經中獎過的用戶
    const { data: previousWinners, error: winnersError } = await supabase
      .from('lottery_history')
      .select('winner_line_id')

    if (winnersError) {
      console.error('❌ 查詢歷史中獎者失敗:', winnersError)
    }

    const previousWinnerIds = new Set(
      previousWinners?.map(w => w.winner_line_id) || []
    )

    const availableUsers = (eligibleUsers as EligibleUser[]).filter(
      (user: EligibleUser) => !previousWinnerIds.has(user.line_id)
    )

    console.log(`📊 排除已中獎者後，剩餘 ${availableUsers.length} 位可抽獎用戶`)

    if (availableUsers.length === 0) {
      return NextResponse.json({
        error: '所有符合資格的用戶都已經中獎過了！請清除抽獎歷史記錄後再試。'
      }, { status: 400 })
    }

    // 4. 更新狀態為「抽獎中」
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

    // 5. 使用加權抽獎（根據照片數量，設定上限）
    const maxPhotos = currentState.max_photos_for_lottery || 5
    console.log(`⚖️ 加權設定：每人最多計算 ${maxPhotos} 張照片`)

    // 建立加權池
    interface WeightedUser {
      line_id: string
      display_name: string
      avatar_url: string
      photo_count: number
    }

    const weightedPool: WeightedUser[] = []

    if (maxPhotos === 0) {
      // 平等機率模式：每人只算一次
      console.log('📊 使用平等機率模式（不加權）')
      weightedPool.push(...availableUsers)
    } else {
      // 加權模式：根據照片數量
      console.log('📊 使用加權機率模式')
      availableUsers.forEach(user => {
        const effectiveCount = Math.min(user.photo_count, maxPhotos)
        console.log(`  - ${user.display_name}: ${user.photo_count} 張照片，有效 ${effectiveCount} 次機會`)
        for (let i = 0; i < effectiveCount; i++) {
          weightedPool.push(user)
        }
      })
    }

    console.log(`🎲 加權池總數: ${weightedPool.length}`)

    // 從加權池中隨機選擇
    const randomIndex = Math.floor(Math.random() * weightedPool.length)
    const winner = weightedPool[randomIndex]

    // 計算中獎機率
    const winnerEffectiveCount = Math.min(winner.photo_count, maxPhotos || winner.photo_count)
    const winProbability = ((winnerEffectiveCount / weightedPool.length) * 100).toFixed(2)

    console.log('🎉 中獎者:', winner.display_name)
    console.log('   照片數:', winner.photo_count)
    console.log('   有效機會:', winnerEffectiveCount)
    console.log('   中獎機率:', `${winProbability}%`)

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
