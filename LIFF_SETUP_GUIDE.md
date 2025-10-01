# 🔗 LIFF 設定完整指南

## 📋 什麼是 LIFF？

LIFF (LINE Front-end Framework) 讓您的 Web 應用程式能在 LINE 內運行，用戶可以用自己的 LINE 帳號自動登入，無需額外授權步驟。

## 🚀 設定步驟

### 第一步：創建 LIFF 應用程式

1. **前往 LINE Developers Console**
   - 訪問 [developers.line.biz](https://developers.line.biz)
   - 登入您的 LINE 開發者帳號

2. **選擇您的 Channel**
   - 選擇已建立的 "Messaging API" Channel（LINE Bot）
   - 點擊 "LIFF" 標籤

3. **新增 LIFF 應用程式**
   - 點擊 "Add" 按鈕
   - 填寫以下資訊：

### 第二步：LIFF 設定參數

```
LIFF app name: 婚禮互動遊戲
Size: Full (全螢幕) ⭐️ 重要！
Endpoint URL: https://wedding-game-app.vercel.app
Scope: 
  ✅ profile (必須)
  ✅ openid (必須)
Bot link feature: On (Aggressive)
```

#### ⭐ Size 選項說明：
- **Full（全螢幕）** ✅ 推薦使用
  - 完全佔據整個螢幕
  - 不顯示瀏覽器標籤欄
  - 向下滑動不會縮小瀏覽器
  - 提供最佳沉浸式體驗
  
- **Tall（高模式）** ❌ 不推薦
  - 佔據大部分螢幕
  - 會顯示瀏覽器標籤欄
  - 向下滑動可能縮小瀏覽器
  
- **Compact（緊湊模式）** ❌ 不推薦
  - 只佔據螢幕下半部
  - 適合小型互動，不適合遊戲

### 第三步：取得 LIFF ID

創建完成後，您會得到一個 LIFF ID，格式類似：`1234567890-AbCdEfGh`

### 第四步：設定環境變數

在 Vercel 專案中設定環境變數：

```
NEXT_PUBLIC_LIFF_ID=您的LIFF_ID
```

## 🎯 LIFF URL 結構

設定完成後，您的 LIFF URL 將會是：

```
https://liff.line.me/{LIFF_ID}/game-live      → 遊戲實況
https://liff.line.me/{LIFF_ID}/quiz           → 快問快答
https://liff.line.me/{LIFF_ID}/photo-upload   → 照片上傳
https://liff.line.me/{LIFF_ID}/photo-wall     → 照片牆
https://liff.line.me/{LIFF_ID}/leaderboard    → 排行榜
https://liff.line.me/{LIFF_ID}/score-history  → 積分歷史
```

## 📱 LINE Bot 選單設定

### 方法一：使用管理後台

1. 部署應用程式後，進入 `/admin/line-menu`
2. 點擊「重新設置選單」
3. 系統會自動使用 LIFF URL 創建豐富選單

### 方法二：手動設定豐富選單

1. **創建選單圖片**
   - 尺寸：2500 x 1686 像素
   - 格式：JPG 或 PNG
   - 分割成 6 個區域（2x3 網格）

2. **上傳圖片**
   - 在 LINE Developers Console 的 "Rich menu" 區域
   - 上傳您的選單圖片

3. **設定區域動作**
   ```
   區域 1 (左上)：https://liff.line.me/{LIFF_ID}/game-live
   區域 2 (中上)：https://liff.line.me/{LIFF_ID}/quiz  
   區域 3 (右上)：https://liff.line.me/{LIFF_ID}/photo-upload
   區域 4 (左下)：https://liff.line.me/{LIFF_ID}/photo-wall
   區域 5 (中下)：https://liff.line.me/{LIFF_ID}/leaderboard
   區域 6 (右下)：https://liff.line.me/{LIFF_ID}/score-history
   ```

## ✅ 驗證設定

### 測試步驟：

1. **加入 LINE Bot 好友**
2. **點擊豐富選單中的任一選項**
3. **確認能自動開啟對應的遊戲功能**
4. **檢查用戶資訊是否正確顯示**

### 預期結果：

- ✅ 點擊選單後直接在 LINE 內開啟遊戲
- ✅ 自動獲取用戶 LINE 資訊（姓名、頭像）
- ✅ 無需額外登入步驟
- ✅ 所有功能正常運作

## 🎨 選單圖片設計建議

### 圖片規格：
- **尺寸**: 2500 x 1686 像素
- **格式**: JPG 或 PNG
- **佈局**: 2x3 網格（6個按鈕）

### 建議內容：
```
[遊戲實況] [快問快答] [照片上傳]
[照片牆]   [排行榜]   [積分歷史]
```

### 設計要點：
- 使用清楚的圖示和文字
- 保持一致的視覺風格
- 確保在手機上清楚可見
- 使用婚禮主題的色彩

## 🔧 故障排除

### 常見問題：

1. **LIFF 初始化失敗**
   - 檢查 `NEXT_PUBLIC_LIFF_ID` 是否正確設定
   - 確認 LIFF 應用程式狀態為啟用

2. **無法獲取用戶資訊**
   - 確認 Scope 包含 `profile` 和 `openid`
   - 檢查用戶是否已授權

3. **選單無法點擊**
   - 確認豐富選單已設為預設
   - 檢查 URL 格式是否正確

4. **❗ 顯示其他分頁標籤、向下滑動縮小瀏覽器**
   
   **問題原因：**
   - LIFF Size 設定為 Tall 或 Compact 而非 Full
   - 缺少必要的 viewport meta 標籤
   
   **解決方法：**
   
   a. **檢查 LIFF Size 設定**（最重要！）
      1. 前往 LINE Developers Console
      2. 選擇你的 Channel → LIFF 標籤
      3. 點擊你的 LIFF 應用程式進行編輯
      4. 確認 **Size 設定為 Full**
      5. 如果不是，修改為 Full 並儲存
   
   b. **確認網頁配置**
      - 確保已正確設定 viewport meta 標籤（已在 layout.tsx 中設定）
      - 確保 CSS 樣式正確（已在 globals.css 中設定）
   
   c. **測試步驟**
      1. 關閉 LINE 應用程式（完全關閉，不是最小化）
      2. 重新開啟 LINE
      3. 透過 Rich Menu 再次打開 LIFF
      4. 應該會看到全屏顯示，無其他分頁
   
   **預期效果：**
   - ✅ 全螢幕顯示，無瀏覽器標籤欄
   - ✅ 向下滑動不會縮小瀏覽器
   - ✅ 沉浸式使用體驗

## 📞 技術支援

如果遇到問題，請檢查：
- LINE Developers Console 設定
- Vercel 環境變數
- 應用程式日誌

---

設定完成後，您的婚禮遊戲將提供最佳的 LINE 用戶體驗！🎉
