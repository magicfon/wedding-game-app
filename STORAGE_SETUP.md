# Supabase Storage 設定指南

## 📦 Storage Buckets 配置

### 🎯 **問題診斷**
如果圖片上傳失敗，通常是因為 Supabase Storage 的 `media` bucket 尚未創建。

### 🔍 **檢查 Storage 狀態**
```bash
# 訪問診斷端點
curl https://your-app.vercel.app/api/debug/storage-check
```

## 🛠️ **手動設定步驟**

### **方法一：Supabase Dashboard（推薦）**

1. **進入 Supabase Dashboard**
   - 前往 [supabase.com](https://supabase.com)
   - 選擇您的專案

2. **創建 Media Bucket**
   - 點擊左側選單 **"Storage"**
   - 點擊 **"Create bucket"**
   - 設定如下：
     ```
     Bucket name: media
     Public bucket: ✅ 啟用
     File size limit: 50 MB
     Allowed MIME types: 
       - image/jpeg
       - image/jpg  
       - image/png
       - image/gif
       - image/webp
       - video/mp4
       - video/webm
       - video/ogg
     ```
   - 點擊 **"Create bucket"**

3. **設定 RLS 政策**
   - 在 **Storage** 頁面，點擊 **"Policies"**
   - 為 `media` bucket 新增政策：
     ```sql
     -- 允許所有人讀取
     CREATE POLICY "Public Access" ON storage.objects
     FOR SELECT USING (bucket_id = 'media');
     
     -- 允許認證用戶上傳
     CREATE POLICY "Authenticated users can upload" ON storage.objects
     FOR INSERT WITH CHECK (bucket_id = 'media' AND auth.role() = 'authenticated');
     
     -- 允許 service_role 完全存取
     CREATE POLICY "Service role can manage" ON storage.objects
     FOR ALL USING (bucket_id = 'media' AND auth.jwt() ->> 'role' = 'service_role');
     ```

### **方法二：API 自動創建**

1. **使用診斷 API**
   ```bash
   # GET: 檢查並嘗試自動創建
   curl https://your-app.vercel.app/api/debug/storage-check
   
   # POST: 強制創建 bucket
   curl -X POST https://your-app.vercel.app/api/debug/storage-check
   ```

2. **檢查結果**
   - 成功：返回 `success: true` 和 bucket 資訊
   - 失敗：返回錯誤訊息和建議

## 📁 **檔案結構**

上傳的媒體檔案會儲存在以下結構：
```
media/
└── questions/
    ├── image_1640995200000_abc123.jpg
    ├── image_1640995300000_def456.png
    ├── video_1640995400000_ghi789.mp4
    └── ...
```

## 🔗 **URL 格式**

上傳成功後會獲得公開 URL：
```
https://your-project-id.supabase.co/storage/v1/object/public/media/questions/filename.ext
```

## ⚠️ **常見問題**

### **1. 上傳失敗：Bucket not found**
**解決方案**：
- 確認 `media` bucket 已創建
- 執行 `/api/debug/storage-check` 自動創建

### **2. 權限錯誤：Unauthorized**
**解決方案**：
- 檢查 `SUPABASE_SERVICE_ROLE_KEY` 環境變數
- 確認 RLS 政策正確設定

### **3. 檔案大小限制**
**解決方案**：
- 圖片：最大 5MB
- 影片：最大 50MB
- 在 Supabase Dashboard 中調整 bucket 設定

### **4. MIME 類型不支援**
**解決方案**：
- 支援的圖片格式：JPEG, PNG, GIF, WebP
- 支援的影片格式：MP4, WebM, OGG
- 在 bucket 設定中新增其他 MIME 類型

## 🧪 **測試上傳**

### **使用管理介面測試**：
1. 進入 **題目管理** → **新增題目**
2. 選擇 **圖片** 或 **影片** 類型
3. 上傳測試檔案
4. 檢查是否成功顯示預覽

### **API 測試**：
```bash
curl -X POST https://your-app.vercel.app/api/admin/media/upload \
  -F "file=@test-image.jpg" \
  -F "mediaType=image" \
  -F "altText=測試圖片"
```

## 📊 **環境變數確認**

確保以下環境變數已正確設定：
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

## 🔄 **重新部署**

設定完成後：
1. 在 Vercel Dashboard 觸發重新部署
2. 或推送代碼變更自動部署
3. 測試媒體上傳功能

---

## 📞 **需要協助？**

如果仍有問題，請檢查：
1. Supabase 專案狀態
2. 環境變數設定
3. Network 連接狀況
4. 瀏覽器控制台錯誤訊息
