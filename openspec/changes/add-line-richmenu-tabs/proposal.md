# Proposal: Add LINE Rich Menu Tabs

## Why

目前婚禮互動遊戲系統的 LINE Bot Rich Menu 功能較為簡單，僅提供單一固定的選單配置。為了提升用戶體驗並更好地組織功能，需要建立一個具備兩個分頁的 Rich Menu 系統：
- **會場資訊分頁**：提供婚禮現場相關資訊（交通、菜單、桌次）
- **現場活動分頁**：提供互動遊戲功能（照片上傳、照片牆、快問快答）

此外，需要建立後台管理介面，讓管理員能夠靈活控制每個分頁的啟用狀態和預設開啟分頁。

## What Changes

### 新增功能
- 建立 LINE Rich Menu 兩分頁系統（會場資訊、現場活動）
- 新增後台 Rich Menu 管理介面
- 支援分頁啟用/停用控制
- 支援設定預設開啟分頁
- 停用分頁時顯示「未開放」圖片，按鈕無法點擊

### 新增頁面
- `/admin/richmenu` - Rich Menu 管理介面
- `/venue-info` - 會場資訊頁面
- `/venue-info/transport` - 交通資訊
- `/venue-info/menu` - 菜單
- `/venue-info/table` - 桌次

### 資料庫變更
- 新增 `line_richmenu_settings` 表用於儲存 Rich Menu 設定
- 新增 `line_richmenu_tabs` 表用於儲存分頁設定
- 新增 `line_richmenu_buttons` 表用於儲存按鈕設定

### API 端點
- `GET/POST /api/admin/richmenu/settings` - 管理 Rich Menu 設定
- `POST /api/admin/richmenu/switch-tab` - 切換用戶 Rich Menu 分頁
- `POST /api/admin/richmenu/upload-image` - 上傳 Rich Menu 圖片
- `POST /api/line/richmenu/switch` - 處理用戶分頁切換請求

## Impact

### Affected Specs
- 新增 `line-richmenu` capability

### Affected Code
- `src/app/api/line/webhook/route.ts` - 新增分頁切換處理
- `src/app/api/line/setup-menu/route.ts` - 重構為支援多分頁
- `src/app/admin/` - 新增 Rich Menu 管理頁面
- `src/app/venue-info/` - 新增會場資訊頁面

### External Dependencies
- LINE Messaging API (Rich Menu 相關 API)
- Supabase (儲存 Rich Menu 設定)
