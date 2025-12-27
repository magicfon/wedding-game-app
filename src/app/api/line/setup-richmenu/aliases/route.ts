import { NextResponse } from 'next/server'
import { messagingApi } from '@line/bot-sdk'

const { MessagingApiClient } = messagingApi

// 初始化 LINE Messaging API Client
function getLineClient(): InstanceType<typeof MessagingApiClient> | null {
    const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN
    if (!channelAccessToken) {
        console.error('LINE_CHANNEL_ACCESS_TOKEN not configured')
        return null
    }
    return new MessagingApiClient({ channelAccessToken })
}

// GET: 獲取所有 Rich Menu Aliases
export async function GET() {
    try {
        const lineClient = getLineClient()

        if (!lineClient) {
            return NextResponse.json(
                { error: 'LINE client not configured' },
                { status: 500 }
            )
        }

        // 獲取所有 aliases
        const aliasListResponse = await lineClient.getRichMenuAliasList()
        const aliases = aliasListResponse.aliases || []

        return NextResponse.json({
            success: true,
            aliases: aliases.map((alias: any) => ({
                aliasId: alias.richMenuAliasId,
                richMenuId: alias.richMenuId
            }))
        })

    } catch (error: any) {
        console.error('Error fetching rich menu aliases:', error)
        return NextResponse.json(
            { error: 'Failed to fetch aliases', details: error?.message || 'Unknown error' },
            { status: 500 }
        )
    }
}
