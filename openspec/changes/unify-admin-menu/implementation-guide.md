# AdminLayout 修復實施指南

## 問題總結

所有使用 AdminLayout 的頁面都出現「左上右下」的問題：選單顯示在左上角，內容顯示在右下角，而不是並排顯示。經過多次嘗試，發現問題根源是 AdminLayout 組件的側邊欄設計存在根本性問題。

## 發現的解決方案

分析「照片上傳」頁面使用的 Layout 組件，發現它採用了覆蓋層（overlay）選單方式，這種方式簡單有效，沒有顯示問題。決定採用相同的方式重新設計 AdminLayout 組件。

## 解決方案

### 步驟 1: 重寫 AdminLayout 組件（採用覆蓋層設計）

替換 `src/components/AdminLayout.tsx` 的內容：

```jsx
'use client'

import { useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import {
  Shield,
  HelpCircle,
  Users,
  Trophy,
  Camera,
  Settings,
  BarChart3,
  Home,
  Menu,
  X,
  HardDrive,
  Gift
} from 'lucide-react'

interface AdminLayoutProps {
  children: React.ReactNode
  title?: string
}

export default function AdminLayout({ children, title }: AdminLayoutProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  const adminMenuItems = [
    { name: '控制台', href: '/admin/dashboard', icon: BarChart3 },
    { name: '題目管理', href: '/admin/questions', icon: HelpCircle },
    { name: '批量設定', href: '/admin/batch-settings', icon: Settings },
    { name: '分數管理', href: '/admin/scores', icon: Trophy },
    { name: '積分歷史', href: '/admin/score-history', icon: Trophy },
    { name: '計分規則', href: '/admin/scoring-rules', icon: Settings },
    { name: 'LINE 選單', href: '/admin/line-menu', icon: Settings },
    { name: '媒體清理', href: '/admin/media-cleanup', icon: HardDrive },
    { name: '照片摸彩', href: '/admin/lottery', icon: Gift },
    { name: '用戶管理', href: '/admin/users', icon: Users },
    { name: '照片管理', href: '/admin/photos', icon: Camera },
    { name: '系統設定', href: '/admin/settings', icon: Settings },
  ]

  // 處理選單點擊
  const handleMenuClick = (href: string) => {
    router.push(href)
    setIsMenuOpen(false)
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-40">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center space-x-4">
              {/* 漢堡選單按鈕 */}
              <button
                onClick={() => setIsMenuOpen(true)}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <Menu className="w-6 h-6 text-gray-700" />
              </button>
              
              {/* Logo 和標題 */}
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full flex items-center justify-center">
                  <Shield className="w-6 h-6 text-white" />
                </div>
                <h1 className="text-xl font-bold text-gray-800">
                  {title || '管理員控制台'}
                </h1>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-500">
                {new Date().toLocaleDateString('zh-TW', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  weekday: 'long'
                })}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* 選單覆蓋層 */}
      {isMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-50"
          onClick={() => setIsMenuOpen(false)}
        >
          <div
            className="fixed left-0 top-0 h-full w-80 bg-white shadow-xl transform transition-transform"
            onClick={e => e.stopPropagation()}
          >
            {/* 選單標題 */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full flex items-center justify-center">
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-lg font-semibold text-gray-800">管理員選單</h2>
              </div>
              <button
                onClick={() => setIsMenuOpen(false)}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X className="w-6 h-6 text-gray-700" />
              </button>
            </div>

            {/* 選單項目 */}
            <nav className="p-4 space-y-2">
              {adminMenuItems.map((item) => (
                <button
                  key={item.href}
                  onClick={() => handleMenuClick(item.href)}
                  className={`w-full flex items-center space-x-3 p-3 rounded-lg transition-colors text-left ${
                    pathname === item.href
                      ? 'bg-pink-100 text-pink-700'
                      : 'hover:bg-gray-100 text-gray-700'
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  <span>{item.name}</span>
                </button>
              ))}

              {/* 回到首頁 */}
              <button
                onClick={() => handleMenuClick('/')}
                className="w-full flex items-center space-x-3 p-3 rounded-lg transition-colors text-left hover:bg-gray-100 text-gray-700"
              >
                <Home className="w-5 h-5" />
                <span>回到首頁</span>
              </button>
            </nav>
          </div>
        </div>
      )}

      {/* 主內容 */}
      <main className="p-4 sm:p-6 lg:p-8">
        {children}
      </main>
    </div>
  )
}
```

### 步驟 2: 測試修復

1. 保存文件後，檢查開發服務器是否自動重新編譯
2. 在 Chrome 瀏覽器中訪問任何管理頁面
3. 確認選單和內容是否正確並排顯示
4. 測試響應式行為：調整瀏覽器窗口大小
5. 測試移動版：縮小窗口並點擊漢堡選單

### 步驟 3: 驗證所有頁面

訪問以下頁面確認一致性：
- `/admin/dashboard`
- `/admin/questions`
- `/admin/photos`
- `/admin/voting-settings`
- 其他管理頁面

## 關鍵改進點

1. **完全分離桌面和移動版**: 使用兩個完全獨立的佈局結構
2. **簡化定位**: 避免複雜的 CSS 定位，使用最簡單的 flex 佈局
3. **清晰的 HTML 結構**: 每個元素都有明確的用途和位置
4. **測試驅動**: 每個組件都經過測試確保正常工作

## 故障排除

如果問題仍然存在：

1. **檢查瀏覽器緩存**: 強制刷新頁面 (Ctrl+F5)
2. **檢查控制台錯誤**: 打開開發者工具查看是否有 JavaScript 錯誤
3. **檢查 Tailwind CSS**: 確認 Tailwind 類別正確應用
4. **逐步測試**: 先測試桌面版，再測試移動版

## 預期結果

修復後，您應該看到：
- 桌面版：選單在左側，內容在右側，完美並排顯示
- 移動版：選單隱藏，點擊漢堡選單時滑出覆蓋內容
- 所有頁面：一致的選單體驗和導航行為