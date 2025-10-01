# 🎯 LIFF 全屏沉浸式體驗設定指南

## 📝 問題描述

當透過 LINE Rich Menu 打開 LIFF 網頁時，可能會遇到以下問題：
- ❌ LINE 瀏覽器顯示其他分頁標籤欄
- ❌ 向下滑動時瀏覽器會縮小
- ❌ 無法提供沉浸式的使用體驗

## ✨ 目標效果

實現以下效果：
- ✅ 全螢幕顯示，無瀏覽器標籤欄
- ✅ 向下滑動不會縮小瀏覽器
- ✅ 完全沉浸式的使用體驗
- ✅ 固定在 LINE 應用內，無法看到其他網頁分頁

## 🔧 完整解決方案

### 步驟 1：LIFF Size 設定（🌟 最關鍵！）

這是實現全屏效果的**最重要**設定。

#### 在 LINE Developers Console 中設定：

1. 登入 [LINE Developers Console](https://developers.line.biz)
2. 選擇你的 Channel（Messaging API）
3. 點擊左側選單的「LIFF」標籤
4. 找到你的 LIFF 應用程式，點擊編輯

#### 關鍵設定：

```
Size: Full (全螢幕)  ⭐️⭐️⭐️
```

#### Size 選項詳細比較：

| Size 選項 | 外觀 | 分頁標籤 | 滑動縮小 | 適用場景 |
|-----------|------|----------|----------|----------|
| **Full** ✅ | 全螢幕 | ❌ 無 | ❌ 不會 | 遊戲、影片、沉浸式體驗 |
| **Tall** ⚠️ | 75%螢幕 | ✅ 有 | ✅ 會 | 表單、資訊頁面 |
| **Compact** ❌ | 50%螢幕 | ✅ 有 | ✅ 會 | 快速互動、簡單功能 |

**重要提醒：**
- 只有 **Full** 模式能實現完全沉浸式體驗
- Tall 和 Compact 模式都會顯示分頁標籤
- 修改後需要完全關閉 LINE 應用重新開啟才能看到效果

### 步驟 2：網頁端配置

#### A. Viewport Meta 標籤（已完成）

在 `layout.tsx` 中設定：

```typescript
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,          // 防止縮放
  userScalable: false,      // 禁用使用者縮放
  viewportFit: 'cover',     // 覆蓋整個螢幕
};
```

#### B. 額外 Meta 標籤（已完成）

```html
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
<meta name="format-detection" content="telephone=no" />
```

#### C. CSS 樣式優化（已完成）

在 `globals.css` 中：

```css
/* 固定 HTML 和 Body */
html, body {
  width: 100%;
  height: 100%;
  overflow: hidden;
  position: fixed;
  overscroll-behavior: none;      /* 防止橡皮筋效果 */
  -webkit-overflow-scrolling: touch;
}

/* 防止下拉刷新 */
#__next {
  width: 100%;
  height: 100%;
  overflow: auto;
  overscroll-behavior: none;
}
```

### 步驟 3：測試驗證

#### 測試步驟：

1. **完全關閉 LINE 應用**
   - iOS: 向上滑動關閉應用
   - Android: 從最近使用的應用中移除

2. **重新開啟 LINE**
   - 重新啟動 LINE 應用

3. **透過 Rich Menu 打開 LIFF**
   - 點擊 Rich Menu 中的任一功能

4. **檢查效果**
   - ✅ 應該全螢幕顯示
   - ✅ 沒有瀏覽器標籤欄
   - ✅ 向下滑動不會縮小

#### 如果還有問題：

1. **清除 LINE 快取**
   - LINE 設定 → 聊天 → 刪除資料

2. **確認 LIFF 設定已儲存**
   - 回到 LINE Developers Console 再次確認

3. **檢查 Endpoint URL**
   - 確保 LIFF 的 Endpoint URL 正確

## 📱 Rich Menu 設定建議

### 使用 LIFF URL 格式：

```
https://liff.line.me/{LIFF_ID}
```

**不要使用：**
```
❌ https://your-domain.com
❌ https://your-domain.com?openExternalBrowser=1
```

### 為什麼？

- LIFF URL 會在 LINE 內建瀏覽器中開啟
- 直接網址可能會在外部瀏覽器開啟
- 只有透過 LIFF URL 才能使用 Full 模式的全屏效果

## 🎨 用戶體驗最佳實踐

### 1. 頁面內容結構

```tsx
<div className="scrollable-content">
  {/* 你的頁面內容 */}
</div>
```

### 2. 防止意外關閉

```typescript
// 在需要確認的頁面中
useEffect(() => {
  const handleBeforeUnload = (e: BeforeUnloadEvent) => {
    e.preventDefault();
    e.returnValue = '';
  };
  
  window.addEventListener('beforeunload', handleBeforeUnload);
  return () => window.removeEventListener('beforeunload', handleBeforeUnload);
}, []);
```

### 3. 處理返回按鈕

```typescript
const handleClose = () => {
  if (window.liff?.isInClient()) {
    window.liff.closeWindow();
  } else {
    window.history.back();
  }
};
```

## 🔍 故障排除檢查清單

- [ ] LIFF Size 設定為 **Full**
- [ ] 使用 LIFF URL 而非直接網址
- [ ] Viewport meta 標籤已設定
- [ ] CSS 樣式已套用
- [ ] 完全關閉並重新開啟 LINE
- [ ] 清除 LINE 快取（如需要）

## 🎯 效果對比

### 使用 Full 模式前：
```
┌─────────────────────┐
│ ← →  分頁標籤列      │  ← 會顯示
├─────────────────────┤
│                     │
│   你的網頁內容       │
│                     │
│   (向下滑動會縮小)   │  ← 會縮小
│                     │
└─────────────────────┘
```

### 使用 Full 模式後：
```
┌─────────────────────┐
│                     │
│                     │
│   你的網頁內容       │
│   (全螢幕沉浸式)     │
│                     │
│   (固定不縮小)       │
│                     │
└─────────────────────┘
```

## 📊 常見 LIFF Size 誤解

### 誤解 1: "Tall 看起來更大"
❌ **錯誤**：Tall 會顯示標籤欄，實際內容區域更小

✅ **正確**：Full 才是真正的全螢幕，內容區域最大

### 誤解 2: "Full 會隱藏重要資訊"
❌ **錯誤**：擔心使用者無法關閉或返回

✅ **正確**：LINE 會在左上角提供關閉按鈕，使用者體驗更好

### 誤解 3: "需要複雜的程式碼"
❌ **錯誤**：需要很多 JavaScript 來控制顯示

✅ **正確**：只需在 LIFF Console 選擇 Full，配合簡單的 CSS

## 💡 專業建議

1. **優先使用 Full 模式**
   - 除非有特殊原因，遊戲和互動應用都應使用 Full

2. **測試不同設備**
   - iOS 和 Android 的 LINE 瀏覽器表現可能略有不同
   - 確保在兩個平台都測試過

3. **注重使用者體驗**
   - 提供清楚的關閉或返回按鈕
   - 避免過長的頁面需要大量滾動

4. **效能優化**
   - Full 模式下內容會即時渲染
   - 確保圖片和資源已優化

## 🎉 總結

要實現 LINE Rich Menu 打開 LIFF 網頁時的全屏沉浸式體驗：

1. **最關鍵：** LIFF Size 設定為 **Full**
2. **配合：** 正確的 viewport 和 CSS 設定
3. **測試：** 完全關閉 LINE 重新開啟驗證

只要正確設定 LIFF Size 為 Full，就能實現你想要的效果！

---

設定完成後，你的婚禮遊戲將提供最佳的沉浸式體驗！🎊

