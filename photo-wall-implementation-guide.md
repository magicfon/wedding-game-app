# 照片牆縮圖優化 - 實施指南

## 概述
本指南提供了實施照片牆縮圖優化功能的詳細步驟，包括具體的代碼實現和部署流程。

## 實施順序

### 階段 1：準備工作和基礎設施

#### 1.1 安裝依賴
```bash
npm install sharp
npm install --save-dev @types/sharp
```

#### 1.2 資料庫結構更新
執行以下 SQL 文件：
```sql
-- database/add-thumbnail-support.sql
ALTER TABLE photos ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;
ALTER TABLE photos ADD COLUMN IF NOT EXISTS thumbnail_file_name TEXT;
ALTER TABLE photos ADD COLUMN IF NOT EXISTS has_thumbnail BOOLEAN DEFAULT FALSE;
ALTER TABLE photos ADD COLUMN IF NOT EXISTS thumbnail_width INTEGER;
ALTER TABLE photos ADD COLUMN IF NOT EXISTS thumbnail_height INTEGER;

CREATE INDEX IF NOT EXISTS idx_photos_has_thumbnail ON photos(has_thumbnail);
CREATE INDEX IF NOT EXISTS idx_photos_thumbnail_url ON photos(thumbnail_url) WHERE thumbnail_url IS NOT NULL;
```

#### 1.3 更新類型定義
在 `src/lib/supabase.ts` 中更新 Photo 介面：
```typescript
export interface Photo {
  id: number
  user_id: string
  image_url: string
  thumbnail_url?: string
  thumbnail_file_name?: string
  has_thumbnail?: boolean
  thumbnail_width?: number
  thumbnail_height?: number
  blessing_message: string
  is_public: boolean
  vote_count: number
  created_at: string
  updated_at?: string
}
```

### 階段 2：後端實施

#### 2.1 創建圖片處理工具
創建 `src/lib/image-processing.ts` 文件：
```typescript
import sharp from 'sharp'
import { createSupabaseAdmin } from './supabase-server'

export interface ImageProcessingOptions {
  width?: number
  quality?: number
  format?: 'jpeg' | 'webp' | 'png'
}

export class ImageProcessor {
  private supabase = createSupabaseAdmin()
  
  async generateThumbnail(
    originalBuffer: Buffer,
    fileName: string,
    options: ImageProcessingOptions = {}
  ): Promise<{ fileName: string; buffer: Buffer; width: number; height: number }> {
    const { width = 150, quality = 85, format = 'jpeg' } = options
    
    const result = await sharp(originalBuffer)
      .resize(width, null, { withoutEnlargement: true, fit: 'inside' })
      .jpeg({ quality })
      .toBuffer({ resolveWithObject: true })
    
    const fileExt = fileName.split('.').pop()
    const nameWithoutExt = fileName.replace(`.${fileExt}`, '')
    const thumbnailFileName = `${nameWithoutExt}_thumb.${format}`
    
    return {
      fileName: thumbnailFileName,
      buffer: result.data,
      width: result.info.width,
      height: result.info.height
    }
  }
  
  async uploadThumbnail(
    thumbnailBuffer: Buffer,
    thumbnailFileName: string
  ): Promise<string> {
    const { data, error } = await this.supabase.storage
      .from('wedding-photos')
      .upload(`thumbnails/${thumbnailFileName}`, thumbnailBuffer, {
        cacheControl: '3600',
        upsert: false
      })
    
    if (error) {
      throw new Error(`縮圖上傳失敗: ${error.message}`)
    }
    
    const { data: urlData } = this.supabase.storage
      .from('wedding-photos')
      .getPublicUrl(`thumbnails/${thumbnailFileName}`)
    
    return urlData.publicUrl
  }
}
```

#### 2.2 更新照片上傳 API
修改 `src/app/api/photo/upload/route.ts`，在現有代碼中添加縮圖生成邏輯：
```typescript
// 在文件頂部添加導入
import { ImageProcessor } from '@/lib/image-processing'

// 在上傳邏輯中添加縮圖生成
// 將文件轉換為 Buffer
const arrayBuffer = await file.arrayBuffer()
const buffer = Buffer.from(arrayBuffer)

// 上傳原始圖片（現有代碼保持不變）
const { data: uploadData, error: uploadError } = await supabase.storage
  .from('wedding-photos')
  .upload(fileName, buffer, {
    cacheControl: '3600',
    upsert: false
  })

// 獲取原始圖片公開 URL（現有代碼保持不變）
const { data: urlData } = supabase.storage
  .from('wedding-photos')
  .getPublicUrl(fileName)

// 生成縮圖（新增代碼）
const imageProcessor = new ImageProcessor()
let thumbnailUrl: string | undefined
let thumbnailFileName: string | undefined
let thumbnailWidth: number | undefined
let thumbnailHeight: number | undefined

try {
  const thumbnailData = await imageProcessor.generateThumbnail(buffer, fileName)
  thumbnailUrl = await imageProcessor.uploadThumbnail(
    thumbnailData.buffer,
    thumbnailData.fileName
  )
  thumbnailFileName = thumbnailData.fileName
  thumbnailWidth = thumbnailData.width
  thumbnailHeight = thumbnailData.height
} catch (thumbnailError) {
  console.error('縮圖生成失敗:', thumbnailError)
  // 縮圖生成失敗不影響主要上傳流程
}

// 更新資料庫插入邏輯
const photoInsertData: any = {
  user_id: uploaderLineId,
  image_url: urlData.publicUrl,
  thumbnail_url: thumbnailUrl,
  thumbnail_file_name: thumbnailFileName,
  has_thumbnail: !!thumbnailUrl,
  thumbnail_width: thumbnailWidth,
  thumbnail_height: thumbnailHeight,
  blessing_message: blessingMessage || '',
  is_public: isPublic,
  vote_count: 0
}
```

#### 2.3 更新照片列表 API
修改 `src/app/api/photo/list/route.ts`，確保返回縮圖信息：
```typescript
// 在現有代碼中添加縮圖處理
const { data: photos, error } = await query

if (error) {
  // 現有錯誤處理
}

// 確保每個照片對象都有完整的縮圖信息
const processedPhotos = (photos || []).map(photo => ({
  ...photo,
  thumbnail_url: photo.thumbnail_url || photo.image_url, // 向後相容
  has_thumbnail: photo.has_thumbnail || false
}))

return NextResponse.json({
  success: true,
  data: {
    photos: processedPhotos,
    total: processedPhotos.length,
    sortBy,
    isPublic
  }
})
```

### 階段 3：前端實施

#### 3.1 創建照片模態框組件
創建 `src/components/PhotoModal.tsx`：
```typescript
'use client'

import { useState, useEffect } from 'react'
import { PhotoWithUser } from '@/lib/supabase'
import { X, Heart } from 'lucide-react'

interface PhotoModalProps {
  photo: PhotoWithUser
  onClose: () => void
  onVote: (photoId: number) => void
  userVotes: Record<number, number>
  votingEnabled: boolean
  votingInProgress: Set<number>
}

export default function PhotoModal({ 
  photo, 
  onClose, 
  onVote, 
  userVotes, 
  votingEnabled, 
  votingInProgress 
}: PhotoModalProps) {
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageError, setImageError] = useState(false)
  
  useEffect(() => {
    setImageLoaded(false)
    setImageError(false)
  }, [photo.id])
  
  const handleImageLoad = () => {
    setImageLoaded(true)
  }
  
  const handleImageError = () => {
    setImageError(true)
  }
  
  return (
    <div 
      className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4 animate-fadeIn"
      onClick={onClose}
    >
      <div className="max-w-6xl w-full h-full flex flex-col">
        {/* 頂部工具列 */}
        <div className="flex items-center justify-between p-4 text-white flex-shrink-0">
          <div className="flex items-center space-x-4">
            <img
              src={photo.uploader.avatar_url || '/default-avatar.png'}
              alt="Avatar"
              className="w-12 h-12 rounded-full border-2 border-white"
            />
            <div>
              <h3 className="font-semibold text-lg">{photo.uploader.display_name}</h3>
              <p className="text-sm text-gray-300">
                {new Date(photo.created_at).toLocaleString('zh-TW')}
              </p>
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        
        {/* 可滾動的內容區域 */}
        <div 
          className="flex-1 overflow-y-auto overflow-x-hidden px-4 pb-4"
          onClick={(e) => e.stopPropagation()}
        >
          {/* 照片容器 */}
          <div className="flex items-center justify-center relative min-h-0 mb-4">
            {/* 縮圖（初始顯示） */}
            <img
              src={photo.thumbnail_url || photo.image_url}
              alt="Wedding photo thumbnail"
              className={`max-w-full w-auto h-auto object-contain rounded-lg shadow-2xl transition-opacity duration-300 ${
                imageLoaded && !imageError ? 'opacity-0' : 'opacity-100'
              }`}
              style={{ position: imageLoaded ? 'absolute' : 'relative' }}
            />
            
            {/* 原圖（背景載入） */}
            <img
              src={photo.image_url}
              alt="Wedding photo"
              className={`max-w-full w-auto h-auto object-contain rounded-lg shadow-2xl transition-opacity duration-300 ${
                imageLoaded && !imageError ? 'opacity-100' : 'opacity-0'
              }`}
              onLoad={handleImageLoad}
              onError={handleImageError}
              onClick={(e) => e.stopPropagation()}
            />
            
            {/* 載入指示器 */}
            {!imageLoaded && !imageError && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
              </div>
            )}
            
            {/* 投票區域 - 右上角 */}
            {votingEnabled && (
              <div className="absolute top-4 right-4 flex items-center space-x-3">
                {/* 得票數顯示 */}
                <div className="bg-pink-500/90 backdrop-blur-sm px-4 py-2 rounded-full flex items-center space-x-2 shadow-lg">
                  <Heart className="w-5 h-5 fill-current text-white" />
                  <span className="font-semibold text-white">{photo.vote_count}</span>
                </div>
                
                {/* 投票按鈕 */}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onVote(photo.id)
                  }}
                  disabled={votingInProgress.has(photo.id)}
                  className={`p-3 rounded-full shadow-2xl transition-all duration-200 backdrop-blur-sm ${
                    votingInProgress.has(photo.id)
                      ? 'bg-white/60 cursor-wait'
                      : userVotes[photo.id] > 0
                      ? 'bg-white/90'
                      : 'bg-white/90 hover:bg-white hover:scale-110'
                  }`}
                >
                  <Heart className={`w-8 h-8 transition-all ${
                    votingInProgress.has(photo.id)
                      ? 'text-gray-400 animate-pulse'
                      : userVotes[photo.id] > 0 
                      ? 'text-red-500 fill-current drop-shadow-lg' 
                      : 'text-gray-400 hover:text-pink-500'
                  }`} />
                </button>
              </div>
            )}
          </div>
          
          {/* 祝福訊息區域 */}
          {photo.blessing_message && (
            <div 
              className="bg-white/10 backdrop-blur-md rounded-2xl p-6 text-white"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="text-white/90 leading-relaxed text-lg break-words">
                {photo.blessing_message}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
```

#### 3.2 更新照片牆頁面
修改 `src/app/photo-wall/page.tsx`：
1. 在文件頂部添加導入：
```typescript
import PhotoModal from '@/components/PhotoModal'
```

2. 更新照片渲染部分，使用縮圖：
```typescript
<div className="columns-3 sm:columns-4 md:columns-5 lg:columns-4 xl:columns-5 gap-3 sm:gap-4 space-y-3 sm:space-y-4">
  {displayedPhotos.map((photo) => (
    <div 
      key={photo.id} 
      className="break-inside-avoid mb-3 sm:mb-4 cursor-pointer group"
      onClick={() => setSelectedPhoto(photo)}
    >
      <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 hover:scale-[1.02]">
        {/* 照片 - 使用縮圖 */}
        <div className="relative">
          <img
            src={photo.thumbnail_url || photo.image_url} // 優先使用縮圖
            alt="Wedding photo"
            className="w-full h-auto object-cover"
            loading="lazy"
          />
          
          {/* 票數顯示 */}
          <div className="absolute bottom-2 left-2 sm:bottom-3 sm:left-3 bg-black/70 text-white px-2 py-1 sm:px-3 sm:py-1.5 rounded-full flex items-center space-x-1">
            <Heart className="w-3 h-3 sm:w-4 sm:h-4 fill-current" />
            <span className="text-xs sm:text-sm font-semibold">{photo.vote_count}</span>
          </div>
        </div>
        
        {/* 簡化資訊 */}
        <div className="p-2 sm:p-3">
          <div className="flex items-center space-x-1.5 sm:space-x-2">
            <img
              src={photo.uploader.avatar_url || '/default-avatar.png'}
              alt="Avatar"
              className="w-5 h-5 sm:w-6 sm:h-6 rounded-full"
            />
            <span className="text-xs sm:text-sm font-medium text-gray-800 truncate">
              {photo.uploader.display_name}
            </span>
          </div>
        </div>
      </div>
    </div>
  ))}
</div>
```

3. 替換現有的模態框部分：
```typescript
{/* 照片放大檢視模態框 */}
{selectedPhoto && (
  <PhotoModal
    photo={selectedPhoto}
    onClose={() => setSelectedPhoto(null)}
    onVote={handleVote}
    userVotes={userVotes}
    votingEnabled={votingEnabled}
    votingInProgress={votingInProgress}
  />
)}
```

### 階段 4：遷移腳本

#### 4.1 創建遷移腳本
創建 `database/migrate-photos-to-thumbnails.sql` 文件（參考技術設計文檔中的完整腳本）。

#### 4.2 創建遷移 API
創建 `src/app/api/admin/migrate-photos/route.ts`：
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase-server'
import { ImageProcessor } from '@/lib/image-processing'

export async function POST(request: NextRequest) {
  try {
    const supabase = createSupabaseAdmin()
    const imageProcessor = new ImageProcessor()
    
    // 獲取一批需要遷移的照片
    const { data: photos, error } = await supabase
      .from('photos')
      .select('id, image_url, user_id, created_at')
      .is('has_thumbnail', false)
      .limit(10)
    
    if (error) {
      throw error
    }
    
    if (!photos || photos.length === 0) {
      return NextResponse.json({
        success: true,
        message: '沒有需要遷移的照片',
        data: { migrated: 0 }
      })
    }
    
    let migratedCount = 0
    
    for (const photo of photos) {
      try {
        // 下載原始圖片
        const response = await fetch(photo.image_url)
        if (!response.ok) {
          console.error(`無法下載照片 ${photo.id}:`, response.statusText)
          continue
        }
        
        const buffer = Buffer.from(await response.arrayBuffer())
        
        // 生成縮圖
        const fileName = `migration_${photo.id}_${Date.now()}.jpg`
        const thumbnailData = await imageProcessor.generateThumbnail(buffer, fileName)
        
        // 上傳縮圖
        const thumbnailUrl = await imageProcessor.uploadThumbnail(
          thumbnailData.buffer,
          thumbnailData.fileName
        )
        
        // 更新資料庫
        await supabase
          .from('photos')
          .update({
            thumbnail_url: thumbnailUrl,
            thumbnail_file_name: thumbnailData.fileName,
            has_thumbnail: true,
            thumbnail_width: thumbnailData.width,
            thumbnail_height: thumbnailData.height,
            updated_at: new Date().toISOString()
          })
          .eq('id', photo.id)
        
        migratedCount++
        console.log(`成功遷移照片 ${photo.id}`)
        
      } catch (error) {
        console.error(`遷移照片 ${photo.id} 失敗:`, error)
      }
    }
    
    return NextResponse.json({
      success: true,
      message: `成功遷移 ${migratedCount} 張照片`,
      data: { migrated: migratedCount, total: photos.length }
    })
    
  } catch (error) {
    console.error('照片遷移錯誤:', error)
    return NextResponse.json({
      error: '照片遷移失敗',
      details: error instanceof Error ? error.message : '未知錯誤'
    }, { status: 500 })
  }
}
```

### 階段 5：測試和驗證

#### 5.1 功能測試清單
- [ ] 新上傳照片自動生成縮圖
- [ ] 照片牆顯示縮圖
- [ ] 點擊照片顯示漸進式載入效果
- [ ] 舊照片遷移功能正常
- [ ] 向後相容性（沒有縮圖的照片仍能正常顯示）

#### 5.2 性能測試
- [ ] 照片牆初始載入時間對比
- [ ] 縮圖載入速度測試
- [ ] 原圖載入時間測試

#### 5.3 兼容性測試
- [ ] 各種設備尺寸測試
- [ ] 不同圖片格式測試
- [ ] 網路慢速環境測試

### 階段 6：部署

#### 6.1 部署順序
1. 部署資料庫更新
2. 部署後端 API 更新
3. 運行遷移腳本（可選）
4. 部署前端更新
5. 監控和驗證

#### 6.2 監控設置
設置以下監控指標：
- 照片上傳成功率
- 縮圖生成成功率
- 照片牆載入時間
- 錯誤率監控

## 故障排除

### 常見問題和解決方案

1. **縮圖生成失敗**
   - 檢查 Sharp 庫是否正確安裝
   - 確認 Supabase Storage 權限設置
   - 檢查圖片格式是否支援

2. **舊照片無法顯示**
   - 確認向後相容性邏輯
   - 檢查 API 返回的數據結構
   - 驗證前端組件的回退邏輯

3. **性能沒有改善**
   - 檢查縮圖尺寸是否合適
   - 確認瀏覽器緩存設置
   - 驗證圖片格式優化

4. **遷移腳本失敗**
   - 檢查網路連接
   - 確認圖片 URL 可訪問性
   - 監控遷移進度和錯誤日誌

## 總結

本實施指南提供了完整的實施步驟，包括：
- 詳細的代碼實現
- 部署和測試流程
- 故障排除指南

按照這個指南執行，可以順利完成照片牆的縮圖優化功能，提高用戶體驗和載入性能。