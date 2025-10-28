# Project Context

## Purpose
婚禮互動遊戲系統是一個為婚禮活動設計的綜合性互動平台，旨在增強賓客參與度，創造難忘的婚禮體驗。系統提供快問快答、照片分享、投票等多種互動功能，讓婚禮更加精彩有趣。

## Tech Stack
- **前端框架**: Next.js 15.5.3 with React 19.1.0
- **語言**: TypeScript 5
- **樣式**: Tailwind CSS 4
- **後端**: Vercel Serverless Functions
- **資料庫**: Supabase (PostgreSQL)
- **認證**: Line Login + Supabase Auth + NextAuth
- **檔案存儲**: Supabase Storage
- **即時更新**: Supabase Realtime
- **LINE 整合**: @line/bot-sdk
- **其他工具**: QR Code generation, Lucide React icons

## Project Conventions

### Code Style
- 使用 TypeScript 嚴格模式
- 採用 ESLint 進行程式碼檢查
- 使用 Tailwind CSS 進行樣式設計
- 組件採用 PascalCase 命名
- 檔案路徑使用 kebab-case
- API 路由遵循 RESTful 原則

### Architecture Patterns
- **單頁應用架構**: 使用 Next.js App Router
- **組件化設計**: 可重用的 React 組件
- **API 路由**: 使用 Next.js API Routes 作為後端服務
- **資料庫層**: 使用 Supabase 作為 BaaS (Backend as a Service)
- **認證流程**: Line Login 整合 Supabase Auth
- **即時通信**: Supabase Realtime 訂閱

### Testing Strategy
- 目前專案主要依賴手動測試
- 使用 TypeScript 進行型別檢查
- 使用 ESLint 進行程式碼品質檢查
- 建議未來添加 Jest 和 React Testing Library 進行單元測試

### Git Workflow
- 主要分支: `main`
- 使用功能分支進行開發
- 提交訊息使用中文，格式: `[類型] 簡短描述`
- 類型包括: [功能], [修復], [重構], [文檔], [樣式]

## Domain Context
- **目標用戶**: 婚禮賓客和管理員
- **核心功能**: 快問快答、照片上傳/分享、投票系統、積分排行榜
- **業務流程**: 賓客透過 Line Login 登入 → 參與遊戲 → 獲得積分 → 查看排名
- **管理流程**: 管理員登入 → 管理題目/照片 → 控制遊戲狀態 → 查看統計數據
- **資料模型**: 用戶、題目、答題記錄、照片、投票、遊戲狀態、積分調整

## Important Constraints
- **LINE 平台依賴**: 必須符合 LINE Bot 和 LINE Login 的使用規範
- **即時性要求**: 遊戲狀態更新需要低延遲
- **檔案大小限制**: 照片上傳需要考慮存儲空間和頻寬限制
- **多語言支援**: 主要使用繁體中文
- **隱私保護**: 需要保護用戶照片和個人資訊
- **婚禮場景**: 針對婚禮活動的特殊需求設計

## External Dependencies
- **Supabase**: 資料庫、認證、存儲、即時通信
- **LINE Platform**: Bot API、Login API、Webhook
- **Vercel**: 部署平台和 Serverless Functions
- **QR Code API**: 生成 QR Code 供用戶掃描
- **NextAuth**: 認證中間件
- **Lucide React**: 圖標庫

## Core Features

### 賓客端功能
- **遊戲實況** (`/game-live`): 觀看正在進行的遊戲狀態
- **快問快答** (`/quiz`): 參與答題競賽，答對得分
- **照片上傳** (`/photo-upload`): 上傳美好回憶並留下祝福
- **照片牆** (`/photo-wall`): 瀏覽所有照片並投票
- **快門傳情** (`/photo-slideshow`): 輪播展示照片和祝福
- **排行榜** (`/leaderboard`): 查看積分排名
- **抽獎活動** (`/lottery-live`): 參與抽獎活動

### 管理員功能
- **總覽儀表板** (`/admin/dashboard`): 查看統計數據和系統狀態
- **簡易儀表板** (`/admin/simple-dashboard`): 簡化的管理介面
- **快問快答管理** (`/admin/questions`): 新增、編輯題目，控制遊戲流程
- **照片管理** (`/admin/photos`): 審核照片，管理投票
- **用戶管理** (`/admin/scores`): 查看參與者資訊和分數
- **系統設定** (`/admin/settings`): 調整遊戲參數
- **投票設定** (`/admin/voting-settings`): 管理投票相關設定
- **抽獎管理** (`/admin/lottery`): 管理抽獎活動

## Database Schema

### 核心表格
- **users**: 用戶資訊 (LINE ID、顯示名稱、頭像、總分)
- **questions**: 題目資料 (題目內容、選項、正確答案、分數設定)
- **answer_records**: 答題記錄 (用戶答案、答題時間、是否正確、獲得分數)
- **photos**: 照片資訊 (上傳者、檔案資訊、祝福訊息、投票數)
- **votes**: 投票記錄 (投票者、照片 ID，防止重複投票)
- **game_state**: 遊戲狀態 (當前題目、遊戲狀態、投票設定)
- **score_adjustments**: 分數調整記錄 (管理員手動調整分數)

### 自動化觸發器
- **update_photo_vote_count**: 自動更新照片投票數
- **update_user_total_score**: 自動更新用戶總分
- **apply_score_adjustment**: 自動應用分數調整

## Key Components

### React 組件
- **Layout**: 主要佈局組件，包含導航和用戶狀態
- **AdminLayout**: 管理員專用佈局
- **MasonryPhotoWall**: 瀑布流照片牆展示
- **MediaUpload**: 媒體檔案上傳組件
- **DragDropQuestionList**: 拖放式題目列表管理
- **UserStatus**: 用戶狀態顯示
- **SimpleUserStatus**: 簡化的用戶狀態

### Custom Hooks
- **useGameState**: 遊戲狀態管理
- **useLiff**: LINE LIFF SDK 整合
- **useRealtimeGameState**: 即時遊戲狀態訂閱

## API Routes Structure

### 管理員 API (`/api/admin/*`)
- **questions**: 題目管理 (CRUD、批次更新、重新排序)
- **photos**: 照片管理 (列表、刪除、切換可見性)
- **scores**: 分數管理
- **stats**: 統計數據
- **media**: 媒體檔案管理
- **voting-settings**: 投票設定
- **storage**: 存儲設定

### 遊戲 API (`/api/*`)
- **quiz**: 答題相關 (心跳檢測、分數計算)
- **photo**: 照片相關 (列表、上傳、投票)
- **lottery**: 抽獎相關 (資格檢查、抽獎、歷史記錄)
- **game**: 遊戲控制
- **user**: 用戶相關 (分數歷史)

### LINE 整合 API (`/api/line/*`)
- **webhook**: LINE Bot Webhook 處理
- **setup-menu**: LINE 選單設定

### 認證 API (`/api/auth/*`)
- **line-callback**: LINE Login 回調
- **liff-sync**: LIFF 同步

## Development Environment

### 環境變數配置
- **Supabase**: URL、匿名金鑰、服務角色金鑰
- **LINE**: 頻道存取權杖、頻道密碼、Login 設定
- **管理員**: 管理員密碼
- **NextAuth**: URL 和密碼
- **應用程式**: 應用程式 URL

### 開發指令
```bash
npm run dev          # 啟動開發服務器 (使用 Turbopack)
npm run build        # 建置生產版本 (使用 Turbopack)
npm run start        # 啟動生產服務器
npm run lint         # 執行 ESLint 檢查
```

## Deployment

### Vercel 部署
- 自動部署從 GitHub 分支
- 環境變數需在 Vercel 控制台設定
- 支援預覽部署 (Preview Deployments)

### 圖片優化
- 支援外部圖片域名 (Supabase、LINE CDN)
- 自動圖片優化和調整大小

## Security Considerations

- **認證**: LINE Login + Supabase Auth 雙重認證
- **授權**: 基於角色的存取控制 (賓客 vs 管理員)
- **資料保護**: SQL 注入防護、XSS 防護
- **檔案安全**: 檔案類型檢查、大小限制
- **即時安全**: Supabase RLS (Row Level Security) 政策
