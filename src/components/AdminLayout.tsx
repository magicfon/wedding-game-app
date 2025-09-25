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
  X
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
    { name: '用戶管理', href: '/admin/users', icon: Users },
    { name: '照片管理', href: '/admin/photos', icon: Camera },
    { name: '系統設定', href: '/admin/settings', icon: Settings },
  ]

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="p-2 bg-white rounded-lg shadow-md"
        >
          {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-40 w-64 bg-white shadow-lg transform ${
        isMenuOpen ? 'translate-x-0' : '-translate-x-full'
      } lg:translate-x-0 transition-transform duration-300 ease-in-out lg:static lg:inset-0`}>
        
        {/* Header */}
        <div className="flex items-center justify-center h-16 bg-gradient-to-r from-pink-500 to-purple-600">
          <div className="flex items-center space-x-2">
            <Shield className="w-8 h-8 text-white" />
            <span className="text-xl font-bold text-white">管理員</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="mt-8">
          <div className="px-4 space-y-2">
            {adminMenuItems.map((item) => (
              <button
                key={item.href}
                onClick={() => {
                  router.push(item.href)
                  setIsMenuOpen(false)
                }}
                className={`w-full flex items-center space-x-3 px-4 py-3 text-left rounded-lg transition-colors ${
                  pathname === item.href
                    ? 'bg-pink-100 text-pink-700 border-r-4 border-pink-500'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span className="font-medium">{item.name}</span>
              </button>
            ))}
          </div>

          <div className="mt-8 pt-8 border-t border-gray-200">
            <div className="px-4 space-y-2">
              <button
                onClick={() => {
                  router.push('/')
                  setIsMenuOpen(false)
                }}
                className="w-full flex items-center space-x-3 px-4 py-3 text-left rounded-lg transition-colors text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              >
                <Home className="w-5 h-5" />
                <span className="font-medium">回到首頁</span>
              </button>
            </div>
          </div>
        </nav>
      </div>

      {/* Overlay for mobile */}
      {isMenuOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={() => setIsMenuOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="lg:ml-64">
        {/* Top bar */}
        <header className="bg-white shadow-sm border-b">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <div className="flex items-center space-x-4">
                <h1 className="text-2xl font-bold text-gray-900">
                  {title || '管理員控制台'}
                </h1>
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

        {/* Page content */}
        <main className="p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
