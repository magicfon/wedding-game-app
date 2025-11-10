# 簡化版照片檔案大小功能 - 實施方案

## 需求概述

在照片管理介面的照片瀏覽狀態下，將原本顯示日期的地方改為顯示檔案大小，其他功能保持不變。

## 具體修改

### 1. 資料庫更新

需要為 `photos` 表新增 `file_size` 欄位：

```sql
-- 新增檔案大小欄位
ALTER TABLE photos 
ADD COLUMN IF NOT EXISTS file_size BIGINT DEFAULT NULL;

-- 新增索引
CREATE INDEX IF NOT EXISTS idx_photos_file_size ON photos(file_size DESC) WHERE file_size IS NOT NULL;

-- 新增註釋
COMMENT ON COLUMN photos.file_size IS '照片檔案大小（位元組）';
```

### 2. 後端 API 更新

#### 2.1 更新照片上傳 API (`/api/photo/upload`)

在 `processDirectUploadMetadata` 函數中新增檔案大小：

```typescript
// 儲存到資料庫（新增 file_size 欄位）
const photoInsertData = {
  user_id: uploaderLineId,
  image_url: fileUrl,
  blessing_message: blessingMessage,
  is_public: isPublic,
  vote_count: 0,
  file_size: fileSize, // 新增這一行
  thumbnail_url_template: fileUrl,
  thumbnail_small_url: generateVercelImageUrl(fileUrl, 200, 75, 'auto'),
  thumbnail_medium_url: generateVercelImageUrl(fileUrl, 400, 80, 'auto'),
  thumbnail_large_url: generateVercelImageUrl(fileUrl, 800, 85, 'auto'),
  thumbnail_generated_at: new Date().toISOString()
};
```

#### 2.2 更新照片列表 API (`/api/admin/photos/all-list`)

在查詢中新增 `file_size` 欄位：

```typescript
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
    file_size, // 新增這一行
    uploader:users!photos_user_id_fkey (
      display_name,
      avatar_url
    )
  `)
  .order('created_at', { ascending: false })
```

### 3. 前端介面更新

#### 3.1 更新類型定義

```typescript
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
```

#### 3.2 新增檔案大小格式化函數

```typescript
// 在照片管理頁面中新增
const formatFileSize = (bytes: number | null): string => {
  if (!bytes || bytes === 0) return '未知'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}
```

#### 3.3 修改照片卡片顯示

在 `src/app/admin/photos/page.tsx` 中，找到照片卡片的底部資訊區域，將日期顯示改為檔案大小顯示：

```typescript
// 原本的代碼（約在第 402-411 行）：
<div className="flex items-center justify-between text-xs text-gray-500">
  <div className="flex items-center space-x-1">
    <Heart className="w-3 h-3 text-red-400" />
    <span>{photo.vote_count}</span>
  </div>
  <div className="flex items-center space-x-1">
    <Clock className="w-3 h-3" />
    <span>{new Date(photo.created_at).toLocaleDateString('zh-TW')}</span>
  </div>
</div>

// 修改為：
<div className="flex items-center justify-between text-xs text-gray-500">
  <div className="flex items-center space-x-1">
    <Heart className="w-3 h-3 text-red-400" />
    <span>{photo.vote_count}</span>
  </div>
  <div className="flex items-center space-x-1">
    <HardDrive className="w-3 h-3" /> {/* 使用硬碟圖示 */}
    <span>{formatFileSize(photo.file_size)}</span>
  </div>
</div>
```

#### 3.4 新增圖示匯入

在檔案頂部新增 `HardDrive` 圖示匯入：

```typescript
import { Eye, EyeOff, Download, Trash2, Image as ImageIcon, Clock, User, Heart, Filter, CheckCircle, XCircle, Loader2, Users, HardDrive } from 'lucide-react'
```

## 實施步驟

1. **執行資料庫遷移**：在 Supabase SQL Editor 中執行上述 SQL 腳本
2. **更新後端 API**：修改照片上傳和列表 API
3. **更新前端介面**：修改照片管理頁面的顯示邏輯
4. **測試功能**：確保檔案大小正確顯示

## 預期效果

修改後，照片卡片底部將顯示：
- 左側：愛心數量（保持不變）
- 右側：檔案大小（取代原本的日期）

例如：
- `❤️ 12` `📁 2.5 MB`
- `❤️ 8` `📁 1.8 MB`
- `❤️ 5` `📁 3.2 MB`

## 注意事項

1. **向後相容性**：現有照片的 `file_size` 欄位將為 NULL，會顯示 "未知"
2. **新上傳照片**：會自動記錄檔案大小
3. **簡潔實現**：不影響其他功能，只修改顯示內容

這個簡化方案滿足了您的需求：只在照片瀏覽狀態下將日期改為檔案大小顯示，其他功能保持不變。