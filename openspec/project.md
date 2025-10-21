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
