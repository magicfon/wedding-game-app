# Project Context

## Purpose
婚禮互動遊戲系統是一個為婚禮活動設計的綜合性互動平台，旨在增強賓客參與度，創造難忘的婚禮體驗。系統提供快問快答、照片分享、投票等多種互動功能，讓賓客能夠積極參與婚禮活動，同時為新人提供珍貴的回憶記錄。

## Tech Stack
- **前端框架**: Next.js 15 + React 19 + TypeScript
- **樣式框架**: Tailwind CSS 4
- **後端**: Vercel Serverless Functions
- **資料庫**: Supabase (PostgreSQL)
- **認證系統**: Line Login + Supabase Auth
- **檔案存儲**: Supabase Storage
- **即時通訊**: Supabase Realtime
- **部署平台**: Vercel
- **開發工具**: ESLint, TypeScript

## Project Conventions

### Code Style
- 使用 TypeScript 進行類型安全開發
- 採用 ESLint 進行程式碼品質檢查
- 組件使用 PascalCase 命名（如 `GameLivePage`）
- 檔案使用 camelCase 命名（如 `gameLivePage.tsx`）
- 常數使用 UPPER_SNAKE_CASE 命名
- 使用 Tailwind CSS 進行樣式設計，採用響應式設計原則

### Architecture Patterns
- **App Router**: 使用 Next.js 13+ App Router 架構
- **Server Components**: 盡可能使用 Server Components 提升效能
- **Client Components**: 僅在需要互動性時使用 'use client'
- **API Routes**: 使用 Next.js API Routes 作為後端服務
- **Realtime Subscriptions**: 使用 Supabase Realtime 進行即時更新
- **Custom Hooks**: 將複雜邏輯抽離為自定義 Hooks（如 `useRealtimeGameState`）

### Testing Strategy
- 使用 Jest 進行單元測試
- 測試檔案放置在 `src/__tests__/` 目錄下
- 測試檔案命名為 `.test.ts` 或 `.test.tsx`
- 重點測試核心業務邏輯和 API 端點

### Git Workflow
- 主要分支：`main`（生產環境）
- 開發分支：`develop`（開發環境）
- 功能分支：`feature/功能名稱`
- 修復分支：`fix/問題描述`
- 提交訊息格式：`type(scope): description`（如 `feat(game): add sound effects`）

## Domain Context

### 核心業務概念
- **賓客 (Guest)**: 透過 Line Login 登入的婚禮參與者
- **主持人 (Host)**: 管理遊戲流程和內容的管理員
- **快問快答 (Quiz)**: 實時問答遊戲，賓客競相答題獲得分數
- **照片牆 (Photo Wall)**: 賓客上傳照片並互相投票的功能
- **遊戲實況 (Game Live)**: 顯示即時遊戲狀態和結果的大螢幕界面
- **排行榜 (Leaderboard)**: 顯示賓客得分排名的競賽元素

### 用戶角色
1. **賓客**: 參與遊戲、上傳照片、投票
2. **主持人/管理員**: 控制遊戲流程、管理內容、調整分數

### 關鍵業務流程
1. 賓客透過 Line Login 登入系統
2. 主持人啟動快問快答遊戲
3. 賓客在答題頁面選擇答案
4. 系統計算分數並更新排行榜
5. 遊戲實況頁面顯示即時結果
6. 賓客可上傳照片並參與投票

## Important Constraints
- **即時性要求**: 遊戲狀態更新必須在 1 秒內完成
- **移動優先**: 主要用戶使用手機參與，需確保移動端體驗
- **Line 生態系統**: 必須與 Line Login 和 Line Bot 深度整合
- **婚禮場景**: 考慮婚禮現場網路環境可能不穩定
- **用戶友好**: 界面必須簡單直觀，適合各年齡層使用
- **資料隱私**: 照片和個人資料需要適當的隱私保護

## External Dependencies
- **Supabase**: 資料庫、認證、存儲和即時通訊服務
- **Line Platform**: Line Login 和 Line Bot API
- **Vercel**: 部署平台和 Serverless Functions
- **Google Fonts**: 字體資源（如需要）
- **Lucide React**: 圖標庫

## Performance Considerations
- 圖片自動壓縮和縮圖生成
- 即時資料訂閱的連接管理
- 大量並發用戶的狀態同步
- 移動網路環境下的載入優化
