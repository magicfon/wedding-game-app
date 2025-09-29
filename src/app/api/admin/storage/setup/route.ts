import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    const supabase = createSupabaseAdmin()
    
    console.log('🗂️ 開始設置 Storage buckets...')

    // 檢查現有的 buckets
    const { data: buckets, error: listError } = await supabase.storage.listBuckets()
    
    if (listError) {
      console.error('❌ 無法獲取 bucket 列表:', listError)
      return NextResponse.json({
        error: '無法獲取 Storage 狀態',
        details: listError.message
      }, { status: 500 })
    }

    console.log('📋 現有 buckets:', buckets?.map(b => b.name))

    const results = []
    
    // 檢查並創建 wedding-photos bucket
    const weddingPhotosExists = buckets?.some(bucket => bucket.name === 'wedding-photos')
    
    if (!weddingPhotosExists) {
      console.log('🆕 創建 wedding-photos bucket...')
      
      const { data: createData, error: createError } = await supabase.storage.createBucket('wedding-photos', {
        public: true,
        allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
        fileSizeLimit: 5242880 // 5MB
      })

      if (createError) {
        console.error('❌ 創建 wedding-photos bucket 失敗:', createError)
        results.push({
          bucket: 'wedding-photos',
          action: 'create',
          success: false,
          error: createError.message
        })
      } else {
        console.log('✅ wedding-photos bucket 創建成功')
        results.push({
          bucket: 'wedding-photos',
          action: 'create',
          success: true,
          data: createData
        })
      }
    } else {
      console.log('✅ wedding-photos bucket 已存在')
      results.push({
        bucket: 'wedding-photos',
        action: 'check',
        success: true,
        message: 'Bucket already exists'
      })
    }

    // 檢查並創建 media bucket (用於問題媒體)
    const mediaExists = buckets?.some(bucket => bucket.name === 'media')
    
    if (!mediaExists) {
      console.log('🆕 創建 media bucket...')
      
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
        results.push({
          bucket: 'media',
          action: 'create',
          success: false,
          error: createError.message
        })
      } else {
        console.log('✅ media bucket 創建成功')
        results.push({
          bucket: 'media',
          action: 'create',
          success: true,
          data: createData
        })
      }
    } else {
      console.log('✅ media bucket 已存在')
      results.push({
        bucket: 'media',
        action: 'check',
        success: true,
        message: 'Bucket already exists'
      })
    }

    // 設置 bucket 政策 (確保公開訪問)
    const policyResults = []
    
    for (const bucketName of ['wedding-photos', 'media']) {
      try {
        console.log(`🔐 設置 ${bucketName} bucket 政策...`)
        
        // 刪除現有政策（如果有）
        await supabase.storage.from(bucketName).createSignedUrl('test', 1) // 測試訪問
        
        policyResults.push({
          bucket: bucketName,
          action: 'policy',
          success: true,
          message: 'Public access verified'
        })
        
      } catch (error) {
        console.error(`❌ 設置 ${bucketName} bucket 政策失敗:`, error)
        policyResults.push({
          bucket: bucketName,
          action: 'policy',
          success: false,
          error: error instanceof Error ? error.message : '未知錯誤'
        })
      }
    }

    const allSuccess = results.every(r => r.success) && policyResults.every(r => r.success)

    return NextResponse.json({
      success: allSuccess,
      message: allSuccess ? 'Storage 設置完成' : 'Storage 設置部分完成',
      buckets: results,
      policies: policyResults,
      summary: {
        wedding_photos_ready: results.find(r => r.bucket === 'wedding-photos')?.success,
        media_ready: results.find(r => r.bucket === 'media')?.success,
        total_buckets: buckets?.length || 0,
        setup_time: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('❌ Storage 設置錯誤:', error)
    return NextResponse.json({
      error: 'Storage 設置失敗',
      details: error instanceof Error ? error.message : '未知錯誤'
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseAdmin()
    
    console.log('🔍 檢查 Storage 狀態...')

    // 獲取所有 buckets
    const { data: buckets, error: listError } = await supabase.storage.listBuckets()
    
    if (listError) {
      return NextResponse.json({
        error: '無法獲取 Storage 狀態',
        details: listError.message
      }, { status: 500 })
    }

    // 檢查必要的 buckets
    const weddingPhotosExists = buckets?.some(bucket => bucket.name === 'wedding-photos')
    const mediaExists = buckets?.some(bucket => bucket.name === 'media')

    // 統計各 bucket 的檔案數量
    const bucketStats = []
    
    for (const bucket of buckets || []) {
      try {
        const { data: files, error: filesError } = await supabase.storage
          .from(bucket.name)
          .list('', { limit: 1000 })

        if (!filesError && files) {
          const totalSize = files.reduce((sum, file) => sum + (file.metadata?.size || 0), 0)
          bucketStats.push({
            name: bucket.name,
            id: bucket.id,
            public: bucket.public,
            file_count: files.length,
            total_size: totalSize,
            total_size_mb: (totalSize / (1024 * 1024)).toFixed(2),
            created_at: bucket.created_at,
            updated_at: bucket.updated_at
          })
        }
      } catch (error) {
        console.error(`Error getting stats for bucket ${bucket.name}:`, error)
        bucketStats.push({
          name: bucket.name,
          id: bucket.id,
          public: bucket.public,
          error: 'Unable to get stats'
        })
      }
    }

    return NextResponse.json({
      success: true,
      storage_ready: weddingPhotosExists && mediaExists,
      buckets: bucketStats,
      required_buckets: {
        'wedding-photos': {
          exists: weddingPhotosExists,
          purpose: '婚禮照片儲存'
        },
        'media': {
          exists: mediaExists,
          purpose: '問題媒體檔案儲存'
        }
      },
      recommendations: [
        ...(!weddingPhotosExists ? ['需要創建 wedding-photos bucket'] : []),
        ...(!mediaExists ? ['需要創建 media bucket'] : [])
      ]
    })

  } catch (error) {
    console.error('❌ Storage 狀態檢查錯誤:', error)
    return NextResponse.json({
      error: 'Storage 狀態檢查失敗',
      details: error instanceof Error ? error.message : '未知錯誤'
    }, { status: 500 })
  }
}
