import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// 使用 service role key 繞過 RLS
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request) {
    try {
        const { photoId, voterLineId, action } = await request.json()

        if (!photoId || !voterLineId) {
            return NextResponse.json({
                success: false,
                error: '缺少必要參數'
            }, { status: 400 })
        }

        // 檢查投票設定
        const { data: gameState, error: gameStateError } = await supabaseAdmin
            .from('game_state')
            .select('voting_enabled, votes_per_user')
            .single()

        if (gameStateError) throw gameStateError

        if (!gameState.voting_enabled) {
            return NextResponse.json({
                success: false,
                error: '投票功能目前已關閉'
            }, { status: 400 })
        }

        if (action === 'unvote') {
            // 取消投票
            const { error: deleteError } = await supabaseAdmin
                .from('wedding_photo_votes')
                .delete()
                .eq('photo_id', photoId)
                .eq('voter_line_id', voterLineId)

            if (deleteError) throw deleteError

            // 更新照片票數 - 使用 RPC 或直接計算
            const { count, error: countError } = await supabaseAdmin
                .from('wedding_photo_votes')
                .select('*', { count: 'exact', head: true })
                .eq('photo_id', photoId)

            if (countError) throw countError

            return NextResponse.json({
                success: true,
                data: {
                    action: 'unvote',
                    photoId,
                    newVoteCount: count || 0
                }
            })
        } else {
            // 投票
            // 先檢查用戶已投票數
            const { count: existingVotes, error: countError } = await supabaseAdmin
                .from('wedding_photo_votes')
                .select('*', { count: 'exact', head: true })
                .eq('voter_line_id', voterLineId)

            if (countError) throw countError

            if ((existingVotes || 0) >= gameState.votes_per_user) {
                return NextResponse.json({
                    success: false,
                    error: '投票額度已用完'
                }, { status: 400 })
            }

            // 檢查是否已投過此照片
            const { data: existingVote, error: existingError } = await supabaseAdmin
                .from('wedding_photo_votes')
                .select('id')
                .eq('photo_id', photoId)
                .eq('voter_line_id', voterLineId)
                .single()

            if (existingError && existingError.code !== 'PGRST116') {
                throw existingError
            }

            if (existingVote) {
                return NextResponse.json({
                    success: false,
                    error: '您已經投過這張照片了'
                }, { status: 400 })
            }

            // 新增投票記錄
            const { error: insertError } = await supabaseAdmin
                .from('wedding_photo_votes')
                .insert({
                    photo_id: photoId,
                    voter_line_id: voterLineId
                })

            if (insertError) throw insertError

            // 計算新的票數
            const { count: newCount, error: newCountError } = await supabaseAdmin
                .from('wedding_photo_votes')
                .select('*', { count: 'exact', head: true })
                .eq('photo_id', photoId)

            if (newCountError) throw newCountError

            return NextResponse.json({
                success: true,
                data: {
                    action: 'vote',
                    photoId,
                    newVoteCount: newCount || 0
                }
            })
        }
    } catch (error) {
        console.error('Wedding photo vote error:', error)
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : '投票失敗'
        }, { status: 500 })
    }
}
