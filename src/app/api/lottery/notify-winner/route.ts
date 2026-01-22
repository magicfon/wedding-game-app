import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase-server'
import { Client } from '@line/bot-sdk'

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { lotteryId, winnerPhotoUrl } = body

        console.log('📨 收到發送通知請求:', { lotteryId, winnerPhotoUrl })

        if (!lotteryId) {
            console.error('❌ 缺少 lotteryId')
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

        // 檢查是否啟用中獎通知（如果欄位不存在或查詢失敗，預設為啟用）
        const { data: lotteryState, error: stateError } = await supabase
            .from('lottery_state')
            .select('notify_winner_enabled')
            .single()

        // 只有明確設定為 false 時才跳過通知
        const notifyEnabled = lotteryState?.notify_winner_enabled !== false
        console.log('📱 中獎通知設定:', { notifyEnabled, stateError: stateError?.message, rawValue: lotteryState?.notify_winner_enabled })

        if (!notifyEnabled) {
            console.log('⏭️ 中獎通知已關閉，跳過發送')
            return NextResponse.json({ success: true, skipped: true, message: '中獎通知已關閉' })
        }

        const winnerLineId = lotteryRecord.winner_line_id

        if (!winnerLineId) {
            console.error('❌ 找不到中獎者 LINE ID')
            return NextResponse.json({ error: 'Winner LINE ID not found' }, { status: 404 })
        }

        // 發送 LINE 通知
        console.log('🔑 檢查 LINE 設定:', {
            hasAccessToken: !!process.env.LINE_CHANNEL_ACCESS_TOKEN,
            hasChannelSecret: !!process.env.LINE_CHANNEL_SECRET
        })

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

            console.log('📨 準備發送 LINE 訊息給:', winnerLineId)

            if (winnerPhotoUrl) {
                try {
                    console.log('🖼️ 嘗試發送 Flex Message...')
                    // 發送 Flex Message 包含照片
                    await client.pushMessage(winnerLineId, {
                        type: 'flex',
                        altText: '🎉 恭喜您中獎！',
                        contents: {
                            type: 'bubble',
                            hero: {
                                type: 'image',
                                url: winnerPhotoUrl,
                                size: 'full',
                                aspectRatio: '20:13',
                                aspectMode: 'cover',
                                action: {
                                    type: 'uri',
                                    label: '查看照片',
                                    uri: winnerPhotoUrl
                                }
                            },
                            body: {
                                type: 'box',
                                layout: 'vertical',
                                contents: [
                                    {
                                        type: 'text',
                                        text: '🎉 恭喜您中獎！',
                                        weight: 'bold',
                                        size: 'xl',
                                        align: 'center',
                                        color: '#d32f2f'
                                    },
                                    {
                                        type: 'text',
                                        text: '您在照片抽獎活動中被選中！',
                                        margin: 'md',
                                        align: 'center',
                                        wrap: true
                                    },
                                    {
                                        type: 'separator',
                                        margin: 'lg'
                                    },
                                    {
                                        type: 'box',
                                        layout: 'vertical',
                                        margin: 'lg',
                                        contents: [
                                            {
                                                type: 'text',
                                                text: '中獎時間',
                                                size: 'xs',
                                                color: '#aaaaaa',
                                                align: 'center'
                                            },
                                            {
                                                type: 'text',
                                                text: timeString,
                                                size: 'sm',
                                                color: '#666666',
                                                align: 'center',
                                                margin: 'xs'
                                            }
                                        ]
                                    }
                                ]
                            }
                        }
                    })
                    console.log('✅ Flex Message 發送成功')
                } catch (flexError) {
                    console.error('❌ Flex Message 發送失敗，嘗試降級為純文字:', flexError)
                    // 降級發送純文字
                    await client.pushMessage(winnerLineId, {
                        type: 'text',
                        text: `🎉 恭喜您中獎！\n\n您在照片抽獎活動中被選中！\n\n中獎時間：${timeString}\n\n照片連結：${winnerPhotoUrl}`
                    })
                }
            } else {
                // 降級發送純文字
                await client.pushMessage(winnerLineId, {
                    type: 'text',
                    text: `🎉 恭喜您中獎！\n\n您在照片抽獎活動中被選中！\n\n中獎時間：${timeString}`
                })
            }

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
