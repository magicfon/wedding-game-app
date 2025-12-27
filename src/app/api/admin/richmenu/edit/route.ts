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

        const menuType = registryData?.menu_type || null
        const hasImage = registryData?.has_image || false

        console.log('📝 Editing rich menu:', richMenuId)
        console.log('📊 Menu type:', menuType)
        console.log('📊 Has image:', hasImage)

        // 1. 如果有圖片，先下載圖片
        let imageBuffer: Buffer | null = null
        if (hasImage) {
            try {
                console.log('📥 Downloading existing image...')
                const imageStream = await blobClient.getRichMenuImage(richMenuId)
                imageBuffer = await streamToBuffer(imageStream as unknown as Readable)
                console.log('✅ Image downloaded, size:', imageBuffer.length)
            } catch (downloadError) {
                console.error('❌ Error downloading image:', downloadError)
                // 繼續執行，只是沒有圖片
            }
        }

        // 2. 刪除舊的 Rich Menu
        console.log('🗑️ Deleting old rich menu:', richMenuId)
        await apiClient.deleteRichMenu(richMenuId)
        console.log('✅ Old rich menu deleted')

        // 3. 建立新的 Rich Menu 配置
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

        // 5. 更新資料庫
        if (menuType) {
            const updateData: any = {
                richmenu_id: newRichMenuId,
                updated_at: new Date().toISOString()
            }

            // 如果成功保留了圖片，確保 has_image 為 true
            if (imageBuffer) {
                updateData.has_image = true
            }

            const { error: updateError } = await supabase
                .from('line_richmenu_registry')
                .update(updateData)
                .eq('menu_type', menuType)

            if (updateError) {
                console.error('Error updating registry:', updateError)
            } else {
                console.log('✅ Database registry updated')
            }
        }

        // 6. 處理 Rich Menu Alias
        let aliasCreated = false
        if (richMenuAliasId && richMenuAliasId.trim()) {
            try {
                console.log(`🔗 Creating/updating alias: ${richMenuAliasId}...`)

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
                aliasCreated = true
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
            aliasCreated,
            richMenuAliasId: aliasCreated ? richMenuAliasId : null
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
