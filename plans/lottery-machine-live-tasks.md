# 彩球機頁面實施任務清單

## 任務概述

將 `lottery/` 資料夾中的完整彩球機功能整合到 Next.js 專案中，創建一個新的彩球機頁面（lottery-machine-live），使用 photo-wall 的照片作為彩球資料來源。

## 任務清單

### 階段 1：資料庫設置

- [ ] 創建 `database/add-lottery-machine-tables.sql`
  - 創建 `lottery_machine_state` 表
  - 創建 `lottery_machine_config` 表
  - 設定預設值
  - 執行資料庫遷移

### 階段 2：API 路由開發

- [x] 創建 `src/app/api/lottery-machine/photos/route.ts`
  - 從 `/api/photo/list` 獲取照片
  - 轉換為彩球機相容格式
  - 支援分頁和篩選

- [x] 創建 `src/app/api/lottery-machine/config/route.ts`
  - GET 方法：從 `lottery_machine_config` 表載入設定
  - POST 方法：儲存設定到 `lottery_machine_config` 表
  - 支援 track_config、physics、chamber_style、platform_style

- [x] 創建 `src/app/api/lottery-machine/draw/route.ts`
  - 從 photo-wall 照片中隨機選擇中獎照片
  - 記錄到 `lottery_history` 表（共用）
  - 更新 `lottery_machine_state` 表
  - 支援排除已中獎照片

- [x] 創建 `src/app/api/lottery-machine/notify-winner/route.ts`
  - 從 `lottery_history` 表獲取中獎記錄
  - 發送 LINE 通知給中獎者
  - 支援 Flex Message（包含照片）
  - 降級為純文字訊息

### 階段 3：管理頁面開發

- [ ] 創建 `src/app/admin/lottery/lottery-machine-live/page.tsx`
  - 整合 AdminLayout 組件
  - 整合軌道編輯器（拖曳節點）
  - 整合物理參數設定（重力、氣流力、側向氣流力、最大速度）
  - 整合腔體和平台樣式設定（拖曳調整大小和位置）
  - 整合彩球大小調整
  - 實現設定儲存功能
  - 顯示抽獎歷史（共用 lottery_history）

### 階段 4：展示頁面開發

- [ ] 創建 `src/app/lottery-machine-live/page.tsx`
  - 整合彩球機視覺效果（物理動畫、氣泡效果）
  - 整合 photo-wall 照片作為彩球
  - 整合軌道動畫
  - 整合慶祝效果
  - 實現 Realtime 訂閱（lottery_machine_state、lottery_history）
  - 整合音效控制

### 階段 5：測試與驗證

- [ ] 測試 API 路由
  - 測試 `/api/lottery-machine/photos` 端點
  - 測試 `/api/lottery-machine/config` 端點
  - 測試 `/api/lottery-machine/draw` 端點
  - 測試 `/api/lottery-machine/notify-winner` 端點

- [ ] 測試管理頁面功能
  - 驗證軌道編輯器正常運作
  - 驗證物理參數設定正常運作
  - 驗證腔體和平台樣式設定正常運作
  - 驗證設定儲存功能正常運作
  - 驗證抽獎歷史顯示正常

- [ ] 測試展示頁面功能
  - 驗證物理動畫正常運作
  - 驗證氣泡效果正常運作
  - 驗證軌道動畫正常運作
  - 驗證慶祝效果正常運作
  - 驗證 Realtime 訂閱正常運作

- [ ] 測試 LINE 通知
  - 驗證中獎通知正常發送
  - 驗證 Flex Message 正常顯示
  - 驗證降級為純文字訊息

- [ ] 驗證與原有功能分開
  - 確認彩球機不影響原有照片摸彩功能
  - 確認兩個功能可以獨立運作

## 完成標準

- [ ] 所有 API 路由正常運作
- [ ] 管理頁面功能完整
- [ ] 展示頁面動畫流暢
- [ ] LINE 通知正常發送
- [ ] 與原有功能完全分開
- [ ] 資料庫表正確建立

## 參考檔案

- `lottery/index.html` - 主頁面結構
- `lottery/script.js` - JavaScript 邏輯（物理動畫、軌道編輯器等）
- `lottery/styles.css` - 樣式表
- `lottery/config.json` - 設定檔案範例
- `src/app/api/photo/list/route.ts` - photo-wall API
- `src/app/api/lottery/photos/route.ts` - 照片摸彩照片 API
- `src/app/api/lottery/draw/route.ts` - 抽獎邏輯
- `src/app/api/lottery/notify-winner/route.ts` - LINE 通知邏輯
- `src/app/admin/lottery/page.tsx` - 管理頁面範例
- `src/app/lottery-live/page.tsx` - 展示頁面範例
