# 婚禮互動遊戲系統

> 🔧 **重要**：請確保 Supabase URL 完整配置！

一個完整的婚禮互動遊戲平台，包含快問快答、照片分享、投票等功能，讓婚禮更加精彩有趣！

## 功能特色

### 賓客端功能
- 🎮 **遊戲實況** - 觀看正在進行的遊戲
- ❓ **快問快答** - 參與答題競賽，答對得分
- 📸 **照片上傳** - 上傳美好回憶並留下祝福
- 🖼️ **照片牆** - 瀏覽所有照片並投票
- ❤️ **快門傳情** - 輪播展示照片和祝福
- 🏆 **排行榜** - 查看積分排名

### 管理員功能
- 📊 **總覽儀表板** - 查看統計數據和系統狀態
- ❓ **快問快答管理** - 新增、編輯題目，控制遊戲流程
- 📸 **照片管理** - 審核照片，管理投票
- 👥 **用戶管理** - 查看參與者資訊
- ⚙️ **系統設定** - 調整遊戲參數

## 技術架構

- **前端**: Next.js 15 + TypeScript + Tailwind CSS
- **後端**: Vercel Serverless Functions
- **資料庫**: Supabase (PostgreSQL)
- **認證**: Line Login + Supabase Auth
- **檔案存儲**: Supabase Storage
- **即時更新**: Supabase Realtime

## 安裝與設置

### 1. 克隆專案
```bash
git clone <repository-url>
cd wedding-game-app
```

### 2. 安裝依賴
```bash
npm install
```

### 3. 環境變數設置
複製 `.env.example` 到 `.env.local` 並填入以下資訊：

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here

# Line Bot Configuration
LINE_CHANNEL_ACCESS_TOKEN=your_line_channel_access_token_here
LINE_CHANNEL_SECRET=your_line_channel_secret_here
LINE_LOGIN_CHANNEL_ID=your_line_login_channel_id_here
LINE_LOGIN_CHANNEL_SECRET=your_line_login_channel_secret_here

# Admin Configuration
ADMIN_PASSWORD=your_admin_password_here

# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_nextauth_secret_here

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. 資料庫設置
1. 在 Supabase 中創建新專案
2. 執行 `database/schema.sql` 中的 SQL 腳本來創建表格
3. 在 Supabase Storage 中創建 `wedding-photos` bucket

### 5. 啟動開發服務器
```bash
npm run dev
```

開啟 [http://localhost:3000](http://localhost:3000) 查看應用程式。

## 部署

### Vercel 部署
1. 推送代碼到 GitHub
2. 在 Vercel 中導入專案
3. 設置環境變數
4. 部署完成

### 環境變數配置
確保在 Vercel 中設置所有必要的環境變數，特別是：
- Supabase 連接資訊
- Line Login 配置
- 管理員密碼

## 使用指南

### 賓客使用流程
1. 透過 Line Bot 或直接訪問網站
2. 使用 Line Login 登入
3. 參與各種遊戲和活動
4. 上傳照片和祝福訊息

### 管理員使用流程
1. 訪問 `/admin` 頁面
2. 輸入管理員密碼登入
3. 在儀表板中管理遊戲和內容
4. 即時控制遊戲流程

## 資料庫結構

主要表格：
- `users` - 用戶資訊
- `questions` - 題目資料
- `answer_records` - 答題記錄
- `photos` - 照片資訊
- `votes` - 投票記錄
- `game_state` - 遊戲狀態
- `score_adjustments` - 分數調整記錄

詳細結構請參考 `database/schema.sql`。

## 安全性

- JWT Token 認證
- SQL 注入防護
- XSS 攻擊防護
- 檔案上傳限制
- Rate Limiting
- HTTPS 強制

## 支援與維護

如有問題或建議，請聯繫開發團隊。

## 授權

本專案僅供婚禮使用，請勿用於商業用途。
