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
    const winnersCount = currentState.winners_per_draw || 1
    console.log(`⚖️ 加權設定：每人最多計算 ${maxPhotos} 張照片`)
    console.log(`🎯 本次抽獎人數：${winnersCount} 位`)

    // 確保不會抽取超過可用人數
    const actualWinnersCount = Math.min(winnersCount, availableUsers.length)
    if (actualWinnersCount < winnersCount) {
      console.log(`⚠️ 可用人數不足，調整為 ${actualWinnersCount} 位`)
    }

    // 定義中獎者類型
    interface WinnerInfo {
      line_id: string
      display_name: string
      avatar_url: string
      photo_count: number
      photo_id: number | null
      photo_url: string | null
    }

    const winners: WinnerInfo[] = []
    const selectedLineIds = new Set<string>() // 追蹤已中獎的用戶，避免重複

    // 建立加權池（會在每次抽獎後移除中獎者）
    interface WeightedUser {
      line_id: string
      display_name: string
      avatar_url: string
      photo_count: number
    }

    // 抽取多位中獎者
    for (let i = 0; i < actualWinnersCount; i++) {
      // 過濾掉已中獎的用戶
      const remainingUsers = availableUsers.filter(
        (user: EligibleUser) => !selectedLineIds.has(user.line_id)
      )

      if (remainingUsers.length === 0) {
        console.log(`⚠️ 已無可抽獎用戶，停止抽獎`)
        break
      }

      // 建立加權池
      const weightedPool: WeightedUser[] = []

      if (maxPhotos === 0) {
        // 平等機率模式：每人只算一次
        weightedPool.push(...remainingUsers)
      } else {
        // 加權模式：根據照片數量
        remainingUsers.forEach((user: EligibleUser) => {
          const effectiveCount = Math.min(user.photo_count, maxPhotos)
          for (let j = 0; j < effectiveCount; j++) {
            weightedPool.push(user)
          }
        })
      }

      // 從加權池中隨機選擇
      const randomIndex = Math.floor(Math.random() * weightedPool.length)
      const winner = weightedPool[randomIndex]

      // 標記為已中獎
      selectedLineIds.add(winner.line_id)

      // 從中獎者的照片中隨機選一張作為中獎照片
      const { data: winnerPhotos, error: photosError } = await supabase
        .from('photos')
        .select('id, image_url, thumbnail_medium_url')
        .eq('user_id', winner.line_id)
        .eq('is_public', true)

      let winnerPhotoId: number | null = null
      let winnerPhotoUrl: string | null = null

      if (!photosError && winnerPhotos && winnerPhotos.length > 0) {
        const randomPhoto = winnerPhotos[Math.floor(Math.random() * winnerPhotos.length)]
        winnerPhotoId = randomPhoto.id
        winnerPhotoUrl = randomPhoto.thumbnail_medium_url || randomPhoto.image_url
      }

      winners.push({
        line_id: winner.line_id,
        display_name: winner.display_name,
        avatar_url: winner.avatar_url,
        photo_count: winner.photo_count,
        photo_id: winnerPhotoId,
        photo_url: winnerPhotoUrl
      })

      console.log(`🎉 第 ${i + 1} 位中獎者: ${winner.display_name}`)
    }

    console.log(`📊 共抽出 ${winners.length} 位中獎者`)

    // 6. 記錄所有中獎者（每位中獎者一筆記錄）
    const lotteryRecords = []
    for (const winner of winners) {
      const { data: lotteryRecord, error: recordError } = await supabase
        .from('lottery_history')
        .insert({
          winner_line_id: winner.line_id,
          winner_display_name: winner.display_name,
          winner_avatar_url: winner.avatar_url,
          photo_count: winner.photo_count,
          winner_photo_id: winner.photo_id,
          winner_photo_url: winner.photo_url,
          admin_id: admin_id || 'system',
          admin_name: admin_name || '系統管理員',
          participants_count: eligibleUsers.length,
          participants_snapshot: JSON.stringify(eligibleUsers),
          notes: notes || null
        })
        .select()
        .single()

      if (recordError) {
        console.error(`❌ 記錄中獎者 ${winner.display_name} 失敗:`, recordError)
      } else {
        lotteryRecords.push(lotteryRecord)
      }
    }

    if (lotteryRecords.length === 0) {
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
        details: '無法記錄任何中獎者'
      }, { status: 500 })
    }

    // 7. 更新抽獎狀態（使用第一位中獎者的 ID 作為 current_draw_id）
    const { error: finalStateError } = await supabase
      .from('lottery_state')
      .update({
        is_drawing: false,
        current_draw_id: lotteryRecords[0].id,
        updated_at: new Date().toISOString()
      })
      .eq('id', currentState.id)

    if (finalStateError) {
      console.error('❌ 更新最終狀態失敗:', finalStateError)
    }

    console.log('✅ 抽獎完成！')

    // 生成中獎訊息
    const winnerNames = winners.map(w => w.display_name).join('、')
    const message = winners.length === 1
      ? `🎉 恭喜 ${winnerNames} 中獎！`
      : `🎉 恭喜 ${winners.length} 位中獎者：${winnerNames}！`

    return NextResponse.json({
      success: true,
      winners: winners.map(w => ({
        line_id: w.line_id,
        display_name: w.display_name,
        avatar_url: w.avatar_url,
        photo_count: w.photo_count
      })),
      // 保持向後相容
      winner: winners.length > 0 ? {
        line_id: winners[0].line_id,
        display_name: winners[0].display_name,
        avatar_url: winners[0].avatar_url,
        photo_count: winners[0].photo_count
      } : null,
      lottery_ids: lotteryRecords.map(r => r.id),
      lottery_id: lotteryRecords[0]?.id,
      draw_time: lotteryRecords[0]?.draw_time,
      participants_count: eligibleUsers.length,
      message
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
