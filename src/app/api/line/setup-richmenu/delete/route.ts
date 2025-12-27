import { NextResponse } from 'next/server'
import { Client } from '@line/bot-sdk'
import { createSupabaseAdmin } from '@/lib/supabase-admin'

// 初始化 LINE Client
function getLineClient(): Client | null {
  const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN
  if (!channelAccessToken) {
    console.error('LINE_CHANNEL_ACCESS_TOKEN not configured')
    return null
  }
  return new Client({ channelAccessToken })
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

    const lineClient = getLineClient()
    const supabase = createSupabaseAdmin()

    if (!lineClient) {
      return NextResponse.json(
        { error: 'Service configuration error' },
        { status: 500 }
      )
    }

    console.log('🗑️ Deleting rich menu:', richMenuId)

    // 從 LINE Platform 刪除 Rich Menu
    await lineClient.deleteRichMenu(richMenuId)
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
