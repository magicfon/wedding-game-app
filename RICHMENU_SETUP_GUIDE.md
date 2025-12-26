# LINE Rich Menu 兩分頁功能設定指南

本指南說明如何設定和使用婚禮互動遊戲的 LINE Rich Menu 兩分頁功能。

## 功能概述

婚禮互動遊戲現在支援兩個可切換的 LINE Rich Menu 分頁：

### 會場資訊分頁
- **交通資訊**：會場位置、停車資訊、大眾運輸
- **菜單**：婚禮宴席菜單詳情
- **桌次**：查看您的座位安排
- **進入遊戲分頁**：切換到現場活動分頁

### 現場活動分頁
- **照片上傳**：分享美好回憶
- **祝福照片牆**：瀏覽和投票
- **快問快答**：參與答題競賽
- **進入會場資訊分頁**：切換到會場資訊分頁

### 未開放分頁
- 當分頁停用時顯示
- 顯示「尚未開放」提示

## 設定步驟

### 步驟 1：執行資料庫遷移

在 Supabase SQL Editor 中執行以下檔案：

```bash
database/add-line-richmenu-tables.sql
```

這會建立以下資料表：
- `line_richmenu_settings`：全域 Rich Menu 設定
- `line_richmenu_user_states`：用戶分頁狀態
- `line_richmenu_registry`：Rich Menu ID 註冊

### 步驟 2：創建 Rich Menu

1. 訪問後台管理介面：`https://your-domain.com/admin/richmenu`
2. 輸入管理員密碼進行登入
3. 點擊「創建 Rich Menu」按鈕
4. 系統會在 LINE Platform 上創建三個 Rich Menu：
   - 會場資訊分頁
   - 現場活動分頁
   - 未開放分頁

### 步驟 3：上傳 Rich Menu 圖片

1. 準備符合規格的圖片（2500x1686 像素）
2. 在後台管理介面中，為每個 Rich Menu 上傳對應的圖片：
   - `venue-info.png` 或 `venue-info.jpg`
   - `activity.png` 或 `activity.jpg`
   - `unavailable.png` 或 `unavailable.jpg`
3. 系統會自動驗證圖片尺寸並上傳到 LINE Platform

**圖片設計指南**：參考 [`public/richmenu-images/README.md`](public/richmenu-images/README.md)

### 步驟 4：設定預設分頁

1. 在後台管理介面中，選擇「預設開啟分頁」
2. 選項：
   - 會場資訊
   - 現場活動
3. 點擊「儲存設定」

### 步驟 5：啟用/停用分頁

1. 在後台管理介面中，使用切換開關控制分頁狀態：
   - 會場資訊分頁啟用/停用
   - 現場活動分頁啟用/停用
2. 點擊「儲存設定」

## 用戶使用流程

### 首次使用
1. 用戶加入 LINE Bot 好友
2. 打開 Rich Menu（預設顯示設定的預設分頁）
3. 點擊功能按鈕進入對應頁面

### 切換分頁
1. 用戶點擊「進入遊戲分頁」或「進入會場資訊分頁」按鈕
2. 系統自動切換 Rich Menu
3. 用戶看到新的分頁內容

### 分頁停用時
1. 當用戶嘗試切換到停用的分頁
2. 系統顯示「未開放」分頁
3. 按鈕無法點擊

## API 端點

### GET /api/admin/richmenu/settings
獲取 Rich Menu 設定

**Headers**:
```
Authorization: Bearer {admin_token}
```

**Response**:
```json
{
  "defaultTab": "venue_info",
  "venueTabEnabled": true,
  "activityTabEnabled": true,
  "richMenuIds": {
    "venue_info": "richmenu-xxx",
    "activity": "richmenu-yyy",
    "unavailable": "richmenu-zzz"
  },
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

### POST /api/admin/richmenu/settings
更新 Rich Menu 設定

**Headers**:
```
Authorization: Bearer {admin_token}
Content-Type: application/json
```

**Body**:
```json
{
  "defaultTab": "venue_info",
  "venueTabEnabled": true,
  "activityTabEnabled": false
}
```

### POST /api/line/richmenu/switch
切換用戶 Rich Menu 分頁

**Body**:
```json
{
  "lineId": "U1234567890",
  "targetTab": "activity"
}
```

### POST /api/admin/richmenu/upload-image
上傳 Rich Menu 圖片

**Headers**:
```
Authorization: Bearer {admin_token}
```

**Body** (FormData):
```
image: {file}
menuType: "venue_info"
```

### POST /api/line/setup-richmenu
創建 Rich Menu

**Headers**:
```
Authorization: Bearer {admin_token}
```

## 故障排除

### Rich Menu 未顯示
1. 檢查 LINE Platform 上的 Rich Menu 是否已創建
2. 確認圖片已上傳
3. 檢查 Webhook URL 是否正確設定

### 分頁切換失敗
1. 檢查 `/api/line/richmenu/switch` API 是否正常運作
2. 確認用戶 LINE ID 正確傳遞
3. 檢查資料庫中的 Rich Menu ID 是否正確

### 圖片上傳失敗
1. 確認圖片尺寸為 2500x1686 像素
2. 檢查檔案格式（PNG 或 JPEG）
3. 確認檔案大小不超過限制
4. 檢查 LINE_CHANNEL_ACCESS_TOKEN 環境變數

### 後台無法存取
1. 確認管理員密碼正確
2. 檢查 ADMIN_PASSWORD 環境變數
3. 確認網路連線正常

## 環境變數

確保以下環境變數已設定：

```bash
# LINE Bot 設定
LINE_CHANNEL_ACCESS_TOKEN=your_channel_access_token
LINE_CHANNEL_SECRET=your_channel_secret

# LIFF 設定
NEXT_PUBLIC_LIFF_ID=your_liff_id

# 應用程式 URL
NEXT_PUBLIC_APP_URL=https://your-domain.com

# 管理員密碼
ADMIN_PASSWORD=your_admin_password

# Supabase 設定
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## 相關文檔

- [LINE_SETUP_GUIDE.md](LINE_SETUP_GUIDE.md) - LINE Bot 基本設定
- [LINE_QUICK_SETUP.md](LINE_QUICK_SETUP.md) - LINE 快速設定清單
- [public/richmenu-images/README.md](public/richmenu-images/README.md) - Rich Menu 圖片設計指南

## 支援

如遇到問題，請檢查：
1. Vercel Functions 日誌
2. LINE Developers Console 中的 Webhook 狀態
3. 瀏覽器開發者工具中的 Network 和 Console 錯誤
