# 後端多張照片上傳 API 設計

## 1. 照片上傳 API 改進

### 1.1 修改現有的 `/api/photo/upload` 端點

#### 請求格式
```typescript
// 支援多檔案上傳的請求格式
interface MultiplePhotoUploadRequest {
  files: File[]; // 多個檔案
  blessingMessage: string;
  isPublic: boolean;
  uploaderLineId: string;
}

// FormData 格式
const formData = new FormData();
files.forEach((file, index) => {
  formData.append(`files[${index}]`, file);
});
formData.append('blessingMessage', blessingMessage);
formData.append('isPublic', isPublic.toString());
formData.append('uploaderLineId', uploaderLineId);
```

#### 響應格式
```typescript
interface MultiplePhotoUploadResponse {
  success: boolean;
  message: string;
  data?: {
    uploadedPhotos: UploadedPhoto[];
    uploadGroupId: string;
    totalCount: number;
    successCount: number;
    failureCount: number;
  };
  errors?: string[];
}

interface UploadedPhoto {
  id: number;
  fileName: string;
  publicUrl: string;
  thumbnailUrls: {
    small: string;
    medium: string;
    large: string;
  };
  blessingMessage: string;
  sequence: number;
  uploadTime: string;
}
```

### 1.2 上傳群組 ID 生成

#### 群組 ID 生成策略
```typescript
// 生成唯一的上傳群組 ID
const generateUploadGroupId = (): string => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `upload_${timestamp}_${random}`;
};

// 或者使用 UUID
import { v4 as uuidv4 } from 'uuid';
const generateUploadGroupId = (): string => {
  return `upload_${uuidv4()}`;
};
```

### 1.3 並行上傳處理

#### 並行上傳邏輯
```typescript
// 並行處理多張照片上傳
const processMultiplePhotos = async (
  files: File[],
  uploadGroupId: string,
  blessingMessage: string,
  isPublic: boolean,
  uploaderLineId: string
): Promise<UploadResult[]> => {
  
  const uploadPromises = files.map(async (file, index) => {
    try {
      // 為每張照片生成唯一檔名
      const fileExt = file.name.split('.').pop();
      const fileName = `${uploaderLineId}_${uploadGroupId}_${index + 1}.${fileExt}`;
      
      // 上傳到 Supabase Storage
      const uploadResult = await uploadToSupabase(file, fileName);
      
      // 生成縮圖 URL
      const thumbnailUrls = generateThumbnailUrls(uploadResult.publicUrl);
      
      // 儲存到資料庫
      const photoData = await savePhotoToDatabase({
        fileName,
        publicUrl: uploadResult.publicUrl,
        thumbnailUrls,
        blessingMessage,
        isPublic,
        uploaderLineId,
        uploadGroupId,
        photoSequence: index + 1
      });
      
      return {
        success: true,
        photo: photoData,
        fileIndex: index
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        fileIndex: index,
        fileName: file.name
      };
    }
  });
  
  return Promise.all(uploadPromises);
};
```

## 2. 系統設定 API

### 2.1 讀取系統設定 API

#### 端點：`GET /api/admin/settings`

```typescript
interface SystemSettingsResponse {
  success: boolean;
  data?: {
    maxPhotoUploadCount: number;
    [key: string]: any;
  };
  error?: string;
}

// 實現範例
export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseAdmin();
    
    // 驗證管理員權限
    const adminUser = await verifyAdmin(request);
    if (!adminUser) {
      return NextResponse.json({
        success: false,
        error: '未授權的存取'
      }, { status: 401 });
    }
    
    // 讀取所有系統設定
    const { data: settings, error } = await supabase
      .from('system_settings')
      .select('setting_key, setting_value, setting_type');
    
    if (error) throw error;
    
    // 轉換為物件格式
    const settingsObject = settings.reduce((acc, setting) => {
      let value = setting.setting_value;
      
      // 根據類型轉換值
      switch (setting.setting_type) {
        case 'integer':
          value = parseInt(value, 10);
          break;
        case 'boolean':
          value = value === 'true';
          break;
      }
      
      acc[setting.setting_key] = value;
      return acc;
    }, {} as Record<string, any>);
    
    return NextResponse.json({
      success: true,
      data: settingsObject
    });
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
```

### 2.2 更新系統設定 API

#### 端點：`PUT /api/admin/settings`

```typescript
interface UpdateSettingsRequest {
  maxPhotoUploadCount?: number;
  [key: string]: any;
}

interface UpdateSettingsResponse {
  success: boolean;
  message?: string;
  data?: Record<string, any>;
  error?: string;
}

// 實現範例
export async function PUT(request: NextRequest) {
  try {
    const supabase = createSupabaseAdmin();
    const body: UpdateSettingsRequest = await request.json();
    
    // 驗證管理員權限
    const adminUser = await verifyAdmin(request);
    if (!adminUser) {
      return NextResponse.json({
        success: false,
        error: '未授權的存取'
      }, { status: 401 });
    }
    
    // 驗證設定值
    if (body.maxPhotoUploadCount !== undefined) {
      if (!Number.isInteger(body.maxPhotoUploadCount) || 
          body.maxPhotoUploadCount < 1 || 
          body.maxPhotoUploadCount > 10) {
        return NextResponse.json({
          success: false,
          error: '最大照片上傳數量必須是 1-10 之間的整數'
        }, { status: 400 });
      }
    }
    
    // 更新設定
    const updatePromises = Object.entries(body).map(([key, value]) => 
      supabase
        .from('system_settings')
        .upsert({
          setting_key: key,
          setting_value: value.toString(),
          updated_at: new Date().toISOString()
        })
    );
    
    await Promise.all(updatePromises);
    
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

### 2.3 獲取最大上傳數量 API

#### 端點：`GET /api/settings/max-photo-count`

```typescript
interface MaxPhotoCountResponse {
  success: boolean;
  data?: {
    maxCount: number;
  };
  error?: string;
}

// 實現範例
export async function GET() {
  try {
    const supabase = createSupabaseAdmin();
    
    // 使用資料庫函數獲取最大上傳數量
    const { data, error } = await supabase
      .rpc('get_max_photo_upload_count');
    
    if (error) throw error;
    
    return NextResponse.json({
      success: true,
      data: {
        maxCount: data || 3 // 預設值
      }
    });
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
```

## 3. 錯誤處理和驗證

### 3.1 檔案驗證

#### 多檔案驗證邏輯
```typescript
interface ValidationResult {
  isValid: boolean;
  errors: string[];
  validFiles: File[];
}

const validateMultipleFiles = async (
  files: File[],
  maxCount: number
): Promise<ValidationResult> => {
  const errors: string[] = [];
  const validFiles: File[] = [];
  
  // 檢查檔案數量
  if (files.length > maxCount) {
    errors.push(`最多只能上傳 ${maxCount} 張照片`);
    return { isValid: false, errors, validFiles };
  }
  
  // 檢查每個檔案
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    
    // 檢查檔案類型
    if (!file.type.startsWith('image/')) {
      errors.push(`第 ${i + 1} 個檔案不是有效的圖片格式`);
      continue;
    }
    
    // 檢查檔案大小
    if (file.size > 5 * 1024 * 1024) {
      errors.push(`第 ${i + 1} 個檔案超過 5MB 限制`);
      continue;
    }
    
    // 檢查圖片有效性
    try {
      await validateImage(file);
      validFiles.push(file);
    } catch (error) {
      errors.push(`第 ${i + 1} 個檔案不是有效的圖片`);
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    validFiles
  };
};
```

### 3.2 部分失敗處理

#### 部分上傳失敗邏輯
```typescript
const handlePartialUploadFailure = (
  results: UploadResult[],
  uploadGroupId: string
): PartialUploadResult => {
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  // 如果有失敗的照片，清理已上傳的檔案
  if (failed.length > 0) {
    cleanupFailedUpload(successful, uploadGroupId);
  }
  
  return {
    partialSuccess: successful.length > 0,
    successCount: successful.length,
    failureCount: failed.length,
    successfulPhotos: successful.map(r => r.photo),
    failedFiles: failed.map(r => ({
      fileName: r.fileName,
      error: r.error
    }))
  };
};
```

## 4. 效能優化

### 4.1 並行處理

#### 並行上傳優化
```typescript
// 使用 Promise.allSettled 處理並行上傳
const uploadWithConcurrencyControl = async (
  files: File[],
  concurrency: number = 3
): Promise<UploadResult[]> => {
  const results: UploadResult[] = [];
  
  for (let i = 0; i < files.length; i += concurrency) {
    const batch = files.slice(i, i + concurrency);
    const batchResults = await Promise.allSettled(
      batch.map(file => uploadSingleFile(file))
    );
    
    results.push(...batchResults.map(result => 
      result.status === 'fulfilled' ? result.value : { success: false, error: result.reason }
    ));
  }
  
  return results;
};
```

### 4.2 快取策略

#### 設定快取
```typescript
// 快取系統設定
const getCachedSetting = async (key: string): Promise<any> => {
  const cacheKey = `setting_${key}`;
  const cached = cache.get(cacheKey);
  
  if (cached) {
    return cached;
  }
  
  const supabase = createSupabaseAdmin();
  const { data } = await supabase
    .from('system_settings')
    .select('setting_value, setting_type')
    .eq('setting_key', key)
    .single();
  
  let value = data?.setting_value;
  if (data?.setting_type === 'integer') {
    value = parseInt(value, 10);
  }
  
  cache.set(cacheKey, value, 300); // 快取 5 分鐘
  return value;
};
```

## 5. 安全性考慮

### 5.1 檔案安全檢查

#### 惡意檔案檢測
```typescript
const validateImage = async (file: File): Promise<boolean> => {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(true);
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(false);
    };
    
    img.src = url;
  });
};
```

### 5.2 速率限制

#### 上傳速率限制
```typescript
const rateLimitUpload = async (
  uploaderLineId: string,
  fileCount: number
): Promise<boolean> => {
  const supabase = createSupabaseAdmin();
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  
  const { data, error } = await supabase
    .from('photos')
    .select('id')
    .eq('user_id', uploaderLineId)
    .gte('created_at', oneHourAgo.toISOString());
  
  if (error) throw error;
  
  // 限制一小時內最多上傳 20 張照片
  return (data?.length || 0) + fileCount <= 20;
};
```

## 6. 監控和日誌

### 6.1 上傳日誌

#### 詳細上傳日誌
```typescript
const logUploadActivity = async (
  uploadGroupId: string,
  uploaderLineId: string,
  fileCount: number,
  successCount: number,
  failureCount: number,
  errors: string[]
): Promise<void> => {
  const supabase = createSupabaseAdmin();
  
  await supabase
    .from('upload_logs')
    .insert({
      upload_group_id: uploadGroupId,
      uploader_line_id: uploaderLineId,
      file_count: fileCount,
      success_count: successCount,
      failure_count: failureCount,
      errors: errors.join('; '),
      created_at: new Date().toISOString()
    });
};
```

### 6.2 效能監控

#### 上傳效能指標
```typescript
const trackUploadPerformance = async (
  uploadGroupId: string,
  fileSize: number,
  uploadTime: number,
  success: boolean
): Promise<void> => {
  // 記錄到監控系統
  analytics.track('photo_upload', {
    uploadGroupId,
    fileSize,
    uploadTime,
    success,
    timestamp: new Date().toISOString()
  });
};