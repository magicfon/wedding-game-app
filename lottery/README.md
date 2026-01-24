# 抽獎機 - Lottery Machine

一個可自訂軌道的抽獎機應用程式，編輯軌道後會自動儲存到 config.json。

## 功能特色

- 🎲 隨機抽獎功能
- 🎨 可自訂軌道路徑（拖曳節點編輯）
- 📦 可調整腔體與彩球大小
- ⚙️ 可調整物理參數（重力、氣流力、最大速度）
- 💾 自動儲存設定到 config.json
- 🎉 得獎動畫與彩帶效果

## 快速開始

### 1. 安裝依賴（首次使用）

```bash
npm install
```

### 2. 啟動伺服器

**開發模式（熱重載）：**
```bash
npm run dev
```
修改程式碼後會自動重新啟動伺服器。

**生產模式：**
```bash
npm start
```
需要手動重新啟動伺服器來載入新的程式碼。

或直接使用 Node.js：
```bash
node server.js
```

伺服器會在 `http://localhost:3000` 啟動，並會顯示以下訊息：

```
╔════════════════════════════════════════════════════════╗
║   🎰 抽獎機伺服器已啟動                                 ║
║                                                         ║
║   本機網址: http://localhost:3000                     ║
║                                                         ║
║   設定會自動儲存到 config.json                         ║
╚════════════════════════════════════════════════════════╝
```

### 3. 開啟瀏覽器

在瀏覽器中訪問：`http://localhost:3000`

**重要：** 必須先啟動伺服器，否則自動儲存功能無法運作。

## 使用說明

### 軌道編輯

1. 點擊「⚙️ 軌道編輯器」展開編輯面板
2. 勾選「🖱️ 啟用拖曳編輯模式」
3. 直接在畫面上拖曳起點、終點或軌道節點
4. 設定會自動儲存到 config.json

### 調整參數

- **腔體寬度/高度**：調整抽獎腔體的大小
- **彩球直徑**：調整參與者照片的大小
- **重力**：控制彩球下落速度
- **氣流力**：控制彩球被吹起的力度
- **最大速度**：限制彩球的最大移動速度

### 抽獎

1. 點擊「🎲 抽出得獎者」按鈕
2. 系統會隨機選擇一位得獎者
3. 得獎者會沿著軌道滑動到得獎平台
4. 顯示彩帶慶祝效果

## 檔案結構

```
lottery/
├── index.html      # 主頁面
├── script.js       # JavaScript 邏輯
├── styles.css      # 樣式表
├── config.json     # 設定檔案（自動儲存）
├── server.js       # Node.js 伺服器
├── package.json    # 專案設定
└── README.md      # 說明文件
```

## API 端點

### POST /api/save-config

儲存設定到 config.json

**請求格式：**
```json
{
  "trackConfig": { ... },
  "physics": { ... },
  "chamberStyle": { ... },
  "platformStyle": { ... }
}
```

### GET /api/load-config

從 config.json 載入設定

**回應格式：**
```json
{
  "trackConfig": { ... },
  "physics": { ... },
  "chamberStyle": { ... },
  "platformStyle": { ... }
}
```

## 技術說明

- **前端**：純 HTML、CSS、JavaScript
- **後端**：Node.js HTTP 伺服器
- **自動儲存**：透過後端 API 將設定寫入 config.json
- **備份機制**：設定同時儲存到 localStorage，確保資料不會遺失

## 注意事項

- 需要安裝 Node.js 才能啟動伺服器
- 設定會同時儲存到伺服器端 config.json 和瀏覽器 localStorage
- 如果伺服器無法連接，設定仍會儲存到 localStorage
