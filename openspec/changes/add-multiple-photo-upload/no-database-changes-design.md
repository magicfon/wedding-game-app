# 不修改資料庫的多張照片上傳設計

## 概述

基於用戶反饋，重新設計多張照片上傳功能，避免修改現有資料庫結構，通過應用層邏輯實現多張照片上傳和祝福語序號功能。

## 1. 設計原則

### 1.1 保持資料庫結構不變
- 不修改現有的 `photos` 表結構
- 不添加新的欄位或表格
- 保持現有的 API 端點和邏輯

### 1.2 在應用層面處理多張照片
- 前端處理多檔案選擇和預覽
- 後端將多張照片作為多次獨立上傳處理
- 通過業務邏輯實現祝福語序號

### 1.3 不使用群組化概念
- 每張照片作為獨立的上傳處理
- 相當於用戶手動進行三次獨立上傳
- 簡化實現邏輯，降低複雜度

## 2. 前端實現方案

### 2.1 多檔案選擇和預覽

#### 檔案選擇邏輯
```typescript
const MultiplePhotoUpload: React.FC = () => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [blessingMessage, setBlessingMessage] = useState('');
  const [maxPhotoCount, setMaxPhotoCount] = useState(3); // 從設定 API 獲取
  
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    
    // 驗證檔案數量
    if (files.length > maxPhotoCount) {
      setError(`最多只能選擇 ${maxPhotoCount} 張照片`);
      return;
    }
    
    setSelectedFiles(files);
    generatePreviews(files);
  };
  
  return (
    <div>
      {/* 多檔案選擇器 */}
      <input
        type="file"
        multiple
        accept="image/*"
        onChange={handleFileSelect}
        max={maxPhotoCount}
      />
      
      {/* 預覽網格 */}
      <PhotoPreviewGrid 
        files={selectedFiles}
        blessingMessage={blessingMessage}
        onRemove={handleRemoveFile}
      />
      
      {/* 祝福語輸入 */}
      <BlessingMessageInput 
        value={blessingMessage}
        onChange={setBlessingMessage}
        photoCount={selectedFiles.length}
      />
    </div>
  );
};
```

#### 照片預覽組件
```typescript
interface PhotoPreviewGridProps {
  files: File[];
  blessingMessage: string;
  onRemove: (index: number) => void;
}

const PhotoPreviewGrid: React.FC<PhotoPreviewGridProps> = ({
  files,
  blessingMessage,
  onRemove
}) => {
  const [previews, setPreviews] = useState<Preview[]>([]);
  
  useEffect(() => {
    const newPreviews = files.map((file, index) => ({
      file,
      preview: URL.createObjectURL(file),
      id: `preview-${index}`,
      sequence: index + 1
    }));
    
    setPreviews(newPreviews);
  }, [files]);
  
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {previews.map((preview, index) => (
        <div key={preview.id} className="relative group">
          <img
            src={preview.preview}
            alt={`照片 ${preview.sequence}`}
            className="w-full h-32 object-cover rounded-lg"
          />
          
          {/* 序號標籤 */}
          <div className="absolute top-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-sm">
            {preview.sequence}/{files.length}
          </div>
          
          {/* 移除按鈕 */}
          <button
            onClick={() => onRemove(index)}
            className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X className="w-4 h-4" />
          </button>
          
          {/* 祝福語預覽 */}
          {blessingMessage && (
            <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-75 text-white p-2 text-xs">
              {blessingMessage} ({preview.sequence}/{files.length})
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
```

### 2.2 祝福語序號預覽

#### 祝福語輸入組件
```typescript
interface BlessingMessageInputProps {
  value: string;
  onChange: (value: string) => void;
  photoCount: number;
}

const BlessingMessageInput: React.FC<BlessingMessageInputProps> = ({
  value,
  onChange,
  photoCount
}) => {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        祝福語
      </label>
      
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="寫下您對新人的祝福..."
        className="w-full h-32 p-4 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        maxLength={200}
      />
      
      {/* 字數統計 */}
      <div className="text-right text-sm text-gray-500">
        {value.length}/200
      </div>
      
      {/* 預覽區域 */}
      {value && photoCount > 0 && (
        <div className="mt-3 p-3 bg-gray-50 rounded-lg">
          <p className="text-sm font-medium text-gray-700 mb-2">祝福語預覽：</p>
          {Array.from({ length: photoCount }, (_, index) => (
            <p key={index} className="text-sm text-gray-600">
              "{value} ({index + 1}/{photoCount})"
            </p>
          ))}
        </div>
      )}
    </div>
  );
};
```

## 3. 後端實現方案

### 3.1 多次獨立上傳

#### 修改現有上傳 API
```typescript
// 修改現有的 /api/photo/upload/route.ts
export async function POST(request: NextRequest) {
  try {
    const supabase = createSupabaseAdmin();
    const formData = await request.formData();
    
    // 檢查是否為多檔案上傳
    const files = formData.getAll('files') as File[];
    const blessingMessage = formData.get('blessingMessage') as string;
    const isPublic = formData.get('isPublic') === 'true';
    const uploaderLineId = formData.get('uploaderLineId') as string;
    
    if (files.length === 0) {
      return NextResponse.json({ 
        error: '未選擇檔案' 
      }, { status: 400 });
    }
    
    // 檢查最大上傳數量
    const maxCount = await getMaxPhotoUploadCount();
    if (files.length > maxCount) {
      return NextResponse.json({ 
        error: `最多只能上傳 ${maxCount} 張照片` 
      }, { status: 400 });
    }
    
    // 並行處理多張照片上傳（相當於手動三次獨立上傳）
    const uploadPromises = files.map(async (file, index) => {
      // 為每張照片生成帶序號的祝福語
      const processedBlessingMessage = blessingMessage 
        ? `${blessingMessage} (${index + 1}/${files.length})`
        : blessingMessage;
      
      return uploadSinglePhoto({
        file,
        blessingMessage: processedBlessingMessage,
        isPublic,
        uploaderLineId
      });
    });
    
    const results = await Promise.allSettled(uploadPromises);
    
    // 處理結果
    const successful = results.filter(r => r.status === 'fulfilled');
    const failed = results.filter(r => r.status === 'rejected');
    
    if (failed.length > 0) {
      return NextResponse.json({
        success: false,
        message: `部分上傳失敗：${successful.length} 張成功，${failed.length} 張失敗`,
        data: {
          uploadedPhotos: successful.map(r => r.value),
          failedFiles: failed.map(r => r.reason)
        }
      }, { status: 207 }); // Multi-Status
    }
    
    return NextResponse.json({
      success: true,
      message: `成功上傳 ${files.length} 張照片`,
      data: {
        uploadedPhotos: successful.map(r => r.value),
        totalCount: files.length
      }
    });
    
  } catch (error) {
    return NextResponse.json({ 
      error: '照片上傳失敗',
      details: error.message 
    }, { status: 500 });
  }
}

// 單張照片上傳函數
async function uploadSinglePhoto({
  file,
  blessingMessage,
  isPublic,
  uploaderLineId
}: {
  file: File;
  blessingMessage: string;
  isPublic: boolean;
  uploaderLineId: string;
}) {
  const supabase = createSupabaseAdmin();
  
  // 驗證檔案
  if (!file.type.startsWith('image/')) {
    throw new Error('請選擇圖片檔案');
  }
  
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('圖片檔案不能超過 5MB');
  }
  
  // 生成檔名
  const fileExt = file.name.split('.').pop();
  const fileName = `${uploaderLineId}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
  
  // 上傳到 Supabase Storage
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('wedding-photos')
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false
    });
  
  if (uploadError) {
    throw new Error(`照片上傳失敗: ${uploadError.message}`);
  }
  
  // 獲取公開 URL
  const { data: urlData } = supabase.storage
    .from('wedding-photos')
    .getPublicUrl(fileName);
  
  // 生成縮圖 URL
  const generateVercelImageUrl = (baseUrl: string, width: number, quality: number = 80) => {
    const encodedUrl = encodeURIComponent(baseUrl);
    return `/_vercel/image?url=${encodedUrl}&w=${width}&q=${quality}&f=auto`;
  };
  
  // 儲存到資料庫
  const photoInsertData = {
    user_id: uploaderLineId,
    image_url: urlData.publicUrl,
    blessing_message: blessingMessage, // 使用處理後的祝福語
    is_public: isPublic,
    vote_count: 0,
    thumbnail_url_template: urlData.publicUrl,
    thumbnail_small_url: generateVercelImageUrl(urlData.publicUrl, 200, 75),
    thumbnail_medium_url: generateVercelImageUrl(urlData.publicUrl, 400, 80),
    thumbnail_large_url: generateVercelImageUrl(urlData.publicUrl, 800, 85),
    thumbnail_generated_at: new Date().toISOString()
  };
  
  const { data: photoData, error: dbError } = await supabase
    .from('photos')
    .insert(photoInsertData)
    .select()
    .single();
  
  if (dbError) {
    // 清理已上傳的檔案
    await supabase.storage
      .from('wedding-photos')
      .remove([fileName]);
    
    throw new Error(`照片資訊儲存失敗: ${dbError.message}`);
  }
  
  return photoData;
}
```

### 3.2 系統設定 API（不使用資料庫）

#### 使用環境變數和記憶體快取
```typescript
// 系統設定管理（不使用資料庫）
class SystemSettingsManager {
  private static instance: SystemSettingsManager;
  private settings: Map<string, any> = new Map();
  
  private constructor() {
    this.loadDefaultSettings();
  }
  
  static getInstance(): SystemSettingsManager {
    if (!SystemSettingsManager.instance) {
      SystemSettingsManager.instance = new SystemSettingsManager();
    }
    return SystemSettingsManager.instance;
  }
  
  private loadDefaultSettings() {
    // 從環境變數載入設定
    this.settings.set('maxPhotoUploadCount', 
      parseInt(process.env.MAX_PHOTO_UPLOAD_COUNT || '3', 10)
    );
    
    // 可以添加更多設定
    this.settings.set('maxFileSize', 5 * 1024 * 1024); // 5MB
    this.settings.set('allowedFileTypes', ['image/jpeg', 'image/png', 'image/gif', 'image/webp']);
  }
  
  getSetting(key: string): any {
    return this.settings.get(key);
  }
  
  updateSetting(key: string, value: any): void {
    this.settings.set(key, value);
    
    // 可以選擇性地持久化到環境變數或檔案
    if (typeof window !== 'undefined') {
      localStorage.setItem(`setting_${key}`, JSON.stringify(value));
    }
  }
  
  getAllSettings(): Record<string, any> {
    const settings: Record<string, any> = {};
    this.settings.forEach((value, key) => {
      settings[key] = value;
    });
    return settings;
  }
}

// API 端點
export async function GET() {
  try {
    const settingsManager = SystemSettingsManager.getInstance();
    const settings = settingsManager.getAllSettings();
    
    return NextResponse.json({
      success: true,
      data: settings
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const settingsManager = SystemSettingsManager.getInstance();
    
    // 驗證設定值
    if (body.maxPhotoUploadCount !== undefined) {
      const count = parseInt(body.maxPhotoUploadCount, 10);
      if (isNaN(count) || count < 1 || count > 10) {
        return NextResponse.json({
          success: false,
          error: '最大照片上傳數量必須是 1-10 之間的整數'
        }, { status: 400 });
      }
      
      settingsManager.updateSetting('maxPhotoUploadCount', count);
    }
    
    return NextResponse.json({
      success: true,
      message: '設定更新成功',
      data: body
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
```

## 4. 管理員設定頁面（不使用資料庫）

### 4.1 設定介面設計

#### 設定表單組件
```typescript
const SystemSettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<SystemSettings>({
    maxPhotoUploadCount: 3
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  useEffect(() => {
    loadSettings();
  }, []);
  
  const loadSettings = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/settings');
      const data = await response.json();
      if (data.success) {
        setSettings(data.data);
      }
    } catch (error) {
      console.error('載入設定失敗:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const saveSettings = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      
      const data = await response.json();
      if (data.success) {
        // 顯示成功訊息
        showSuccessMessage('設定已更新');
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      showErrorMessage('更新設定失敗: ' + error.message);
    } finally {
      setSaving(false);
    }
  };
  
  return (
    <AdminLayout title="系統設定">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-6">系統設定</h2>
          
          {/* 照片上傳設定 */}
          <div className="space-y-6">
            <div>
              <label htmlFor="maxPhotoUploadCount" className="block text-sm font-medium text-gray-700 mb-2">
                最大照片上傳數量
              </label>
              
              <div className="flex items-center space-x-4">
                <input
                  type="number"
                  id="maxPhotoUploadCount"
                  min="1"
                  max="10"
                  value={settings.maxPhotoUploadCount}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    maxPhotoUploadCount: parseInt(e.target.value, 10) || 1
                  }))}
                  className="w-20 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
                
                <span className="text-sm text-gray-500">張照片</span>
              </div>
              
              <p className="mt-2 text-sm text-gray-600">
                設定用戶一次可以上傳的最大照片數量。建議範圍：1-10 張
              </p>
              
              {/* 預覽 */}
              <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-700">
                  用戶將能夠一次上傳最多 <span className="font-semibold">{settings.maxPhotoUploadCount}</span> 張照片
                </p>
              </div>
            </div>
          </div>
          
          {/* 儲存按鈕 */}
          <div className="mt-8 flex justify-end">
            <button
              onClick={saveSettings}
              disabled={saving}
              className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
            >
              {saving ? '儲存中...' : '儲存設定'}
            </button>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};
```

## 5. 照片牆顯示（無需修改）

### 5.1 保持現有邏輯
- 照片牆的顯示邏輯完全不需要修改
- 因為祝福語序號已經在上傳時添加到 `blessing_message` 欄位
- 現有的照片卡片組件會直接顯示帶序號的祝福語

### 5.2 自動顯示序號
```typescript
// 現有的 PhotoCard 組件會自動顯示
const PhotoCard: React.FC<{ photo: Photo }> = ({ photo }) => {
  // photo.blessing_message 已經包含序號，直接顯示即可
  return (
    <div className="photo-card">
      {/* 照片內容 */}
      <img src={photo.thumbnail_medium_url} alt={photo.blessing_message} />
      
      {/* 祝福語 - 已經包含序號 */}
      {photo.blessing_message && (
        <p className="blessing-message">
          {photo.blessing_message}
        </p>
      )}
      
      {/* 其他內容 */}
    </div>
  );
};
```

## 6. 優勢和限制

### 6.1 優勢
- **無需資料庫變更**：降低部署風險
- **向後相容**：現有功能完全不受影響
- **實現簡單**：邏輯集中在應用層
- **部署容易**：只需要更新程式碼

### 6.2 限制
- **無法查詢同群組照片**：因為沒有群組 ID
- **設定持久化有限**：依賴記憶體或環境變數
- **無法追蹤上傳群組**：缺少群組級別的統計

## 7. 實現計劃

### 7.1 階段一：前端開發（2-3天）
- [ ] 實作多檔案選擇功能
- [ ] 創建照片預覽網格
- [ ] 添加祝福語序號預覽
- [ ] 實作檔案驗證

### 7.2 階段二：後端開發（2-3天）
- [ ] 修改照片上傳 API 支援多檔案
- [ ] 實作系統設定管理
- [ ] 添加錯誤處理和進度追蹤

### 7.3 階段三：管理員設定（1-2天）
- [ ] 創建系統設定頁面
- [ ] 實作設定驗證和儲存
- [ ] 整合到管理員導航

### 7.4 階段四：測試和部署（1-2天）
- [ ] 單元測試和整合測試
- [ ] 端到端測試
- [ ] 部署和驗證

## 8. 總結

這個不修改資料庫的方案提供了：

1. **簡化的實現**：通過應用層邏輯實現多張照片上傳
2. **降低風險**：避免資料庫變更可能帶來的問題
3. **快速部署**：只需要更新程式碼，無需資料庫遷移
4. **向後相容**：現有功能完全不受影響

雖然缺少一些進階功能（如群組查詢），但能夠滿足核心需求：多張照片上傳、祝福語序號、管理員控制。

## 9. 核心設計理念

### 9.1 不使用群組化概念
- 每張照片作為獨立的上傳處理
- 相當於用戶手動進行三次獨立上傳
- 簡化實現邏輯，降低複雜度

### 9.2 保持資料庫結構不變
- 不修改現有的 `photos` 表結構
- 不添加新的欄位或表格
- 保持現有的 API 端點和邏輯

### 9.3 在應用層面處理多張照片
- 前端處理多檔案選擇和預覽
- 後端將多張照片作為多次獨立上傳處理
- 通過業務邏輯實現祝福語序號

這個設計確保了：
- 向後相容性
- 可擴展性
- 用戶友好性
- 系統穩定性

通過遵循這個設計，我們可以成功實現多張照片上傳功能，提升婚禮互動遊戲系統的用戶體驗。