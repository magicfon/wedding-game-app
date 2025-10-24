import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const envInfo = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'unknown',
      vercel: {
        isVercel: !!process.env.VERCEL,
        vercelEnv: process.env.VERCEL_ENV || 'not set',
        region: process.env.VERCEL_REGION || 'not set'
      },
      dependencies: {
        sharpInPackage: false as boolean | string,
        nodeVersion: process.version || 'unknown'
      },
      storage: {
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'set' : 'not set',
        supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'set' : 'not set'
      }
    }

    // 檢查 package.json 中的 Sharp 依賴
    try {
      const fs = await import('fs')
      const path = await import('path')
      const packageJsonPath = path.join(process.cwd(), 'package.json')
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))
      envInfo.dependencies.sharpInPackage = !!packageJson.dependencies?.sharp
    } catch (error) {
      envInfo.dependencies.sharpInPackage = 'error checking'
    }

    // 嘗試簡單的模塊導入測試
    const moduleTest = {
      fs: false,
      path: false,
      sharp: false
    }

    try {
      await import('fs')
      moduleTest.fs = true
    } catch (e) {
      moduleTest.fs = false
    }

    try {
      await import('path')
      moduleTest.path = true
    } catch (e) {
      moduleTest.path = false
    }

    try {
      await import('sharp')
      moduleTest.sharp = true
    } catch (e) {
      moduleTest.sharp = false
    }

    return NextResponse.json({
      success: true,
      message: '環境檢查完成',
      data: {
        envInfo,
        moduleTest,
        recommendations: generateRecommendations(envInfo, moduleTest)
      }
    })

  } catch (error) {
    return NextResponse.json({
      success: false,
      message: '環境檢查失敗',
      error: error instanceof Error ? error.message : '未知錯誤'
    }, { status: 500 })
  }
}

function generateRecommendations(envInfo: any, moduleTest: any) {
  const recommendations = []

  if (!envInfo.dependencies.sharpInPackage) {
    recommendations.push({
      type: 'error',
      message: 'Sharp 依賴未在 package.json 中找到，請運行 npm install sharp'
    })
  }

  if (!moduleTest.sharp) {
    recommendations.push({
      type: 'error',
      message: 'Sharp 模塊無法導入，可能需要重新安裝或檢查 Vercel 構建配置'
    })
  }

  if (!envInfo.storage.supabaseUrl) {
    recommendations.push({
      type: 'warning',
      message: 'Supabase URL 環境變量未設置'
    })
  }

  if (!envInfo.storage.supabaseKey) {
    recommendations.push({
      type: 'warning',
      message: 'Supabase Service Role Key 環境變量未設置'
    })
  }

  if (envInfo.vercel.isVercel && !moduleTest.sharp) {
    recommendations.push({
      type: 'critical',
      message: '在 Vercel 環境中 Sharp 無法載入，請檢查 Vercel 構建日誌並考慮使用外部圖片處理服務'
    })
  }

  return recommendations
}