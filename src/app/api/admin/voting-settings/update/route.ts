import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase-admin'

export async function POST(request: NextRequest) {
  try {
    const supabaseAdmin = createSupabaseAdmin()
    
    const { votingEnabled, votesPerUser } = await request.json()

    // 驗證數據
    if (typeof votingEnabled !== 'boolean') {
      return NextResponse.json(
        { success: false, error: 'votingEnabled 必須是布林值' },
        { status: 400 }
      )
    }

    if (typeof votesPerUser !== 'number' || votesPerUser < 1 || votesPerUser > 20) {
      return NextResponse.json(
        { success: false, error: 'votesPerUser 必須是 1-20 之間的數字' },
        { status: 400 }
      )
    }

    // 更新設定
    const { error } = await supabaseAdmin
      .from('game_state')
      .update({
        voting_enabled: votingEnabled,
        votes_per_user: votesPerUser
      })
      .eq('id', 1) // 假設只有一個 game_state 記錄

    if (error) throw error

    return NextResponse.json({
      success: true,
      message: '投票設定已更新'
    })
  } catch (error) {
    console.error('更新投票設定失敗:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: '更新投票設定失敗',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}

