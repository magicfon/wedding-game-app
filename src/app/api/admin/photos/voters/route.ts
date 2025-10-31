import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase-admin'

export async function GET(request: NextRequest) {
  try {
    const supabaseAdmin = createSupabaseAdmin()
    const { searchParams } = new URL(request.url)
    const photoId = searchParams.get('photoId')
    
    // 驗證 photoId 參數
    if (!photoId || isNaN(Number(photoId))) {
      return NextResponse.json(
        { error: '無效的照片 ID' },
        { status: 400 }
      )
    }

    console.log(`=== 獲取照片投票者資訊開始 ===`)
    console.log(`照片 ID: ${photoId}`)

    // 檢查照片是否存在
    const { data: photo, error: photoError } = await supabaseAdmin
      .from('photos')
      .select('id, is_public')
      .eq('id', photoId)
      .single()

    if (photoError || !photo) {
      console.error('照片不存在:', photoError)
      return NextResponse.json(
        { error: '照片不存在' },
        { status: 404 }
      )
    }

    // 獲取投票者資訊
    const { data: voters, error: votersError } = await supabaseAdmin
      .from('votes')
      .select(`
        voter_line_id,
        created_at,
        users!votes_voter_line_id_fkey (
          line_id,
          display_name,
          avatar_url
        )
      `)
      .eq('photo_id', photoId)
      .order('created_at', { ascending: false })

    if (votersError) {
      console.error('獲取投票者失敗:', votersError)
      return NextResponse.json(
        { error: '獲取投票者失敗', details: votersError.message },
        { status: 500 }
      )
    }

    // 格式化投票者資料
    const formattedVoters = voters?.map((vote: any) => ({
      lineId: vote.users?.line_id || vote.voter_line_id,
      displayName: vote.users?.display_name || '未知用戶',
      avatarUrl: vote.users?.avatar_url
    })).filter(voter => voter.lineId) || []

    console.log(`找到 ${formattedVoters.length} 個投票者`)

    return NextResponse.json({
      success: true,
      data: {
        photoId: Number(photoId),
        voters: formattedVoters,
        totalVoters: formattedVoters.length
      }
    })

  } catch (error) {
    console.error('獲取照片投票者資訊錯誤:', error)
    return NextResponse.json(
      { error: '伺服器錯誤', details: error instanceof Error ? error.message : '未知錯誤' },
      { status: 500 }
    )
  }
}