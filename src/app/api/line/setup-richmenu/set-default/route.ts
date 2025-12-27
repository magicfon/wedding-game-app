import { NextResponse } from 'next/server'
import { messagingApi } from '@line/bot-sdk'

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

// POST: 設置預設 Rich Menu
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

    if (!apiClient) {
      return NextResponse.json(
        { error: 'Service configuration error' },
        { status: 500 }
      )
    }

    console.log('⭐ Setting default rich menu:', richMenuId)

    // 設置預設 Rich Menu
    await apiClient.setDefaultRichMenu(richMenuId)
    console.log('✅ Default rich menu set:', richMenuId)

    return NextResponse.json({
      success: true,
      message: 'Default rich menu set successfully',
      richMenuId
    })

  } catch (error) {
    console.error('Error in POST /api/line/setup-richmenu/set-default:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
