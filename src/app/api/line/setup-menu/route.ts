import { NextRequest, NextResponse } from 'next/server'
import { Client } from '@line/bot-sdk'

// 設置 LINE Bot 選單
export async function POST(request: NextRequest) {
  try {
    const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN
    
    if (!channelAccessToken) {
      return NextResponse.json({ 
        error: 'LINE_CHANNEL_ACCESS_TOKEN not configured' 
      }, { status: 500 })
    }

    const client = new Client({
      channelAccessToken,
    })

    // 設置豐富選單
    const richMenu = {
      size: {
        width: 2500,
        height: 1686
      },
      selected: true,
      name: "婚禮遊戲選單",
      chatBarText: "選單",
      areas: [
        {
          bounds: { x: 0, y: 0, width: 833, height: 843 },
          action: { 
            type: "uri" as const, 
            uri: `https://wedding-game-app.vercel.app/login?redirect=game-live`
          }
        },
        {
          bounds: { x: 833, y: 0, width: 834, height: 843 },
          action: { 
            type: "uri" as const, 
            uri: `https://wedding-game-app.vercel.app/login?redirect=quiz`
          }
        },
        {
          bounds: { x: 1667, y: 0, width: 833, height: 843 },
          action: { 
            type: "uri" as const, 
            uri: `https://wedding-game-app.vercel.app/login?redirect=photo-upload`
          }
        },
        {
          bounds: { x: 0, y: 843, width: 833, height: 843 },
          action: { 
            type: "uri" as const, 
            uri: `https://wedding-game-app.vercel.app/login?redirect=photo-wall`
          }
        },
        {
          bounds: { x: 833, y: 843, width: 834, height: 843 },
          action: { 
            type: "uri" as const, 
            uri: `https://wedding-game-app.vercel.app/login?redirect=leaderboard`
          }
        },
        {
          bounds: { x: 1667, y: 843, width: 833, height: 843 },
          action: { 
            type: "uri" as const, 
            uri: `https://wedding-game-app.vercel.app/login?redirect=score-history`
          }
        }
      ]
    }

    // 創建豐富選單
    const richMenuId = await client.createRichMenu(richMenu)
    console.log('Rich menu created:', richMenuId)

    // 設置預設豐富選單（需要上傳圖片才能啟用）
    // await client.setDefaultRichMenu(richMenuId)

    return NextResponse.json({
      success: true,
      richMenuId,
      message: '豐富選單創建成功，請上傳選單圖片後啟用'
    })

  } catch (error) {
    console.error('Setup menu error:', error)
    return NextResponse.json({ 
      error: '設置選單失敗',
      details: error instanceof Error ? error.message : '未知錯誤'
    }, { status: 500 })
  }
}

// 獲取當前選單狀態
export async function GET(request: NextRequest) {
  try {
    const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN
    
    if (!channelAccessToken) {
      return NextResponse.json({ 
        error: 'LINE_CHANNEL_ACCESS_TOKEN not configured' 
      }, { status: 500 })
    }

    const client = new Client({
      channelAccessToken,
    })

    // 獲取豐富選單列表
    const richMenus = await client.getRichMenuList()
    
    // 獲取預設豐富選單
    let defaultRichMenuId = null
    try {
      defaultRichMenuId = await client.getDefaultRichMenuId()
    } catch (error) {
      console.log('No default rich menu set')
    }

    return NextResponse.json({
      success: true,
      richMenus,
      defaultRichMenuId,
      message: '選單狀態獲取成功'
    })

  } catch (error) {
    console.error('Get menu error:', error)
    return NextResponse.json({ 
      error: '獲取選單狀態失敗',
      details: error instanceof Error ? error.message : '未知錯誤'
    }, { status: 500 })
  }
}
