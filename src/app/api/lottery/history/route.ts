import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase-server'

// 獲取抽獎歷史記錄
export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServer()
    const url = new URL(request.url)
    
    const limit = parseInt(url.searchParams.get('limit') || '50')
    const offset = parseInt(url.searchParams.get('offset') || '0')
    
    console.log(`🎰 獲取抽獎歷史記錄 (limit: ${limit}, offset: ${offset})`)
    
    // 獲取抽獎歷史（按時間倒序）
    const { data: history, error, count } = await supabase
      .from('lottery_history')
      .select('*', { count: 'exact' })
      .order('draw_time', { ascending: false })
      .range(offset, offset + limit - 1)
    
    if (error) {
      console.error('❌ 獲取抽獎歷史失敗:', error)
      return NextResponse.json({ 
        error: '獲取抽獎歷史失敗',
        details: error.message 
      }, { status: 500 })
    }
    
    console.log(`✅ 找到 ${history?.length || 0} 筆抽獎記錄（總共 ${count} 筆）`)
    
    return NextResponse.json({
      success: true,
      history: history || [],
      total: count || 0,
      limit,
      offset,
      has_more: (count || 0) > offset + limit
    })
    
  } catch (error) {
    console.error('❌ 獲取抽獎歷史時發生錯誤:', error)
    return NextResponse.json({ 
      error: '獲取抽獎歷史時發生錯誤',
      details: error instanceof Error ? error.message : '未知錯誤'
    }, { status: 500 })
  }
}

// 刪除抽獎記錄（僅管理員）
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createSupabaseServer()
    const body = await request.json()
    
    const { lottery_id, admin_id } = body
    
    if (!lottery_id) {
      return NextResponse.json({ 
        error: '缺少 lottery_id 參數' 
      }, { status: 400 })
    }
    
    console.log(`🗑️ 刪除抽獎記錄 ${lottery_id} (管理員: ${admin_id})`)
    
    const { error } = await supabase
      .from('lottery_history')
      .delete()
      .eq('id', lottery_id)
    
    if (error) {
      console.error('❌ 刪除抽獎記錄失敗:', error)
      return NextResponse.json({ 
        error: '刪除抽獎記錄失敗',
        details: error.message 
      }, { status: 500 })
    }
    
    console.log('✅ 抽獎記錄已刪除')
    
    return NextResponse.json({
      success: true,
      message: '抽獎記錄已刪除'
    })
    
  } catch (error) {
    console.error('❌ 刪除抽獎記錄時發生錯誤:', error)
    return NextResponse.json({ 
      error: '刪除抽獎記錄時發生錯誤',
      details: error instanceof Error ? error.message : '未知錯誤'
    }, { status: 500 })
  }
}

