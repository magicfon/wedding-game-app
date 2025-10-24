// 照片牆縮圖功能測試腳本
// 使用方法: node scripts/test-thumbnail-functionality.js

const fs = require('fs');
const path = require('path');

// 測試配置
const config = {
  baseUrl: 'http://localhost:3000',
  testImagePath: './test-assets/test-image.jpg', // 需要創建測試圖片
  testUserId: 'test-user-' + Date.now()
};

// 測試結果記錄
const testResults = {
  passed: 0,
  failed: 0,
  tests: []
};

// 輔助函數
function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : 'ℹ️';
  console.log(`[${timestamp}] ${prefix} ${message}`);
}

function recordTest(name, passed, details = '') {
  testResults.tests.push({ name, passed, details });
  if (passed) {
    testResults.passed++;
    log(`測試通過: ${name}`, 'success');
  } else {
    testResults.failed++;
    log(`測試失敗: ${name} - ${details}`, 'error');
  }
}

// HTTP 請求輔助函數
async function makeRequest(url, options = {}) {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    });
    
    return {
      ok: response.ok,
      status: response.status,
      data: await response.json()
    };
  } catch (error) {
    return {
      ok: false,
      error: error.message
    };
  }
}

// 測試 1: 檢查 API 端點是否可用
async function testApiEndpoints() {
  log('開始測試 API 端點...');
  
  // 測試照片列表 API
  const listResult = await makeRequest(`${config.baseUrl}/api/photo/list?sortBy=time&isPublic=true`);
  recordTest(
    '照片列表 API',
    listResult.ok,
    listResult.ok ? 'API 正常響應' : `狀態碼: ${listResult.status}`
  );
  
  // 測試遷移狀態 API
  const migrateStatusResult = await makeRequest(`${config.baseUrl}/api/admin/migrate-photos`);
  recordTest(
    '遷移狀態 API',
    migrateStatusResult.ok,
    migrateStatusResult.ok ? 'API 正常響應' : `狀態碼: ${migrateStatusResult.status}`
  );
}

// 測試 2: 照片上傳和縮圖生成
async function testPhotoUpload() {
  log('開始測試照片上傳...');
  
  // 檢查測試圖片是否存在
  if (!fs.existsSync(config.testImagePath)) {
    recordTest(
      '照片上傳測試',
      false,
      `測試圖片不存在: ${config.testImagePath}`
    );
    return;
  }
  
  try {
    // 讀取測試圖片
    const imageBuffer = fs.readFileSync(config.testImagePath);
    
    // 創建 FormData
    const FormData = require('form-data');
    const form = new FormData();
    form.append('file', imageBuffer, 'test-image.jpg');
    form.append('uploaderLineId', config.testUserId);
    form.append('blessingMessage', '測試祝福訊息');
    form.append('isPublic', 'true');
    
    // 發送上傳請求
    const response = await fetch(`${config.baseUrl}/api/photo/upload`, {
      method: 'POST',
      body: form
    });
    
    const result = await response.json();
    
    if (response.ok && result.success) {
      recordTest(
        '照片上傳',
        true,
        `照片 ID: ${result.data.id}`
      );
      
      // 檢查是否返回了縮圖 URL
      if (result.data.thumbnailUrl) {
        recordTest(
          '縮圖生成',
          true,
          `縮圖 URL: ${result.data.thumbnailUrl}`
        );
      } else {
        recordTest(
          '縮圖生成',
          false,
          '上傳成功但沒有返回縮圖 URL'
        );
      }
      
      return result.data.id;
    } else {
      recordTest(
        '照片上傳',
        false,
        result.error || '未知錯誤'
      );
      return null;
    }
  } catch (error) {
    recordTest(
      '照片上傳',
      false,
      error.message
    );
    return null;
  }
}

// 測試 3: 照片列表返回縮圖信息
async function testPhotoListWithThumbnails() {
  log('開始測試照片列表縮圖信息...');
  
  const result = await makeRequest(`${config.baseUrl}/api/photo/list?sortBy=time&isPublic=true`);
  
  if (result.ok && result.data.success) {
    const photos = result.data.data.photos;
    
    if (photos.length > 0) {
      // 檢查是否有照片包含縮圖信息
      const photosWithThumbnails = photos.filter(photo => photo.thumbnail_url);
      
      if (photosWithThumbnails.length > 0) {
        recordTest(
          '照片列表縮圖信息',
          true,
          `${photosWithThumbnails.length}/${photos.length} 張照片有縮圖`
        );
      } else {
        recordTest(
          '照片列表縮圖信息',
          false,
          '沒有照片包含縮圖信息'
        );
      }
    } else {
      recordTest(
        '照片列表縮圖信息',
        false,
        '照片列表為空'
      );
    }
  } else {
    recordTest(
      '照片列表縮圖信息',
      false,
      result.error || 'API 請求失敗'
    );
  }
}

// 測試 4: 遷移功能
async function testMigration() {
  log('開始測試遷移功能...');
  
  // 獲取遷移狀態
  const statusResult = await makeRequest(`${config.baseUrl}/api/admin/migrate-photos`);
  
  if (statusResult.ok && statusResult.data.success) {
    const { total, withThumbnails, withoutThumbnails } = statusResult.data.data;
    
    recordTest(
      '遷移狀態查詢',
      true,
      `總計: ${total}, 有縮圖: ${withThumbnails}, 無縮圖: ${withoutThumbnails}`
    );
    
    // 如果有需要遷移的照片，測試遷移 API
    if (withoutThumbnails > 0) {
      const migrateResult = await makeRequest(`${config.baseUrl}/api/admin/migrate-photos`, {
        method: 'POST'
      });
      
      if (migrateResult.ok && migrateResult.data.success) {
        recordTest(
          '照片遷移',
          true,
          `成功遷移: ${migrateResult.data.data.migrated}, 失敗: ${migrateResult.data.data.failed}`
        );
      } else {
        recordTest(
          '照片遷移',
          false,
          migrateResult.data.error || '遷移失敗'
        );
      }
    } else {
      recordTest(
        '照片遷移',
        true,
        '沒有需要遷移的照片'
      );
    }
  } else {
    recordTest(
      '遷移狀態查詢',
      false,
      statusResult.data.error || 'API 請求失敗'
    );
  }
}

// 測試 5: 性能測試
async function testPerformance() {
  log('開始性能測試...');
  
  const startTime = Date.now();
  
  // 測試照片列表載入時間
  const result = await makeRequest(`${config.baseUrl}/api/photo/list?sortBy=time&isPublic=true&limit=20`);
  
  const loadTime = Date.now() - startTime;
  
  if (result.ok && result.data.success) {
    recordTest(
      '照片列表載入性能',
      loadTime < 2000, // 期望在 2 秒內完成
      `載入時間: ${loadTime}ms`
    );
  } else {
    recordTest(
      '照片列表載入性能',
      false,
      'API 請求失敗'
    );
  }
}

// 主測試函數
async function runTests() {
  log('開始照片牆縮圖功能測試...');
  log(`測試配置: ${JSON.stringify(config, null, 2)}`);
  
  // 創建測試資產目錄
  const testAssetsDir = path.dirname(config.testImagePath);
  if (!fs.existsSync(testAssetsDir)) {
    fs.mkdirSync(testAssetsDir, { recursive: true });
    log(`創建測試資產目錄: ${testAssetsDir}`);
  }
  
  // 執行測試
  await testApiEndpoints();
  await testPhotoListWithThumbnails();
  const uploadedPhotoId = await testPhotoUpload();
  await testMigration();
  await testPerformance();
  
  // 輸出測試結果
  log('\n=== 測試結果總結 ===');
  log(`通過: ${testResults.passed}`);
  log(`失敗: ${testResults.failed}`);
  log(`總計: ${testResults.passed + testResults.failed}`);
  
  if (testResults.failed > 0) {
    log('\n失敗的測試:');
    testResults.tests
      .filter(test => !test.passed)
      .forEach(test => {
        log(`- ${test.name}: ${test.details}`, 'error');
      });
  }
  
  // 保存測試結果
  const resultsPath = './test-results.json';
  fs.writeFileSync(resultsPath, JSON.stringify(testResults, null, 2));
  log(`\n測試結果已保存到: ${resultsPath}`);
  
  // 退出代碼
  process.exit(testResults.failed > 0 ? 1 : 0);
}

// 運行測試
if (require.main === module) {
  runTests().catch(error => {
    log(`測試運行失敗: ${error.message}`, 'error');
    process.exit(1);
  });
}

module.exports = {
  runTests,
  testApiEndpoints,
  testPhotoUpload,
  testPhotoListWithThumbnails,
  testMigration,
  testPerformance
};