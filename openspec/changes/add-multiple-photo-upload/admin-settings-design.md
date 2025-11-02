# 管理員設定頁面設計

## 1. 系統設定頁面結構

### 1.1 新增系統設定頁面

#### 路由：`/admin/system-settings`

```typescript
// 頁面結構
export default function SystemSettingsPage() {
  return (
    <AdminLayout title="系統設定">
      <SystemSettingsForm />
    </AdminLayout>
  );
}
```

### 1.2 設定表單組件

#### 主要設定區域
```typescript
interface SystemSettingsFormProps {
  settings: SystemSettings;
  onSettingsUpdate: (settings: Partial<SystemSettings>) => void;
  loading: boolean;
}

const SystemSettingsForm: React.FC<SystemSettingsFormProps> = ({
  settings,
  onSettingsUpdate,
  loading
}) => {
  const [formData, setFormData] = useState(settings);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      await onSettingsUpdate(formData);
      setErrors({});
    } catch (error) {
      setErrors({ general: error.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 照片上傳設定 */}
      <PhotoUploadSettings 
        formData={formData}
        setFormData={setFormData}
        errors={errors}
      />
      
      {/* 其他系統設定 */}
      <OtherSystemSettings 
        formData={formData}
        setFormData={setFormData}
        errors={errors}
      />
      
      {/* 儲存按鈕 */}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={saving || loading}
          className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
        >
          {saving ? '儲存中...' : '儲存設定'}
        </button>
      </div>
    </form>
  );
};
```

## 2. 照片上傳設定組件

### 2.1 最大上傳數量控制

#### 數量輸入組件
```typescript
interface PhotoUploadSettingsProps {
  formData: SystemSettings;
  setFormData: (data: SystemSettings) => void;
  errors: Record<string, string>;
}

const PhotoUploadSettings: React.FC<PhotoUploadSettingsProps> = ({
  formData,
  setFormData,
  errors
}) => {
  const handleMaxPhotoCountChange = (value: string) => {
    const numValue = parseInt(value, 10);
    
    // 驗證輸入
    if (isNaN(numValue) || numValue < 1) {
      setFormData({
        ...formData,
        maxPhotoUploadCount: 1
      });
      return;
    }
    
    if (numValue > 10) {
      setFormData({
        ...formData,
        maxPhotoUploadCount: 10
      });
      return;
    }
    
    setFormData({
      ...formData,
      maxPhotoUploadCount: numValue
    });
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-semibold mb-4 flex items-center">
        <Camera className="w-5 h-5 mr-2 text-blue-500" />
        照片上傳設定
      </h2>
      
      <div className="space-y-4">
        {/* 最大上傳數量設定 */}
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
              value={formData.maxPhotoUploadCount}
              onChange={(e) => handleMaxPhotoCountChange(e.target.value)}
              className="w-20 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
            
            <span className="text-sm text-gray-500">張照片</span>
          </div>
          
          {/* 說明文字 */}
          <p className="mt-2 text-sm text-gray-600">
            設定用戶一次可以上傳的最大照片數量。建議範圍：1-10 張
          </p>
          
          {/* 錯誤提示 */}
          {errors.maxPhotoUploadCount && (
            <p className="mt-1 text-sm text-red-600">
              {errors.maxPhotoUploadCount}
            </p>
          )}
        </div>

        {/* 設定預覽 */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-gray-700 mb-2">設定效果預覽</h3>
          <p className="text-sm text-gray-600">
            用戶將能夠一次上傳最多 <span className="font-semibold">{formData.maxPhotoUploadCount}</span> 張照片
          </p>
          
          {/* 視覺化預覽 */}
          <div className="mt-3 flex space-x-2">
            {Array.from({ length: Math.min(formData.maxPhotoUploadCount, 5) }, (_, i) => (
              <div
                key={i}
                className="w-12 h-12 bg-gray-200 rounded border-2 border-dashed border-gray-300 flex items-center justify-center"
              >
                <ImageIcon className="w-4 h-4 text-gray-400" />
              </div>
            ))}
            
            {formData.maxPhotoUploadCount > 5 && (
              <div className="w-12 h-12 bg-gray-100 rounded border-2 border-dashed border-gray-300 flex items-center justify-center">
                <span className="text-xs text-gray-500">+{formData.maxPhotoUploadCount - 5}</span>
              </div>
            )}
          </div>
        </div>

        {/* 影響說明 */}
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-blue-800 mb-2">注意事項</h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• 數量過多可能影響伺服器效能</li>
            <li>• 建議根據網路頻寬和用戶需求調整</li>
            <li>• 變更會立即生效，影響所有用戶</li>
            <li>• 現有上傳的照片不受影響</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
```

### 2.2 設定驗證

#### 客戶端驗證
```typescript
const validateSettings = (settings: SystemSettings): Record<string, string> => {
  const errors: Record<string, string> = {};
  
  // 驗證最大照片上傳數量
  if (!Number.isInteger(settings.maxPhotoUploadCount)) {
    errors.maxPhotoUploadCount = '必須是整數';
  } else if (settings.maxPhotoUploadCount < 1) {
    errors.maxPhotoUploadCount = '最少需要 1 張照片';
  } else if (settings.maxPhotoUploadCount > 10) {
    errors.maxPhotoUploadCount = '最多支援 10 張照片';
  }
  
  return errors;
};
```

## 3. 系統設定管理

### 3.1 設定狀態管理

#### 設定 Hook
```typescript
interface SystemSettings {
  maxPhotoUploadCount: number;
  // 未來可能添加的其他設定
  [key: string]: any;
}

const useSystemSettings = () => {
  const [settings, setSettings] = useState<SystemSettings>({
    maxPhotoUploadCount: 3
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 載入設定
  const loadSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/settings');
      const data = await response.json();
      
      if (data.success) {
        setSettings(data.data);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 更新設定
  const updateSettings = async (newSettings: Partial<SystemSettings>) => {
    try {
      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newSettings)
      });
      
      const data = await response.json();
      
      if (data.success) {
        setSettings(prev => ({ ...prev, ...newSettings }));
        return data;
      } else {
        throw new Error(data.error);
      }
    } catch (err) {
      throw new Error(err.message);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  return {
    settings,
    loading,
    error,
    updateSettings,
    reloadSettings: loadSettings
  };
};
```

### 3.2 設定變更日誌

#### 變更記錄
```typescript
const logSettingChange = async (
  settingKey: string,
  oldValue: any,
  newValue: any,
  adminId: string
): Promise<void> => {
  const supabase = createSupabaseAdmin();
  
  await supabase
    .from('setting_change_logs')
    .insert({
      setting_key: settingKey,
      old_value: oldValue?.toString(),
      new_value: newValue?.toString(),
      admin_id: adminId,
      changed_at: new Date().toISOString()
    });
};
```

## 4. 用戶介面設計

### 4.1 響應式佈局

#### 行動裝置適配
```css
/* 行動裝置樣式 */
@media (max-width: 768px) {
  .settings-form {
    padding: 1rem;
  }
  
  .settings-grid {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
  
  .preview-grid {
    justify-content: center;
  }
}
```

### 4.2 載入和錯誤狀態

#### 載入狀態
```typescript
const LoadingState = () => (
  <div className="flex justify-center items-center h-64">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
    <span className="ml-3 text-gray-600">載入設定中...</span>
  </div>
);
```

#### 錯誤狀態
```typescript
const ErrorState = ({ error, onRetry }: { error: string; onRetry: () => void }) => (
  <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
    <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
    <h3 className="text-lg font-semibold text-red-800 mb-2">載入失敗</h3>
    <p className="text-red-600 mb-4">{error}</p>
    <button
      onClick={onRetry}
      className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
    >
      重新載入
    </button>
  </div>
);
```

## 5. 成功提示和確認

### 5.1 儲存成功提示

#### 成功訊息組件
```typescript
const SuccessMessage = ({ message, onClose }: { message: string; onClose: () => void }) => (
  <div className="fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-fadeIn">
    <div className="flex items-center">
      <CheckCircle className="w-5 h-5 mr-2" />
      <span>{message}</span>
      <button
        onClick={onClose}
        className="ml-4 text-green-200 hover:text-white"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  </div>
);
```

### 5.2 危險操作確認

#### 設定重置確認
```typescript
const ConfirmResetDialog = ({ 
  isOpen, 
  onConfirm, 
  onCancel 
}: {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) => (
  <Dialog isOpen={isOpen} onClose={onCancel}>
    <div className="bg-white rounded-lg p-6 max-w-md">
      <h3 className="text-lg font-semibold mb-4">確認重置設定</h3>
      <p className="text-gray-600 mb-6">
        確定要重置所有設定為預設值嗎？此操作無法復原。
      </p>
      <div className="flex justify-end space-x-3">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-gray-600 hover:text-gray-800"
        >
          取消
        </button>
        <button
          onClick={onConfirm}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
        >
          確認重置
        </button>
      </div>
    </div>
  </Dialog>
);
```

## 6. 整合到現有管理系統

### 6.1 導航整合

#### 更新管理員導航
```typescript
// 在 AdminLayout 中添加新的導航項目
const adminNavItems = [
  { name: '總覽', href: '/admin/dashboard', icon: BarChart3 },
  { name: '照片管理', href: '/admin/photos', icon: Camera },
  { name: '題目管理', href: '/admin/questions', icon: HelpCircle },
  { name: '系統設定', href: '/admin/system-settings', icon: Settings }, // 新增
  // ... 其他導航項目
];
```

### 6.2 權限控制

#### 管理員權限檢查
```typescript
const withAdminAuth = (Component: React.ComponentType) => {
  return async function AuthenticatedComponent(props: any) {
    // 檢查管理員權限
    const isAdmin = await checkAdminAuth();
    
    if (!isAdmin) {
      redirect('/admin/login');
      return null;
    }
    
    return <Component {...props} />;
  };
};

// 使用方式
export default withAdminAuth(SystemSettingsPage);
```

## 7. 測試和驗證

### 7.1 設定測試

#### 單元測試範例
```typescript
describe('SystemSettings', () => {
  test('should validate max photo upload count', () => {
    const invalidSettings = {
      maxPhotoUploadCount: 15 // 超過限制
    };
    
    const errors = validateSettings(invalidSettings);
    
    expect(errors.maxPhotoUploadCount).toBe('最多支援 10 張照片');
  });
  
  test('should update settings successfully', async () => {
    const newSettings = {
      maxPhotoUploadCount: 5
    };
    
    const result = await updateSettings(newSettings);
    
    expect(result.success).toBe(true);
    expect(result.data.maxPhotoUploadCount).toBe(5);
  });
});
```

### 7.2 整合測試

#### 端到端測試
```typescript
describe('System Settings E2E', () => {
  test('admin can update max photo upload count', async () => {
    // 登入管理員
    await loginAsAdmin();
    
    // 導航到設定頁面
    await page.goto('/admin/system-settings');
    
    // 更新設定
    await page.fill('#maxPhotoUploadCount', '7');
    await page.click('[data-testid="save-settings"]');
    
    // 驗證成功訊息
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
    
    // 驗證設定已更新
    const currentValue = await page.inputValue('#maxPhotoUploadCount');
    expect(currentValue).toBe('7');
  });
});