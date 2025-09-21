export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">隱私政策</h1>
          
          <div className="space-y-6 text-gray-700">
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">資料收集</h2>
              <p>
                本婚禮互動遊戲應用程式會收集以下資訊：
              </p>
              <ul className="list-disc list-inside ml-4 mt-2">
                <li>Line 用戶 ID</li>
                <li>Line 顯示名稱</li>
                <li>Line 頭像圖片</li>
                <li>遊戲參與記錄</li>
                <li>上傳的照片和祝福訊息</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">資料使用</h2>
              <p>
                我們收集的資料僅用於：
              </p>
              <ul className="list-disc list-inside ml-4 mt-2">
                <li>提供婚禮遊戲服務</li>
                <li>顯示用戶身份和積分</li>
                <li>展示照片和祝福訊息</li>
                <li>改善服務品質</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">資料保護</h2>
              <p>
                我們採取適當的安全措施保護您的個人資料，包括：
              </p>
              <ul className="list-disc list-inside ml-4 mt-2">
                <li>加密傳輸</li>
                <li>安全存儲</li>
                <li>限制存取權限</li>
                <li>定期安全檢查</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">資料刪除</h2>
              <p>
                婚禮活動結束後，我們會在合理期間內刪除相關資料。
                如需提前刪除個人資料，請聯繫管理員。
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">聯繫我們</h2>
              <p>
                如對隱私政策有任何疑問，請透過婚禮主辦方聯繫我們。
              </p>
            </section>
          </div>

          <div className="mt-8 pt-8 border-t border-gray-200">
            <p className="text-sm text-gray-500">
              最後更新日期：{new Date().toLocaleDateString('zh-TW')}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
