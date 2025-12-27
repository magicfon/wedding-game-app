import { NextRequest, NextResponse } from 'next/server'
import { Client } from '@line/bot-sdk'

// 初始化 LINE Client
function getLineClient(): Client | null {
  const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN
  if (!channelAccessToken) {
    console.error('LINE_CHANNEL_ACCESS_TOKEN not configured')
    return null
  }
  return new Client({ channelAccessToken })
}

// GET: 獲取 Rich Menu 圖片
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

    const lineClient = getLineClient()

    if (!lineClient) {
      return NextResponse.json(
        { error: 'Service configuration error' },
        { status: 500 }
      )
    }

    console.log('🖼️ Fetching rich menu image:', richMenuId)

    // 獲取 Rich Menu 圖片
    const imageBuffer = await (lineClient as any).getRichMenuImage(richMenuId)

    // 返回圖片
    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=3600', // 快取 1 小時
      },
    })

  } catch (error) {
    console.error('Error in GET /api/line/setup-richmenu/get-image:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
