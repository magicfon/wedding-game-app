import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase-server'

// 獲取當前抽獎狀態
export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServer()

    const { data: state, error } = await supabase
      .from('lottery_state')
      .select('*')
      .single()

    if (error) {
      console.error('❌ 獲取抽獎狀態失敗:', error)
      return NextResponse.json({
        error: '獲取抽獎狀態失敗',
        details: error.message
      }, { status: 500 })
    }

    // 如果有當前抽獎 ID，獲取詳細資訊
    let currentDraw = null
    if (state?.current_draw_id) {
      const { data: draw } = await supabase
        .from('lottery_history')
        .select('*')
        .eq('id', state.current_draw_id)
        .single()

      currentDraw = draw
    }

    return NextResponse.json({
      success: true,
      state: state || {
        is_lottery_active: false,
        is_drawing: false,
        current_draw_id: null
      },
      current_draw: currentDraw
    })

  } catch (error) {
    console.error('❌ 獲取抽獎狀態時發生錯誤:', error)
    return NextResponse.json({
      error: '獲取抽獎狀態時發生錯誤',
      details: error instanceof Error ? error.message : '未知錯誤'
    }, { status: 500 })
  }
}

// 更新抽獎狀態（啟動/關閉抽獎模式，或更新加權設定）
export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServer()
    const body = await request.json()

    const { is_lottery_active, max_photos_for_lottery, admin_id } = body

    console.log(`🎰 更新抽獎設定 (管理員: ${admin_id})`)

    // 獲取當前狀態
    const { data: currentState } = await supabase
      .from('lottery_state')
      .select('*')
      .single()

    if (!currentState) {
      return NextResponse.json({
        error: '找不到抽獎狀態記錄'
      }, { status: 404 })
    }

    // 準備更新的欄位
    const updateFields: any = {
      updated_at: new Date().toISOString()
    }

    // 如果提供了 is_lottery_active，更新它
    if (typeof is_lottery_active === 'boolean') {
      updateFields.is_lottery_active = is_lottery_active
      console.log(`  - 抽獎模式: ${is_lottery_active ? '啟動' : '關閉'}`)
    }

    // 如果提供了 max_photos_for_lottery，更新它
    if (typeof max_photos_for_lottery === 'number') {
      updateFields.max_photos_for_lottery = max_photos_for_lottery
      console.log(`  - 加權上限: ${max_photos_for_lottery} 張照片${max_photos_for_lottery === 0 ? '（平等機率）' : ''}`)
    }

    // 更新狀態
    const { data: updatedState, error } = await supabase
      .from('lottery_state')
      .update(updateFields)
      .eq('id', currentState.id)
      .select()
      .single()

    if (error) {
      console.error('❌ 更新抽獎設定失敗:', error)
      return NextResponse.json({
        error: '更新抽獎設定失敗',
        details: error.message
      }, { status: 500 })
    }

    console.log('✅ 抽獎設定已更新')

    let message = '設定已更新'
    if (typeof is_lottery_active === 'boolean') {
      message = is_lottery_active ? '抽獎模式已啟動' : '抽獎模式已關閉'
    }
    if (typeof max_photos_for_lottery === 'number') {
      message += (typeof is_lottery_active === 'boolean' ? '，' : '') +
        `加權上限已設為 ${max_photos_for_lottery} 張`
    }

    return NextResponse.json({
      success: true,
      state: updatedState,
      message
    })

  } catch (error) {
    console.error('❌ 更新抽獎設定時發生錯誤:', error)
    return NextResponse.json({
      error: '更新抽獎設定時發生錯誤',
      details: error instanceof Error ? error.message : '未知錯誤'
    }, { status: 500 })
  }
}

// 重置抽獎狀態（清除當前抽獎）
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createSupabaseServer()
    const body = await request.json()

    const { admin_id } = body

    console.log(`🔄 重置抽獎狀態 (管理員: ${admin_id})`)

    // 獲取當前狀態
    const { data: currentState } = await supabase
      .from('lottery_state')
      .select('*')
      .single()

    if (!currentState) {
      return NextResponse.json({
        error: '找不到抽獎狀態記錄'
      }, { status: 404 })
    }

    // 重置狀態
    const { data: updatedState, error } = await supabase
      .from('lottery_state')
      .update({
        is_drawing: false,
        current_draw_id: null,
        draw_started_at: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', currentState.id)
      .select()
      .single()

    if (error) {
      console.error('❌ 重置抽獎狀態失敗:', error)
      return NextResponse.json({
        error: '重置抽獎狀態失敗',
        details: error.message
      }, { status: 500 })
    }

    console.log('✅ 抽獎狀態已重置')

    return NextResponse.json({
      success: true,
      state: updatedState,
      message: '抽獎狀態已重置'
    })

  } catch (error) {
    console.error('❌ 重置抽獎狀態時發生錯誤:', error)
    return NextResponse.json({
      error: '重置抽獎狀態時發生錯誤',
      details: error instanceof Error ? error.message : '未知錯誤'
    }, { status: 500 })
  }
}

// 更新抽獎動畫模式
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createSupabaseServer()
    const body = await request.json()

    const { animation_mode, admin_id } = body

    // 驗證動畫模式
    const validModes = ['fast_shuffle', 'slot_machine', 'waterfall', 'tournament']
    if (!validModes.includes(animation_mode)) {
      return NextResponse.json({
        error: '無效的動畫模式',
        valid_modes: validModes
      }, { status: 400 })
    }

    console.log(`🎨 更新抽獎動畫模式: ${animation_mode} (管理員: ${admin_id})`)

    // 獲取當前狀態
    const { data: currentState } = await supabase
      .from('lottery_state')
      .select('*')
      .single()

    if (!currentState) {
      return NextResponse.json({
        error: '找不到抽獎狀態記錄'
      }, { status: 404 })
    }

    // 更新動畫模式
    const { data: updatedState, error } = await supabase
      .from('lottery_state')
      .update({
        animation_mode,
        updated_at: new Date().toISOString()
      })
      .eq('id', currentState.id)
      .select()
      .single()

    if (error) {
      console.error('❌ 更新動畫模式失敗:', error)
      return NextResponse.json({
        error: '更新動畫模式失敗',
        details: error.message
      }, { status: 500 })
    }

    const modeNames: { [key: string]: string } = {
      fast_shuffle: '快速切換',
      slot_machine: '老虎機',
      waterfall: '瀑布流',
      tournament: '淘汰賽'
    }

    console.log(`✅ 動畫模式已更新為: ${modeNames[animation_mode]}`)

    return NextResponse.json({
      success: true,
      state: updatedState,
      message: `動畫模式已切換為「${modeNames[animation_mode]}」`
    })

  } catch (error) {
    console.error('❌ 更新動畫模式時發生錯誤:', error)
    return NextResponse.json({
      error: '更新動畫模式時發生錯誤',
      details: error instanceof Error ? error.message : '未知錯誤'
    }, { status: 500 })
  }
}
