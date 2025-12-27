import { NextRequest, NextResponse } from 'next/server'
import { messagingApi } from '@line/bot-sdk'
import { createSupabaseAdmin } from '@/lib/supabase-admin'

const { MessagingApiBlobClient, MessagingApiClient } = messagingApi
type RichMenuRequest = Parameters<InstanceType<typeof MessagingApiClient>['createRichMenu']>[0]

// 初始化 LINE Blob Client (用於圖片上傳)
function getLineBlobClient(): InstanceType<typeof MessagingApiBlobClient> | null {
  const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN
  if (!channelAccessToken) {
    console.error('LINE_CHANNEL_ACCESS_TOKEN not configured')
    return null
  }
  return new MessagingApiBlobClient({ channelAccessToken })
}

// 初始化 LINE Messaging API Client (用於 Rich Menu 管理)
function getLineApiClient(): InstanceType<typeof MessagingApiClient> | null {
  const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN
  if (!channelAccessToken) {
    console.error('LINE_CHANNEL_ACCESS_TOKEN not configured')
    return null
  }
  return new MessagingApiClient({ channelAccessToken })
}

// 獲取 LIFF ID
function getLiffId(): string {
  const liffId = process.env.NEXT_PUBLIC_LIFF_ID
  if (!liffId) {
    throw new Error('NEXT_PUBLIC_LIFF_ID not configured')
  }
  return liffId
}

// 創建會場資訊分頁 Rich Menu 配置
function createVenueInfoRichMenu(liffId: string): RichMenuRequest {
  return {
    size: {
      width: 2500,
      height: 1686
    },
    selected: true,
    name: "婚禮遊戲 - 會場資訊",
    chatBarText: "會場資訊",
    areas: [
      {
        bounds: { x: 0, y: 0, width: 1250, height: 843 },
        action: {
          type: "uri" as const,
          uri: `https://liff.line.me/${liffId}/venue-info/transport`,
          label: "交通資訊"
        }
      },
      {
        bounds: { x: 1250, y: 0, width: 1250, height: 843 },
        action: {
          type: "uri" as const,
          uri: `https://liff.line.me/${liffId}/venue-info/menu`,
          label: "菜單"
        }
      },
      {
        bounds: { x: 0, y: 843, width: 1250, height: 843 },
        action: {
          type: "uri" as const,
          uri: `https://liff.line.me/${liffId}/venue-info/table`,
          label: "桌次"
        }
      },
      {
        bounds: { x: 1250, y: 843, width: 1250, height: 843 },
        action: {
          type: "richmenuswitch" as const,
          richMenuAliasId: "richmenu-alias-activity",
          data: "switch_tab:activity"
        }
      }
    ]
  }
}

// 創建現場活動分頁 Rich Menu 配置
function createActivityRichMenu(liffId: string): RichMenuRequest {
  return {
    size: {
      width: 2500,
      height: 1686
    },
    selected: true,
    name: "婚禮遊戲 - 現場活動",
    chatBarText: "現場活動",
    areas: [
      {
        bounds: { x: 0, y: 0, width: 1250, height: 843 },
        action: {
          type: "uri" as const,
          uri: `https://liff.line.me/${liffId}/photo-upload`,
          label: "照片上傳"
        }
      },
      {
        bounds: { x: 1250, y: 0, width: 1250, height: 843 },
        action: {
          type: "uri" as const,
          uri: `https://liff.line.me/${liffId}/photo-wall`,
          label: "祝福照片牆"
        }
      },
      {
        bounds: { x: 0, y: 843, width: 1250, height: 843 },
        action: {
          type: "uri" as const,
          uri: `https://liff.line.me/${liffId}/quiz`,
          label: "快問快答"
        }
      },
      {
        bounds: { x: 1250, y: 843, width: 1250, height: 843 },
        action: {
          type: "richmenuswitch" as const,
          richMenuAliasId: "richmenu-alias-venue-info",
          data: "switch_tab:venue_info"
        }
      }
    ]
  }
}

// 創建未開放分頁 Rich Menu 配置
function createUnavailableRichMenu(): RichMenuRequest {
  return {
    size: {
      width: 2500,
      height: 1686
    },
    selected: true,
    name: "婚禮遊戲 - 未開放",
    chatBarText: "未開放",
    areas: [
      {
        bounds: { x: 1250, y: 843, width: 1250, height: 843 },
        action: {
          type: "richmenuswitch" as const,
          richMenuAliasId: "richmenu-alias-venue-info",
          data: "switch_tab:venue_info"
        }
      }
    ]
  }
}

// 根據 menu type 獲取對應的 Rich Menu 配置
function getRichMenuConfig(menuType: string, liffId: string) {
  switch (menuType) {
    case 'venue_info':
      return createVenueInfoRichMenu(liffId)
    case 'activity':
      return createActivityRichMenu(liffId)
    case 'unavailable':
      return createUnavailableRichMenu()
    default:
      throw new Error(`Unknown menu type: ${menuType}`)
  }
}

// 驗證圖片尺寸
function validateImageDimensions(
  width: number,
  height: number
): boolean {
  return width === 2500 && height === 1686
}

// POST: 上傳 Rich Menu 圖片
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('image') as File
    const menuType = formData.get('menuType') as string | null
    const inputRichMenuId = formData.get('richMenuId') as string | null

    // 驗證輸入
    if (!file) {
      return NextResponse.json(
        { error: 'Image file is required' },
        { status: 400 }
      )
    }

    // 必須提供 menuType 或 richMenuId 其中之一
    if (!menuType && !inputRichMenuId) {
      return NextResponse.json(
        { error: 'Either menuType or richMenuId is required' },
        { status: 400 }
      )
    }

    if (menuType && !['venue_info', 'activity', 'unavailable'].includes(menuType)) {
      return NextResponse.json(
        { error: 'Invalid menu type' },
        { status: 400 }
      )
    }

    // 驗證檔案類型
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'File must be an image' },
        { status: 400 }
      )
    }

    const supabase = createSupabaseAdmin()

    let richMenuId: string
    let registryMenuType: string | null = menuType
    let hasExistingImage = false

    if (inputRichMenuId) {
      // 直接使用傳入的 richMenuId，從資料庫查找對應資訊
      const { data: registryData, error: registryError } = await supabase
        .from('line_richmenu_registry')
        .select('richmenu_id, menu_type, has_image')
        .eq('richmenu_id', inputRichMenuId)
        .single()

      if (registryError || !registryData) {
        // 如果資料庫中沒有這個 richMenuId，可能是未註冊的 rich menu
        // 仍然嘗試上傳，但不會更新資料庫
        console.log('⚠️ Rich menu not found in registry, uploading directly:', inputRichMenuId)
        richMenuId = inputRichMenuId
      } else {
        richMenuId = registryData.richmenu_id
        registryMenuType = registryData.menu_type
        hasExistingImage = registryData.has_image || false
      }
    } else {
      // 使用 menuType 查找
      const { data: registryData, error: registryError } = await supabase
        .from('line_richmenu_registry')
        .select('richmenu_id, has_image')
        .eq('menu_type', menuType)
        .single()

      if (registryError || !registryData) {
        return NextResponse.json(
          { error: 'Rich menu not found for this menu type. Please create the rich menu first using /api/line/setup-richmenu' },
          { status: 404 }
        )
      }
      richMenuId = registryData.richmenu_id
      hasExistingImage = registryData.has_image || false
    }

    // 驗證圖片尺寸
    const imageBuffer = await file.arrayBuffer()

    // 使用 sharp 來驗證圖片尺寸
    let imageWidth = 0
    let imageHeight = 0

    try {
      const sharp = (await import('sharp')).default
      const metadata = await sharp(Buffer.from(imageBuffer)).metadata()
      imageWidth = metadata.width || 0
      imageHeight = metadata.height || 0
      console.log('📐 Image dimensions:', imageWidth, 'x', imageHeight)
    } catch (sharpError) {
      console.warn('⚠️ Sharp not available, skipping dimension check:', sharpError)
    }

    if (imageWidth > 0 && imageHeight > 0) {
      if (!validateImageDimensions(imageWidth, imageHeight)) {
        return NextResponse.json(
          { error: `Image dimensions must be 2500x1686px, got ${imageWidth}x${imageHeight}px` },
          { status: 400 }
        )
      }
    }

    const blobClient = getLineBlobClient()
    const apiClient = getLineApiClient()

    if (!blobClient || !apiClient) {
      return NextResponse.json(
        { error: 'LINE client configuration error' },
        { status: 500 }
      )
    }

    console.log('📤 Uploading image to rich menu:', richMenuId, '(menu type:', registryMenuType + ')')
    console.log('📊 Image size:', imageBuffer.byteLength, 'bytes')
    console.log('📊 Image type:', file.type)
    console.log('📊 Has existing image:', hasExistingImage)

    // 準備圖片 Blob
    const imageBlob = new Blob([imageBuffer], { type: file.type })

    // 嘗試上傳圖片到 Rich Menu
    try {
      console.log('📤 First attempt: Calling setRichMenuImage')
      console.log('  - richMenuId:', richMenuId)
      console.log('  - blob size:', imageBlob.size)

      await blobClient.setRichMenuImage(richMenuId, imageBlob)
      console.log('✅ Image uploaded successfully (first attempt)')
    } catch (uploadError: any) {
      console.error('❌ First attempt failed:', uploadError)

      // 檢查是否是「圖片已存在」錯誤
      const errorBody = uploadError?.body || ''
      const isImageAlreadyExists =
        errorBody.includes('An image has already been uploaded') ||
        (uploadError.status === 400 && hasExistingImage)

      if (isImageAlreadyExists) {
        console.log('🔄 Rich menu already has an image. Recreating while preserving parameters...')

        try {
          // 1. 獲取現有的 Rich Menu 配置和 Alias
          console.log('📋 Fetching existing rich menu config...')
          const existingMenu = await apiClient.getRichMenu(richMenuId)

          // 查找指向此 Menu 的 Alias
          let existingAliasId: string | null = null
          try {
            const aliasList = await apiClient.getRichMenuAliasList()
            const alias = aliasList.aliases.find(a => a.richMenuId === richMenuId)
            if (alias) {
              existingAliasId = alias.richMenuAliasId
              console.log('🔗 Found existing alias:', existingAliasId)
            }
          } catch (err) {
            console.warn('⚠️ Failed to fetch aliases (continuing):', err)
          }

          // 1.5 檢查是否為預設 Rich Menu
          let isDefault = false
          try {
            const defaultMenuId = await apiClient.getDefaultRichMenuId()
            if (defaultMenuId.richMenuId === richMenuId) {
              isDefault = true
              console.log('🌟 This rich menu is the current default.')
            }
          } catch (e) {
            console.warn('Failed to check default rich menu:', e)
          }

          // 2. 刪除舊的 Rich Menu
          console.log('🗑️ Deleting old rich menu:', richMenuId)
          await apiClient.deleteRichMenu(richMenuId)
          console.log('✅ Old rich menu deleted')

          // 3. 創建新的 Rich Menu (使用原有配置)
          const menuConfig: RichMenuRequest = {
            size: existingMenu.size,
            selected: existingMenu.selected,
            name: existingMenu.name,
            chatBarText: existingMenu.chatBarText,
            areas: existingMenu.areas
          }

          console.log('📝 Creating new rich menu with preserved config...')
          const newRichMenuResponse = await apiClient.createRichMenu(menuConfig)
          const newRichMenuId = newRichMenuResponse.richMenuId
          console.log('✅ New rich menu created:', newRichMenuId)

          // 4. 上傳圖片到新的 Rich Menu
          console.log('📤 Uploading image to new rich menu...')
          await blobClient.setRichMenuImage(newRichMenuId, imageBlob)
          console.log('✅ Image uploaded to new rich menu')

          // 5. 更新資料庫 (如果該 Menu 有在 registry 中)
          if (registryMenuType) {
            const { error: updateError } = await supabase
              .from('line_richmenu_registry')
              .update({
                richmenu_id: newRichMenuId,
                has_image: true,
                updated_at: new Date().toISOString()
              })
              .eq('menu_type', registryMenuType)

            if (updateError) {
              console.error('Error updating registry:', updateError)
            } else {
              console.log('✅ Database registry updated')
            }
          }

          // 6. 恢復 Rich Menu Alias
          if (existingAliasId) {
            try {
              console.log(`🔗 Restoring alias ${existingAliasId} to new rich menu...`)

              // 先嘗試刪除舊的 alias (雖然 rich menu 刪除後 alias 應該會自動無效，但為了確保乾淨還是顯式刪除)
              try {
                await apiClient.deleteRichMenuAlias(existingAliasId)
              } catch (deleteErr) {
                // Ignore
              }

              // 創建新的 alias
              await apiClient.createRichMenuAlias({
                richMenuAliasId: existingAliasId,
                richMenuId: newRichMenuId
              })
              console.log(`✅ Restored alias: ${existingAliasId} -> ${newRichMenuId}`)
            } catch (aliasError: any) {
              console.error(`❌ Error restoring alias ${existingAliasId}:`, aliasError)
            }
          } else if (registryMenuType) {
            // 如果沒有找到現有 alias，但知道 menu type，嘗試根據規則建立預設 alias
            const defaultAliasId = registryMenuType === 'venue_info'
              ? 'richmenu-alias-venue-info'
              : registryMenuType === 'activity'
                ? 'richmenu-alias-activity'
                : null

            if (defaultAliasId) {
              try {
                await apiClient.createRichMenuAlias({
                  richMenuAliasId: defaultAliasId,
                  richMenuId: newRichMenuId
                })
                console.log(`✅ Created default alias: ${defaultAliasId} -> ${newRichMenuId}`)
              } catch (err) {
                console.log(`ℹ️ Skipped default alias creation (might already exist or not needed)`)
              }
            }
          }

          // 7. 如果原本是預設，則將新的設為預設
          if (isDefault) {
            try {
              await apiClient.setDefaultRichMenu(newRichMenuId)
              console.log('🌟 Restored default rich menu to:', newRichMenuId)
            } catch (e) {
              console.error('❌ Failed to restore default rich menu:', e)
            }
          }

          richMenuId = newRichMenuId

          return NextResponse.json({
            success: true,
            message: `Rich menu recreated and image uploaded successfully`,
            richMenuId: newRichMenuId,
            menuType: registryMenuType,
            recreated: true,
            aliasRestored: !!existingAliasId,
            note: 'The rich menu was recreated to allow image update, preserving existing configuration.'
          })

        } catch (recreateError: any) {
          console.error('❌ Error recreating rich menu:', recreateError)
          throw new Error(`Failed to recreate rich menu: ${recreateError.message || recreateError}`)
        }
      }

      // 其他錯誤，直接拋出
      throw uploadError
    }

    // 更新資料庫中的 has_image 狀態
    if (registryMenuType) {
      const { error: updateError } = await supabase
        .from('line_richmenu_registry')
        .update({
          has_image: true,
          updated_at: new Date().toISOString()
        })
        .eq('menu_type', registryMenuType)

      if (updateError) {
        console.error('Error updating has_image status:', updateError)
      }
    }

    return NextResponse.json({
      success: true,
      message: `Rich menu image uploaded successfully`,
      richMenuId,
      menuType: registryMenuType
    })

  } catch (error) {
    console.error('Error in POST /api/admin/richmenu/upload-image:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// GET: 獲取 Rich Menu 圖片上傳狀態
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const menuType = searchParams.get('menuType') || 'venue_info'

    const supabase = createSupabaseAdmin()

    // 獲取 Rich Menu 註冊資訊
    const { data, error } = await supabase
      .from('line_richmenu_registry')
      .select('*')
      .eq('menu_type', menuType)
      .single()

    if (error) {
      console.error('Error fetching rich menu registry:', error)
      return NextResponse.json(
        { error: 'Failed to fetch rich menu registry' },
        { status: 500 }
      )
    }

    if (!data) {
      return NextResponse.json({
        hasImage: false,
        message: 'No rich menu found for this type'
      })
    }

    return NextResponse.json({
      hasImage: data.has_image || false,
      richMenuId: data.richmenu_id,
      menuType: data.menu_type,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    })

  } catch (error) {
    console.error('Error in GET /api/admin/richmenu/upload-image:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
