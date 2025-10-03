import { NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase-admin'

export async function GET() {
  try {
    const supabaseAdmin = createSupabaseAdmin()
    
    // 獲取總投票數
    const { count: totalVotes, error: votesError } = await supabaseAdmin
      .from('votes')
      .select('*', { count: 'exact', head: true })

    if (votesError) console.error('獲取投票數失敗:', votesError)

    // 獲取公開照片數
    const { count: totalPhotos, error: photosError } = await supabaseAdmin
      .from('photos')
      .select('*', { count: 'exact', head: true })
      .eq('is_public', true)

    if (photosError) console.error('獲取照片數失敗:', photosError)

    // 獲取參與投票人數（不重複的 voter_line_id）
    const { data: voters, error: votersError } = await supabaseAdmin
      .from('votes')
      .select('voter_line_id')

    if (votersError) console.error('獲取投票者失敗:', votersError)

    const activeVoters = voters ? new Set(voters.map(v => v.voter_line_id)).size : 0

    return NextResponse.json({
      success: true,
      stats: {
        totalVotes: totalVotes || 0,
        totalPhotos: totalPhotos || 0,
        activeVoters
      }
    })
  } catch (error) {
    console.error('獲取投票統計失敗:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: '獲取投票統計失敗',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}

