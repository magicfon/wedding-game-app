import { NextRequest, NextResponse } from 'next/server'
import { messagingApi } from '@line/bot-sdk'
import { createSupabaseAdmin } from '@/lib/supabase-admin'
import { Readable } from 'stream'

const { MessagingApiBlobClient, MessagingApiClient } = messagingApi
type RichMenuRequest = Parameters<InstanceType<typeof MessagingApiClient>['createRichMenu']>[0]

// 初始化 LINE Blob Client
function getLineBlobClient(): InstanceType<typeof MessagingApiBlobClient> | null {
    const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN
    if (!channelAccessToken) {
        console.error('LINE_CHANNEL_ACCESS_TOKEN not configured')
        return null
    }
    return new MessagingApiBlobClient({ channelAccessToken })
}

// 初始化 LINE Messaging API Client
function getLineApiClient(): InstanceType<typeof MessagingApiClient> | null {
    const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN
    if (!channelAccessToken) {
        console.error('LINE_CHANNEL_ACCESS_TOKEN not configured')
        return null
    }
    return new MessagingApiClient({ channelAccessToken })
}

// 將 Node.js Readable stream 轉換為 Buffer
async function streamToBuffer(stream: Readable): Promise<Buffer> {
    const chunks: Buffer[] = []
    for await (const chunk of stream) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
    }
    return Buffer.concat(chunks)
}

// POST: 編輯 Rich Menu
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { richMenuId, richMenuAliasId, config } = body

        // 驗證輸入
        if (!richMenuId) {
            return NextResponse.json(
                { error: 'richMenuId is required' },
                { status: 400 }
            )
        }

        if (!config) {
            return NextResponse.json(
                { error: 'config is required' },
                { status: 400 }
            )
        }

        const { name, chatBarText, selected, areas } = config

        // 驗證必要欄位
        if (!name || !chatBarText) {
            return NextResponse.json(
                { error: 'name and chatBarText are required in config' },
                { status: 400 }
            )
        }

        // 驗證 action 設定 - 確保 richmenuswitch 有 data 欄位
        if (areas && Array.isArray(areas)) {
            for (let i = 0; i < areas.length; i++) {
                const area = areas[i]
                if (area.action?.type === 'richmenuswitch') {
                    if (!area.action.richMenuAliasId) {
                        return NextResponse.json(
                            { error: `區域 ${i + 1}: richmenuswitch 類型需要提供 richMenuAliasId` },
                            { status: 400 }
                        )
                    }
                    if (!area.action.data) {
                        return NextResponse.json(
                            { error: `區域 ${i + 1}: richmenuswitch 類型需要提供 data 欄位` },
                            { status: 400 }
                        )
                    }
                }
                if (area.action?.type === 'uri' && !area.action.uri) {
                    return NextResponse.json(
                        { error: `區域 ${i + 1}: uri 類型需要提供 uri 網址` },
                        { status: 400 }
                    )
                }
                if (area.action?.type === 'postback' && !area.action.data) {
                    return NextResponse.json(
                        { error: `區域 ${i + 1}: postback 類型需要提供 data 欄位` },
                        { status: 400 }
                    )
                }
            }
        }

        const supabase = createSupabaseAdmin()
        const blobClient = getLineBlobClient()
        const apiClient = getLineApiClient()

        if (!blobClient || !apiClient) {
            return NextResponse.json(
                { error: 'LINE client configuration error' },
                { status: 500 }
            )
        }

        // 從資料庫獲取 Rich Menu 註冊資訊
        const { data: registryData, error: registryError } = await supabase
            .from('line_richmenu_registry')
            .select('menu_type, has_image')
            .eq('richmenu_id', richMenuId)
            .single()

        if (registryError) {
            console.log('⚠️ Rich menu not found in registry, will not update database')
        }

        let menuType = registryData?.menu_type || null
        const hasImage = registryData?.has_image || false

        // 嘗試從 Alias 推斷 menuType (如果資料庫找不到)
        if (!menuType) {
            try {
                const aliasList = await apiClient.getRichMenuAliasList()
                const alias = aliasList.aliases.find(a => a.richMenuId === richMenuId)
                if (alias) {
                    if (alias.richMenuAliasId === 'richmenu-alias-venue-info') menuType = 'venue_info'
                    if (alias.richMenuAliasId === 'richmenu-alias-activity') menuType = 'activity'
                }
            } catch (e) {
                console.warn('Failed to deduce menuType from alias:', e)
            }
        }

        console.log('📝 Editing rich menu:', richMenuId)
        console.log('📊 Menu type:', menuType)
        console.log('📊 Database has image:', hasImage)

        // 1. 嘗試下載現有圖片 (不依賴資料庫 has_image 狀態)
        let imageBuffer: Buffer | null = null
        try {
            console.log('📥 Attempting to download existing image...')
            const imageStream = await blobClient.getRichMenuImage(richMenuId)
            imageBuffer = await streamToBuffer(imageStream as unknown as Readable)
            console.log('✅ Image downloaded, size:', imageBuffer.length)
        } catch (downloadError: any) {
            // 404 表示沒有圖片，這是正常的
            if (downloadError.status === 404) {
                console.log('ℹ️ No existing image found (404)')
            } else {
                console.error('❌ Error downloading image:', downloadError)
            }
        }

        // 2. 檢查是否為預設 Rich Menu
        let isDefault = false
        try {
            const defaultMenuId = await apiClient.getDefaultRichMenuId()
            if (defaultMenuId === richMenuId) {
                isDefault = true
                console.log('🌟 This rich menu is the current default.')
            }
        } catch (e) {
            console.warn('Failed to check default rich menu:', e)
        }

        // 3. 刪除舊的 Rich Menu
        console.log('🗑️ Deleting old rich menu:', richMenuId)
        await apiClient.deleteRichMenu(richMenuId)
        console.log('✅ Old rich menu deleted')

        // 4. 建立新的 Rich Menu 配置
        const newMenuConfig: RichMenuRequest = {
            size: {
                width: 2500,
                height: 1686
            },
            selected: selected ?? true,
            name: name,
            chatBarText: chatBarText,
            areas: (areas || []).map((area: any) => ({
                bounds: {
                    x: area.bounds?.x || 0,
                    y: area.bounds?.y || 0,
                    width: area.bounds?.width || 0,
                    height: area.bounds?.height || 0
                },
                action: area.action
            }))
        }

        console.log('🏗️ Creating new rich menu with updated config...')
        const newRichMenuResponse = await apiClient.createRichMenu(newMenuConfig)
        const newRichMenuId = newRichMenuResponse.richMenuId
        console.log('✅ New rich menu created:', newRichMenuId)

        // 5. 如果原本是預設，則將新的設為預設
        if (isDefault) {
            try {
                await apiClient.setDefaultRichMenu(newRichMenuId)
                console.log('🌟 Restored default rich menu to:', newRichMenuId)
            } catch (e) {
                console.error('❌ Failed to restore default rich menu:', e)
            }
        }

        // 4. 如果有圖片，重新上傳
        if (imageBuffer) {
            try {
                console.log('📤 Re-uploading image to new rich menu...')
                const imageBlob = new Blob([new Uint8Array(imageBuffer)], { type: 'image/png' })
                await blobClient.setRichMenuImage(newRichMenuId, imageBlob)
                console.log('✅ Image re-uploaded successfully')
            } catch (uploadError) {
                console.error('❌ Error re-uploading image:', uploadError)
            }
        }

        // 5. 更新資料庫 - 刪除舊記錄，創建新記錄（保留 menu_type）
        // 先刪除舊的 registry 記錄
        await supabase
            .from('line_richmenu_registry')
            .delete()
            .eq('richmenu_id', richMenuId)

        // 創建新的 registry 記錄，保留 menu_type
        const { error: insertError } = await supabase
            .from('line_richmenu_registry')
            .insert({
                richmenu_id: newRichMenuId,
                name: name,
                menu_type: menuType, // 保留原本的 menu_type（可能是 null）
                has_image: !!imageBuffer,
                updated_at: new Date().toISOString()
            })

        if (insertError) {
            console.error('Error updating registry:', insertError)
        } else {
            console.log('✅ Database registry updated with new rich menu ID')
        }

        // 6. 處理 Rich Menu Alias - 更新所有指向舊 Rich Menu ID 的 alias
        let aliasUpdated = false
        const updatedAliases: string[] = []

        // 從 LINE API 查找所有指向舊 Rich Menu ID 的 alias
        try {
            const aliasList = await apiClient.getRichMenuAliasList()
            const aliasesPointingToOld = aliasList.aliases.filter(a => a.richMenuId === richMenuId)

            console.log(`🔍 Found ${aliasesPointingToOld.length} aliases pointing to old Rich Menu ID`)

            for (const alias of aliasesPointingToOld) {
                try {
                    console.log(`🔗 Updating alias ${alias.richMenuAliasId} to new Rich Menu ID...`)

                    // 刪除舊的 alias
                    await apiClient.deleteRichMenuAlias(alias.richMenuAliasId)
                    console.log(`🗑️ Deleted alias: ${alias.richMenuAliasId}`)

                    // 創建新的 alias 指向新的 Rich Menu ID
                    await apiClient.createRichMenuAlias({
                        richMenuAliasId: alias.richMenuAliasId,
                        richMenuId: newRichMenuId
                    })
                    console.log(`✅ Updated alias: ${alias.richMenuAliasId} -> ${newRichMenuId}`)
                    updatedAliases.push(alias.richMenuAliasId)
                    aliasUpdated = true
                } catch (aliasError: any) {
                    console.error(`❌ Error updating alias ${alias.richMenuAliasId}:`, aliasError)
                }
            }
        } catch (listError) {
            console.error('❌ Error fetching alias list:', listError)
        }

        // 如果有 menu_type 但沒有對應的 alias，也建立它
        if ((menuType === 'venue_info' || menuType === 'activity') && !aliasUpdated) {
            const aliasId = menuType === 'venue_info'
                ? 'richmenu-alias-venue-info'
                : 'richmenu-alias-activity'

            try {
                console.log(`🔗 Creating alias ${aliasId} for menu_type: ${menuType}...`)

                // 先嘗試刪除舊的 alias（如果存在）
                try {
                    await apiClient.deleteRichMenuAlias(aliasId)
                    console.log(`🗑️ Deleted existing alias: ${aliasId}`)
                } catch (deleteErr: any) {
                    // 忽略不存在的錯誤
                }

                // 創建新的 alias 指向新的 Rich Menu ID
                await apiClient.createRichMenuAlias({
                    richMenuAliasId: aliasId,
                    richMenuId: newRichMenuId
                })
                console.log(`✅ Created alias: ${aliasId} -> ${newRichMenuId}`)
                updatedAliases.push(aliasId)
                aliasUpdated = true
            } catch (aliasError: any) {
                console.error(`❌ Error creating alias ${aliasId}:`, aliasError)
            }
        }

        // 如果有傳入自訂的 richMenuAliasId，也處理它
        let customAliasCreated = false
        if (richMenuAliasId && richMenuAliasId.trim()) {
            try {
                console.log(`🔗 Creating/updating custom alias: ${richMenuAliasId}...`)

                // 先嘗試刪除舊的 alias
                try {
                    await apiClient.deleteRichMenuAlias(richMenuAliasId)
                    console.log(`🗑️ Deleted existing alias: ${richMenuAliasId}`)
                } catch (deleteErr: any) {
                    console.log(`⚠️ No existing alias to delete: ${richMenuAliasId}`)
                }

                // 創建新的 alias
                await apiClient.createRichMenuAlias({
                    richMenuAliasId: richMenuAliasId.trim(),
                    richMenuId: newRichMenuId
                })
                console.log(`✅ Created alias: ${richMenuAliasId} -> ${newRichMenuId}`)
                customAliasCreated = true
            } catch (aliasError: any) {
                console.error(`❌ Error creating alias ${richMenuAliasId}:`, aliasError)
            }
        }

        return NextResponse.json({
            success: true,
            message: 'Rich menu updated successfully',
            oldRichMenuId: richMenuId,
            newRichMenuId: newRichMenuId,
            menuType,
            imagePreserved: !!imageBuffer,
            aliasUpdated,
            customAliasCreated,
            richMenuAliasId: customAliasCreated ? richMenuAliasId : null
        })

    } catch (error) {
        console.error('Error in POST /api/admin/richmenu/edit:', error)
        return NextResponse.json(
            { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        )
    }
}

// GET: 獲取 Rich Menu 詳細資訊（用於編輯表單）
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const richMenuId = searchParams.get('richMenuId')

        if (!richMenuId) {
            return NextResponse.json(
                { error: 'richMenuId is required' },
                { status: 400 }
            )
        }

        const apiClient = getLineApiClient()

        if (!apiClient) {
            return NextResponse.json(
                { error: 'LINE client configuration error' },
                { status: 500 }
            )
        }

        console.log('📋 Fetching rich menu details:', richMenuId)

        // 從 LINE API 獲取 Rich Menu 詳細資訊
        const richMenu = await apiClient.getRichMenu(richMenuId)

        // 嘗試獲取指向此 Rich Menu 的 alias
        let richMenuAliasId: string | null = null
        try {
            const aliasListResponse = await apiClient.getRichMenuAliasList()
            const aliases = aliasListResponse.aliases || []
            const matchingAlias = aliases.find(alias => alias.richMenuId === richMenuId)
            if (matchingAlias) {
                richMenuAliasId = matchingAlias.richMenuAliasId
                console.log('📌 Found existing alias:', richMenuAliasId)
            }
        } catch (aliasError) {
            console.log('⚠️ Could not fetch aliases:', aliasError)
        }

        return NextResponse.json({
            success: true,
            richMenu: {
                richMenuId: richMenu.richMenuId,
                name: richMenu.name,
                chatBarText: richMenu.chatBarText,
                selected: richMenu.selected,
                size: richMenu.size,
                areas: richMenu.areas,
                richMenuAliasId: richMenuAliasId
            }
        })

    } catch (error) {
        console.error('Error in GET /api/admin/richmenu/edit:', error)
        return NextResponse.json(
            { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        )
    }
}
