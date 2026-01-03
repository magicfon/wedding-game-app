import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase-admin'

export async function GET(request: NextRequest) {
    try {
        const supabaseAdmin = createSupabaseAdmin()
        const { searchParams } = new URL(request.url)
        const photoId = searchParams.get('photoId')

        // 驗證 photoId 參數 (Google Drive file ID 是字串)
        if (!photoId) {
            return NextResponse.json(
                { error: '請提供照片 ID' },
                { status: 400 }
            )
        }

        console.log(`=== 獲取婚紗照投票者資訊 ===`)
        console.log(`照片 ID: ${photoId}`)

        // 獲取投票者資訊 - 從 wedding_photo_votes JOIN users
        const { data: votes, error: votesError } = await supabaseAdmin
            .from('wedding_photo_votes')
            .select('voter_line_id, created_at')
            .eq('photo_id', photoId)
            .order('created_at', { ascending: false })

        if (votesError) {
            console.error('獲取投票記錄失敗:', votesError)
            return NextResponse.json(
                { error: '獲取投票記錄失敗', details: votesError.message },
                { status: 500 }
            )
        }

        if (!votes || votes.length === 0) {
            return NextResponse.json({
                success: true,
                data: {
                    photoId,
                    voters: [],
                    totalVoters: 0
                }
            })
        }

        // 獲取所有投票者的用戶資訊
        const voterLineIds = votes.map(v => v.voter_line_id)
        const { data: users, error: usersError } = await supabaseAdmin
            .from('users')
            .select('line_id, display_name, avatar_url')
            .in('line_id', voterLineIds)

        if (usersError) {
            console.error('獲取用戶資訊失敗:', usersError)
        }

        // 建立用戶資訊映射
        const userMap = new Map(
            (users || []).map(u => [u.line_id, { displayName: u.display_name, avatarUrl: u.avatar_url }])
        )

        // 格式化投票者資料
        const formattedVoters = votes.map(vote => {
            const userInfo = userMap.get(vote.voter_line_id)
            return {
                lineId: vote.voter_line_id,
                displayName: userInfo?.displayName || '未知用戶',
                avatarUrl: userInfo?.avatarUrl || null,
                votedAt: vote.created_at
            }
        })

        console.log(`找到 ${formattedVoters.length} 個投票者`)

        return NextResponse.json({
            success: true,
            data: {
                photoId,
                voters: formattedVoters,
                totalVoters: formattedVoters.length
            }
        })

    } catch (error) {
        console.error('獲取婚紗照投票者資訊錯誤:', error)
        return NextResponse.json(
            { error: '伺服器錯誤', details: error instanceof Error ? error.message : '未知錯誤' },
            { status: 500 }
        )
    }
}
