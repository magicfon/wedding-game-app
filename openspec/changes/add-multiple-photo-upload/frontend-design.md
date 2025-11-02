# 前端多張照片上傳介面設計

## 1. 照片上傳頁面改進

### 1.1 多檔案選擇介面

#### 檔案選擇區域
- 保持現有的點擊選擇功能
- 添加 `multiple` 屬性支援多選
- 顯示當前選擇數量和最大限制
- 支援拖拽多檔案上傳

```typescript
// 新的檔案輸入元素
<input
  ref={fileInputRef}
  type="file"
  accept="image/*"
  multiple={true}
  max={maxPhotoCount}
  onChange={handleFileSelect}
  className="hidden"
/>
```

#### 選擇狀態提示
- 顯示 "已選擇 X/Y 張照片"
- 超過限制時顯示錯誤提示
- 支援移除已選擇的個別照片

### 1.2 多張照片預覽區域

#### 預覽網格佈局
- 使用響應式網格顯示多張照片預覽
- 每張照片顯示縮圖和移除按鈕
- 顯示照片序號 (1/3, 2/3, 3/3)
- 支援照片重新排序（可選功能）

```typescript
// 照片預覽組件結構
interface PhotoPreview {
  file: File;
  preview: string;
  id: string;
  sequence: number;
}

// 預覽網格
<div className="grid grid-cols-2 md:grid-cols-3 gap-4">
  {selectedPhotos.map((photo, index) => (
    <div key={photo.id} className="relative group">
      <img src={photo.preview} alt={`照片 ${index + 1}`} />
      <div className="absolute top-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded">
        {index + 1}/{selectedPhotos.length}
      </div>
      <button onClick={() => removePhoto(photo.id)} className="absolute top-2 right-2">
        <X className="w-4 h-4" />
      </button>
    </div>
  ))}
</div>
```

#### 照片資訊顯示
- 每張照片顯示檔案大小
- 顯示檔案格式
- 顯示總檔案大小

### 1.3 祝福語輸入區域

#### 統一祝福語輸入
- 保持現有的祝福語輸入框
- 添加提示說明會應用到所有照片
- 顯示預覽效果（可選）

```typescript
// 祝福語預覽
<div className="bg-gray-50 p-3 rounded-lg">
  <p className="text-sm text-gray-600 mb-2">祝福語預覽：</p>
  {selectedPhotos.map((_, index) => (
    <p key={index} className="text-sm">
      "{blessingMessage} ({index + 1}/{selectedPhotos.length})"
    </p>
  ))}
</div>
```

## 2. 上傳進度顯示

### 2.1 整體上傳進度
- 顯示整體上傳進度條
- 顯示 "正在上傳 X/Y 張照片"
- 顯示總上傳進度百分比

### 2.2 個別照片進度
- 每張照片顯示獨立的進度條
- 顯示上傳狀態（上傳中、完成、失敗）
- 支援重試失敗的照片

```typescript
// 上傳進度組件
<div className="space-y-2">
  {uploadProgress.map((progress) => (
    <div key={progress.photoId} className="flex items-center space-x-3">
      <img src={progress.preview} className="w-12 h-12 object-cover rounded" />
      <div className="flex-1">
        <div className="flex justify-between text-sm">
          <span>照片 {progress.sequence}</span>
          <span>{progress.status}</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-500 h-2 rounded-full transition-all"
            style={{ width: `${progress.percentage}%` }}
          />
        </div>
      </div>
    </div>
  ))}
</div>
```

## 3. 錯誤處理和驗證

### 3.1 檔案驗證
- 檢查每張照片的格式
- 檢查每張照片的大小（最大 5MB）
- 檢查總照片數量不超過限制
- 檢查總檔案大小（可選限制）

### 3.2 錯誤提示
- 顯示具體的錯誤訊息
- 提供解決方案建議
- 支援部分重新上傳

```typescript
// 錯誤處理示例
const validateFiles = (files: File[]): ValidationResult => {
  const errors: string[] = [];
  
  if (files.length > maxPhotoCount) {
    errors.push(`最多只能選擇 ${maxPhotoCount} 張照片`);
  }
  
  files.forEach((file, index) => {
    if (!file.type.startsWith('image/')) {
      errors.push(`第 ${index + 1} 張照片不是有效的圖片格式`);
    }
    
    if (file.size > 5 * 1024 * 1024) {
      errors.push(`第 ${index + 1} 張照片超過 5MB 限制`);
    }
  });
  
  return {
    isValid: errors.length === 0,
    errors
  };
};
```

## 4. 響應式設計

### 4.1 行動裝置適配
- 小螢幕使用單列預覽
- 觸控友好的按鈕大小
- 優化的拖拽體驗

### 4.2 桌面裝置優化
- 多列預覽網格
- 鍵盤導航支援
- 拖拽排序功能

## 5. 用戶體驗改進

### 5.1 操作流程優化
- 清晰的步驟指示
- 即時反饋和提示
- 流暢的動畫效果

### 5.2 可訪問性
- 鍵盤導航支援
- 螢幕閱讀器支援
- 高對比度模式支援

## 6. 效能優化

### 6.1 預覽圖片優化
- 使用適當的預覽圖片尺寸
- 延遲載入非可見預覽
- 記憶體管理（清理舊預覽）

### 6.2 上傳優化
- 並行上傳多張照片
- 上傳失敗自動重試
- 網路狀態檢測

## 7. 組件結構設計

### 7.1 主要組件
- `MultiplePhotoUpload`: 主要的上傳組件
- `PhotoPreviewGrid`: 照片預覽網格
- `UploadProgress`: 上傳進度顯示
- `FileSelector`: 檔案選擇器

### 7.2 輔助組件
- `PhotoPreviewItem`: 單張照片預覽
- `ProgressBar`: 進度條組件
- `ErrorMessage`: 錯誤訊息顯示
- `ValidationSummary`: 驗證結果摘要

## 8. 狀態管理

### 8.1 本地狀態
```typescript
interface UploadState {
  selectedPhotos: PhotoPreview[];
  blessingMessage: string;
  isPublic: boolean;
  uploadProgress: UploadProgress[];
  isUploading: boolean;
  errors: string[];
}
```

### 8.2 狀態更新流程
1. 用戶選擇照片 → 更新 selectedPhotos
2. 用戶輸入祝福語 → 更新 blessingMessage
3. 開始上傳 → 更新 isUploading 和 uploadProgress
4. 上傳完成 → 清理狀態，顯示成功訊息