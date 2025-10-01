# ⚡ LIFF 全屏快速修復指南

## 🎯 問題：LINE 瀏覽器顯示分頁標籤、向下滑動縮小

## 🔥 最快解決方法（5 分鐘）

### 1️⃣ 修改 LIFF Size（最重要！）

前往 [LINE Developers Console](https://developers.line.biz)

```
你的 Channel → LIFF → 編輯
Size: Full ⭐️ (不是 Tall 或 Compact)
儲存
```

### 2️⃣ 測試

```
1. 完全關閉 LINE 應用
2. 重新開啟 LINE
3. 點擊 Rich Menu
4. ✅ 應該全螢幕顯示！
```

---

## 📋 Size 選項快速對照表

| 選項 | 分頁標籤 | 滑動縮小 | 沉浸式 |
|------|---------|---------|--------|
| **Full** ✅ | ❌ 無 | ❌ 不會 | ✅ 是 |
| **Tall** | ✅ 有 | ✅ 會 | ❌ 否 |
| **Compact** | ✅ 有 | ✅ 會 | ❌ 否 |

---

## 💻 程式碼已更新

以下檔案已自動優化（無需手動修改）：

- ✅ `layout.tsx` - viewport 設定
- ✅ `globals.css` - 全屏樣式
- ✅ `LIFF_SETUP_GUIDE.md` - 詳細說明

---

## 🚫 常見錯誤

❌ 使用 Tall 或 Compact  
✅ **必須使用 Full**

❌ 沒有完全關閉 LINE  
✅ **完全關閉後重新開啟**

❌ 使用直接網址而非 LIFF URL  
✅ **使用 `https://liff.line.me/{LIFF_ID}`**

---

## 📞 還有問題？

查看詳細指南：
- `LIFF_FULLSCREEN_GUIDE.md` - 完整說明
- `LIFF_SETUP_GUIDE.md` - 設定指南

---

**重點：只要 LIFF Size 設為 Full，就能解決 90% 的問題！** 🎉

