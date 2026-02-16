import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const maxDuration = 30

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
)

const GOOGLE_DRIVE_FOLDER_ID = '1ONhhVIoewh3he9mT4ie0llGi_urQh5Kw'

export async function GET() {
    try {
        // 1. 用戶
        const { data: users } = await supabaseAdmin
            .from('users').select('*').order('total_score', { ascending: false })

        // 2. 照片 + 上傳者
        const { data: rawPhotos } = await supabaseAdmin
            .from('photos')
            .select(`
        id, image_url, blessing_message, is_public, vote_count,
        created_at, media_type, user_id,
        uploader:users!photos_user_id_fkey(display_name, avatar_url)
      `)
            .order('created_at', { ascending: false })

        const photos = (rawPhotos || []).map((p: any) => {
            const uploader = Array.isArray(p.uploader) ? p.uploader[0] : p.uploader
            return {
                ...p,
                uploader_name: uploader?.display_name || '匿名',
                uploader_avatar: uploader?.avatar_url || '',
            }
        })

        // 3. 問題
        const { data: questions } = await supabaseAdmin
            .from('questions').select('*').order('display_order', { ascending: true })

        // 4. 答題記錄
        const { data: rawAnswers } = await supabaseAdmin
            .from('answer_records')
            .select(`*, user:users!answer_records_user_line_id_fkey(display_name, avatar_url)`)
            .order('created_at', { ascending: false })

        const answerRecords = (rawAnswers || []).map((r: any) => ({
            ...r, user: Array.isArray(r.user) ? r.user[0] : r.user
        }))

        // 5. 遊戲狀態
        const { data: gameState } = await supabaseAdmin.from('game_state').select('*').single()

        // 6. 抽獎歷史
        const { data: lotteryHistory } = await supabaseAdmin
            .from('lottery_history').select('*').order('draw_time', { ascending: false })

        // 7. 照片投票紀錄
        const { data: rawPhotoVotes } = await supabaseAdmin
            .from('votes')
            .select(`id, photo_id, voter_line_id, created_at,
        voter:users!votes_voter_line_id_fkey(display_name, avatar_url)`)
            .order('created_at', { ascending: false })

        const photoVotes = (rawPhotoVotes || []).map((v: any) => ({
            ...v, voter: Array.isArray(v.voter) ? v.voter[0] : v.voter
        }))

        // 8. 婚紗照投票紀錄
        const { data: rawWeddingVotes } = await supabaseAdmin
            .from('wedding_photo_votes')
            .select(`id, photo_id, voter_line_id, created_at`)
            .order('created_at', { ascending: false })

        const userMap = new Map((users || []).map((u: any) => [u.line_id, u]))
        const weddingVotes = (rawWeddingVotes || []).map((v: any) => ({
            ...v,
            voter: userMap.get(v.voter_line_id)
                ? { display_name: userMap.get(v.voter_line_id).display_name, avatar_url: userMap.get(v.voter_line_id).avatar_url }
                : null
        }))

        // 9. 婚紗照（從 Google Drive）
        let weddingPhotos: any[] = []
        try {
            const folderUrl = `https://drive.google.com/embeddedfolderview?id=${GOOGLE_DRIVE_FOLDER_ID}#grid`
            const response = await fetch(folderUrl, {
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
            })
            if (response.ok) {
                const html = await response.text()
                const fileIds: string[] = []
                const regex1 = /data-id="([a-zA-Z0-9_-]+)"/g
                let match
                while ((match = regex1.exec(html)) !== null) {
                    if (match[1] && !fileIds.includes(match[1]) && match[1] !== GOOGLE_DRIVE_FOLDER_ID) fileIds.push(match[1])
                }
                const regex2 = /\/d\/([a-zA-Z0-9_-]+)\//g
                while ((match = regex2.exec(html)) !== null) {
                    if (match[1] && !fileIds.includes(match[1]) && match[1] !== GOOGLE_DRIVE_FOLDER_ID) fileIds.push(match[1])
                }

                const voteCounts: Record<string, number> = {}
                weddingVotes.forEach((v: any) => { voteCounts[v.photo_id] = (voteCounts[v.photo_id] || 0) + 1 })

                weddingPhotos = fileIds.map((id, index) => ({
                    id, name: `婚紗照 ${index + 1}`,
                    url: `https://drive.google.com/thumbnail?id=${id}&sz=w1920`,
                    vote_count: voteCounts[id] || 0
                }))
            }
        } catch { /* ignore */ }

        return NextResponse.json({
            users: users || [],
            photos,
            questions: questions || [],
            answerRecords,
            gameState,
            lotteryHistory: lotteryHistory || [],
            photoVotes,
            weddingVotes,
            weddingPhotos,
        })
    } catch (error) {
        console.error('[export-data] Error:', error)
        return NextResponse.json(
            { error: '抓取資料失敗', details: error instanceof Error ? error.message : '未知錯誤' },
            { status: 500 }
        )
    }
}
