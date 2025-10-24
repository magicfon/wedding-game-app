// 生產環境部署驗證腳本
// 使用方法: node scripts/verify-production-deployment.js

const https = require('https');
const http = require('http');

// 配置
const config = {
  productionUrl: process.env.PRODUCTION_URL || 'https://your-app.vercel.app',
  timeout: 30000, // 30秒超時
  endpoints: [
    '/api/photo/list',
    '/api/admin/migrate-photos',
    '/api/admin/health-check'
  ]
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

// HTTP 請求函數
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const request = protocol.request(url, options, (response) => {
      let data = '';
      response.on('data', chunk => data += chunk);
      response.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({
            ok: response.statusCode >= 200 && response.statusCode < 300,
            status: response.statusCode,
            data: jsonData
          });
        } catch (error) {
          resolve({
            ok: false,
            status: response.statusCode,
            error: 'Invalid JSON response',
            rawData: data.substring(0, 200)
          });
        }
      });
    });

    request.on('error', (error) => {
      resolve({
        ok: false,
        error: error.message
      });
    });

    request.on('timeout', () => {
      request.destroy();
      resolve({
        ok: false,
        error: 'Request timeout'
      });
    });

    request.setTimeout(config.timeout);
    request.end();
  });
}

// 測試 1: 基本連接性測試
async function testBasicConnectivity() {
  log('開始基本連接性測試...');
  
  try {
    const result = await makeRequest(config.productionUrl);
    recordTest(
      '基本連接性',
      result.ok,
      result.ok ? '應用程序可訪問' : `狀態碼: ${result.status || 'Unknown'}`
    );
  } catch (error) {
    recordTest(
      '基本連接性',
      false,
      error.message
    );
  }
}

// 測試 2: API 端點測試
async function testApiEndpoints() {
  log('開始 API 端點測試...');
  
  for (const endpoint of config.endpoints) {
    const url = `${config.productionUrl}${endpoint}`;
    
    try {
      const result = await makeRequest(url);
      recordTest(
        `API 端點: ${endpoint}`,
        result.ok,
        result.ok ? 'API 正常響應' : `狀態碼: ${result.status || 'Unknown'}`
      );
    } catch (error) {
      recordTest(
        `API 端點: ${endpoint}`,
        false,
        error.message
      );
    }
  }
}

// 測試 3: 照片列表功能測試
async function testPhotoListFunctionality() {
  log('開始照片列表功能測試...');
  
  const url = `${config.productionUrl}/api/photo/list?sortBy=time&isPublic=true&limit=5`;
  
  try {
    const result = await makeRequest(url);
    
    if (result.ok && result.data.success) {
      const photos = result.data.data?.photos || [];
      
      // 檢查是否有照片包含縮圖信息
      const photosWithThumbnails = photos.filter(photo => photo.thumbnail_url);
      
      recordTest(
        '照片列表功能',
        true,
        `返回 ${photos.length} 張照片，其中 ${photosWithThumbnails.length} 張有縮圖`
      );
      
      // 如果有照片，檢查縮圖URL是否可訪問
      if (photosWithThumbnails.length > 0) {
        const thumbnailUrl = photosWithThumbnails[0].thumbnail_url;
        try {
          const thumbnailResult = await makeRequest(thumbnailUrl);
          recordTest(
            '縮圖URL可訪問性',
            thumbnailResult.ok,
            thumbnailResult.ok ? '縮圖可正常訪問' : `狀態碼: ${thumbnailResult.status || 'Unknown'}`
          );
        } catch (error) {
          recordTest(
            '縮圖URL可訪問性',
            false,
            error.message
          );
        }
      }
    } else {
      recordTest(
        '照片列表功能',
        false,
        result.data?.error || 'API 響應異常'
      );
    }
  } catch (error) {
    recordTest(
      '照片列表功能',
      false,
      error.message
    );
  }
}

// 測試 4: 遷移狀態檢查
async function testMigrationStatus() {
  log('開始遷移狀態檢查...');
  
  const url = `${config.productionUrl}/api/admin/migrate-photos`;
  
  try {
    const result = await makeRequest(url);
    
    if (result.ok && result.data.success) {
      const { total, withThumbnails, withoutThumbnails } = result.data.data;
      const progressPercentage = total > 0 ? Math.round((withThumbnails / total) * 100) : 0;
      
      recordTest(
        '遷移狀態檢查',
        true,
        `總計: ${total}, 有縮圖: ${withThumbnails}, 無縮圖: ${withoutThumbnails}, 進度: ${progressPercentage}%`
      );
    } else {
      recordTest(
        '遷移狀態檢查',
        false,
        result.data?.error || 'API 響應異常'
      );
    }
  } catch (error) {
    recordTest(
      '遷移狀態檢查',
      false,
      error.message
    );
  }
}

// 測試 5: 健康檢查
async function testHealthCheck() {
  log('開始健康檢查...');
  
  const url = `${config.productionUrl}/api/admin/health-check`;
  
  try {
    const result = await makeRequest(url);
    
    if (result.ok && result.data.success) {
      const { status, services } = result.data.data;
      
      recordTest(
        '健康檢查',
        status === 'healthy',
        `整體狀態: ${status}, 服務狀態: ${JSON.stringify(services)}`
      );
      
      // 檢查各個服務狀態
      Object.entries(services).forEach(([service, serviceStatus]) => {
        recordTest(
          `服務健康檢查: ${service}`,
          serviceStatus === 'healthy',
          `狀態: ${serviceStatus}`
        );
      });
    } else {
      recordTest(
        '健康檢查',
        false,
        result.data?.error || 'API 響應異常'
      );
    }
  } catch (error) {
    recordTest(
      '健康檢查',
      false,
      error.message
    );
  }
}

// 主測試函數
async function runVerification() {
  log('開始生產環境部署驗證...');
  log(`目標URL: ${config.productionUrl}`);
  log(`超時設置: ${config.timeout}ms`);
  
  // 執行測試
  await testBasicConnectivity();
  await testApiEndpoints();
  await testPhotoListFunctionality();
  await testMigrationStatus();
  await testHealthCheck();
  
  // 輸出測試結果
  log('\n=== 驗證結果總結 ===');
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
  const resultsPath = './production-verification-results.json';
  const fs = require('fs');
  fs.writeFileSync(resultsPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    config,
    results: testResults
  }, null, 2));
  log(`\n驗證結果已保存到: ${resultsPath}`);
  
  // 退出代碼
  process.exit(testResults.failed > 0 ? 1 : 0);
}

// 運行驗證
if (require.main === module) {
  runVerification().catch(error => {
    log(`驗證運行失敗: ${error.message}`, 'error');
    process.exit(1);
  });
}

module.exports = {
  runVerification,
  testBasicConnectivity,
  testApiEndpoints,
  testPhotoListFunctionality,
  testMigrationStatus,
  testHealthCheck
};