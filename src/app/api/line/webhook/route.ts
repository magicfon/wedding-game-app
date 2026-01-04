import { NextRequest, NextResponse } from 'next/server'
import { Client, WebhookEvent, PostbackEvent } from '@line/bot-sdk'
import crypto from 'crypto'

const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || 'dummy_token',
  channelSecret: process.env.LINE_CHANNEL_SECRET || 'dummy_secret'
}

// 只有在有真實 token 時才創建 client
const client = process.env.LINE_CHANNEL_ACCESS_TOKEN
  ? new Client(config)
  : null

// 驗證 Line 簽名
function validateSignature(body: string, signature: string): boolean {
  if (!config.channelSecret || config.channelSecret === 'dummy_secret') return true // 開發模式跳過驗證

  const hash = crypto
    .createHmac('SHA256', config.channelSecret)
    .update(body)
    .digest('base64')

  return hash === signature
}

// 處理 Rich Menu 分頁切換
async function handleRichMenuSwitch(userId: string, targetTab: string) {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/line/richmenu/switch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        lineId: userId,
        targetTab: targetTab
      })
    })

    const result = await response.json()
    return result
  } catch (error) {
    console.error('Error handling rich menu switch:', error)
    return { success: false, error: 'Switch failed' }
  }
}

// 處理 Postback 事件 (僅處理 Rich Menu 切換，不回覆訊息)
async function handlePostback(event: PostbackEvent) {
  if (!client) return

  const data = event.postback.data
  const userId = event.source?.userId

  // 處理 Rich Menu 分頁切換
  if (data.startsWith('switch_tab:')) {
    if (!userId) {
      console.error('No userId in postback event')
      return
    }

    const targetTab = data.replace('switch_tab:', '')
    const result = await handleRichMenuSwitch(userId, targetTab)

    if (result.success) {
      console.log(`Switched user ${userId} to ${targetTab} tab`)
    } else {
      console.error(`Failed to switch user ${userId} to ${targetTab} tab:`, result.error)
    }
    return
  }

  // 其他 postback 事件只記錄，不回覆
  console.log('Postback data:', data)
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get('x-line-signature')

    if (!signature || !validateSignature(body, signature)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    const events: WebhookEvent[] = JSON.parse(body).events

    await Promise.all(
      events.map(async (event) => {
        switch (event.type) {
          case 'postback':
            await handlePostback(event)
            break
          case 'message':
          case 'follow':
          case 'unfollow':
            // 不處理這些事件，由 LINE OA 後台設定處理
            break
        }
      })
    )

    return NextResponse.json({ status: 'ok' })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ message: 'Line Bot Webhook is running' })
}
