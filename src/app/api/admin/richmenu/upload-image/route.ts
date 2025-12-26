import { NextRequest, NextResponse } from 'next/server'
import { Client } from '@line/bot-sdk'
import { createClient } from '@supabase/supabase-js'

// 驗證管理員權限
async function verifyAdmin(request: NextRequest): Promise<boolean> {
  const authHeader = request.headers.get('authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return false
  }

  const token = authHeader.substring(7)
  const adminPassword = process.env.ADMIN_PASSWORD

  if (!adminPassword) {
    console.error('ADMIN_PASSWORD not configured')
    return false
  }

  return token === adminPassword
}

// 初始化 LINE Client
function getLineClient(): Client | null {
  const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN
  if (!channelAccessToken) {
    console.error('LINE_CHANNEL_ACCESS_TOKEN not configured')
    return null
  }
  return new Client({ channelAccessToken })
}

// 初始化 Supabase Client
function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Supabase configuration missing')
    return null
  }

  return createClient(supabaseUrl, supabaseServiceKey)
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
    // 驗證管理員權限
    const isAdmin = await verifyAdmin(request)
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('image') as File
    const menuType = formData.get('menuType') as string

    // 驗證輸入
    if (!file) {
      return NextResponse.json(
        { error: 'Image file is required' },
        { status: 400 }
      )
    }

    if (!menuType || !['venue_info', 'activity', 'unavailable'].includes(menuType)) {
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

    // 驗證圖片尺寸 (LINE API 會在實際上傳時驗證)
    const imageBuffer = await file.arrayBuffer()
    // 注意：由於 canvas 套件在 Vercel 環境可能有相容性問題，
    // 我們讓 LINE API 來驗證圖片尺寸
    // 如果需要在本機驗證，可以安裝 canvas 套件並取消註解以下程式碼：
    // const { createCanvas, loadImage } = await import('canvas')
    // const image = await loadImage(Buffer.from(imageBuffer))
    // if (!validateImageDimensions(image.width, image.height)) {
    //   return NextResponse.json(
    //     { error: 'Image dimensions must be 2500x1686px' },
    //     { status: 400 }
    //   )
    // }

    const lineClient = getLineClient()
    if (!lineClient) {
      return NextResponse.json(
        { error: 'LINE client configuration error' },
        { status: 500 }
      )
    }

    const supabase = getSupabaseClient()
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database configuration error' },
        { status: 500 }
      )
    }

    // 檢查是否已有 Rich Menu ID
    const { data: existingRegistry } = await supabase
      .from('line_richmenu_registry')
      .select('richmenu_id')
      .eq('menu_type', menuType)
      .single()

    let richMenuId: string

    if (existingRegistry) {
      // 更新現有 Rich Menu 的圖片
      richMenuId = existingRegistry.richmenu_id
      await (lineClient as any).setRichMenuImage(richMenuId, Buffer.from(imageBuffer))
    } else {
      // 創建新的 Rich Menu
      const richMenu = {
        size: {
          width: 2500,
          height: 1686
        },
        selected: false,
        name: `Wedding Game ${menuType} Menu`,
        chatBarText: menuType === 'unavailable' ? '未開放' : '選單',
        areas: []
      }

      richMenuId = await lineClient.createRichMenu(richMenu)

      // 上傳圖片到 Rich Menu
      await (lineClient as any).setRichMenuImage(richMenuId, Buffer.from(imageBuffer))

      // 註冊 Rich Menu ID
      await supabase
        .from('line_richmenu_registry')
        .upsert({
          menu_type: menuType,
          richmenu_id: richMenuId,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'menu_type'
        })
    }

    return NextResponse.json({
      success: true,
      message: 'Rich menu image uploaded successfully',
      richMenuId,
      menuType
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
    // 驗證管理員權限
    const isAdmin = await verifyAdmin(request)
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const menuType = searchParams.get('menuType')

    if (!menuType || !['venue_info', 'activity', 'unavailable'].includes(menuType)) {
      return NextResponse.json(
        { error: 'Invalid menu type' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseClient()
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database configuration error' },
        { status: 500 }
      )
    }

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
        message: 'No image uploaded for this menu type'
      })
    }

    return NextResponse.json({
      hasImage: true,
      richMenuId: data.richmenu_id,
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
