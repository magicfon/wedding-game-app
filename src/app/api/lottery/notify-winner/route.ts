import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase-server'
import { Client } from '@line/bot-sdk'

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { lotteryId } = body

        if (!lotteryId) {
            return NextResponse.json({ error: 'Missing lotteryId' }, { status: 400 })
        }

        const supabase = await createSupabaseServer()

        // 獲取抽獎記錄
        const { data: lotteryRecord, error: fetchError } = await supabase
            .from('lottery_history')
            .select('*')
            .eq('id', lotteryId)
            .single()

        if (fetchError || !lotteryRecord) {
            console.error('❌ 獲取抽獎記錄失敗:', fetchError)
            return NextResponse.json({ error: 'Lottery record not found' }, { status: 404 })
        }

        const winnerLineId = lotteryRecord.winner_line_id

        if (!winnerLineId) {
            return NextResponse.json({ error: 'Winner LINE ID not found' }, { status: 404 })
        }

        // 發送 LINE 通知
        if (process.env.LINE_CHANNEL_ACCESS_TOKEN && process.env.LINE_CHANNEL_SECRET) {
            const client = new Client({
                channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
                channelSecret: process.env.LINE_CHANNEL_SECRET,
            })

            const now = new Date()
            const timeString = now.toLocaleString('zh-TW', {
                timeZone: 'Asia/Taipei',
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            })

            await client.pushMessage(winnerLineId, {
                type: 'text',
                text: `🎉 恭喜您中獎！\n\n您在照片抽獎活動中被選中！\n\n中獎時間：${timeString}`
            })
            console.log('✅ LINE 通知發送成功')

            return NextResponse.json({ success: true })
        } else {
            console.log('⚠️ 未設定 LINE Token，跳過通知')
            return NextResponse.json({ error: 'LINE configuration missing' }, { status: 500 })
        }

    } catch (error) {
        console.error('❌ 發送通知時發生錯誤:', error)
        return NextResponse.json({
            error: 'Internal server error',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 })
    }
}
