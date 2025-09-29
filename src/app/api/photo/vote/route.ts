import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    const supabase = createSupabaseAdmin()
    const body = await request.json()
    
    const { photoId, voterLineId } = body
    
    if (!photoId || !voterLineId) {
      return NextResponse.json({ 
        error: '缺少必要參數：photoId 和 voterLineId' 
      }, { status: 400 })
    }

    // 檢查投票設定
    const { data: gameState, error: gameStateError } = await supabase
      .from('game_state')
      .select('voting_enabled, votes_per_user')
      .single()

    if (gameStateError) {
      return NextResponse.json({ 
        error: '無法獲取遊戲狀態',
        details: gameStateError.message 
      }, { status: 500 })
    }

    if (!gameState.voting_enabled) {
      return NextResponse.json({ 
        error: '投票功能目前關閉中' 
      }, { status: 403 })
    }

    // 檢查用戶已使用的投票數
    const { data: userVotes, error: userVotesError } = await supabase
      .from('votes')
      .select('id')
      .eq('voter_line_id', voterLineId)

    if (userVotesError) {
      return NextResponse.json({ 
        error: '無法獲取投票記錄',
        details: userVotesError.message 
      }, { status: 500 })
    }

    if (userVotes.length >= gameState.votes_per_user) {
      return NextResponse.json({ 
        error: `您的投票額度已用完！每人最多可投 ${gameState.votes_per_user} 票` 
      }, { status: 403 })
    }

    // 檢查照片是否存在且為公開
    const { data: photo, error: photoError } = await supabase
      .from('photos')
      .select('id, is_public')
      .eq('id', photoId)
      .single()

    if (photoError || !photo) {
      return NextResponse.json({ 
        error: '照片不存在' 
      }, { status: 404 })
    }

    if (!photo.is_public) {
      return NextResponse.json({ 
        error: '此照片不開放投票' 
      }, { status: 403 })
    }

    console.log(`💖 用戶 ${voterLineId} 為照片 ${photoId} 投票`)

    // 新增投票記錄（允許同一用戶對同一張照片多次投票，直到達到總額度）
    const { data: voteData, error: voteError } = await supabase
      .from('votes')
      .insert({
        voter_line_id: voterLineId,
        photo_id: photoId
      })
      .select()
      .single()

    if (voteError) {
      console.error('❌ 投票失敗:', voteError)
      return NextResponse.json({ 
        error: '投票失敗',
        details: voteError.message 
      }, { status: 500 })
    }

    // 獲取更新後的照片投票數
    const { data: updatedPhoto, error: updatedPhotoError } = await supabase
      .from('photos')
      .select('vote_count')
      .eq('id', photoId)
      .single()

    if (updatedPhotoError) {
      console.error('❌ 獲取更新後投票數失敗:', updatedPhotoError)
    }

    // 獲取用戶剩餘投票數
    const { data: remainingVotes, error: remainingVotesError } = await supabase
      .from('votes')
      .select('id')
      .eq('voter_line_id', voterLineId)

    const usedVotes = remainingVotes?.length || 0
    const remainingVoteCount = Math.max(0, gameState.votes_per_user - usedVotes)

    console.log(`✅ 投票成功！照片 ${photoId} 新票數: ${updatedPhoto?.vote_count || 'N/A'}`)

    return NextResponse.json({
      success: true,
      message: '投票成功',
      data: {
        voteId: voteData.id,
        photoId,
        newVoteCount: updatedPhoto?.vote_count || 0,
        remainingVotes: remainingVoteCount,
        usedVotes
      }
    })

  } catch (error) {
    console.error('❌ 投票錯誤:', error)
    return NextResponse.json({ 
      error: '投票失敗',
      details: error instanceof Error ? error.message : '未知錯誤'
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseAdmin()
    const { searchParams } = new URL(request.url)
    const voterLineId = searchParams.get('voterLineId')
    
    if (!voterLineId) {
      return NextResponse.json({ 
        error: '缺少 voterLineId 參數' 
      }, { status: 400 })
    }

    // 獲取用戶的投票記錄
    const { data: userVotes, error: userVotesError } = await supabase
      .from('votes')
      .select('photo_id, created_at')
      .eq('voter_line_id', voterLineId)
      .order('created_at', { ascending: false })

    if (userVotesError) {
      return NextResponse.json({ 
        error: '無法獲取投票記錄',
        details: userVotesError.message 
      }, { status: 500 })
    }

    // 獲取投票設定
    const { data: gameState, error: gameStateError } = await supabase
      .from('game_state')
      .select('voting_enabled, votes_per_user')
      .single()

    if (gameStateError) {
      return NextResponse.json({ 
        error: '無法獲取遊戲狀態',
        details: gameStateError.message 
      }, { status: 500 })
    }

    // 統計每張照片的投票數
    const photoVoteCount: Record<number, number> = {}
    userVotes?.forEach(vote => {
      photoVoteCount[vote.photo_id] = (photoVoteCount[vote.photo_id] || 0) + 1
    })

    const usedVotes = userVotes?.length || 0
    const remainingVotes = Math.max(0, gameState.votes_per_user - usedVotes)

    return NextResponse.json({
      success: true,
      data: {
        votingEnabled: gameState.voting_enabled,
        totalVotesAllowed: gameState.votes_per_user,
        usedVotes,
        remainingVotes,
        userVotes: userVotes || [],
        photoVoteCount
      }
    })

  } catch (error) {
    console.error('❌ 獲取投票記錄錯誤:', error)
    return NextResponse.json({ 
      error: '獲取投票記錄失敗',
      details: error instanceof Error ? error.message : '未知錯誤'
    }, { status: 500 })
  }
}
