import { NextRequest, NextResponse } from 'next/server'
import { Client, WebhookEvent, MessageEvent, PostbackEvent } from '@line/bot-sdk'
import crypto from 'crypto'

const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || '',
  channelSecret: process.env.LINE_CHANNEL_SECRET || ''
}

const client = new Client(config)

// 驗證 Line 簽名
function validateSignature(body: string, signature: string): boolean {
  if (!config.channelSecret) return false
  
  const hash = crypto
    .createHmac('SHA256', config.channelSecret)
    .update(body)
    .digest('base64')
  
  return hash === signature
}

// 主選單訊息
const getMainMenuMessage = () => {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://wedding-game-app.vercel.app'
  
  return {
    type: 'text' as const,
    text: `🎉 歡迎來到婚禮互動遊戲！

請點擊以下連結參與各種精彩活動：

🎮 遊戲實況：${appUrl}/game-live
❓ 快問快答：${appUrl}/quiz  
📸 照片上傳：${appUrl}/photo-upload
🖼️ 照片牆：${appUrl}/photo-wall
❤️ 快門傳情：${appUrl}/photo-slideshow
🏆 排行榜：${appUrl}/leaderboard

🚀 首次使用請先登入：${appUrl}/auth/line

輸入「選單」可重新顯示此訊息
輸入「幫助」查看詳細說明`
  }
}

// 處理訊息事件
async function handleMessage(event: MessageEvent) {
  if (event.message.type !== 'text') return

  const text = event.message.text.toLowerCase()
  
  if (text.includes('選單') || text.includes('menu') || text.includes('開始')) {
    await client.replyMessage(event.replyToken, getMainMenuMessage())
  } else if (text.includes('help') || text.includes('幫助')) {
    await client.replyMessage(event.replyToken, {
      type: 'text',
      text: `🎉 歡迎使用婚禮互動遊戲！

可用指令：
• 輸入「選單」查看所有功能
• 點擊下方按鈕直接進入遊戲

功能介紹：
🎮 遊戲實況 - 觀看正在進行的遊戲
❓ 快問快答 - 參與答題競賽
📸 照片上傳 - 分享美好回憶
🖼️ 照片牆 - 瀏覽和投票
❤️ 快門傳情 - 輪播展示照片
🏆 排行榜 - 查看積分排名

請點擊「🚀 開始遊戲」進行登入！`
    })
  } else {
    await client.replyMessage(event.replyToken, {
      type: 'text',
      text: '歡迎來到婚禮互動遊戲！🎉\n\n請輸入「選單」查看所有功能，或點擊「🚀 開始遊戲」立即開始！'
    })
  }
}

// 處理 Postback 事件
async function handlePostback(event: PostbackEvent) {
  const data = event.postback.data
  
  switch (data) {
    case 'show_menu':
      await client.replyMessage(event.replyToken, getMainMenuMessage())
      break
    default:
      await client.replyMessage(event.replyToken, {
        type: 'text',
        text: '請使用選單中的按鈕來操作遊戲功能！'
      })
  }
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
          case 'message':
            await handleMessage(event)
            break
          case 'postback':
            await handlePostback(event)
            break
          case 'follow':
            // 用戶加入好友時的歡迎訊息
            await client.replyMessage(event.replyToken, {
              type: 'text',
              text: `🎉 歡迎加入婚禮互動遊戲！

感謝您的參與！這裡有豐富的互動功能等著您：

🎮 遊戲實況 - 即時觀看遊戲進行
❓ 快問快答 - 測試您的反應速度
📸 照片分享 - 記錄美好時刻
🏆 積分競賽 - 爭取最高榮譽

請輸入「選單」查看所有功能，或點擊「🚀 開始遊戲」立即參與！`
            })
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
