# 後端 API 更新設計 - 支援照片檔案大小功能

## 概述

更新後端 API 以支援照片檔案大小功能，包括修改現有 API 和新增統計 API。

## 需要更新的 API

### 1. 照片上傳 API (`/api/photo/upload`)

#### 現有問題
- 目前 API 已經接收 `fileSize` 參數，但沒有儲存到資料庫
- 需要更新 `processDirectUploadMetadata` 函數

#### 更新內容

```typescript
// 更新 processDirectUploadMetadata 函數
async function processDirectUploadMetadata({
  fileName,
  fileUrl,
  fileSize,
  fileType,
  blessingMessage,
  isPublic,
  uploaderLineId
}: {
  fileName: string;
  fileUrl: string;
  fileSize: number;
  fileType: string;
  blessingMessage: string;
  isPublic: boolean;
  uploaderLineId: string;
}) {
  const supabase = createSupabaseAdmin();
  
  // 驗證檔案類型
  if (!fileType.startsWith('image/')) {
    throw new Error('請選擇圖片檔案');
  }
  
  // 驗證檔案 URL 是否來自我們的 Supabase Storage
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!fileUrl.startsWith(`${supabaseUrl}/storage/v1/object/public/wedding-photos/`)) {
    throw new Error('無效的檔案來源');
  }
  
  // 生成縮圖 URL
  const generateVercelImageUrl = (baseUrl: string, width: number, quality: number = 80, format: string = 'auto') => {
    const encodedUrl = encodeURIComponent(baseUrl);
    return `/_vercel/image?url=${encodedUrl}&w=${width}&q=${quality}&f=${format}`;
  };
  
  // 儲存到資料庫（新增 file_size 欄位）
  const photoInsertData = {
    user_id: uploaderLineId,
    image_url: fileUrl,
    blessing_message: blessingMessage,
    is_public: isPublic,
    vote_count: 0,
    file_size: fileSize, // 新增檔案大小
    thumbnail_url_template: fileUrl,
    thumbnail_small_url: generateVercelImageUrl(fileUrl, 200, 75, 'auto'),
    thumbnail_medium_url: generateVercelImageUrl(fileUrl, 400, 80, 'auto'),
    thumbnail_large_url: generateVercelImageUrl(fileUrl, 800, 85, 'auto'),
    thumbnail_generated_at: new Date().toISOString()
  };
  
  const { data: photoData, error: dbError } = await supabase
    .from('photos')
    .insert(photoInsertData)
    .select()
    .single();
  
  if (dbError) {
    throw new Error(`照片資訊儲存失敗: ${dbError.message}`);
  }
  
  return photoData;
}
```

### 2. 照片列表 API (`/api/admin/photos/all-list`)

#### 現有問題
- 目前沒有返回檔案大小資訊
- 需要在 SELECT 查詢中新增 `file_size` 欄位

#### 更新內容

```typescript
// 更新照片列表查詢
const { data: photos, error: photosError } = await supabaseAdmin
  .from('photos')
  .select(`
    id,
    image_url,
    blessing_message,
    is_public,
    vote_count,
    created_at,
    user_id,
    file_size, // 新增檔案大小欄位
    uploader:users!photos_user_id_fkey (
      display_name,
      avatar_url
    )
  `)
  .order('created_at', { ascending: false })
```

### 3. 新增儲存空間統計 API (`/api/admin/photos/storage-stats`)

#### 新增 API 內容

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase-admin'

export async function GET(request: NextRequest) {
  try {
    const supabaseAdmin = createSupabaseAdmin()
    
    // 獲取基本統計
    const { data: basicStats, error: basicError } = await supabaseAdmin
      .from('photos')
      .select('file_size')
    
    if (basicError) {
      throw new Error(`獲取基本統計失敗: ${basicError.message}`)
    }
    
    // 計算統計資料
    const photosWithSize = basicStats?.filter(p => p.file_size !== null) || []
    const totalPhotos = basicStats?.length || 0
    const photosWithSizeCount = photosWithSize.length
    const totalStorageBytes = photosWithSize.reduce((sum, p) => sum + (p.file_size || 0), 0)
    const averageSizeBytes = photosWithSizeCount > 0 ? Math.round(totalStorageBytes / photosWithSizeCount) : 0
    const maxSizeBytes = photosWithSize.length > 0 ? Math.max(...photosWithSize.map(p => p.file_size || 0)) : 0
    const minSizeBytes = photosWithSize.length > 0 ? Math.min(...photosWithSize.map(p => p.file_size || 0)) : 0
    
    // 檔案大小分布
    const sizeDistribution = {
      small: photosWithSize.filter(p => (p.file_size || 0) < 1024 * 1024).length, // < 1 MB
      medium: photosWithSize.filter(p => (p.file_size || 0) >= 1024 * 1024 && (p.file_size || 0) < 5 * 1024 * 1024).length, // 1-5 MB
      large: photosWithSize.filter(p => (p.file_size || 0) >= 5 * 1024 * 1024 && (p.file_size || 0) < 10 * 1024 * 1024).length, // 5-10 MB
      extraLarge: photosWithSize.filter(p => (p.file_size || 0) >= 10 * 1024 * 1024).length // > 10 MB
    }
    
    // 格式化檔案大小
    const formatFileSize = (bytes: number): string => {
      if (bytes === 0) return '0 B'
      if (bytes < 1024) return `${bytes} B`
      if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
      if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
      return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
    }
    
    const statistics = {
      totalPhotos,
      photosWithSize: photosWithSizeCount,
      photosWithoutSize: totalPhotos - photosWithSizeCount,
      totalStorage: {
        bytes: totalStorageBytes,
        formatted: formatFileSize(totalStorageBytes)
      },
      averageSize: {
        bytes: averageSizeBytes,
        formatted: formatFileSize(averageSizeBytes)
      },
      maxSize: {
        bytes: maxSizeBytes,
        formatted: formatFileSize(maxSizeBytes)
      },
      minSize: {
        bytes: minSizeBytes,
        formatted: formatFileSize(minSizeBytes)
      },
      sizeDistribution: {
        small: {
          count: sizeDistribution.small,
          percentage: photosWithSizeCount > 0 ? Math.round((sizeDistribution.small / photosWithSizeCount) * 100) : 0
        },
        medium: {
          count: sizeDistribution.medium,
          percentage: photosWithSizeCount > 0 ? Math.round((sizeDistribution.medium / photosWithSizeCount) * 100) : 0
        },
        large: {
          count: sizeDistribution.large,
          percentage: photosWithSizeCount > 0 ? Math.round((sizeDistribution.large / photosWithSizeCount) * 100) : 0
        },
        extraLarge: {
          count: sizeDistribution.extraLarge,
          percentage: photosWithSizeCount > 0 ? Math.round((sizeDistribution.extraLarge / photosWithSizeCount) * 100) : 0
        }
      }
    }
    
    return NextResponse.json({
      success: true,
      data: statistics
    })
    
  } catch (error) {
    console.error('獲取儲存空間統計失敗:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '獲取統計失敗' },
      { status: 500 }
    )
  }
}
```

### 4. 新增檔案大小補充 API (`/api/admin/photos/update-file-sizes`)

#### 用途
為現有照片補充檔案大小資訊（可選功能）

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase-admin'

export async function POST(request: NextRequest) {
  try {
    const supabaseAdmin = createSupabaseAdmin()
    
    // 獲取沒有檔案大小的照片
    const { data: photosWithoutSize, error: fetchError } = await supabaseAdmin
      .from('photos')
      .select('id, image_url')
      .is('file_size', null)
      .limit(10) // 限制批次處理數量
    
    if (fetchError) {
      throw new Error(`獲取照片失敗: ${fetchError.message}`)
    }
    
    const updateResults = []
    
    for (const photo of photosWithoutSize || []) {
      try {
        // 嘗試從 URL 獲取檔案大小（這是一個簡化的實現）
        // 實際情況可能需要從存儲服務獲取檔案資訊
        const response = await fetch(photo.image_url, { method: 'HEAD' })
        const contentLength = response.headers.get('content-length')
        
        if (contentLength) {
          const fileSize = parseInt(contentLength, 10)
          
          // 更新檔案大小
          const { data: updateData, error: updateError } = await supabaseAdmin
            .from('photos')
            .update({ file_size: fileSize })
            .eq('id', photo.id)
            .select()
            .single()
          
          if (updateError) {
            throw new Error(`更新照片 ${photo.id} 失敗: ${updateError.message}`)
          }
          
          updateResults.push({
            id: photo.id,
            success: true,
            fileSize: fileSize
          })
        } else {
          updateResults.push({
            id: photo.id,
            success: false,
            error: '無法獲取檔案大小'
          })
        }
      } catch (error) {
        updateResults.push({
          id: photo.id,
          success: false,
          error: error instanceof Error ? error.message : '未知錯誤'
        })
      }
    }
    
    return NextResponse.json({
      success: true,
      message: `處理了 ${updateResults.length} 張照片`,
      data: {
        processed: updateResults.length,
        successful: updateResults.filter(r => r.success).length,
        failed: updateResults.filter(r => !r.success).length,
        results: updateResults
      }
    })
    
  } catch (error) {
    console.error('更新檔案大小失敗:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '更新失敗' },
      { status: 500 }
    )
  }
}
```

## 前端介面更新需求

### 1. 類型定義更新

```typescript
// 更新 PhotoWithUser 介面
interface PhotoWithUser {
  id: number
  image_url: string
  blessing_message: string | null
  is_public: boolean
  vote_count: number
  created_at: string
  user_id: string
  file_size: number | null // 新增檔案大小
  uploader: {
    display_name: string
    avatar_url: string | null
  }
  thumbnail_small_url?: string
  thumbnail_medium_url?: string
  thumbnail_large_url?: string
  thumbnail_generated_at?: string
}

// 新增儲存統計介面
interface StorageStatistics {
  totalPhotos: number
  photosWithSize: number
  photosWithoutSize: number
  totalStorage: {
    bytes: number
    formatted: string
  }
  averageSize: {
    bytes: number
    formatted: string
  }
  maxSize: {
    bytes: number
    formatted: string
  }
  minSize: {
    bytes: number
    formatted: string
  }
  sizeDistribution: {
    small: { count: number; percentage: number }
    medium: { count: number; percentage: number }
    large: { count: number; percentage: number }
    extraLarge: { count: number; percentage: number }
  }
}
```

### 2. 工具函數

```typescript
// 檔案大小格式化函數（如果前端需要獨立實現）
const formatFileSize = (bytes: number | null): string => {
  if (!bytes || bytes === 0) return '未知'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

// 檔案大小分類函數
const getFileSizeCategory = (bytes: number | null): string => {
  if (!bytes) return '未知'
  if (bytes < 1024 * 1024) return '小檔案'
  if (bytes < 5 * 1024 * 1024) return '中檔案'
  if (bytes < 10 * 1024 * 1024) return '大檔案'
  return '超大檔案'
}
```

## 實施步驟

1. **執行資料庫遷移**: 先執行 `add-file-size-to-photos.sql` 腳本
2. **更新照片上傳 API**: 修改 `/api/photo/upload` 中的 `processDirectUploadMetadata` 函數
3. **更新照片列表 API**: 修改 `/api/admin/photos/all-list` 返回檔案大小
4. **新增統計 API**: 創建 `/api/admin/photos/storage-stats`
5. **更新前端介面**: 修改照片管理頁面顯示檔案大小
6. **測試功能**: 確保所有功能正常運作

## 注意事項

1. **向後相容性**: 確保現有功能不受影響
2. **錯誤處理**: 適當處理檔案大小為空的情況
3. **效能考量**: 大量照片的統計查詢可能需要優化
4. **安全性**: 確保只有管理員可以存取統計 API