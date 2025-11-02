# 實現細節和測試計劃

## 1. 實現優先級和時間線

### 1.1 階段一：資料庫結構變更（優先級：高）
**預估時間：1-2 天**

#### 任務清單
- [ ] 執行資料庫遷移腳本
- [ ] 驗證新欄位和索引創建成功
- [ ] 測試資料庫函數和觸發器
- [ ] 備份現有資料（安全措施）

#### 驗證標準
- 所有新欄位正確添加
- 索引創建成功
- 觸發器正常工作
- 現有功能不受影響

### 1.2 階段二：後端 API 開發（優先級：高）
**預估時間：2-3 天**

#### 任務清單
- [ ] 修改 `/api/photo/upload` 支援多檔案
- [ ] 實作系統設定讀取 API
- [ ] 實作系統設定更新 API
- [ ] 添加錯誤處理和驗證
- [ ] 實作上傳進度追蹤

#### 驗證標準
- API 正確處理多檔案上傳
- 設定 API 正常工作
- 錯誤處理完善
- 效能符合要求

### 1.3 階段三：前端介面開發（優先級：中）
**預估時間：3-4 天**

#### 任務清單
- [ ] 修改照片上傳頁面支援多選
- [ ] 實作照片預覽網格
- [ ] 添加上傳進度顯示
- [ ] 實作檔案驗證
- [ ] 優化用戶體驗

#### 驗證標準
- 多檔案選擇正常工作
- 預覽功能完整
- 進度顯示準確
- 響應式設計良好

### 1.4 階段四：管理員設定功能（優先級：中）
**預估時間：2 天**

#### 任務清單
- [ ] 創建系統設定頁面
- [ ] 實作最大上傳數量控制
- [ ] 添加設定驗證
- [ ] 整合到管理員導航

#### 驗證標準
- 設定頁面功能完整
- 驗證邏輯正確
- 權限控制有效
- 用戶介面友好

### 1.5 階段五：照片牆更新（優先級：低）
**預估時間：1-2 天**

#### 任務清單
- [ ] 更新照片卡片顯示邏輯
- [ ] 測試祝福語序號顯示
- [ ] 驗證投票功能正常
- [ ] 效能優化

#### 驗證標準
- 照片牆正常顯示
- 序號正確顯示
- 投票功能不受影響
- 效能保持良好

## 2. 詳細實現計劃

### 2.1 資料庫變更實現

#### 步驟 1：準備工作
```sql
-- 備份現有 photos 表
CREATE TABLE photos_backup_multiple_upload AS TABLE photos;

-- 檢查現有資料
SELECT COUNT(*) as total_photos FROM photos;
```

#### 步驟 2：執行變更
```bash
# 使用 Supabase SQL Editor 執行
# 或使用 psql 命令行
psql -h your-project.supabase.co -U postgres -d postgres -f database-changes.sql
```

#### 步驟 3：驗證變更
```sql
-- 檢查新欄位
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'photos' 
AND column_name IN ('upload_group_id', 'photo_sequence', 'blessing_message_with_sequence');

-- 檢查系統設定表
SELECT * FROM system_settings WHERE setting_key = 'max_photo_upload_count';
```

### 2.2 後端 API 實現

#### 檔案結構
```
src/app/api/
├── photo/
│   └── upload/
│       └── route.ts (修改現有)
├── admin/
│   └── settings/
│       └── route.ts (新增)
└── settings/
    └── max-photo-count/
        └── route.ts (新增)
```

#### 實現順序
1. 先實作系統設定 API（較簡單）
2. 再修改照片上傳 API（較複雜）
3. 最後添加輔助 API

#### 關鍵實現點
```typescript
// 多檔案處理邏輯
const files = formData.getAll('files') as File[];
const uploadGroupId = generateUploadGroupId();

// 並行上傳
const results = await Promise.allSettled(
  files.map((file, index) => uploadSingleFile(file, index, uploadGroupId))
);

// 處理部分失敗
const successful = results.filter(r => r.status === 'fulfilled');
const failed = results.filter(r => r.status === 'rejected');
```

### 2.3 前端實現

#### 組件結構
```
src/components/
├── MultiplePhotoUpload.tsx (新增)
├── PhotoPreviewGrid.tsx (新增)
├── PhotoPreviewItem.tsx (新增)
├── UploadProgress.tsx (修改現有)
└── PhotoCard.tsx (修改現有)

src/app/
├── photo-upload/
│   └── page.tsx (修改現有)
└── admin/
    └── system-settings/
        └── page.tsx (新增)
```

#### 實現順序
1. 創建基礎的多檔案選擇功能
2. 添加照片預覽網格
3. 實作上傳進度追蹤
4. 添加錯誤處理和驗證
5. 優化用戶體驗

#### 關鍵實現點
```typescript
// 檔案選擇處理
const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
  const files = Array.from(event.target.files || []);
  const validFiles = validateFiles(files);
  
  if (validFiles.length > maxPhotoCount) {
    setError(`最多只能選擇 ${maxPhotoCount} 張照片`);
    return;
  }
  
  setSelectedPhotos(validFiles.map(file => ({
    file,
    preview: URL.createObjectURL(file),
    id: generateId()
  })));
};
```

### 2.4 管理員設定實現

#### 頁面結構
```
src/app/admin/system-settings/
├── page.tsx (主頁面)
├── components/
│   ├── SystemSettingsForm.tsx
│   ├── PhotoUploadSettings.tsx
│   └── OtherSettings.tsx
└── hooks/
    └── useSystemSettings.ts
```

#### 實現重點
- 表單驗證
- 設定快取
- 權限控制
- 用戶反饋

## 3. 測試計劃

### 3.1 單元測試

#### 後端測試
```typescript
// 測試檔案：src/__tests__/api/photo-upload.test.ts
describe('Photo Upload API', () => {
  test('should handle multiple file upload', async () => {
    const formData = new FormData();
    formData.append('files', mockFile1);
    formData.append('files', mockFile2);
    formData.append('blessingMessage', '測試祝福');
    
    const response = await POST({ formData } as NextRequest);
    const data = await response.json();
    
    expect(data.success).toBe(true);
    expect(data.data.uploadedPhotos).toHaveLength(2);
  });
  
  test('should validate file count limit', async () => {
    const formData = new FormData();
    // 添加超過限制的檔案數量
    for (let i = 0; i < 15; i++) {
      formData.append('files', mockFile);
    }
    
    const response = await POST({ formData } as NextRequest);
    const data = await response.json();
    
    expect(data.success).toBe(false);
    expect(data.error).toContain('最多只能上傳');
  });
});
```

#### 前端測試
```typescript
// 測試檔案：src/__tests__/components/MultiplePhotoUpload.test.tsx
describe('MultiplePhotoUpload', () => {
  test('should allow selecting multiple files', () => {
    render(<MultiplePhotoUpload />);
    
    const fileInput = screen.getByLabelText('選擇照片');
    const files = [mockFile1, mockFile2, mockFile3];
    
    fireEvent.change(fileInput, { target: { files } });
    
    expect(screen.getAllByTestId('photo-preview')).toHaveLength(3);
  });
  
  test('should show error when exceeding limit', () => {
    render(<MultiplePhotoUpload maxPhotoCount={3} />);
    
    const files = Array(5).fill(mockFile);
    const fileInput = screen.getByLabelText('選擇照片');
    
    fireEvent.change(fileInput, { target: { files } });
    
    expect(screen.getByText(/最多只能選擇 3 張照片/)).toBeInTheDocument();
  });
});
```

### 3.2 整合測試

#### 端到端測試
```typescript
// 測試檔案：src/__tests__/e2e/photo-upload.e2e.ts
describe('Photo Upload E2E', () => {
  test('complete multiple photo upload flow', async () => {
    // 登入用戶
    await loginUser();
    
    // 導航到照片上傳頁面
    await page.goto('/photo-upload');
    
    // 選擇多張照片
    const fileInput = await page.$('input[type="file"]');
    await fileInput.setInputFiles(['photo1.jpg', 'photo2.jpg', 'photo3.jpg']);
    
    // 輸入祝福語
    await page.fill('#blessingMessage', '測試祝福語');
    
    // 點擊上傳按鈕
    await page.click('[data-testid="upload-button"]');
    
    // 等待上傳完成
    await page.waitForSelector('[data-testid="upload-success"]');
    
    // 驗證成功訊息
    expect(await page.textContent('[data-testid="success-message"]'))
      .toContain('上傳成功');
    
    // 導航到照片牆驗證
    await page.goto('/photo-wall');
    
    // 檢查照片和祝福語序號
    expect(await page.textContent('text=測試祝福語 (1/3)')).toBeInTheDocument();
    expect(await page.textContent('text=測試祝福語 (2/3)')).toBeInTheDocument();
    expect(await page.textContent('text=測試祝福語 (3/3)')).toBeInTheDocument();
  });
});
```

### 3.3 效能測試

#### 載入效能測試
```typescript
// 測試檔案：src/__tests__/performance/photo-upload.performance.ts
describe('Photo Upload Performance', () => {
  test('should handle concurrent uploads efficiently', async () => {
    const startTime = Date.now();
    
    // 模擬 5 個並發上傳
    const uploadPromises = Array(5).fill(null).map(() => 
      uploadMultiplePhotos(mockFiles)
    );
    
    await Promise.all(uploadPromises);
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    // 驗證總時間在合理範圍內
    expect(duration).toBeLessThan(30000); // 30 秒內完成
  });
  
  test('should not exceed memory limits', async () => {
    const initialMemory = process.memoryUsage().heapUsed;
    
    // 上傳大量照片
    await uploadMultiplePhotos(largeFileArray);
    
    const finalMemory = process.memoryUsage().heapUsed;
    const memoryIncrease = finalMemory - initialMemory;
    
    // 驗證記憶體增長在合理範圍內
    expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024); // 100MB
  });
});
```

## 4. 部署計劃

### 4.1 部署前檢查清單

#### 資料庫檢查
- [ ] 資料庫備份完成
- [ ] 遷移腳本測試通過
- [ ] 回滾腳本準備就緒
- [ ] 效能基準測試完成

#### 程式碼檢查
- [ ] 所有測試通過
- [ ] 程式碼審查完成
- [ ] 安全性檢查通過
- [ ] 效能測試通過

#### 功能檢查
- [ ] 手動測試完成
- [ ] 跨瀏覽器測試完成
- [ ] 行動裝置測試完成
- [ ] 可訪問性測試完成

### 4.2 部署步驟

#### 階段一：資料庫部署
1. 執行資料庫備份
2. 執行遷移腳本
3. 驗證資料庫變更
4. 測試基本功能

#### 階段二：程式碼部署
1. 部署後端 API 變更
2. 部署前端介面變更
3. 部署管理員設定功能
4. 執行煙霧測試

#### 階段三：驗證和監控
1. 執行完整功能測試
2. 監控系統效能
3. 檢查錯誤日誌
4. 收集用戶反饋

### 4.3 回滾計劃

#### 回滾觸發條件
- 嚴重功能錯誤
- 效能嚴重下降
- 資料庫問題
- 用戶大量投訴

#### 回滾步驟
1. 停止新功能服務
2. 執行資料庫回滾腳本
3. 恢復程式碼到上一版本
4. 驗證系統正常運作

## 5. 風險管理

### 5.1 技術風險

#### 資料庫風險
- **風險**：資料庫遷移失敗
- **緩解措施**：完整備份、分階段遷移、回滾腳本
- **應急計劃**：立即回滾到遷移前狀態

#### 效能風險
- **風險**：多檔案上傳影響效能
- **緩解措施**：並行限制、進度顯示、錯誤處理
- **應急計劃**：暫時降低最大上傳數量

#### 相容性風險
- **風險**：新功能影響現有功能
- **緩解措施**：向後相容設計、完整測試
- **應急計劃**：功能開關控制

### 5.2 用戶體驗風險

#### 學習曲線
- **風險**：用戶不熟悉多檔案上傳
- **緩解措施**：清晰的使用說明、視覺提示
- **應急計劃**：添加教學引導

#### 錯誤處理
- **風險**：部分上傳失敗造成困惑
- **緩解措施**：明確的錯誤訊息、重試選項
- **應急計劃**：提供客服支援

## 6. 成功指標

### 6.1 功能指標
- 多檔案上傳成功率 > 95%
- 平均上傳時間 < 30 秒（3 張照片）
- 錯誤率 < 5%

### 6.2 用戶體驗指標
- 用戶滿意度 > 4.5/5
- 功能使用率 > 60%
- 支援請求減少 30%

### 6.3 技術指標
- 系統可用性 > 99.5%
- 響應時間 < 2 秒
- 錯誤率 < 1%

## 7. 後續改進計劃

### 7.1 短期改進（1 個月內）
- 添加照片重新排序功能
- 優化行動裝置體驗
- 增加上傳範本功能

### 7.2 中期改進（3 個月內）
- 添加照片編輯功能
- 實作批量操作
- 增強錯誤恢復機制

### 7.3 長期改進（6 個月內）
- 添加 AI 照片分類
- 實作照片相簿功能
- 增加社交分享功能