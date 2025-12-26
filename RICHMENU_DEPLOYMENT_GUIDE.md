# LINE Rich Menu 兩分頁功能部署指南

本指南說明如何部署 LINE Rich Menu 兩分頁功能到生產環境。

## 前置條件

- 已完成 LINE Bot 基本設定（參考 [LINE_SETUP_GUIDE.md](LINE_SETUP_GUIDE.md)）
- 已準備好三張 Rich Menu 圖片（2500x1686 像素）
- 有管理員權限訪問後台

## 部署步驟

### 1. 執行資料庫遷移

在 Supabase SQL Editor 中執行以下腳本：

```bash
database/add-line-richmenu-tables.sql
```

這會建立以下資料表：
- `line_richmenu_settings`
- `line_richmenu_user_states`
- `line_richmenu_registry`

### 2. 部署程式碼到 Vercel

程式碼已經包含在專案中，直接部署即可：

```bash
git add .
git commit -m "feat: add LINE Rich Menu tabs feature"
git push
```

Vercel 會自動部署更新。

### 3. 設置環境變數

確保 Vercel 專案中已設置以下環境變數：

```bash
# LINE Bot 設定
LINE_CHANNEL_ACCESS_TOKEN=your_channel_access_token
LINE_CHANNEL_SECRET=your_channel_secret

# LIFF 設定
NEXT_PUBLIC_LIFF_ID=your_liff_id

# 應用程式 URL
NEXT_PUBLIC_APP_URL=https://wedding-game-app.vercel.app

# 管理員密碼
ADMIN_PASSWORD=your_admin_password

# Supabase 設定
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 4. 創建 Rich Menu

1. 訪問後台管理介面：
   ```
   https://wedding-game-app.vercel.app/admin/richmenu
   ```

2. 輸入管理員密碼進行登入

3. 點擊「創建 Rich Menu」按鈕

4. 等待系統在 LINE Platform 上創建三個 Rich Menu：
   - 會場資訊分頁
   - 現場活動分頁
   - 未開放分頁

### 5. 上傳 Rich Menu 圖片

1. 準備三張符合規格的圖片：
   - `venue-info.png` (2500x1686 像素)
   - `activity.png` (2500x1686 像素)
   - `unavailable.png` (2500x1686 像素)

2. 在後台管理介面中，分別為每個 Rich Menu 上傳圖片：
   - 點擊「會場資訊」的「選擇圖片」按鈕
   - 選擇 `venue-info.png`
   - 等待上傳完成
   - 重複上述步驟為「現場活動」和「未開放」上傳圖片

### 6. 設定預設分頁

1. 在後台管理介面中，選擇「預設開啟分頁」
2. 選項：
   - 會場資訊
   - 現場活動
3. 點擊「儲存設定」

### 7. 啟用/停用分頁

1. 在後台管理介面中，使用切換開關控制分頁狀態：
   - 會場資訊分頁啟用/停用
   - 現場活動分頁啟用/停用
2. 點擊「儲存設定」

### 8. 測試功能

#### 測試用戶流程

1. 用手機加入 LINE Bot 好友
2. 打開 Rich Menu
3. 驗證預設分頁正確顯示
4. 點擊「進入遊戲分頁」或「進入會場資訊分頁」
5. 驗證分頁正確切換
6. 點擊功能按鈕，驗證導向正確頁面

#### 測試停用分頁

1. 在後台停用其中一個分頁
2. 用戶嘗試切換到停用的分頁
3. 驗證顯示「未開放」分頁
4. 驗證按鈕無法點擊

#### 測試後台管理

1. 訪問 `/admin/richmenu`
2. 驗證設定正確顯示
3. 測試修改設定並儲存
4. 測試上傳新圖片

## 驗證清單

部署完成後，請確認以下項目：

- [ ] 資料庫表已成功建立
- [ ] 程式碼已部署到 Vercel
- [ ] 環境變數已正確設置
- [ ] 三個 Rich Menu 已在 LINE Platform 上創建
- [ ] 三張 Rich Menu 圖片已上傳
- [ ] 預設分頁已設定
- [ ] 分頁啟用/停用功能正常運作
- [ ] 用戶可以正常切換分頁
- [ ] 停用分頁時顯示「未開放」狀態
- [ ] 功能按鈕正確導向到對應頁面

## 故障排除

### Rich Menu 未顯示

**可能原因**：
- Rich Menu 未創建
- 圖片未上傳
- Webhook 未正確設置

**解決方案**：
1. 檢查 LINE Developers Console 中的 Rich Menu 列表
2. 確認圖片已成功上傳
3. 檢查 Webhook URL 是否正確

### 分頁切換失敗

**可能原因**：
- API 端點未正確部署
- 資料庫連線問題
- LINE API 速率限制

**解決方案**：
1. 檢查 Vercel Functions 日誌
2. 確認資料庫連線正常
3. 檢查 LINE API 調用頻率

### 圖片上傳失敗

**可能原因**：
- 圖片尺寸不符合要求
- 檔案格式不支援
- 檔案大小超過限制

**解決方案**：
1. 確認圖片尺寸為 2500x1686 像素
2. 使用 PNG 或 JPEG 格式
3. 確認檔案大小不超過 1MB

### 後台無法存取

**可能原因**：
- 管理員密碼錯誤
- 環境變數未設置
- 網路連線問題

**解決方案**：
1. 確認管理員密碼正確
2. 檢查 ADMIN_PASSWORD 環境變數
3. 確認網路連線正常

## 監控與維護

### 日常監控

- 檢查 Vercel Functions 日誌
- 監控 LINE Webhook 狀態
- 追蹤用戶分頁切換頻率

### 定期維護

- 更新 Rich Menu 圖片
- 調整分頁啟用狀態
- 優化用戶體驗

## 相關文檔

- [LINE_SETUP_GUIDE.md](LINE_SETUP_GUIDE.md) - LINE Bot 基本設定
- [RICHMENU_SETUP_GUIDE.md](RICHMENU_SETUP_GUIDE.md) - Rich Menu 詳細設定指南
- [public/richmenu-images/README.md](public/richmenu-images/README.md) - Rich Menu 圖片設計指南

## 支援

如遇到問題，請檢查：

1. **Vercel Functions 日誌**：在 Vercel 專案的 "Functions" 標籤查看錯誤
2. **LINE Webhook 狀態**：在 LINE Developers Console 檢查 webhook 狀態
3. **瀏覽器開發者工具**：查看 Network 和 Console 錯誤

## 部署後檢查

部署完成後，建議進行以下檢查：

1. **功能測試**：完整測試所有 Rich Menu 功能
2. **效能測試**：檢查分頁切換速度
3. **相容性測試**：在不同裝置上測試（iOS、Android）
4. **安全測試**：驗證管理員權限和 API 安全性
5. **用戶體驗測試**：邀請少數用戶進行實際測試
