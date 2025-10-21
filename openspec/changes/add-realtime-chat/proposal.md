## Why
為了增強婚禮活動的互動性，讓賓客能夠即時交流祝福和感想，創造更加溫馨的婚禮氛圍。

## What Changes
- 添加即時聊天功能到現有系統
- 創建聊天室管理功能
- 實現訊息發送和接收
- 添加訊息歷史記錄
- 整合到現有用戶認證系統
- **BREAKING**: 需要新增資料庫表格

## Impact
- Affected specs: chat, user-auth
- Affected code: 
  - 新增: src/components/Chat/, src/app/api/chat/, src/hooks/useChat.ts
  - 修改: src/app/layout.tsx, src/app/game-live/page.tsx
  - 資料庫: 新增 chat_rooms, messages 表格