'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useLiff } from '@/hooks/useLiff'
import { Upload, Save, RefreshCw, CheckCircle, XCircle, AlertCircle, Trash2, Star, Copy } from 'lucide-react'
import AdminLayout from '@/components/AdminLayout'

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
  const router = useRouter()
  const { isLoggedIn, isAdmin, loading: liffLoading, adminLoading } = useLiff()
  
  const [settings, setSettings] = useState<RichMenuSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [uploading, setUploading] = useState<{ [key: string]: boolean }>({})
  const [richMenuList, setRichMenuList] = useState<any[] | null>(null)
  const [loadingRichMenuList, setLoadingRichMenuList] = useState(false)
  const [deleting, setDeleting] = useState<{ [key: string]: boolean }>({})
  const [settingDefault, setSettingDefault] = useState<string | null>(null)

  // 檢查管理員權限
  useEffect(() => {
    if (liffLoading || adminLoading) {
      return
    }

    if (!isLoggedIn || !isAdmin) {
      router.push('/')
      return
    }

    // 是管理員，載入設定
    fetchSettings()
    fetchRichMenuList()
    setLoading(false)
  }, [isLoggedIn, isAdmin, liffLoading, adminLoading, router])

  // 獲取設定
  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/admin/richmenu/settings')

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

  // 獲取 Rich Menu 列表
  const fetchRichMenuList = async () => {
    setLoadingRichMenuList(true)
    try {
      const response = await fetch('/api/line/setup-richmenu')
      if (!response.ok) {
        throw new Error('Failed to fetch rich menu list')
      }
      const data = await response.json()
      if (data.success && data.status?.linePlatform?.menus) {
        // 合併資料庫中的圖片狀態
        const menusWithImageStatus = data.status.linePlatform.menus.map((menu: any) => {
          const registryEntry = data.status?.database?.menus?.find((r: any) => r.richmenu_id === menu.richMenuId)
          return {
            ...menu,
            hasImage: registryEntry?.has_image || false
          }
        })
        setRichMenuList(menusWithImageStatus)
      }
    } catch (error) {
      console.error('Error fetching rich menu list:', error)
    } finally {
      setLoadingRichMenuList(false)
    }
  }

  // 刪除 Rich Menu
  const handleDeleteRichMenu = async (richMenuId: string) => {
    if (!confirm('確定要刪除這個 Rich Menu 嗎？此操作無法復原。')) {
      return
    }

    setDeleting(prev => ({ ...prev, [richMenuId]: true }))
    try {
      const response = await fetch('/api/line/setup-richmenu/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ richMenuId })
      })

      if (!response.ok) {
        throw new Error('Failed to delete rich menu')
      }

      showMessage('success', 'Rich Menu 刪除成功')
      fetchRichMenuList()
    } catch (error) {
      console.error('Error deleting rich menu:', error)
      showMessage('error', 'Rich Menu 刪除失敗')
    } finally {
      setDeleting(prev => ({ ...prev, [richMenuId]: false }))
    }
  }

  // 設置預設 Rich Menu
  const handleSetDefaultRichMenu = async (richMenuId: string) => {
    setSettingDefault(richMenuId)
    try {
      const response = await fetch('/api/line/setup-richmenu/set-default', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ richMenuId })
      })

      if (!response.ok) {
        throw new Error('Failed to set default rich menu')
      }

      showMessage('success', '預設 Rich Menu 設置成功')
      fetchRichMenuList()
    } catch (error) {
      console.error('Error setting default rich menu:', error)
      showMessage('error', '預設 Rich Menu 設置失敗')
    } finally {
      setSettingDefault(null)
    }
  }

  // 複製 Rich Menu ID
  const handleCopyRichMenuId = async (richMenuId: string) => {
    try {
      await navigator.clipboard.writeText(richMenuId)
      showMessage('success', 'Rich Menu ID 已複製到剪貼板')
    } catch (error) {
      console.error('Error copying rich menu ID:', error)
      showMessage('error', '複製失敗')
    }
  }

  // 儲存設定
  const handleSaveSettings = async () => {
    if (!settings) return

    setSaving(true)
    try {
      const response = await fetch('/api/admin/richmenu/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
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
  const handleImageUpload = async (richMenuId: string, file: File) => {
    console.log('📤 handleImageUpload called with richMenuId:', richMenuId)
    console.log('📊 File:', file.name, file.size, file.type)
    
    setUploading(prev => ({ ...prev, [richMenuId]: true }))

    try {
      const formData = new FormData()
      formData.append('image', file)
      formData.append('richMenuId', richMenuId)

      console.log('📤 Sending upload request...')

      const response = await fetch('/api/admin/richmenu/upload-image', {
        method: 'POST',
        body: formData
      })

      console.log('📥 Response status:', response.status, response.statusText)

      if (!response.ok) {
        const error = await response.json()
        console.error('❌ Upload error response:', error)
        throw new Error(error.error || 'Upload failed')
      }

      const result = await response.json()
      console.log('✅ Upload success:', result)
      showMessage('success', '圖片上傳成功')
      
      // 重新獲取 Rich Menu 列表
      fetchRichMenuList()
    } catch (error) {
      console.error('❌ Error uploading image:', error)
      showMessage('error', `圖片上傳失敗: ${error instanceof Error ? error.message : '未知錯誤'}`)
    } finally {
      setUploading(prev => ({ ...prev, [richMenuId]: false }))
    }
  }

  // 創建 Rich Menu
  const handleCreateRichMenus = async () => {
    console.log('🔘 handleCreateRichMenus called')
    try {
      console.log('📤 Sending POST request to /api/line/setup-richmenu')
      const response = await fetch('/api/line/setup-richmenu', {
        method: 'POST'
      })

      console.log('📥 Response status:', response.status, response.statusText)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ Response not OK:', errorText)
        throw new Error('Failed to create rich menus')
      }

      const result = await response.json()
      console.log('✅ Response data:', result)
      showMessage('success', 'Rich Menu 創建成功')
      
      // 重新獲取設定和 Rich Menu 列表
      fetchSettings()
      fetchRichMenuList()
    } catch (error) {
      console.error('❌ Error creating rich menus:', error)
      showMessage('error', 'Rich Menu 創建失敗')
    }
  }

  // 顯示訊息
  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 3000)
  }

  if (loading || liffLoading || adminLoading) {
    return (
      <AdminLayout title="LINE Rich Menu 管理">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-500" />
            <p className="text-gray-600">載入中...</p>
          </div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout title="LINE Rich Menu 管理">
      <div className="max-w-6xl mx-auto">
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
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">基本設定</h2>


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

        {/* Rich Menu 管理 */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-xl font-semibold">Rich Menu 管理</h2>
              <p className="text-sm text-gray-600 mt-1">
                當前總數: <span className="font-semibold text-blue-600">{richMenuList?.length || 0}</span> 個
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={fetchRichMenuList}
                disabled={loadingRichMenuList}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${loadingRichMenuList ? 'animate-spin' : ''}`} />
                重新整理
              </button>
              <button
                onClick={() => {
                  console.log('🖱️ 創建 Rich Menu 按鈕被點擊')
                  handleCreateRichMenus()
                }}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                <RefreshCw className="w-4 h-4" />
                創建 Rich Menu
              </button>
            </div>
          </div>

          {loadingRichMenuList ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
              <span className="ml-2 text-gray-600">載入中...</span>
            </div>
          ) : richMenuList && richMenuList.length > 0 ? (
            <div className="space-y-4">
              {richMenuList.map((menu: any) => (
                <div key={menu.richMenuId} className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-start gap-4">
                    {/* Rich Menu 圖片預覽 */}
                    <div className="flex-shrink-0">
                      {menu.hasImage ? (
                        <img
                          src={`/api/line/setup-richmenu/get-image?richMenuId=${menu.richMenuId}`}
                          alt={menu.name}
                          className="w-32 h-24 object-cover rounded border border-gray-200"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none'
                          }}
                        />
                      ) : (
                        <div className="w-32 h-24 bg-gray-200 rounded border border-gray-200 flex items-center justify-center">
                          <span className="text-xs text-gray-500">無圖片</span>
                        </div>
                      )}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-gray-900">{menu.name}</h3>
                        {menu.selected && (
                          <Star className="w-4 h-4 text-yellow-500 fill-current" />
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-sm text-gray-600">ID: {menu.richMenuId}</p>
                        <button
                          onClick={() => handleCopyRichMenuId(menu.richMenuId)}
                          className="text-blue-600 hover:text-blue-800"
                          title="複製 ID"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                      <p className="text-sm text-gray-600">Chat Bar Text: {menu.chatBarText}</p>
                      <p className="text-sm text-gray-600">尺寸: {menu.size?.width} x {menu.size?.height}</p>
                      <div className="mt-2">
                        {menu.hasImage ? (
                          <div className="flex items-center gap-1 text-green-600">
                            <CheckCircle className="w-3 h-3" />
                            <span className="text-xs">已上傳圖片</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-gray-500">
                            <XCircle className="w-3 h-3" />
                            <span className="text-xs">未上傳圖片</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="ml-4 flex flex-col gap-2">
                      {menu.selected ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          預設
                        </span>
                      ) : (
                        <button
                          onClick={() => handleSetDefaultRichMenu(menu.richMenuId)}
                          disabled={settingDefault === menu.richMenuId}
                          className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 disabled:opacity-50"
                        >
                          <Star className="w-3 h-3" />
                          {settingDefault === menu.richMenuId ? '設定中...' : '設為預設'}
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteRichMenu(menu.richMenuId)}
                        disabled={deleting[menu.richMenuId] || menu.selected}
                        className="flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white text-xs rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        title={menu.selected ? '無法刪除預設 Rich Menu' : ''}
                      >
                        <Trash2 className="w-3 h-3" />
                        {deleting[menu.richMenuId] ? '刪除中...' : '刪除'}
                      </button>
                      <label className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white text-xs rounded hover:bg-green-700 cursor-pointer disabled:opacity-50">
                        <Upload className="w-3 h-3" />
                        {uploading[menu.richMenuId] ? '上傳中...' : '上傳圖片'}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) {
                              handleImageUpload(menu.richMenuId, file)
                            }
                          }}
                          disabled={uploading[menu.richMenuId]}
                        />
                      </label>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>目前沒有 Rich Menu，請點擊「創建 Rich Menu」按鈕創建</p>
            </div>
          )}

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
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">使用說明</h2>
          <div className="space-y-4 text-sm text-gray-700">
            <div>
              <h3 className="font-medium mb-1">1. 創建 Rich Menu</h3>
              <p>點擊「創建 Rich Menu」按鈕，系統會在 LINE Platform 上創建一個 Rich Menu。</p>
            </div>
            <div>
              <h3 className="font-medium mb-1">2. 管理 Rich Menu</h3>
              <p>在「Rich Menu 管理」區塊中，您可以：</p>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>查看所有 Rich Menu 的名稱、ID、Chat Bar Text 和尺寸</li>
                <li>查看 Rich Menu 的圖片預覽</li>
                <li>點擊「設為預設」按鈕將某個 Rich Menu 設為預設（用戶首次看到）</li>
                <li>點擊「刪除」按鈕刪除不需要的 Rich Menu（無法刪除預設的 Rich Menu）</li>
                <li>點擊「重新整理」按鈕更新列表</li>
                <li>上傳 Rich Menu 圖片</li>
              </ul>
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
    </AdminLayout>
  )
}
