import { NextResponse } from 'next/server'
import { messagingApi } from '@line/bot-sdk'
import { createSupabaseAdmin } from '@/lib/supabase-admin'

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

// POST: 為現有的 Rich Menus 創建/更新 Aliases
export async function POST() {
    try {
        const lineClient = getLineClient()
        const supabase = createSupabaseAdmin()

        if (!lineClient) {
            return NextResponse.json(
                { error: 'LINE client not configured' },
                { status: 500 }
            )
        }

        // 從資料庫獲取已註冊的 rich menu IDs
        const { data: registry, error: registryError } = await supabase
            .from('line_richmenu_registry')
            .select('menu_type, richmenu_id')

        if (registryError || !registry) {
            return NextResponse.json(
                { error: 'Failed to fetch registry' },
                { status: 500 }
            )
        }

        // 定義要創建的 aliases
        const aliasConfigs = [
            { aliasId: 'richmenu-alias-venue-info', menuType: 'venue_info' },
            { aliasId: 'richmenu-alias-activity', menuType: 'activity' }
        ]

        const results: Array<{ aliasId: string; success: boolean; error?: string }> = []

        for (const config of aliasConfigs) {
            const menuEntry = registry.find(r => r.menu_type === config.menuType)

            if (!menuEntry?.richmenu_id) {
                results.push({
                    aliasId: config.aliasId,
                    success: false,
                    error: `No ${config.menuType} menu found in registry`
                })
                continue
            }

            try {
                console.log(`🔗 Creating alias ${config.aliasId} for ${config.menuType}...`)

                // 先刪除舊的 alias（如果存在）
                try {
                    await lineClient.deleteRichMenuAlias(config.aliasId)
                    console.log(`🗑️ Deleted existing alias: ${config.aliasId}`)
                } catch (deleteErr: any) {
                    console.log(`⚠️ No existing alias to delete: ${config.aliasId}`)
                }

                // 創建新的 alias
                await lineClient.createRichMenuAlias({
                    richMenuAliasId: config.aliasId,
                    richMenuId: menuEntry.richmenu_id
                })
                console.log(`✅ Created alias: ${config.aliasId} -> ${menuEntry.richmenu_id}`)

                results.push({
                    aliasId: config.aliasId,
                    success: true
                })
            } catch (aliasError: any) {
                console.error(`❌ Error creating alias ${config.aliasId}:`, aliasError)
                results.push({
                    aliasId: config.aliasId,
                    success: false,
                    error: aliasError?.message || 'Unknown error'
                })
            }
        }

        const successCount = results.filter(r => r.success).length

        return NextResponse.json({
            success: successCount > 0,
            message: `Created ${successCount}/${aliasConfigs.length} aliases`,
            results
        })

    } catch (error: any) {
        console.error('Error creating aliases:', error)
        return NextResponse.json(
            { error: 'Internal server error', details: error?.message || 'Unknown error' },
            { status: 500 }
        )
    }
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
