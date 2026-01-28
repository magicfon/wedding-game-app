import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase-server'

// 獲取抽獎歷史記錄
export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseAdmin()

    console.log('📋 獲取抽獎歷史記錄...')

    // 獲取所有中獎記錄
    const { data: history, error } = await supabase
      .from('lottery_history')
      .select('winner_line_id, winner_display_name, winner_avatar_url, winner_photo_id, winner_photo_url, draw_time')
      .order('draw_time', { ascending: false })

    if (error) {
      console.error('❌ 獲取歷史記錄失敗:', error)
      return NextResponse.json({
        error: '獲取歷史記錄失敗',
        details: error.message
      }, { status: 500 })
    }

    console.log(`✅ 成功獲取 ${history?.length || 0} 筆歷史記錄`)

    return NextResponse.json({
      success: true,
      history: history || []
    })

  } catch (error) {
    console.error('❌ 獲取歷史記錄時發生錯誤:', error)
    return NextResponse.json({
      error: '獲取歷史記錄時發生錯誤',
      details: error instanceof Error ? error.message : '未知錯誤'
    }, { status: 500 })
  }
}
