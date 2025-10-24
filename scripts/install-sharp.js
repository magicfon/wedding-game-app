const { execSync } = require('child_process');

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