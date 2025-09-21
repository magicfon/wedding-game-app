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

// 主選單 Rich Menu
const mainMenu = {
  type: 'flex',
  altText: '婚禮互動遊戲選單',
  contents: {
    type: 'bubble',
    hero: {
      type: 'image',
      url: 'https://via.placeholder.com/1040x585/ff69b4/ffffff?text=%E5%A9%9A%E7%A6%AE%E4%BA%92%E5%8B%95%E9%81%8A%E6%88%B2',
      size: 'full',
      aspectRatio: '20:11',
      aspectMode: 'cover'
    },
    body: {
      type: 'box',
      layout: 'vertical',
      contents: [
        {
          type: 'text',
          text: '🎉 婚禮互動遊戲',
          weight: 'bold',
          size: 'xl',
          color: '#ff69b4',
          align: 'center'
        },
        {
          type: 'text',
          text: '選擇您想要的功能',
          size: 'sm',
          color: '#666666',
          margin: 'md',
          align: 'center'
        }
      ]
    },
    footer: {
      type: 'box',
      layout: 'vertical',
      spacing: 'sm',
      contents: [
        {
          type: 'box',
          layout: 'horizontal',
          spacing: 'sm',
          contents: [
            {
              type: 'button',
              style: 'primary',
              height: 'sm',
              action: {
                type: 'uri',
                label: '🎮 遊戲實況',
                uri: `${process.env.NEXT_PUBLIC_APP_URL}/game-live`
              },
              color: '#3b82f6'
            },
            {
              type: 'button',
              style: 'primary',
              height: 'sm',
              action: {
                type: 'uri',
                label: '❓ 快問快答',
                uri: `${process.env.NEXT_PUBLIC_APP_URL}/quiz`
              },
              color: '#10b981'
            }
          ]
        },
        {
          type: 'box',
          layout: 'horizontal',
          spacing: 'sm',
          contents: [
            {
              type: 'button',
              style: 'primary',
              height: 'sm',
              action: {
                type: 'uri',
                label: '📸 照片上傳',
                uri: `${process.env.NEXT_PUBLIC_APP_URL}/photo-upload`
              },
              color: '#8b5cf6'
            },
            {
              type: 'button',
              style: 'primary',
              height: 'sm',
              action: {
                type: 'uri',
                label: '🖼️ 照片牆',
                uri: `${process.env.NEXT_PUBLIC_APP_URL}/photo-wall`
              },
              color: '#ec4899'
            }
          ]
        },
        {
          type: 'box',
          layout: 'horizontal',
          spacing: 'sm',
          contents: [
            {
              type: 'button',
              style: 'primary',
              height: 'sm',
              action: {
                type: 'uri',
                label: '❤️ 快門傳情',
                uri: `${process.env.NEXT_PUBLIC_APP_URL}/photo-slideshow`
              },
              color: '#ef4444'
            },
            {
              type: 'button',
              style: 'primary',
              height: 'sm',
              action: {
                type: 'uri',
                label: '🏆 排行榜',
                uri: `${process.env.NEXT_PUBLIC_APP_URL}/leaderboard`
              },
              color: '#f59e0b'
            }
          ]
        },
        {
          type: 'button',
          style: 'secondary',
          action: {
            type: 'uri',
            label: '🚀 開始遊戲（需登入）',
            uri: `${process.env.NEXT_PUBLIC_APP_URL}/auth/line`
          }
        }
      ]
    }
  }
}

// 處理訊息事件
async function handleMessage(event: MessageEvent) {
  if (event.message.type !== 'text') return

  const text = event.message.text.toLowerCase()
  
  if (text.includes('選單') || text.includes('menu') || text.includes('開始')) {
    await client.replyMessage(event.replyToken, mainMenu)
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
      await client.replyMessage(event.replyToken, mainMenu)
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
