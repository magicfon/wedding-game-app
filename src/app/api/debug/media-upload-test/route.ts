import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    console.log('🧪 開始媒體上傳測試...')
    
    const supabase = createSupabaseAdmin()
    console.log('✅ Supabase 連接成功')
    
    // 檢查請求格式
    const contentType = request.headers.get('content-type')
    console.log('📋 Content-Type:', contentType)
    
    if (!contentType?.includes('multipart/form-data')) {
      return NextResponse.json({
        error: '請求格式錯誤',
        details: '需要 multipart/form-data 格式',
        received_content_type: contentType
      }, { status: 400 })
    }
    
    // 解析 FormData
    let formData
    try {
      formData = await request.formData()
      console.log('✅ FormData 解析成功')
    } catch (error) {
      console.error('❌ FormData 解析失敗:', error)
      return NextResponse.json({
        error: 'FormData 解析失敗',
        details: error instanceof Error ? error.message : '未知錯誤'
      }, { status: 400 })
    }
    
    // 檢查必要欄位
    const file = formData.get('file') as File
    const mediaType = formData.get('mediaType') as string
    const altText = formData.get('altText') as string
    
    console.log('📝 表單數據:', {
      file: file ? `${file.name} (${file.size} bytes, ${file.type})` : 'null',
      mediaType,
      altText
    })
    
    if (!file) {
      return NextResponse.json({
        error: '未選擇檔案',
        form_data_keys: Array.from(formData.keys())
      }, { status: 400 })
    }
    
    if (!mediaType) {
      return NextResponse.json({
        error: '未指定媒體類型',
        form_data_keys: Array.from(formData.keys())
      }, { status: 400 })
    }
    
    // 檢查檔案類型
    const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    const allowedVideoTypes = ['video/mp4', 'video/webm', 'video/ogg']
    
    if (mediaType === 'image' && !allowedImageTypes.includes(file.type)) {
      return NextResponse.json({
        error: '不支援的圖片格式',
        file_type: file.type,
        allowed_types: allowedImageTypes
      }, { status: 400 })
    }
    
    if (mediaType === 'video' && !allowedVideoTypes.includes(file.type)) {
      return NextResponse.json({
        error: '不支援的影片格式',
        file_type: file.type,
        allowed_types: allowedVideoTypes
      }, { status: 400 })
    }
    
    // 檢查檔案大小
    const maxImageSize = 5 * 1024 * 1024 // 5MB
    const maxVideoSize = 50 * 1024 * 1024 // 50MB
    
    if (mediaType === 'image' && file.size > maxImageSize) {
      return NextResponse.json({
        error: '圖片檔案過大',
        file_size: file.size,
        max_size: maxImageSize,
        file_size_mb: (file.size / 1024 / 1024).toFixed(2)
      }, { status: 400 })
    }
    
    if (mediaType === 'video' && file.size > maxVideoSize) {
      return NextResponse.json({
        error: '影片檔案過大',
        file_size: file.size,
        max_size: maxVideoSize,
        file_size_mb: (file.size / 1024 / 1024).toFixed(2)
      }, { status: 400 })
    }
    
    // 檢查 Storage bucket
    console.log('🔍 檢查 Storage bucket...')
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets()
    
    if (bucketsError) {
      console.error('❌ 無法獲取 bucket 列表:', bucketsError)
      return NextResponse.json({
        error: 'Storage 連接失敗',
        details: bucketsError.message,
        supabase_url: process.env.NEXT_PUBLIC_SUPABASE_URL,
        has_service_key: !!process.env.SUPABASE_SERVICE_ROLE_KEY
      }, { status: 500 })
    }
    
    const mediaExists = buckets?.some(bucket => bucket.name === 'media')
    console.log('📦 Media bucket 存在:', mediaExists)
    console.log('📦 所有 buckets:', buckets?.map(b => b.name))
    
    if (!mediaExists) {
      return NextResponse.json({
        error: 'Media bucket 不存在',
        available_buckets: buckets?.map(b => b.name),
        suggestion: '請先執行 /api/debug/storage-check 創建 bucket'
      }, { status: 500 })
    }
    
    // 生成檔名
    const timestamp = Date.now()
    const randomStr = Math.random().toString(36).substring(2, 8)
    const extension = file.name.split('.').pop()
    const fileName = `${mediaType}_${timestamp}_${randomStr}.${extension}`
    const filePath = `questions/${fileName}`
    
    console.log('📤 準備上傳:', {
      fileName,
      filePath,
      fileSize: file.size,
      fileType: file.type
    })
    
    // 嘗試上傳
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('media')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      })
    
    if (uploadError) {
      console.error('❌ 上傳失敗:', uploadError)
      return NextResponse.json({
        error: '檔案上傳失敗',
        details: uploadError.message,
        upload_path: filePath,
        bucket: 'media'
      }, { status: 500 })
    }
    
    console.log('✅ 上傳成功:', uploadData)
    
    // 獲取公開 URL
    const { data: urlData } = supabase.storage
      .from('media')
      .getPublicUrl(filePath)
    
    const publicUrl = urlData.publicUrl
    console.log('🔗 公開 URL:', publicUrl)
    
    return NextResponse.json({
      success: true,
      message: '測試上傳成功',
      data: {
        fileName,
        filePath,
        publicUrl,
        mediaType,
        fileSize: file.size,
        altText: altText || `${mediaType === 'image' ? '圖片' : '影片'}內容`,
        uploadData
      }
    })
    
  } catch (error) {
    console.error('❌ 測試上傳錯誤:', error)
    return NextResponse.json({
      error: '測試失敗',
      details: error instanceof Error ? error.message : '未知錯誤',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: '媒體上傳測試端點',
    usage: 'POST with multipart/form-data',
    required_fields: ['file', 'mediaType'],
    optional_fields: ['altText'],
    test_url: '/api/debug/media-upload-test'
  })
}
