import { NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase-server'

export async function POST() {
  try {
    const supabase = createSupabaseAdmin()

    // 1. 刪除所有投票記錄
    const { error: deleteVotesError } = await supabase
      .from('votes')
      .delete()
      .neq('id', 0) // 刪除所有記錄

    if (deleteVotesError) {
      console.error('❌ 刪除投票記錄失敗:', deleteVotesError)
      return NextResponse.json({
        error: '刪除投票記錄失敗',
        details: deleteVotesError.message
      }, { status: 500 })
    }

    // 2. 重置所有照片的投票數為 0
    const { error: resetCountError } = await supabase
      .from('photos')
      .update({ vote_count: 0 })
      .neq('id', 0) // 更新所有照片

    if (resetCountError) {
      console.error('❌ 重置照片票數失敗:', resetCountError)
      return NextResponse.json({
        error: '重置照片票數失敗',
        details: resetCountError.message
      }, { status: 500 })
    }

    console.log('✅ 已重置所有投票狀態')

    return NextResponse.json({
      success: true,
      message: '已成功重置所有投票狀態'
    })

  } catch (error) {
    console.error('❌ 重置投票失敗:', error)
    return NextResponse.json({
      error: '重置投票失敗',
      details: error instanceof Error ? error.message : '未知錯誤'
    }, { status: 500 })
  }
}

