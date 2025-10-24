# Sharp 庫在 Vercel 環境中的安裝指南

## 問題概述

在 Vercel 環境中，僅僅在 `package.json` 中添加 Sharp 依賴可能不夠，因為 Vercel 的構建環境需要特定的配置來確保原生依賴正確安裝。

## 解決方案

### 1. 使用 Vercel 配置文件

已創建 `vercel.json` 文件，包含以下配置：

```json
{
  "buildCommand": "npm run build",
  "installCommand": "npm install",
  "framework": "nextjs",
  "env": {
    "NEXT_PUBLIC_SUPABASE_URL": "@supabase_url",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY": "@supabase_anon_key",
    "SUPABASE_SERVICE_ROLE_KEY": "@supabase_service_role_key"
  }
}
```

### 2. 確保 package.json 包含 Sharp 依賴

```json
{
  "dependencies": {
    "sharp": "^0.33.0"
  }
}
```

### 3. 添加安裝後腳本

創建 `scripts/install-sharp.js` 文件：

```javascript
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔧 開始安裝 Sharp 庫...');

try {
  // 執行安裝命令
  execSync('npm install sharp', { stdio: 'inherit' });
  
  // 驗證安裝
  const sharp = require('sharp');
  console.log('✅ Sharp 庫安裝成功!');
  console.log(`📦 版本: ${sharp.versions.sharp}`);
  
} catch (error) {
  console.error('❌ Sharp 庫安裝失敗:', error.message);
  process.exit(1);
}
```

### 4. 更新 package.json 腳本

```json
{
  "scripts": {
    "postinstall": "node scripts/install-sharp.js",
    "install:sharp": "node scripts/install-sharp.js"
  }
}
```

## 部署步驟

### 步驟 1: 本地測試

1. 運行 `npm run install:sharp` 確保 Sharp 在本地環境中正確安裝
2. 運行 `npm run build` 確保構建過程沒有錯誤
3. 測試 Sharp 功能：
   ```javascript
   const sharp = require('sharp');
   console.log('Sharp 可用:', !!sharp);
   ```

### 步驟 2: Vercel 部署

1. 提交所有更改到 Git
2. 推送到遠程倉庫
3. 在 Vercel 儀表板中觸發重新部署
4. 在 Vercel 儀表板的 Environment Variables 中設置：
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`

### 步驟 3: 部署後驗證

1. 訪問 `/api/debug/sharp-simple` 端點測試 Sharp 庫
2. 訪問 `/api/debug/env-check-simple` 端點檢查環境配置
3. 使用管理介面的「測試 Sharp 庫」和「檢查環境配置」按鈕

## 故障排除

### 如果 Sharp 仍然無法載入

1. **檢查 Vercel 構建日誌**：
   - 在 Vercel 儀表板中查看 Functions 標籤
   - 尋找與 Sharp 相關的錯誤信息

2. **嘗試不同的安裝方法**：
   ```json
   {
     "dependencies": {
       "sharp": "0.33.0"
     }
   }
   ```

3. **使用外部圖片處理服務**：
   - 考慮使用 Cloudinary、Imgix 等服務
   - 修改圖片處理邏輯以使用外部 API

4. **降級 Sharp 版本**：
   ```json
   {
     "dependencies": {
       "sharp": "0.32.6"
     }
   }
   ```

### 如果構建超時

1. **增加 Vercel 函數超時**：
   ```json
   {
     "functions": {
       "src/app/api/admin/migrate-photos/route.ts": {
         "maxDuration": 60
       }
     }
   }
   ```

2. **優化圖片處理**：
   - 減少批次處理大小
   - 使用更小的圖片尺寸
   - 實施進度報告

## 最佳實踐

### 1. 使用動態導入

```typescript
async function getSharp() {
  try {
    const sharp = (await import('sharp')).default || (await import('sharp'));
    return sharp;
  } catch (error) {
    console.error('Sharp 載入失敗:', error);
    throw new Error('圖片處理庫不可用');
  }
}
```

### 2. 錯誤處理

```typescript
try {
  const sharp = await getSharp();
  // 使用 sharp 處理圖片
} catch (error) {
  console.error('圖片處理失敗:', error);
  // 返回錯誤響應或使用默認圖片
}
```

### 3. 性能監控

```typescript
const startTime = Date.now();
// 執行圖片處理
const processingTime = Date.now() - startTime;
console.log(`圖片處理耗時: ${processingTime}ms`);
```

## 總結

通過以上配置和步驟，應該能夠解決 Sharp 庫在 Vercel 環境中的安裝和載入問題。關鍵是確保：

1. 正確的依賴聲明
2. 適當的 Vercel 配置
3. 完整的環境變量設置
4. 充分的錯誤處理和降級方案

如果問題仍然存在，建議考慮使用外部圖片處理服務作為替代方案。