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

/**
 * AdminLayout 組件 - 管理員頁面的統一佈局
 *
 * 使用覆蓋層設計模式，解決了原來的「左上右下」顯示問題。
 * 在所有設備上提供一致的選單體驗，使用全屏覆蓋層方式顯示選單。
 *
 * @param children - 子組件內容
 * @param title - 頁面標題，顯示在 Header 中
 */
interface AdminLayoutProps {
  children: React.ReactNode
  title?: string
}

export default function AdminLayout({ children, title }: AdminLayoutProps) {
  // 控制選單開關狀態
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  // 管理員選單項目配置
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

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header - 固定在頂部，包含漢堡選單按鈕和頁面標題 */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-40">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center space-x-4">
              {/* 漢堡選單按鈕 - 在所有螢幕尺寸都顯示，點擊打開覆蓋層選單 */}
              <button
                onClick={() => setIsMenuOpen(true)}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                aria-label="打開選單"
              >
                <Menu className="w-6 h-6 text-gray-700" />
              </button>
              
              {/* Logo 和標題 */}
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full flex items-center justify-center">
                  <Shield className="w-6 h-6 text-white" />
                </div>
                <h1 className="text-xl font-bold text-gray-800">
                  {title || '管理員控制台'}
                </h1>
              </div>
            </div>
            
            {/* 日期顯示 - 在桌面版顯示完整日期，移動版顯示簡短日期 */}
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-500 hidden sm:block">
                {new Date().toLocaleDateString('zh-TW', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  weekday: 'long'
                })}
              </div>
              <div className="text-sm text-gray-500 sm:hidden">
                {new Date().toLocaleDateString('zh-TW', {
                  month: 'short',
                  day: 'numeric'
                })}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* 全屏選單覆蓋層 - 使用覆蓋層設計模式，解決「左上右下」問題 */}
      {isMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-50 animate-fade-in"
          onClick={() => setIsMenuOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="menu-title"
        >
          {/* 選單面板 - 從左側滑入，固定寬度，帶有陰影效果 */}
          <div
            className="fixed left-0 top-0 h-full w-80 bg-white shadow-xl transform transition-transform duration-300 ease-out animate-slide-in"
            style={{ willChange: 'transform' }}
            onClick={e => e.stopPropagation()}
          >
            {/* 選單 Header - 包含標題和關閉按鈕 */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full flex items-center justify-center">
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <h2 id="menu-title" className="text-lg font-semibold text-gray-800">管理員選單</h2>
              </div>
              <button
                onClick={() => setIsMenuOpen(false)}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                aria-label="關閉選單"
              >
                <X className="w-6 h-6 text-gray-700" />
              </button>
            </div>

            {/* 選單項目 - 包含所有管理頁面鏈接，當前頁面高亮顯示 */}
            <nav className="p-4 space-y-2" role="navigation">
              {adminMenuItems.map((item, index) => (
                <button
                  key={item.href}
                  onClick={() => {
                    router.push(item.href)
                    setIsMenuOpen(false)
                  }}
                  className={`w-full flex items-center space-x-3 p-3 rounded-lg transition-all duration-200 text-left group ${
                    pathname === item.href
                      ? 'bg-pink-100 text-pink-700 border-r-4 border-pink-500 shadow-sm'
                      : 'hover:bg-gray-100 hover:text-gray-900 hover:translate-x-1 text-gray-700'
                  }`}
                  style={{
                    animationDelay: `${index * 50}ms`,
                    animation: 'fadeInUp 0.3s ease-out forwards',
                    opacity: 0
                  }}
                  aria-current={pathname === item.href ? 'page' : undefined}
                >
                  <item.icon className={`w-5 h-5 transition-transform duration-200 ${
                    pathname === item.href ? 'text-pink-600' : 'group-hover:scale-110'
                  }`} />
                  <span className="font-medium">{item.name}</span>
                  {/* 當前頁面指示器 - 動畫脈動效果 */}
                  {pathname === item.href && (
                    <div className="ml-auto">
                      <div className="w-2 h-2 bg-pink-500 rounded-full animate-pulse"></div>
                    </div>
                  )}
                </button>
              ))}

              {/* 分隔線 */}
              <div className="border-t border-gray-200 my-4"></div>

              {/* 回到首頁 - 特殊樣式，位於選單底部 */}
              <button
                onClick={() => {
                  router.push('/')
                  setIsMenuOpen(false)
                }}
                className="w-full flex items-center space-x-3 p-3 rounded-lg transition-all duration-200 text-left group hover:bg-gray-100 hover:text-gray-900 hover:translate-x-1 text-gray-700 border-t border-gray-200 mt-4 pt-4"
              >
                <Home className="w-5 h-5 transition-transform duration-200 group-hover:scale-110" />
                <span className="font-medium">回到首頁</span>
              </button>
            </nav>
          </div>
        </div>
      )}

      {/* 主內容區域 - 響應式間距 */}
      <main className="p-4 sm:p-6 lg:p-8">
        {children}
      </main>
    </div>
  )
}
