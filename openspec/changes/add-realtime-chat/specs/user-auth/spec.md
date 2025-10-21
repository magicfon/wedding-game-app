## MODIFIED Requirements
### Requirement: 用戶認證狀態
已認證用戶 SHALL 能夠訪問所有系統功能，包括遊戲參與、照片上傳和即時聊天。

#### Scenario: 用戶訪問聊天功能
- **WHEN** 已登入用戶嘗試訪問聊天功能
- **THEN** 系統 SHALL 允許用戶進入聊天介面
- **AND** 顯示用戶的 LINE 暱稱和頭像

#### Scenario: 未認證用戶訪問聊天功能
- **WHEN** 未登入用戶嘗試訪問聊天功能
- **THEN** 系統 SHALL 重導向用戶至登入頁面
- **AND** 顯示「請先登入以使用聊天功能」的提示

#### Scenario: 用戶在聊天中顯示身份
- **WHEN** 用戶在聊天中發送訊息
- **THEN** 系統 SHALL 顯示用戶的 LINE 暱稱
- **AND** 顯示用戶的 LINE 頭像縮圖
- **AND** 顯示用戶的積分排名（如果適用）