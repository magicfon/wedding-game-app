import { NextRequest, NextResponse } from 'next/server'
import { messagingApi } from '@line/bot-sdk'

const { MessagingApiBlobClient } = messagingApi

// 初始化 LINE Blob Client (用於圖片操作)
function getLineBlobClient(): InstanceType<typeof MessagingApiBlobClient> | null {
  const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN
  if (!channelAccessToken) {
    console.error('LINE_CHANNEL_ACCESS_TOKEN not configured')
    return null
  }
  return new MessagingApiBlobClient({ channelAccessToken })
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

    const blobClient = getLineBlobClient()

    if (!blobClient) {
      return NextResponse.json(
        { error: 'Service configuration error' },
        { status: 500 }
      )
    }

    console.log('🖼️ Fetching rich menu image:', richMenuId)

    // 使用 LINE Bot SDK v10 的 MessagingApiBlobClient 獲取圖片
    const imageStream = await blobClient.getRichMenuImage(richMenuId)

    // 將 ReadableStream 轉換為 ArrayBuffer
    const reader = imageStream.getReader()
    const chunks: Uint8Array[] = []

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      chunks.push(value)
    }

    // 合併所有 chunks
    const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0)
    const imageBuffer = new Uint8Array(totalLength)
    let offset = 0
    for (const chunk of chunks) {
      imageBuffer.set(chunk, offset)
      offset += chunk.length
    }

    // 返回圖片
    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=3600', // 快取 1 小時
      },
    })

  } catch (error: any) {
    console.error('Error in GET /api/line/setup-richmenu/get-image:', error)

    // 如果是 404，表示沒有圖片
    if (error.status === 404) {
      return NextResponse.json(
        { error: 'No image found for this rich menu' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
