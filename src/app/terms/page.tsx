export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">使用條款</h1>
          
          <div className="space-y-6 text-gray-700">
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">服務說明</h2>
              <p>
                本婚禮互動遊戲應用程式提供以下服務：
              </p>
              <ul className="list-disc list-inside ml-4 mt-2">
                <li>快問快答遊戲</li>
                <li>照片分享功能</li>
                <li>投票和排行榜</li>
                <li>即時互動功能</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">使用規範</h2>
              <p>使用本服務時，您同意：</p>
              <ul className="list-disc list-inside ml-4 mt-2">
                <li>不上傳不當或違法內容</li>
                <li>尊重其他參與者</li>
                <li>不進行任何破壞系統的行為</li>
                <li>遵守婚禮活動的相關規定</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">內容政策</h2>
              <p>
                上傳的照片和訊息應符合以下要求：
              </p>
              <ul className="list-disc list-inside ml-4 mt-2">
                <li>適合在婚禮場合展示</li>
                <li>不包含不當或冒犯性內容</li>
                <li>尊重他人隱私</li>
                <li>符合法律規範</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">服務限制</h2>
              <p>
                我們保留以下權利：
              </p>
              <ul className="list-disc list-inside ml-4 mt-2">
                <li>審核和移除不當內容</li>
                <li>暫停違規用戶的使用權限</li>
                <li>修改或終止服務</li>
                <li>更新使用條款</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">免責聲明</h2>
              <p>
                本服務僅供婚禮活動使用，我們不對以下情況負責：
              </p>
              <ul className="list-disc list-inside ml-4 mt-2">
                <li>服務中斷或技術問題</li>
                <li>用戶上傳內容的準確性</li>
                <li>第三方服務的可用性</li>
                <li>不可抗力因素造成的影響</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">聯繫資訊</h2>
              <p>
                如對使用條款有任何疑問，請透過婚禮主辦方聯繫我們。
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
