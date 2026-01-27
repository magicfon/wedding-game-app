import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase-server'
import { Client } from '@line/bot-sdk'

// 執行彩球機抽獎
export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServer()
    const body = await request.json()

    const { admin_id, admin_name, notes } = body

    console.log('🎰 開始執行彩球機抽獎...')
    console.log('管理員:', admin_name, '(', admin_id, ')')

    // 1. 檢查是否正在抽獎中
    const { data: currentState, error: stateError } = await supabase
      .from('lottery_machine_state')
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

    // 2. 獲取所有公開照片
    const { data: photos, error: photosError } = await supabase
      .from('photos')
      .select(`
        id,
        image_url,
        user_id,
        blessing_message,
        thumbnail_small_url,
        thumbnail_medium_url,
        thumbnail_large_url,
        media_type
      `)
      .eq('is_public', true)
      .order('created_at', { ascending: false })

    if (photosError) {
      console.error('❌ 獲取照片失敗:', photosError)
      return NextResponse.json({
        error: '獲取照片失敗',
        details: photosError.message
      }, { status: 500 })
    }

    if (!photos || photos.length === 0) {
      return NextResponse.json({
        error: '沒有公開照片可以抽獎'
      }, { status: 400 })
    }

    console.log(`📸 共有 ${photos.length} 張公開照片`)

    // 3. 排除已經中獎過的照片和用戶
    const { data: previousWinners, error: winnersError } = await supabase
      .from('lottery_history')
      .select('winner_photo_id, winner_line_id')
    
    if (winnersError) {
      console.error('❌ 獲取中獎記錄失敗:', winnersError)
      return NextResponse.json({
        error: '獲取中獎記錄失敗',
        details: winnersError.message
      }, { status: 500 })
    }

    // 排除已經中獎過的照片ID
    const previousWinnerPhotoIds = new Set(
      previousWinners?.map(w => w.winner_photo_id).filter(Boolean) || []
    )

    // 排除已經中獎過的用戶ID
    const previousWinnerLineIds = new Set(
      previousWinners?.map(w => w.winner_line_id).filter(Boolean) || []
    )

    const availablePhotos = photos.filter(photo => 
      !previousWinnerPhotoIds.has(photo.id) && 
      !previousWinnerLineIds.has(photo.user_id)
    )

    console.log(`📸 排除已中獎照片和用戶後，剩餘 ${availablePhotos.length} 張可抽獎照片`)

    if (availablePhotos.length === 0) {
      return NextResponse.json({
        error: '所有照片都已經中獎過了！請清除抽獎歷史記錄後再試。'
      }, { status: 400 })
    }

    // 4. 更新狀態為「抽獎中」
    const { error: updateStateError } = await supabase
      .from('lottery_machine_state')
      .update({
        is_drawing: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', currentState.id)

    if (updateStateError) {
      console.error('❌ 更新抽獎狀態失敗:', updateStateError)
    }

    // 5. 隨機選擇中獎照片
    const winnerIndex = Math.floor(Math.random() * availablePhotos.length)
    const winnerPhoto = availablePhotos[winnerIndex]

    console.log(`🎉 中獎照片 ID: ${winnerPhoto.id}`)

    // 6. 獲取用戶資訊
    const { data: user } = await supabase
      .from('users')
      .select('line_id, display_name, avatar_url')
      .eq('line_id', winnerPhoto.user_id)
      .single()

    const winnerLineId = user?.line_id || winnerPhoto.user_id
    const winnerDisplayName = user?.display_name || '匿名用戶'
    const winnerAvatarUrl = user?.avatar_url || '/default-avatar.png'

    // 7. 計算用戶照片數量
    const { data: userPhotos } = await supabase
      .from('photos')
      .select('id')
      .eq('user_id', winnerPhoto.user_id)
      .eq('is_public', true)

    const photoCount = userPhotos?.length || 0

    // 8. 記錄中獎者
    // 只存儲必要的信息，避免 payload string too long 錯誤
    const participantsSnapshot = photos.map(p => ({
      id: p.id,
      user_id: p.user_id
    }))

    const { data: lotteryRecord, error: recordError } = await supabase
      .from('lottery_history')
      .insert({
        winner_line_id: winnerLineId,
        winner_display_name: winnerDisplayName,
        winner_avatar_url: winnerAvatarUrl,
        photo_count: photoCount,
        winner_photo_id: winnerPhoto.id,
        winner_photo_url: winnerPhoto.thumbnail_medium_url || winnerPhoto.image_url,
        admin_id: admin_id || 'system',
        admin_name: admin_name || '系統管理員',
        participants_count: photos.length,
        participants_snapshot: JSON.stringify(participantsSnapshot),
        notes: notes || null
      })
      .select()
      .single()

    if (recordError) {
      console.error('❌ 記錄中獎者失敗:', recordError)
      
      // 重置抽獎狀態
      await supabase
        .from('lottery_machine_state')
        .update({
          is_drawing: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', currentState.id)

      return NextResponse.json({
        error: '記錄抽獎結果失敗',
        details: '無法記錄中獎者'
      }, { status: 500 })
    }

    // 8.5 發送 LINE 通知給中獎者
    try {
      // 檢查是否啟用中獎通知
      const { data: lotteryMachineState } = await supabase
        .from('lottery_machine_state')
        .select('notify_winner_enabled')
        .single()

      const notifyEnabled = lotteryMachineState?.notify_winner_enabled !== false
      console.log('📱 中獎通知設定:', { notifyEnabled })

      if (notifyEnabled && winnerLineId) {
        if (process.env.LINE_CHANNEL_ACCESS_TOKEN && process.env.LINE_CHANNEL_SECRET) {
          const client = new Client({
            channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
            channelSecret: process.env.LINE_CHANNEL_SECRET,
          })

          const now = new Date()
          const timeString = now.toLocaleString('zh-TW', {
            timeZone: 'Asia/Taipei',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
          })

          console.log('📨 準備發送 LINE 訊息給:', winnerLineId)

          const winnerPhotoUrl = winnerPhoto.thumbnail_medium_url || winnerPhoto.image_url

          if (winnerPhotoUrl) {
            try {
              console.log('🖼️ 嘗試發送 Flex Message...')
              // 發送 Flex Message 包含照片
              await client.pushMessage(winnerLineId, {
                type: 'flex',
                altText: '🎉 恭喜您中獎！',
                contents: {
                  type: 'bubble',
                  hero: {
                    type: 'image',
                    url: winnerPhotoUrl,
                    size: 'full',
                    aspectRatio: '20:13',
                    aspectMode: 'cover',
                    action: {
                      type: 'uri',
                      label: '查看照片',
                      uri: winnerPhotoUrl
                    }
                  },
                  body: {
                    type: 'box',
                    layout: 'vertical',
                    contents: [
                      {
                        type: 'text',
                        text: '🎉 恭喜您中獎！',
                        weight: 'bold',
                        size: 'xl',
                        align: 'center',
                        color: '#d32f2f'
                      },
                      {
                        type: 'text',
                        text: '您在照片抽獎活動中被選中！',
                        margin: 'md',
                        align: 'center',
                        wrap: true
                      },
                      {
                        type: 'separator',
                        margin: 'lg'
                      },
                      {
                        type: 'box',
                        layout: 'vertical',
                        margin: 'lg',
                        contents: [
                          {
                            type: 'text',
                            text: '中獎時間',
                            size: 'xs',
                            color: '#aaaaaa',
                            align: 'center'
                          },
                          {
                            type: 'text',
                            text: timeString,
                            size: 'sm',
                            color: '#666666',
                            align: 'center',
                            margin: 'xs'
                          }
                        ]
                      }
                    ]
                  }
                }
              })
              console.log('✅ Flex Message 發送成功')
            } catch (flexError) {
              console.error('❌ Flex Message 發送失敗，嘗試降級為純文字:', flexError)
              // 降級發送純文字
              await client.pushMessage(winnerLineId, {
                type: 'text',
                text: `🎉 恭喜您中獎！\n\n您在照片抽獎活動中被選中！\n\n中獎時間：${timeString}\n\n照片連結：${winnerPhotoUrl}`
              })
            }
          } else {
            // 降級發送純文字
            await client.pushMessage(winnerLineId, {
              type: 'text',
              text: `🎉 恭喜您中獎！\n\n您在照片抽獎活動中被選中！\n\n中獎時間：${timeString}`
            })
          }

          console.log('✅ LINE 通知發送成功')
        } else {
          console.log('⚠️ 未設定 LINE Token，跳過通知')
        }
      } else {
        console.log('⏭️ 中獎通知已關閉，跳過發送')
      }
    } catch (notifyError) {
      console.error('❌ 發送 LINE 通知時發生錯誤:', notifyError)
      // 不影響抽獎結果，只記錄錯誤
    }

    // 9. 更新抽獎狀態（使用中獎記錄的 ID）
    const { error: finalStateError } = await supabase
      .from('lottery_machine_state')
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
        line_id: winnerLineId,
        display_name: winnerDisplayName,
        avatar_url: winnerAvatarUrl,
        photo_count: photoCount
      },
      winner_photo: {
        id: winnerPhoto.id,
        url: winnerPhoto.image_url,
        thumbnail_url: winnerPhoto.thumbnail_medium_url || winnerPhoto.image_url
      },
      lottery_id: lotteryRecord.id,
      draw_time: lotteryRecord.draw_time,
      participants_count: photos.length,
      message: `🎉 恭喜 ${winnerDisplayName} 中獎！`
    })

  } catch (error) {
    console.error('❌ 抽獎時發生錯誤:', error)

    // 確保重置抽獎狀態
    try {
      const supabase = await createSupabaseServer()
      await supabase
        .from('lottery_machine_state')
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
