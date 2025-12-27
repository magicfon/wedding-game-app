# Rich Menu 圖片上傳問題修復

## 問題描述

當嘗試上傳 Rich Menu 圖片到 LINE API 時，收到 400 Bad Request 錯誤。

### 錯誤信息

```
Error uploading image to LINE: Request failed with status code 400
```

### 錯誤詳情

- 圖片尺寸：2500 x 1686（正確）
- 圖片大小：66349 bytes
- 圖片類型：image/png
- API 端點：`https://api-data.line.me/v2/bot/richmenu/{richMenuId}/content`

## 可能的原因

1. **LINE Bot SDK 方法使用不正確**：`postBinary` 方法的參數順序或格式可能不正確
2. **圖片數據格式問題**：圖片數據可能需要特定的編碼或格式
3. **Content-Type 設置問題**：Content-Type 可能需要更精確的設置

## 解決方案

### 1. 添加備用方案

修改了 `src/app/api/admin/richmenu/upload-image/route.ts`，添加了兩種上傳方法的備用方案：

```typescript
// 先嘗試使用 setRichMenuImage 方法
try {
  await (lineClient as any).setRichMenuImage(
    richMenuId,
    imageBufferData,
    file.type
  )
  console.log('✅ Image uploaded successfully using setRichMenuImage')
} catch (setRichMenuImageError) {
  // 如果失敗，嘗試使用 postBinary 方法
  await (lineClient as any).postBinary(
    `/richmenu/${richMenuId}/content`,
    imageBufferData,
    file.type
  )
  console.log('✅ Image uploaded successfully using postBinary')
}
```

### 2. 添加詳細的調試信息

添加了更多的日誌輸出來幫助診斷問題：

```typescript
console.log('📤 Image buffer size:', imageBufferData.length, 'bytes')
console.log('📤 Image buffer type:', imageBufferData.constructor.name)
console.log('📤 Content-Type:', file.type)
console.log('📤 Rich Menu ID:', richMenuId)
console.log('📤 API endpoint:', `/richmenu/${richMenuId}/content`)
```

### 3. 創建調試端點

創建了 `src/app/api/admin/richmenu/debug-upload/route.ts` 來測試 LINE API 連接：

#### GET 方法

測試是否能夠獲取 Rich Menu 信息：

```bash
GET /api/admin/richmenu/debug-upload
```

#### POST 方法

測試上傳一個簡單的測試圖片（1x1 像素的 PNG）：

```bash
POST /api/admin/richmenu/debug-upload
```

## 測試步驟

### 1. 測試調試端點

首先測試調試端點來確認 LINE API 連接是否正常：

```bash
# 測試獲取 Rich Menu 信息
curl https://wedding-game-app.vercel.app/api/admin/richmenu/debug-upload

# 測試上傳測試圖片
curl -X POST https://wedding-game-app.vercel.app/api/admin/richmenu/debug-upload
```

### 2. 檢查日誌

查看 Vercel 日誌中的詳細錯誤信息：

```bash
vercel logs
```

### 3. 驗證圖片

確保上傳的圖片符合 LINE API 的要求：

- 尺寸：2500 x 1686 像素
- 格式：PNG 或 JPEG
- 文件大小：不超過 10 MB
- 色彩模式：RGB

## 進一步調試

如果問題仍然存在，可以嘗試以下步驟：

### 1. 使用 curl 直接測試

```bash
curl -X POST https://api-data.line.me/v2/bot/richmenu/{richMenuId}/content \
  -H "Authorization: Bearer {channel access token}" \
  -H "Content-Type: image/png" \
  --data-binary @richmenu.png
```

### 2. 檢查 LINE Bot SDK 版本

確認 `@line/bot-sdk` 版本是否為最新版本：

```bash
npm list @line/bot-sdk
```

### 3. 檢查環境變量

確認 `LINE_CHANNEL_ACCESS_TOKEN` 是否正確設置：

```bash
echo $LINE_CHANNEL_ACCESS_TOKEN
```

## 已知的 LINE API 限制

根據 LINE API 文檔，Rich Menu 圖片有以下限制：

1. **尺寸要求**：
   - 寬度：800-2500 像素
   - 高度：250-1686 像素
   - 必須與創建 Rich Menu 時設置的尺寸完全一致

2. **文件格式**：
   - PNG
   - JPEG

3. **文件大小**：
   - 不超過 10 MB

4. **色彩模式**：
   - RGB
   - 不支持 CMYK 或其他色彩模式

## 常見問題

### Q: 為什麼會收到 400 錯誤？

A: 400 錯誤通常表示請求格式不正確。可能的原因包括：
- 圖片尺寸與 Rich Menu 設置不匹配
- 圖片格式不支持
- Content-Type 設置錯誤
- 圖片數據格式不正確

### Q: 如何確認圖片尺寸是否正確？

A: 使用圖片編輯軟或命令行工具檢查：

```bash
# 使用 identify 命令（需要 ImageMagick）
identify richmenu.png

# 或使用 sharp（Node.js）
sharp('richmenu.png').metadata()
```

### Q: 如何測試 LINE API 連接？

A: 使用調試端點或 curl 命令測試：

```bash
# 使用調試端點
curl https://wedding-game-app.vercel.app/api/admin/richmenu/debug-upload

# 使用 curl
curl -H "Authorization: Bearer {token}" \
  https://api-data.line.me/v2/bot/richmenu/{richMenuId}
```

## 參考資料

- [LINE Messaging API - Rich Menus](https://developers.line.biz/en/docs/messaging-api/using-rich-menus/)
- [LINE Messaging API - Upload Rich Menu Image](https://developers.line.biz/en/reference/messaging-api/#upload-rich-menu-image)
- [@line/bot-sdk GitHub Repository](https://github.com/line/line-bot-sdk-nodejs)
