import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseAdmin()
    
    console.log('🔍 檢查 Supabase Storage 配置...')
    
    // 檢查 media bucket 是否存在
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets()
    
    if (bucketsError) {
      console.error('❌ 無法獲取 bucket 列表:', bucketsError)
      return NextResponse.json({
        success: false,
        error: 'Storage 連接失敗',
        details: bucketsError.message
      }, { status: 500 })
    }

    console.log('📦 現有 buckets:', buckets?.map(b => b.name))
    
    const mediaExists = buckets?.some(bucket => bucket.name === 'media')
    const weddingPhotosExists = buckets?.some(bucket => bucket.name === 'wedding-photos')
    
    let bucketCreated = false
    
    // 如果 media bucket 不存在，嘗試創建
    if (!mediaExists) {
      console.log('📦 media bucket 不存在，嘗試創建...')
      
      const { data: createData, error: createError } = await supabase.storage.createBucket('media', {
        public: true,
        allowedMimeTypes: [
          'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
          'video/mp4', 'video/webm', 'video/ogg'
        ],
        fileSizeLimit: 52428800 // 50MB
      })
      
      if (createError) {
        console.error('❌ 創建 media bucket 失敗:', createError)
        return NextResponse.json({
          success: false,
          error: '無法創建 media bucket',
          details: createError.message,
          buckets: buckets?.map(b => ({ name: b.name, public: b.public })),
          suggestions: [
            '請在 Supabase Dashboard > Storage 中手動創建 "media" bucket',
            '設定為 Public bucket',
            '允許的檔案類型：image/*, video/*'
          ]
        }, { status: 500 })
      } else {
        console.log('✅ 成功創建 media bucket')
        bucketCreated = true
      }
    }
    
    // 測試上傳權限
    const testFileName = `test_${Date.now()}.txt`
    const testContent = new Blob(['test content'], { type: 'text/plain' })
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('media')
      .upload(`test/${testFileName}`, testContent, {
        cacheControl: '3600',
        upsert: false
      })
    
    if (uploadError) {
      console.error('❌ 測試上傳失敗:', uploadError)
      return NextResponse.json({
        success: false,
        error: '上傳權限測試失敗',
        details: uploadError.message,
        buckets: buckets?.map(b => ({ name: b.name, public: b.public })),
        suggestions: [
          '檢查 RLS (Row Level Security) 政策',
          '確認 service_role key 有正確權限',
          '檢查 bucket 權限設定'
        ]
      }, { status: 500 })
    }
    
    // 清理測試檔案
    await supabase.storage.from('media').remove([`test/${testFileName}`])
    
    // 獲取公開 URL 測試
    const { data: urlData } = supabase.storage
      .from('media')
      .getPublicUrl('test/example.jpg')
    
    return NextResponse.json({
      success: true,
      message: 'Storage 配置檢查完成',
      storage_status: {
        media_bucket_exists: mediaExists || bucketCreated,
        wedding_photos_exists: weddingPhotosExists,
        bucket_created_this_session: bucketCreated,
        upload_test: '成功',
        public_url_format: urlData.publicUrl
      },
      buckets: buckets?.map(b => ({ 
        name: b.name, 
        public: b.public,
        created_at: b.created_at 
      })),
      upload_endpoint: '/api/admin/media/upload',
      supported_formats: {
        images: ['JPEG', 'PNG', 'GIF', 'WebP'],
        videos: ['MP4', 'WebM', 'OGG']
      },
      size_limits: {
        images: '5MB',
        videos: '50MB'
      }
    })

  } catch (error) {
    console.error('❌ Storage 檢查錯誤:', error)
    return NextResponse.json({
      success: false,
      error: 'Storage 檢查失敗',
      details: error instanceof Error ? error.message : '未知錯誤'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createSupabaseAdmin()
    
    console.log('🔧 強制創建 media bucket...')
    
    // 強制創建 media bucket
    const { data: createData, error: createError } = await supabase.storage.createBucket('media', {
      public: true,
      allowedMimeTypes: [
        'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
        'video/mp4', 'video/webm', 'video/ogg'
      ],
      fileSizeLimit: 52428800 // 50MB
    })
    
    if (createError) {
      return NextResponse.json({
        success: false,
        error: '創建 bucket 失敗',
        details: createError.message
      }, { status: 500 })
    }
    
    return NextResponse.json({
      success: true,
      message: 'media bucket 創建成功',
      bucket_info: createData
    })

  } catch (error) {
    console.error('❌ 創建 bucket 錯誤:', error)
    return NextResponse.json({
      success: false,
      error: '創建失敗',
      details: error instanceof Error ? error.message : '未知錯誤'
    }, { status: 500 })
  }
}
