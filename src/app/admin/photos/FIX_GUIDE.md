# 管理頁面縮圖修復指南

## 問題
管理頁面縮圖無法顯示，但照片牆可以正常顯示

## 原因
- 照片牆使用 `ResponsiveImage` 組件（有錯誤處理）
- 管理頁面使用普通 `img` 標籤（無錯誤處理）

## 修復步驟

### 1. 添加 ResponsiveImage 導入

在檔案開頭（第 7-8 行之間）添加：

```typescript
import { Eye, EyeOff, Download, Trash2, Image as ImageIcon, Clock, User, Heart, Filter, CheckCircle, XCircle, Loader2, Users, HardDrive, CheckSquare, Square, Video, Play } from 'lucide-react'
import ResponsiveImage from '@/components/ResponsiveImage'  // 添加這行
```

### 2. 替換影片縮圖部分

找到第 535-545 行左右的影片 `<img>` 標籤，替換為：

```typescript
<div className="w-full h-full relative">
  <ResponsiveImage
    src={photo.image_url}
    alt={photo.blessing_message || '影片'}
    className="w-full h-full object-cover"
    thumbnailUrls={{
      small: photo.thumbnail_small_url,
      medium: photo.thumbnail_medium_url,
      large: photo.thumbnail_large_url
    }}
    sizes="200px"
  />
  {/* 保留 Play 按鈕和影片標籤 */}
```

### 3. 替換照片縮圖部分

找到第 556-565 行左右的照片 `<img>` 標籤，替換為：

```typescript
) : photo.image_url ? (
  <ResponsiveImage
    src={photo.image_url}
    alt={photo.blessing_message || '照片'}
    className="w-full h-full object-cover"
    thumbnailUrls={{
      small: photo.thumbnail_small_url,
      medium: photo.thumbnail_medium_url,
      large: photo.thumbnail_large_url
    }}
    sizes="200px"
  />
```

## 完整修復代碼

我已經創建了兩個參考檔案：
1. `FIXED_page_header.txt` - 檔案開頭部分（含導入）
2. `FIXED_thumbnail_section.txt` - 縮圖顯示部分的完整代碼

請參考這些檔案進行修改。

## 測試

修改後執行：
```bash
npm run build
```

確保編譯成功，然後部署測試。
