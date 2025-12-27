import { NextResponse } from 'next/server'
import { messagingApi } from '@line/bot-sdk'
import { createSupabaseAdmin } from '@/lib/supabase-admin'

const { MessagingApiClient } = messagingApi

// 初始化 LINE Messaging API Client
function getLineApiClient(): InstanceType<typeof MessagingApiClient> | null {
  const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN
  if (!channelAccessToken) {
    console.error('LINE_CHANNEL_ACCESS_TOKEN not configured')
    return null
  }
  return new MessagingApiClient({ channelAccessToken })
}

// POST: 刪除 Rich Menu
export async function POST(request: Request) {
  try {
    const { richMenuId } = await request.json()

    if (!richMenuId) {
      return NextResponse.json(
        { error: 'richMenuId is required' },
        { status: 400 }
      )
    }

    const apiClient = getLineApiClient()
    const supabase = createSupabaseAdmin()

    if (!apiClient) {
      return NextResponse.json(
        { error: 'Service configuration error' },
        { status: 500 }
      )
    }

    console.log('🗑️ Deleting rich menu:', richMenuId)

    // 檢查是否為預設 Rich Menu，如果是則先清除預設
    try {
      const defaultResponse = await apiClient.getDefaultRichMenuId()
      if (defaultResponse?.richMenuId === richMenuId) {
        console.log('⚠️ This is the default rich menu, clearing default first...')
        await apiClient.cancelDefaultRichMenu()
        console.log('✅ Default rich menu cleared')
      }
    } catch (err: any) {
      // 如果沒有預設選單，忽略錯誤
      console.log('ℹ️ No default rich menu set or error checking:', err?.message)
    }

    // 從 LINE Platform 刪除 Rich Menu
    await apiClient.deleteRichMenu(richMenuId)
    console.log('✅ Rich menu deleted from LINE Platform:', richMenuId)

    // 從資料庫刪除對應的記錄
    const { error } = await supabase
      .from('line_richmenu_registry')
      .delete()
      .eq('richmenu_id', richMenuId)

    if (error) {
      console.error('Error deleting from database:', error)
    } else {
      console.log('✅ Rich menu deleted from database:', richMenuId)
    }

    return NextResponse.json({
      success: true,
      message: 'Rich menu deleted successfully',
      richMenuId
    })

  } catch (error) {
    console.error('Error in POST /api/line/setup-richmenu/delete:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
