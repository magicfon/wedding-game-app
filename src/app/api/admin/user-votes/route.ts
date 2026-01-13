import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase-admin'

export async function GET(request: NextRequest) {
    try {
        const supabaseAdmin = createSupabaseAdmin()

        console.log(`=== 獲取所有用戶投票記錄 ===`)

        // 1. 獲取所有用戶
        const { data: users, error: usersError } = await supabaseAdmin
            .from('users')
            .select('line_id, display_name, avatar_url')
            .order('display_name', { ascending: true })

        if (usersError) {
            console.error('獲取用戶失敗:', usersError)
            return NextResponse.json(
                { error: '獲取用戶失敗', details: usersError.message },
                { status: 500 }
            )
        }

        if (!users || users.length === 0) {
            return NextResponse.json({
                success: true,
                data: { users: [] }
            })
        }

        // 2. 獲取照片牆投票記錄
        const { data: photoVotes, error: photoVotesError } = await supabaseAdmin
            .from('photo_votes')
            .select(`
                voter_id,
                photo_id,
                created_at,
                photos:photo_id (
                    id,
                    image_url,
                    thumbnail_small_url,
                    thumbnail_medium_url
                )
            `)
            .order('created_at', { ascending: false })

        if (photoVotesError) {
            console.error('獲取照片牆投票失敗:', photoVotesError)
        }

        // 3. 獲取婚紗照投票記錄
        const { data: weddingVotes, error: weddingVotesError } = await supabaseAdmin
            .from('wedding_photo_votes')
            .select('voter_line_id, photo_id, created_at')
            .order('created_at', { ascending: false })

        if (weddingVotesError) {
            console.error('獲取婚紗照投票失敗:', weddingVotesError)
        }

        // 4. 建立用戶投票映射
        const photoVotesByUser = new Map<string, Array<{
            photoId: number
            thumbnailUrl: string | null
            votedAt: string
        }>>()

        const weddingVotesByUser = new Map<string, Array<{
            photoId: string
            votedAt: string
        }>>()

        // 處理照片牆投票
        if (photoVotes) {
            for (const vote of photoVotes) {
                const userId = vote.voter_id
                if (!photoVotesByUser.has(userId)) {
                    photoVotesByUser.set(userId, [])
                }
                // Supabase foreign key join returns the related record
                const photo = vote.photos as unknown as { id: number; image_url: string; thumbnail_small_url?: string; thumbnail_medium_url?: string } | null
                photoVotesByUser.get(userId)!.push({
                    photoId: vote.photo_id,
                    thumbnailUrl: photo?.thumbnail_small_url || photo?.thumbnail_medium_url || photo?.image_url || null,
                    votedAt: vote.created_at
                })
            }
        }

        // 處理婚紗照投票
        if (weddingVotes) {
            for (const vote of weddingVotes) {
                const userId = vote.voter_line_id
                if (!weddingVotesByUser.has(userId)) {
                    weddingVotesByUser.set(userId, [])
                }
                weddingVotesByUser.get(userId)!.push({
                    photoId: vote.photo_id,
                    votedAt: vote.created_at
                })
            }
        }

        // 5. 組合用戶資料
        const usersWithVotes = users.map(user => ({
            lineId: user.line_id,
            displayName: user.display_name,
            avatarUrl: user.avatar_url,
            photoWallVotes: photoVotesByUser.get(user.line_id) || [],
            weddingPhotoVotes: weddingVotesByUser.get(user.line_id) || []
        }))

        // 過濾出有投票記錄的用戶，並按總投票數排序
        const usersWithAnyVotes = usersWithVotes
            .filter(u => u.photoWallVotes.length > 0 || u.weddingPhotoVotes.length > 0)
            .sort((a, b) => {
                const totalA = a.photoWallVotes.length + a.weddingPhotoVotes.length
                const totalB = b.photoWallVotes.length + b.weddingPhotoVotes.length
                return totalB - totalA
            })

        console.log(`找到 ${usersWithAnyVotes.length} 個有投票記錄的用戶`)

        return NextResponse.json({
            success: true,
            data: {
                users: usersWithAnyVotes,
                totalUsers: usersWithAnyVotes.length
            }
        })

    } catch (error) {
        console.error('獲取用戶投票記錄錯誤:', error)
        return NextResponse.json(
            { error: '伺服器錯誤', details: error instanceof Error ? error.message : '未知錯誤' },
            { status: 500 }
        )
    }
}
