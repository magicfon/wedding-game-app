import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase-admin'

export async function POST(request: NextRequest) {
    console.log('=== 重置所有投票 API 開始 ===')

    try {
        const supabaseAdmin = createSupabaseAdmin()

        // 獲取投票統計（用於回報）
        const { data: votesBefore, error: countError } = await supabaseAdmin
            .from('votes')
            .select('id', { count: 'exact' })

        const totalVotesBefore = votesBefore?.length || 0
        console.log('votes 表重置前總投票數:', totalVotesBefore)

        // 獲取 photo_votes 表的統計
        const { data: photoVotesBefore } = await supabaseAdmin
            .from('photo_votes')
            .select('id', { count: 'exact' })

        const totalPhotoVotesBefore = photoVotesBefore?.length || 0
        console.log('photo_votes 表重置前總投票數:', totalPhotoVotesBefore)

        // 刪除 votes 表的所有投票記錄
        const { error: deleteVotesError } = await supabaseAdmin
            .from('votes')
            .delete()
            .neq('id', 0) // 這是一個技巧，用來刪除所有記錄

        if (deleteVotesError) {
            console.error('刪除 votes 投票記錄失敗:', deleteVotesError)
            return NextResponse.json(
                { error: '刪除 votes 投票記錄失敗', details: deleteVotesError.message },
                { status: 500 }
            )
        }

        console.log('votes 表投票記錄已全部刪除')

        // 刪除 photo_votes 表的所有投票記錄（如果表存在）
        const { error: deletePhotoVotesError } = await supabaseAdmin
            .from('photo_votes')
            .delete()
            .neq('id', 0)

        if (deletePhotoVotesError) {
            // 如果是表不存在的錯誤，忽略
            if (!deletePhotoVotesError.message.includes('does not exist')) {
                console.error('刪除 photo_votes 投票記錄失敗:', deletePhotoVotesError)
                return NextResponse.json(
                    { error: '刪除 photo_votes 投票記錄失敗', details: deletePhotoVotesError.message },
                    { status: 500 }
                )
            }
        } else {
            console.log('photo_votes 表投票記錄已全部刪除')
        }

        // 將所有照片的 vote_count 重置為 0
        const { error: resetPhotosError } = await supabaseAdmin
            .from('photos')
            .update({ vote_count: 0 })
            .neq('id', 0) // 更新所有記錄

        if (resetPhotosError) {
            console.error('重置照片投票數失敗:', resetPhotosError)
            return NextResponse.json(
                { error: '重置照片投票數失敗', details: resetPhotosError.message },
                { status: 500 }
            )
        }

        console.log('照片投票數已全部重置為 0')

        return NextResponse.json({
            success: true,
            message: `已成功重置所有投票`,
            deletedVotes: totalVotesBefore,
            deletedPhotoVotes: totalPhotoVotesBefore,
            totalDeleted: totalVotesBefore + totalPhotoVotesBefore
        })

    } catch (error) {
        console.error('重置投票失敗:', error)
        return NextResponse.json(
            { error: '伺服器錯誤', details: error instanceof Error ? error.message : String(error) },
            { status: 500 }
        )
    }
}
