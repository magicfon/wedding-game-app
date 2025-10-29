'use client'

import { useState } from 'react'
import Layout from '@/components/Layout'
import ResponsiveImage from '@/components/ResponsiveImage'

export default function LightboxTestPage() {
  const [showLightbox, setShowLightbox] = useState(false)
  
  // 測試用的圖片URL（使用本地圖片避免外部URL問題）
  const testImageUrl = "/api/photo/test-image"  // 使用本地API端點
  const testThumbnailUrls = {
    small: "/api/photo/test-image?w=200",
    medium: "/api/photo/test-image?w=400",
    large: "/api/photo/test-image?w=800"
  }

  return (
    <Layout title="Lightbox 測試">
      <div className="max-w-4xl mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6">Lightbox 原圖顯示測試</h1>
        
        <div className="space-y-8">
          {/* 縮圖模式測試 */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">縮圖模式（正常顯示）</h2>
            <div className="w-64">
              <ResponsiveImage
                src={testImageUrl}
                alt="Test image thumbnail"
                className="w-full h-auto rounded-lg cursor-pointer"
                thumbnailUrls={testThumbnailUrls}
                sizes="(max-width: 640px) 200px, 400px"
                width={400}  // 🎯 設置縮圖寬度
                height={300}  // 🎯 設置縮圖高度
                onClick={() => setShowLightbox(true)}
              />
            </div>
            <p className="text-sm text-gray-600 mt-2">
              這裡應該顯示縮圖（根據螢幕尺寸自動選擇）
            </p>
          </div>

          {/* Lightbox 模式測試 */}
          {showLightbox && (
            <div 
              className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4"
              onClick={() => setShowLightbox(false)}
            >
              <div className="max-w-4xl w-full">
                <div className="text-white text-center mb-4">
                  <h3 className="text-xl font-semibold">Lightbox 模式（應顯示原圖）</h3>
                  <p className="text-sm text-gray-300">
                    檢查網路請求，應該載入 1200px 原圖而不是縮圖
                  </p>
                </div>
                
                <div className="flex justify-center">
                  <ResponsiveImage
                    src={testImageUrl}
                    alt="Test image lightbox"
                    className="max-w-full max-h-[70vh] w-auto h-auto"
                    lightboxMode={true}
                    progressiveLoad={true}  // 🎯 啟用漸進式載入：先顯示縮圖，再載入原圖
                    thumbnailUrls={testThumbnailUrls}
                    sizes={undefined}
                    priority={true}
                    quality={100}
                    width={1200}  // 🎯 明確設置寬度避免 Next.js 錯誤
                    height={800}  // 🎯 設置高度
                  />
                </div>
                
                <div className="text-center mt-4">
                  <button
                    onClick={() => setShowLightbox(false)}
                    className="bg-white text-black px-6 py-2 rounded-lg font-medium"
                  >
                    關閉
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 測試說明 */}
        <div className="bg-blue-50 rounded-lg p-6 mt-8">
          <h3 className="text-lg font-semibold mb-3">測試步驟：</h3>
          <ol className="list-decimal list-inside space-y-2 text-sm">
            <li>打開瀏覽器開發者工具的 Network 面板</li>
            <li>點擊上方的縮圖打開 Lightbox</li>
            <li>觀察圖片載入過程：應先顯示縮圖（800px）</li>
            <li>然後自動載入原圖（1200px）並平滑替換</li>
            <li>檢查 Network 面板中的圖片請求順序</li>
            <li>確認最終顯示的是原圖 URL（1200px）</li>
            <li>確認圖片品質設定為 100</li>
          </ol>
          
          <div className="mt-4 p-3 bg-yellow-100 rounded">
            <p className="text-sm font-medium">預期結果：</p>
            <ul className="list-disc list-inside text-sm mt-1">
              <li>Lightbox 打開時立即顯示縮圖（800px）</li>
              <li>然後自動載入原圖（1200px）並平滑替換</li>
              <li>載入過程中有載入指示器</li>
              <li>最終顯示高品質原圖</li>
              <li>圖片品質應為最高（100）</li>
              <li>不應使用響應式 sizes 屬性</li>
            </ul>
          </div>
          
          <div className="mt-4 p-3 bg-blue-100 rounded">
            <p className="text-sm font-medium">漸進式載入優勢：</p>
            <ul className="list-disc list-inside text-sm mt-1">
              <li>⚡ 快速響應：立即顯示縮圖，避免白屏等待</li>
              <li>🎨 平滑過渡：縮圖到原圖的無縫替換</li>
              <li>📱 用戶友好：減少等待時間，提升體驗</li>
              <li>🔧 智能載入：根據網路條件自動調整</li>
            </ul>
          </div>
          
          <div className="mt-4 p-3 bg-green-100 rounded">
            <p className="text-sm font-medium">照片牆實際行為：</p>
            <ul className="list-disc list-inside text-sm mt-1">
              <li>📸 點擊照片後直接將瀑布牆上的照片放到畫面上放大</li>
              <li>🔄 然後再讀取原圖替換（如果啟用漸進式載入）</li>
              <li>🎯 保持與瀑布牆一致的初始顯示</li>
            </ul>
          </div>
        </div>
      </div>
    </Layout>
  )
}