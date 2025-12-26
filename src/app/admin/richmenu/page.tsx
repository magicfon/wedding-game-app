'use client'

import { useState, useEffect } from 'react'
import { Upload, Save, RefreshCw, CheckCircle, XCircle, AlertCircle } from 'lucide-react'

interface RichMenuSettings {
  defaultTab: 'venue_info' | 'activity'
  venueTabEnabled: boolean
  activityTabEnabled: boolean
  richMenuIds: {
    venue_info?: string
    activity?: string
    unavailable?: string
  }
  updatedAt: string
}

interface RichMenuStatus {
  hasImage: boolean
  richMenuId?: string
  createdAt?: string
  updatedAt?: string
}

export default function RichMenuManagementPage() {
  const [settings, setSettings] = useState<RichMenuSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [uploading, setUploading] = useState<{ [key: string]: boolean }>({})
  const [imageStatus, setImageStatus] = useState<{ [key: string]: RichMenuStatus }>({})
  const [authToken, setAuthToken] = useState('')

  // 從 localStorage 讀取認證 token
  useEffect(() => {
    const token = localStorage.getItem('admin_token')
    if (token) {
      setAuthToken(token)
      fetchSettings(token)
      fetchImageStatus(token)
    }
  }, [])

  // 獲取設定
  const fetchSettings = async (token: string) => {
    try {
      const response = await fetch('/api/admin/richmenu/settings', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch settings')
      }

      const data = await response.json()
      setSettings(data)
    } catch (error) {
      console.error('Error fetching settings:', error)
      showMessage('error', '無法載入設定')
    } finally {
      setLoading(false)
    }
  }

  // 獲取圖片狀態
  const fetchImageStatus = async (token: string) => {
    const menuTypes = ['venue_info', 'activity', 'unavailable']
    const status: { [key: string]: RichMenuStatus } = {}

    for (const menuType of menuTypes) {
      try {
        const response = await fetch(`/api/admin/richmenu/upload-image?menuType=${menuType}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })

        if (response.ok) {
          const data = await response.json()
          status[menuType] = data
        }
      } catch (error) {
        console.error(`Error fetching image status for ${menuType}:`, error)
        status[menuType] = { hasImage: false }
      }
    }

    setImageStatus(status)
  }

  // 儲存設定
  const handleSaveSettings = async () => {
    if (!settings) return

    setSaving(true)
    try {
      const response = await fetch('/api/admin/richmenu/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          defaultTab: settings.defaultTab,
          venueTabEnabled: settings.venueTabEnabled,
          activityTabEnabled: settings.activityTabEnabled
        })
      })

      if (!response.ok) {
        throw new Error('Failed to save settings')
      }

      showMessage('success', '設定已儲存')
    } catch (error) {
      console.error('Error saving settings:', error)
      showMessage('error', '儲存失敗')
    } finally {
      setSaving(false)
    }
  }

  // 上傳圖片
  const handleImageUpload = async (menuType: string, file: File) => {
    setUploading(prev => ({ ...prev, [menuType]: true }))

    try {
      const formData = new FormData()
      formData.append('image', file)
      formData.append('menuType', menuType)

      const response = await fetch('/api/admin/richmenu/upload-image', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        body: formData
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Upload failed')
      }

      const result = await response.json()
      showMessage('success', `${getMenuTypeName(menuType)}圖片上傳成功`)
      
      // 重新獲取圖片狀態
      fetchImageStatus(authToken)
    } catch (error) {
      console.error('Error uploading image:', error)
      showMessage('error', `圖片上傳失敗: ${error instanceof Error ? error.message : '未知錯誤'}`)
    } finally {
      setUploading(prev => ({ ...prev, [menuType]: false }))
    }
  }

  // 創建 Rich Menu
  const handleCreateRichMenus = async () => {
    try {
      const response = await fetch('/api/line/setup-richmenu', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to create rich menus')
      }

      const result = await response.json()
      showMessage('success', 'Rich Menu 創建成功')
      
      // 重新獲取設定和圖片狀態
      fetchSettings(authToken)
      fetchImageStatus(authToken)
    } catch (error) {
      console.error('Error creating rich menus:', error)
      showMessage('error', 'Rich Menu 創建失敗')
    }
  }

  // 顯示訊息
  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 3000)
  }

  // 獲取選單類型名稱
  const getMenuTypeName = (menuType: string): string => {
    const names: { [key: string]: string } = {
      venue_info: '會場資訊',
      activity: '現場活動',
      unavailable: '未開放'
    }
    return names[menuType] || menuType
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p>載入中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">LINE Rich Menu 管理</h1>
          <p className="text-gray-600">管理婚禮遊戲的 LINE Rich Menu 設定</p>
        </div>

        {/* 訊息提示 */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
            message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
          }`}>
            {message.type === 'success' ? (
              <CheckCircle className="w-5 h-5" />
            ) : (
              <XCircle className="w-5 h-5" />
            )}
            <span>{message.text}</span>
          </div>
        )}

        {/* 基本設定 */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">基本設定</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 預設分頁 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                預設開啟分頁
              </label>
              <select
                value={settings?.defaultTab || 'venue_info'}
                onChange={(e) => setSettings(prev => prev ? { ...prev, defaultTab: e.target.value as any } : null)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="venue_info">會場資訊</option>
                <option value="activity">現場活動</option>
              </select>
            </div>

            {/* 會場資訊分頁啟用 */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <h3 className="font-medium">會場資訊分頁</h3>
                <p className="text-sm text-gray-600">交通資訊、菜單、桌次</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings?.venueTabEnabled || false}
                  onChange={(e) => setSettings(prev => prev ? { ...prev, venueTabEnabled: e.target.checked } : null)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {/* 現場活動分頁啟用 */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <h3 className="font-medium">現場活動分頁</h3>
                <p className="text-sm text-gray-600">照片上傳、照片牆、快問快答</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings?.activityTabEnabled || false}
                  onChange={(e) => setSettings(prev => prev ? { ...prev, activityTabEnabled: e.target.checked } : null)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={handleSaveSettings}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              {saving ? '儲存中...' : '儲存設定'}
            </button>
          </div>
        </div>

        {/* Rich Menu 圖片管理 */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Rich Menu 圖片</h2>
            <button
              onClick={handleCreateRichMenus}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              <RefreshCw className="w-4 h-4" />
              創建 Rich Menu
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {['venue_info', 'activity', 'unavailable'].map((menuType) => (
              <div key={menuType} className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-medium mb-3">{getMenuTypeName(menuType)}</h3>

                {/* 圖片狀態 */}
                <div className="mb-4">
                  {imageStatus[menuType]?.hasImage ? (
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle className="w-4 h-4" />
                      <span className="text-sm">已上傳</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-gray-500">
                      <XCircle className="w-4 h-4" />
                      <span className="text-sm">未上傳</span>
                    </div>
                  )}
                </div>

                {/* 上傳按鈕 */}
                <div>
                  <label className="block">
                    <span className="sr-only">選擇圖片</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) {
                          handleImageUpload(menuType, file)
                        }
                      }}
                      disabled={uploading[menuType]}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                  </label>
                  {uploading[menuType] && (
                    <div className="mt-2 flex items-center gap-2 text-sm text-blue-600">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      上傳中...
                    </div>
                  )}
                </div>

                {/* Rich Menu ID */}
                {settings?.richMenuIds[menuType as keyof typeof settings.richMenuIds] && (
                  <div className="mt-4 p-2 bg-gray-50 rounded text-xs text-gray-600 break-all">
                    ID: {settings.richMenuIds[menuType as keyof typeof settings.richMenuIds]}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* 說明 */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">圖片規格要求</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>尺寸：2500 x 1686 像素</li>
                  <li>格式：PNG 或 JPEG</li>
                  <li>檔案大小：不超過 1MB</li>
                  <li>請確保圖片清晰易讀</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* 使用說明 */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">使用說明</h2>
          <div className="space-y-4 text-sm text-gray-700">
            <div>
              <h3 className="font-medium mb-1">1. 創建 Rich Menu</h3>
              <p>點擊「創建 Rich Menu」按鈕，系統會在 LINE Platform 上創建三個 Rich Menu（會場資訊、現場活動、未開放）。</p>
            </div>
            <div>
              <h3 className="font-medium mb-1">2. 上傳圖片</h3>
              <p>為每個 Rich Menu 上傳對應的圖片。圖片尺寸必須為 2500x1686 像素。</p>
            </div>
            <div>
              <h3 className="font-medium mb-1">3. 設定預設分頁</h3>
              <p>選擇用戶首次打開 Rich Menu 時顯示的預設分頁。</p>
            </div>
            <div>
              <h3 className="font-medium mb-1">4. 啟用/停用分頁</h3>
              <p>可以隨時啟用或停用分頁。停用的分頁會顯示「未開放」狀態。</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
