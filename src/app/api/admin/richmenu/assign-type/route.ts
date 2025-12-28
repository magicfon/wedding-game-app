import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase-admin'
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

// POST: 設定或移除 Rich Menu 的 menu_type
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { richMenuId, menuType } = body

        // 驗證輸入
        if (!richMenuId) {
            return NextResponse.json(
                { error: 'richMenuId is required' },
                { status: 400 }
            )
        }

        // 驗證 menuType 值
        const validTypes = ['venue_info', 'activity', 'unavailable', null]
        if (!validTypes.includes(menuType)) {
            return NextResponse.json(
                { error: 'menuType must be one of: venue_info, activity, unavailable, or null' },
                { status: 400 }
            )
        }

        const supabase = createSupabaseAdmin()

        console.log(`🏷️ Assigning menu_type '${menuType}' to rich menu: ${richMenuId}`)

        // 1. 如果 menuType 不是 null，先將其他擁有該 menuType 的 Rich Menu 設為 null
        if (menuType !== null) {
            const { error: clearError } = await supabase
                .from('line_richmenu_registry')
                .update({ menu_type: null, updated_at: new Date().toISOString() })
                .eq('menu_type', menuType)
                .neq('richmenu_id', richMenuId)

            if (clearError) {
                console.error('Error clearing existing menu_type:', clearError)
            } else {
                console.log(`✅ Cleared existing '${menuType}' assignment`)
            }
        }

        // 2. 更新指定 Rich Menu 的 menu_type
        const { data, error: updateError } = await supabase
            .from('line_richmenu_registry')
            .update({
                menu_type: menuType,
                updated_at: new Date().toISOString()
            })
            .eq('richmenu_id', richMenuId)
            .select()
            .single()

        if (updateError) {
            console.error('Error updating menu_type:', updateError)
            return NextResponse.json(
                { error: 'Failed to update menu_type', details: updateError.message },
                { status: 500 }
            )
        }

        console.log(`✅ Updated rich menu ${richMenuId} with menu_type: ${menuType}`)

        // 3. 如果設定的是 'activity' 或 'venue_info'，更新對應的 alias
        let aliasUpdated = false
        if (menuType === 'venue_info' || menuType === 'activity') {
            const lineClient = getLineClient()
            if (lineClient) {
                const aliasId = menuType === 'venue_info'
                    ? 'richmenu-alias-venue-info'
                    : 'richmenu-alias-activity'

                try {
                    // 先嘗試刪除舊的 alias
                    try {
                        await lineClient.deleteRichMenuAlias(aliasId)
                        console.log(`🗑️ Deleted existing alias: ${aliasId}`)
                    } catch (deleteErr: any) {
                        console.log(`⚠️ No existing alias to delete: ${aliasId}`)
                    }

                    // 創建新的 alias
                    await lineClient.createRichMenuAlias({
                        richMenuAliasId: aliasId,
                        richMenuId: richMenuId
                    })
                    console.log(`✅ Created alias: ${aliasId} -> ${richMenuId}`)
                    aliasUpdated = true
                } catch (aliasError: any) {
                    console.error(`❌ Error updating alias ${aliasId}:`, aliasError)
                }
            }
        }

        return NextResponse.json({
            success: true,
            message: `Successfully assigned menu_type '${menuType}' to rich menu`,
            richMenuId,
            menuType,
            aliasUpdated,
            data
        })

    } catch (error) {
        console.error('Error in POST /api/admin/richmenu/assign-type:', error)
        return NextResponse.json(
            { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        )
    }
}

// GET: 獲取目前各 menu_type 的分配狀態
export async function GET(request: NextRequest) {
    try {
        const supabase = createSupabaseAdmin()

        // 獲取所有有 menu_type 的 Rich Menu
        const { data, error } = await supabase
            .from('line_richmenu_registry')
            .select('*')
            .not('menu_type', 'is', null)
            .order('menu_type')

        if (error) {
            console.error('Error fetching menu_type assignments:', error)
            return NextResponse.json(
                { error: 'Failed to fetch menu_type assignments' },
                { status: 500 }
            )
        }

        // 組織成 menu_type -> richMenuInfo 的對應
        const assignments: Record<string, any> = {
            venue_info: null,
            activity: null,
            unavailable: null
        }

        data?.forEach(item => {
            if (item.menu_type) {
                assignments[item.menu_type] = {
                    richMenuId: item.richmenu_id,
                    name: item.name,
                    hasImage: item.has_image
                }
            }
        })

        return NextResponse.json({
            success: true,
            assignments
        })

    } catch (error) {
        console.error('Error in GET /api/admin/richmenu/assign-type:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
