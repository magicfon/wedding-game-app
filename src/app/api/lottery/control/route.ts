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

// 更新抽獎狀態（啟動/關閉抽獎模式）
export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServer()
    const body = await request.json()
    
    const { is_lottery_active, admin_id } = body
    
    console.log(`🎰 更新抽獎狀態: ${is_lottery_active ? '啟動' : '關閉'} (管理員: ${admin_id})`)
    
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
    
    // 更新狀態
    const { data: updatedState, error } = await supabase
      .from('lottery_state')
      .update({
        is_lottery_active: is_lottery_active,
        updated_at: new Date().toISOString()
      })
      .eq('id', currentState.id)
      .select()
      .single()
    
    if (error) {
      console.error('❌ 更新抽獎狀態失敗:', error)
      return NextResponse.json({ 
        error: '更新抽獎狀態失敗',
        details: error.message 
      }, { status: 500 })
    }
    
    console.log('✅ 抽獎狀態已更新')
    
    return NextResponse.json({
      success: true,
      state: updatedState,
      message: is_lottery_active ? '抽獎模式已啟動' : '抽獎模式已關閉'
    })
    
  } catch (error) {
    console.error('❌ 更新抽獎狀態時發生錯誤:', error)
    return NextResponse.json({ 
      error: '更新抽獎狀態時發生錯誤',
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

