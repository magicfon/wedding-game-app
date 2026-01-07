# 婚紗照 - 中國大陸版

適用於 Gitee Pages 部署的靜態婚紗照相簿。

## 📁 目錄結構

```
wedding-photos-china/
├── index.html          # 主頁面
├── css/
│   └── style.css       # 樣式
├── js/
│   └── gallery.js      # 相簿功能
├── images/
│   └── photos/         # 👈 請將婚紗照放在這裡
│       ├── 01.jpg
│       ├── 02.jpg
│       └── ...
└── README.md           # 本說明文件
```

## 🚀 快速開始

### 1. 添加照片

將婚紗照放入 `images/photos/` 資料夾，並編輯 `js/gallery.js` 中的 `PHOTOS` 陣列：

```javascript
const PHOTOS = [
    { src: '01.jpg', landscape: false },  // 直幅
    { src: '02.jpg', landscape: true },   // 橫幅
    // 添加更多照片...
];
```

> 💡 提示：如果不確定是橫幅還是直幅，設為 `false`，程式會自動偵測。

### 2. 本地測試

直接用瀏覽器開啟 `index.html`，或使用 Live Server：

```bash
# VS Code 安裝 Live Server 擴展後，右鍵 index.html -> Open with Live Server
```

### 3. 部署到 Gitee Pages

1. 在 [Gitee](https://gitee.com) 建立新倉庫
2. 上傳整個 `wedding-photos-china` 資料夾內容
3. 進入 **服務** → **Gitee Pages**
4. 選擇部署分支，點擊 **啟動**
5. 訪問生成的網址 ✨

## ✨ 功能特色

- 📱 響應式設計，支援手機/平板/電腦
- 🖼️ 智慧排版（橫幅照片自動佔雙列）
- 🔍 點擊放大查看
- ⬅️➡️ 左右切換瀏覽
- ⌨️ 鍵盤導航（← → Esc）
- 👆 觸控滑動支援

## 📝 注意事項

1. **照片格式**：建議使用 JPG，檔案大小控制在 500KB 以內以加快載入速度
2. **Gitee 容量**：免費用戶單一倉庫上限 500MB
3. **圖片命名**：避免使用中文檔名

---

💕 祝福你們幸福美滿！
