import { NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase-admin'

export async function GET() {
  try {
    const supabaseAdmin = createSupabaseAdmin()
    
    // 獲取投票設定
    const { data, error } = await supabaseAdmin
      .from('game_state')
      .select('voting_enabled, votes_per_user')
      .single()

    if (error) throw error

    return NextResponse.json({
      success: true,
      settings: {
        voting_enabled: data.voting_enabled || false,
        votes_per_user: data.votes_per_user || 3
      }
    })
  } catch (error) {
    console.error('獲取投票設定失敗:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: '獲取投票設定失敗',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}

