import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const debugInfo = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'unknown',
    tests: [] as Array<{
      name: string
      status: 'success' | 'error'
      message: string
      version?: any
      metadata?: any
      outputSize?: any
      envVars?: any
      sharpDependency?: any
    }>
  }

  // 測試 1: 檢查 Sharp 是否可以導入
  try {
    const sharpModule = await import('sharp')
    const sharp = sharpModule.default || sharpModule
    debugInfo.tests.push({
      name: 'Sharp 導入測試',
      status: 'success',
      message: 'Sharp 庫成功導入',
      version: sharp.versions || 'unknown'
    })
  } catch (error) {
    debugInfo.tests.push({
      name: 'Sharp 導入測試',
      status: 'error',
      message: `Sharp 導入失敗: ${error instanceof Error ? error.message : '未知錯誤'}`
    })
    return NextResponse.json({
      success: false,
      debugInfo
    }, { status: 500 })
  }

  // 測試 2: 檢查 Sharp 基本功能
  try {
    const sharpModule = await import('sharp')
    const sharp = sharpModule.default || sharpModule
    const testBuffer = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64')
    
    const metadata = await sharp(testBuffer).metadata()
    debugInfo.tests.push({
      name: 'Sharp 基本功能測試',
      status: 'success',
      message: 'Sharp 基本功能正常',
      metadata: {
        format: metadata.format,
        width: metadata.width,
        height: metadata.height
      }
    })
  } catch (error) {
    debugInfo.tests.push({
      name: 'Sharp 基本功能測試',
      status: 'error',
      message: `Sharp 基本功能測試失敗: ${error instanceof Error ? error.message : '未知錯誤'}`
    })
  }

  // 測試 3: 檢查 Sharp 圖片處理功能
  try {
    const sharpModule = await import('sharp')
    const sharp = sharpModule.default || sharpModule
    const testBuffer = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64')
    
    const processedBuffer = await sharp(testBuffer)
      .resize(50, 50)
      .jpeg({ quality: 80 })
      .toBuffer()
    
    debugInfo.tests.push({
      name: 'Sharp 圖片處理測試',
      status: 'success',
      message: 'Sharp 圖片處理功能正常',
      outputSize: processedBuffer.length
    })
  } catch (error) {
    debugInfo.tests.push({
      name: 'Sharp 圖片處理測試',
      status: 'error',
      message: `Sharp 圖片處理測試失敗: ${error instanceof Error ? error.message : '未知錯誤'}`
    })
  }

  // 測試 4: 檢查環境變量
  const envVars = {
    NODE_ENV: process.env.NODE_ENV,
    VERCEL: process.env.VERCEL,
    VERCEL_ENV: process.env.VERCEL_ENV,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'set' : 'not set',
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'set' : 'not set'
  }

  debugInfo.tests.push({
    name: '環境變量檢查',
    status: 'success',
    message: '環境變量檢查完成',
    envVars
  })

  // 測試 5: 檢查 package.json 依賴
  try {
    const fs = await import('fs')
    const path = await import('path')
    const packageJsonPath = path.join(process.cwd(), 'package.json')
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))
    
    const sharpDep = packageJson.dependencies?.sharp
    debugInfo.tests.push({
      name: 'Package.json 依賴檢查',
      status: 'success',
      message: 'Package.json 依賴檢查完成',
      sharpDependency: sharpDep || 'not found'
    })
  } catch (error) {
    debugInfo.tests.push({
      name: 'Package.json 依賴檢查',
      status: 'error',
      message: `Package.json 依賴檢查失敗: ${error instanceof Error ? error.message : '未知錯誤'}`
    })
  }

  const successCount = debugInfo.tests.filter(t => t.status === 'success').length
  const totalCount = debugInfo.tests.length
  const failedCount = debugInfo.tests.filter(t => t.status === 'error').length

  return NextResponse.json({
    success: successCount === totalCount,
    debugInfo,
    summary: {
      totalTests: totalCount,
      passedTests: successCount,
      failedTests: failedCount
    }
  })
}