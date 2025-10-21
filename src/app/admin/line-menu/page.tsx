'use client'

import { useState, useEffect } from 'react'
import { useLiff } from '@/hooks/useLiff'
import { useRouter } from 'next/navigation'
import AdminLayout from '@/components/AdminLayout'
import { Menu, Settings, Check, AlertCircle, ExternalLink } from 'lucide-react'

interface RichMenu {
  richMenuId: string
  size: {
    width: number
    height: number
  }
  selected: boolean
  name: string
  chatBarText: string
  areas: Array<{
    bounds: {
      x: number
      y: number
      width: number
      height: number
    }
    action: {
      type: string
      uri: string
    }
  }>
}

interface MenuStatus {
  success: boolean
  richMenus: RichMenu[]
  defaultRichMenuId: string | null
  message: string
}

export default function AdminLineMenuPage() {
  const [menuStatus, setMenuStatus] = useState<MenuStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [setupLoading, setSetupLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [messageType, setMessageType] = useState<'success' | 'error'>('success')
  
  const { isLoggedIn, isAdmin, loading: liffLoading, adminLoading } = useLiff()
  const router = useRouter()

  // 檢查管理員權限
  useEffect(() => {
    if (liffLoading || adminLoading) return
    if (!isLoggedIn || !isAdmin) {
      router.push('/')
    }
  }, [liffLoading, adminLoading, isLoggedIn, isAdmin, router])

  // 載入選單狀態
  const fetchMenuStatus = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/line/setup-menu')
      const data = await response.json()
      
      if (data.success) {
        setMenuStatus(data)
      } else {
        setMessage(data.error || '載入選單狀態失敗')
        setMessageType('error')
      }
    } catch (error) {
      console.error('載入選單狀態錯誤:', error)
      setMessage('載入選單狀態失敗')
      setMessageType('error')
    } finally {
      setLoading(false)
    }
  }

  // 設置選單
  const setupMenu = async () => {
    try {
      setSetupLoading(true)
      setMessage(null)
      
      const response = await fetch('/api/line/setup-menu', {
        method: 'POST'
      })
      const data = await response.json()
      
      if (data.success) {
        setMessage('選單設置成功！')
        setMessageType('success')
        // 重新載入狀態
        await fetchMenuStatus()
      } else {
        setMessage(data.error || '設置選單失敗')
        setMessageType('error')
      }
    } catch (error) {
      console.error('設置選單錯誤:', error)
      setMessage('設置選單失敗')
      setMessageType('error')
    } finally {
      setSetupLoading(false)
    }
  }

  useEffect(() => {
    if (isLoggedIn && isAdmin) {
      fetchMenuStatus()
    }
  }, [isLoggedIn, isAdmin])

  if (liffLoading || adminLoading || loading) {
    return (
      <AdminLayout title="LINE Bot 選單管理">
        <div className="flex justify-center items-center py-12">
          <div className="text-gray-500">載入中...</div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout title="LINE Bot 選單管理">
      <div className="max-w-6xl mx-auto">
        
        {/* 狀態訊息 */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg ${
            messageType === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
          }`}>
            <div className="flex items-center space-x-2">
              {messageType === 'success' ? (
                <Check className="w-5 h-5" />
              ) : (
                <AlertCircle className="w-5 h-5" />
              )}
              <span>{message}</span>
            </div>
          </div>
        )}

        {/* 選單設置卡片 */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <Menu className="w-6 h-6 text-blue-600" />
              <div>
                <h2 className="text-xl font-bold text-gray-900">LINE Bot 選單設置</h2>
                <p className="text-gray-600">管理 LINE Bot 的豐富選單和用戶導航</p>
              </div>
            </div>
            
            <button
              onClick={setupMenu}
              disabled={setupLoading}
              className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Settings className="w-4 h-4" />
              <span>{setupLoading ? '設置中...' : '重新設置選單'}</span>
            </button>
          </div>

          {/* LIFF 登入流程說明 */}
          <div className="bg-green-50 p-4 rounded-lg mb-6">
            <h3 className="font-semibold text-green-900 mb-2">🔧 LIFF 登入流程</h3>
            <div className="text-green-800 text-sm space-y-2">
              <p>• 使用 LIFF URL，每個用戶用自己的 LINE 帳號自動登入</p>
              <p>• 無需額外授權步驟，直接在 LINE 內開啟遊戲</p>
              <p>• 自動獲取用戶 LINE 資訊（姓名、頭像等）</p>
              <p>• 提供最佳的 LINE 用戶體驗</p>
            </div>
          </div>

          {/* 選單項目預覽 */}
          <div className="bg-blue-50 p-4 rounded-lg mb-6">
            <h3 className="font-semibold text-blue-900 mb-3">📱 LINE 用戶端選單項目</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="bg-white p-4 rounded-lg border border-blue-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-gray-900">🎮 遊戲實況</span>
                  <ExternalLink className="w-4 h-4 text-blue-500" />
                </div>
                <p className="text-sm text-gray-600">/game-live</p>
              </div>
              
              <div className="bg-white p-4 rounded-lg border border-blue-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-gray-900">❓ 快問快答</span>
                  <ExternalLink className="w-4 h-4 text-blue-500" />
                </div>
                <p className="text-sm text-gray-600">/quiz</p>
              </div>
              
              <div className="bg-white p-4 rounded-lg border border-blue-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-gray-900">📸 照片上傳</span>
                  <ExternalLink className="w-4 h-4 text-blue-500" />
                </div>
                <p className="text-sm text-gray-600">/photo-upload</p>
              </div>
              
              <div className="bg-white p-4 rounded-lg border border-blue-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-gray-900">🖼️ 照片牆</span>
                  <ExternalLink className="w-4 h-4 text-blue-500" />
                </div>
                <p className="text-sm text-gray-600">/photo-wall</p>
              </div>
              
              <div className="bg-white p-4 rounded-lg border border-blue-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-gray-900">🏆 排行榜</span>
                  <ExternalLink className="w-4 h-4 text-blue-500" />
                </div>
                <p className="text-sm text-gray-600">/leaderboard</p>
              </div>
              
              <div className="bg-white p-4 rounded-lg border border-blue-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-gray-900">📊 積分歷史</span>
                  <ExternalLink className="w-4 h-4 text-blue-500" />
                </div>
                <p className="text-sm text-gray-600">/score-history</p>
              </div>
            </div>
          </div>

          {/* 管理後台選單對照 */}
          <div className="bg-green-50 p-4 rounded-lg">
            <h3 className="font-semibold text-green-900 mb-3">🔧 管理後台選單對照</h3>
            <div className="text-green-800 text-sm space-y-2">
              <p>• 控制台 → 對應 LINE 選單的總入口</p>
              <p>• 題目管理 → 管理快問快答內容</p>
              <p>• 照片管理 → 管理照片上傳和照片牆內容</p>
              <p>• 分數管理/積分歷史 → 對應排行榜和積分歷史</p>
              <p>• 照片摸彩 → 額外功能，LINE 選單中未顯示</p>
              <p>• 投票設定 → 照片相關功能設定</p>
              <p>• LINE 選單 → 管理當前頁面的功能</p>
            </div>
          </div>
        </div>

        {/* 當前選單狀態 */}
        {menuStatus && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">當前選單狀態</h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-700">豐富選單數量</span>
                <span className="font-medium">{menuStatus.richMenus?.length || 0} 個</span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-700">預設選單</span>
                <span className={`font-medium ${menuStatus.defaultRichMenuId ? 'text-green-600' : 'text-gray-500'}`}>
                  {menuStatus.defaultRichMenuId ? '已設置' : '未設置'}
                </span>
              </div>
            </div>

            {/* 豐富選單列表 */}
            {menuStatus.richMenus && menuStatus.richMenus.length > 0 && (
              <div className="mt-6">
                <h4 className="font-medium text-gray-900 mb-3">豐富選單列表</h4>
                <div className="space-y-2">
                  {menuStatus.richMenus.map((menu) => (
                    <div key={menu.richMenuId} className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-medium text-gray-900">{menu.name}</span>
                          <span className="ml-2 text-sm text-gray-500">({menu.chatBarText})</span>
                        </div>
                        <div className="text-sm text-gray-600">
                          {menu.richMenuId === menuStatus.defaultRichMenuId && (
                            <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">預設</span>
                          )}
                        </div>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        ID: {menu.richMenuId}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 設置說明 */}
        <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h4 className="font-medium text-yellow-900 mb-2">⚠️ 重要提醒</h4>
          <div className="text-yellow-800 text-sm space-y-1">
            <p>• 設置選單後需要上傳對應的選單圖片才能啟用</p>
            <p>• 建議圖片尺寸：2500 x 1686 像素</p>
            <p>• 選單圖片需要在 LINE Developers Console 中手動上傳</p>
            <p>• 上傳圖片後需要設置為預設選單才會對所有用戶生效</p>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
