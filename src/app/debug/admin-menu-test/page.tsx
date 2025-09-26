'use client'

import { useState, useEffect } from 'react'
import { useLiff } from '@/hooks/useLiff'

export default function AdminMenuTestPage() {
  const { isLoggedIn, isAdmin, user, loading: liffLoading, adminLoading } = useLiff()
  const [menuItems, setMenuItems] = useState<any[]>([])

  // 模擬 AdminLayout 中的選單項目
  const adminMenuItems = [
    { name: '控制台', href: '/admin/dashboard', icon: 'BarChart3' },
    { name: '題目管理', href: '/admin/questions', icon: 'HelpCircle' },
    { name: '批量設定', href: '/admin/batch-settings', icon: 'Settings' },
    { name: '分數管理', href: '/admin/scores', icon: 'Trophy' },
    { name: '積分歷史', href: '/admin/score-history', icon: 'Trophy' },
    { name: '計分規則', href: '/admin/scoring-rules', icon: 'Settings' },
    { name: 'LINE 選單', href: '/admin/line-menu', icon: 'Settings' },
    { name: '媒體清理', href: '/admin/media-cleanup', icon: 'HardDrive' },
    { name: '用戶管理', href: '/admin/users', icon: 'Users' },
    { name: '照片管理', href: '/admin/photos', icon: 'Camera' },
    { name: '系統設定', href: '/admin/settings', icon: 'Settings' },
  ]

  useEffect(() => {
    setMenuItems(adminMenuItems)
  }, [])

  const testMediaCleanupPage = async () => {
    try {
      const response = await fetch('/admin/media-cleanup')
      console.log('媒體清理頁面測試:', response.status, response.statusText)
      if (response.ok) {
        alert('✅ 媒體清理頁面可以正常訪問')
        window.open('/admin/media-cleanup', '_blank')
      } else {
        alert('❌ 媒體清理頁面無法訪問: ' + response.status)
      }
    } catch (error) {
      console.error('測試錯誤:', error)
      alert('❌ 測試失敗: ' + error)
    }
  }

  const testMediaCleanupAPI = async () => {
    try {
      const response = await fetch('/api/admin/media/cleanup')
      const data = await response.json()
      console.log('媒體清理 API 測試:', data)
      if (data.success) {
        alert('✅ 媒體清理 API 正常工作')
      } else {
        alert('❌ 媒體清理 API 錯誤: ' + data.error)
      }
    } catch (error) {
      console.error('API 測試錯誤:', error)
      alert('❌ API 測試失敗: ' + error)
    }
  }

  if (liffLoading || adminLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">管理員選單診斷</h1>
        
        {/* 用戶狀態 */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">用戶狀態</h2>
          <div className="space-y-2">
            <p><strong>登入狀態:</strong> {isLoggedIn ? '✅ 已登入' : '❌ 未登入'}</p>
            <p><strong>管理員權限:</strong> {isAdmin ? '✅ 是管理員' : '❌ 不是管理員'}</p>
            <p><strong>用戶資訊:</strong> {user ? `${user.displayName} (${user.lineId})` : '無'}</p>
            <p><strong>LIFF 載入中:</strong> {liffLoading ? '是' : '否'}</p>
            <p><strong>管理員檢查中:</strong> {adminLoading ? '是' : '否'}</p>
          </div>
        </div>

        {/* 選單項目列表 */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">管理員選單項目</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {menuItems.map((item, index) => (
              <div 
                key={index} 
                className={`p-3 rounded-lg border ${
                  item.name === '媒體清理' ? 'bg-yellow-100 border-yellow-300' : 'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <span className="font-mono text-sm">{item.icon}</span>
                  <span className="font-medium">{item.name}</span>
                </div>
                <p className="text-sm text-gray-600 mt-1">{item.href}</p>
                {item.name === '媒體清理' && (
                  <p className="text-sm text-yellow-800 mt-1">🎯 這就是你要找的媒體清理選項！</p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 測試按鈕 */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">功能測試</h2>
          <div className="space-y-4">
            <button
              onClick={testMediaCleanupPage}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg transition-colors"
            >
              🔗 測試媒體清理頁面是否可訪問
            </button>
            
            <button
              onClick={testMediaCleanupAPI}
              className="w-full bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg transition-colors"
            >
              🔧 測試媒體清理 API 是否正常
            </button>

            <a
              href="/admin/media-cleanup"
              target="_blank"
              className="block w-full bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-lg transition-colors text-center"
            >
              🚀 直接訪問媒體清理頁面
            </a>

            <a
              href="/admin/dashboard"
              target="_blank"
              className="block w-full bg-purple-500 hover:bg-purple-600 text-white px-6 py-3 rounded-lg transition-colors text-center"
            >
              📊 訪問管理員控制台
            </a>
          </div>
        </div>

        {/* 說明 */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-6">
          <h3 className="font-semibold text-yellow-800 mb-2">📝 使用說明</h3>
          <ul className="text-sm text-yellow-700 space-y-1">
            <li>• 如果你是管理員但看不到「媒體清理」選項，可能是瀏覽器緩存問題</li>
            <li>• 嘗試重新整理頁面或清除瀏覽器緩存</li>
            <li>• 點擊「直接訪問媒體清理頁面」可以繞過選單直接使用功能</li>
            <li>• 如果 API 測試失敗，可能是部署還沒完成，等待幾分鐘後再試</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
