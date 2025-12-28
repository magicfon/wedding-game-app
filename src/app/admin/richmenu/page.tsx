'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useLiff } from '@/hooks/useLiff'
import { Upload, Save, RefreshCw, CheckCircle, XCircle, AlertCircle, Trash2, Star, Copy, Edit2, Plus, Minus, X, MousePointer2 } from 'lucide-react'
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
  lineAliases?: Record<string, { richMenuId: string; richMenuName?: string }>
  updatedAt: string
}

interface RichMenuStatus {
  hasImage: boolean
  richMenuId?: string
  createdAt?: string
  updatedAt?: string
}

interface RichMenuArea {
  bounds: { x: number; y: number; width: number; height: number }
  action: { type: string; uri?: string; data?: string; label?: string; richMenuAliasId?: string }
}

interface EditingRichMenu {
  richMenuId: string
  name: string
  chatBarText: string
  selected: boolean
  areas: RichMenuArea[]
}

const RichMenuThumbnail = ({ richMenuId, name, hasImage }: { richMenuId: string, name: string, hasImage: boolean }) => {
  const [imageError, setImageError] = useState(false)

  // 如果 hasImage 為 true，或者沒有發生錯誤，都嘗試顯示圖片
  const showImage = !imageError

  return (
    <>
      {showImage ? (
        <img
          src={`/api/line/setup-richmenu/get-image?richMenuId=${richMenuId}`}
          alt={name}
          className="w-32 h-24 object-cover rounded border border-gray-200"
          onError={() => setImageError(true)}
        />
      ) : (
        <div className="w-32 h-24 bg-gray-200 rounded border border-gray-200 flex flex-col items-center justify-center gap-1">
          <span className="text-xs text-gray-500">無圖片</span>
          {hasImage && <span className="text-[10px] text-red-400">(載入失敗)</span>}
        </div>
      )}
    </>
  )
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

  // 編輯相關 state
  const [editingMenu, setEditingMenu] = useState<EditingRichMenu | null>(null)
  const [loadingEdit, setLoadingEdit] = useState(false)
  const [savingEdit, setSavingEdit] = useState(false)

  // 視覺化編輯器 state
  const [isDrawMode, setIsDrawMode] = useState(false)
  const [isDrawing, setIsDrawing] = useState(false)
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null)
  const [drawCurrent, setDrawCurrent] = useState<{ x: number; y: number } | null>(null)
  const [selectedAreaIndex, setSelectedAreaIndex] = useState<number | null>(null)
  const [imageContainerSize, setImageContainerSize] = useState<{ width: number; height: number } | null>(null)
  const imageContainerRef = useRef<HTMLDivElement>(null)

  // 預設 Rich Menu ID (從 LINE Platform 獲取)
  const [defaultRichMenuId, setDefaultRichMenuId] = useState<string | null>(null)

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
      const response = await fetch(`/api/line/setup-richmenu?t=${Date.now()}`)
      if (!response.ok) {
        throw new Error('Failed to fetch rich menu list')
      }
      const data = await response.json()
      if (data.success && data.status?.linePlatform?.menus) {
        // 設置預設 Rich Menu ID
        if (data.status.linePlatform.defaultRichMenuId) {
          setDefaultRichMenuId(data.status.linePlatform.defaultRichMenuId)
        } else {
          setDefaultRichMenuId(null)
        }

        // 合併資料庫中的圖片狀態和 menu_type
        const menusWithImageStatus = data.status.linePlatform.menus.map((menu: any) => {
          const registryEntry = data.status?.database?.menus?.find((r: any) => r.richmenu_id === menu.richMenuId)
          return {
            ...menu,
            hasImage: registryEntry?.has_image || false,
            menuType: registryEntry?.menu_type || null
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

  // 指定 Rich Menu 類型
  const [assigningType, setAssigningType] = useState<{ [key: string]: boolean }>({})

  const handleAssignMenuType = async (richMenuId: string, menuType: string | null) => {
    setAssigningType(prev => ({ ...prev, [richMenuId]: true }))
    try {
      const response = await fetch('/api/admin/richmenu/assign-type', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          richMenuId,
          menuType: menuType === '' ? null : menuType
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to assign menu type')
      }

      showMessage('success', menuType ? `已設定為 ${menuType}` : '已移除類型設定')
      fetchRichMenuList()
      fetchSettings()
    } catch (error) {
      console.error('Error assigning menu type:', error)
      showMessage('error', `設定失敗: ${error instanceof Error ? error.message : '未知錯誤'}`)
    } finally {
      setAssigningType(prev => ({ ...prev, [richMenuId]: false }))
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
      await fetchSettings() // 刷新 Alias 對照表
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

  // 開啟編輯 Modal
  const openEditModal = async (richMenuId: string) => {
    setLoadingEdit(true)
    try {
      const response = await fetch(`/api/admin/richmenu/edit?richMenuId=${richMenuId}`)
      if (!response.ok) {
        throw new Error('Failed to fetch rich menu details')
      }
      const data = await response.json()
      if (data.success && data.richMenu) {
        setEditingMenu({
          richMenuId: data.richMenu.richMenuId,
          name: data.richMenu.name,
          chatBarText: data.richMenu.chatBarText,
          selected: data.richMenu.selected,
          areas: data.richMenu.areas || []
        })
      }
    } catch (error) {
      console.error('Error fetching rich menu details:', error)
      showMessage('error', '無法載入 Rich Menu 資訊')
    } finally {
      setLoadingEdit(false)
    }
  }

  // 儲存編輯
  const saveEdit = async () => {
    if (!editingMenu) return

    setSavingEdit(true)
    try {
      const response = await fetch('/api/admin/richmenu/edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          richMenuId: editingMenu.richMenuId,
          config: {
            name: editingMenu.name,
            chatBarText: editingMenu.chatBarText,
            selected: editingMenu.selected,
            areas: editingMenu.areas
          }
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to save')
      }

      showMessage('success', 'Rich Menu 更新成功')
      setEditingMenu(null)
      await fetchRichMenuList()
      await fetchSettings() // 刷新 Alias 對照表
    } catch (error) {
      console.error('Error saving rich menu:', error)
      showMessage('error', `儲存失敗: ${error instanceof Error ? error.message : '未知錯誤'}`)
    } finally {
      setSavingEdit(false)
    }
  }

  // 更新編輯中的區域
  const updateEditingArea = (index: number, field: string, value: any) => {
    if (!editingMenu) return
    const newAreas = [...editingMenu.areas]

    if (field.startsWith('bounds.')) {
      const boundsField = field.split('.')[1]
      newAreas[index] = {
        ...newAreas[index],
        bounds: { ...newAreas[index].bounds, [boundsField]: parseInt(value) || 0 }
      }
    } else if (field.startsWith('action.')) {
      const actionField = field.split('.')[1]
      newAreas[index] = {
        ...newAreas[index],
        action: { ...newAreas[index].action, [actionField]: value }
      }
    }

    setEditingMenu({ ...editingMenu, areas: newAreas })
  }

  // 新增區域
  const addArea = () => {
    if (!editingMenu) return
    const newArea: RichMenuArea = {
      bounds: { x: 0, y: 0, width: 1250, height: 843 },
      action: { type: 'uri', uri: '', label: '新按鈕' }
    }
    setEditingMenu({ ...editingMenu, areas: [...editingMenu.areas, newArea] })
  }

  // 移除區域
  const removeArea = (index: number) => {
    if (!editingMenu) return
    const newAreas = editingMenu.areas.filter((_, i) => i !== index)
    setEditingMenu({ ...editingMenu, areas: newAreas })
    if (selectedAreaIndex === index) {
      setSelectedAreaIndex(null)
    } else if (selectedAreaIndex !== null && selectedAreaIndex > index) {
      setSelectedAreaIndex(selectedAreaIndex - 1)
    }
  }

  // Rich Menu 實際尺寸
  const RICH_MENU_WIDTH = 2500
  const RICH_MENU_HEIGHT = 1686

  // 計算縮放比例
  const getScale = useCallback(() => {
    if (!imageContainerSize) return { scaleX: 1, scaleY: 1 }
    return {
      scaleX: imageContainerSize.width / RICH_MENU_WIDTH,
      scaleY: imageContainerSize.height / RICH_MENU_HEIGHT
    }
  }, [imageContainerSize])

  // 畫布座標轉實際座標
  const canvasToActual = useCallback((canvasX: number, canvasY: number, canvasW?: number, canvasH?: number) => {
    const { scaleX, scaleY } = getScale()
    const result = {
      x: Math.round(canvasX / scaleX),
      y: Math.round(canvasY / scaleY),
      width: canvasW ? Math.round(canvasW / scaleX) : 0,
      height: canvasH ? Math.round(canvasH / scaleY) : 0
    }
    // 確保不超出邊界
    result.x = Math.max(0, Math.min(result.x, RICH_MENU_WIDTH))
    result.y = Math.max(0, Math.min(result.y, RICH_MENU_HEIGHT))
    if (result.x + result.width > RICH_MENU_WIDTH) {
      result.width = RICH_MENU_WIDTH - result.x
    }
    if (result.y + result.height > RICH_MENU_HEIGHT) {
      result.height = RICH_MENU_HEIGHT - result.y
    }
    return result
  }, [getScale])

  // 實際座標轉畫布座標
  const actualToCanvas = useCallback((actualX: number, actualY: number, actualW: number, actualH: number) => {
    const { scaleX, scaleY } = getScale()
    return {
      x: actualX * scaleX,
      y: actualY * scaleY,
      width: actualW * scaleX,
      height: actualH * scaleY
    }
  }, [getScale])

  // 更新圖片容器尺寸
  const updateImageContainerSize = useCallback(() => {
    if (imageContainerRef.current) {
      const rect = imageContainerRef.current.getBoundingClientRect()
      setImageContainerSize({ width: rect.width, height: rect.height })
    }
  }, [])

  // 監聽視窗大小變化
  useEffect(() => {
    if (editingMenu) {
      updateImageContainerSize()
      window.addEventListener('resize', updateImageContainerSize)
      return () => window.removeEventListener('resize', updateImageContainerSize)
    }
  }, [editingMenu, updateImageContainerSize])

  // 監聽 Escape 鍵取消繪製
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isDrawing) {
        setIsDrawing(false)
        setDrawStart(null)
        setDrawCurrent(null)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isDrawing])

  // 滑鼠事件處理 - 點擊開始/結束繪製
  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDrawMode || !imageContainerRef.current) return

    const rect = imageContainerRef.current.getBoundingClientRect()
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width))
    const y = Math.max(0, Math.min(e.clientY - rect.top, rect.height))

    if (!isDrawing) {
      // 第一次點擊：開始繪製
      setIsDrawing(true)
      setDrawStart({ x, y })
      setDrawCurrent({ x, y })
      setSelectedAreaIndex(null)
    } else {
      // 第二次點擊：完成繪製
      if (!drawStart || !editingMenu) {
        setIsDrawing(false)
        setDrawStart(null)
        setDrawCurrent(null)
        return
      }

      // 計算矩形
      const minX = Math.min(drawStart.x, x)
      const minY = Math.min(drawStart.y, y)
      const width = Math.abs(x - drawStart.x)
      const height = Math.abs(y - drawStart.y)

      // 只有當矩形足夠大時才新增區域 (至少 20px)
      if (width > 20 && height > 20) {
        const actualBounds = canvasToActual(minX, minY, width, height)
        const newArea: RichMenuArea = {
          bounds: {
            x: actualBounds.x,
            y: actualBounds.y,
            width: actualBounds.width,
            height: actualBounds.height
          },
          action: { type: 'uri', uri: '', label: `區域 ${editingMenu.areas.length + 1}` }
        }
        const newAreas = [...editingMenu.areas, newArea]
        setEditingMenu({ ...editingMenu, areas: newAreas })
        setSelectedAreaIndex(newAreas.length - 1)
      }

      setIsDrawing(false)
      setDrawStart(null)
      setDrawCurrent(null)
    }
  }

  // 滑鼠事件處理 - 繪製中移動滑鼠更新預覽
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDrawing || !imageContainerRef.current) return
    const rect = imageContainerRef.current.getBoundingClientRect()
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width))
    const y = Math.max(0, Math.min(e.clientY - rect.top, rect.height))
    setDrawCurrent({ x, y })
  }

  // 取消繪製 (按 Escape 或點擊外部)
  const cancelDrawing = () => {
    setIsDrawing(false)
    setDrawStart(null)
    setDrawCurrent(null)
  }

  // 點擊區域選擇
  const handleAreaClick = (index: number, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!isDrawMode) {
      setSelectedAreaIndex(selectedAreaIndex === index ? null : index)
    }
  }

  // 取得繪製中的矩形 (畫布座標)
  const getDrawingRect = () => {
    if (!drawStart || !drawCurrent) return null
    return {
      x: Math.min(drawStart.x, drawCurrent.x),
      y: Math.min(drawStart.y, drawCurrent.y),
      width: Math.abs(drawCurrent.x - drawStart.x),
      height: Math.abs(drawCurrent.y - drawStart.y)
    }
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
          <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
            }`}>
            {message.type === 'success' ? (
              <CheckCircle className="w-5 h-5" />
            ) : (
              <XCircle className="w-5 h-5" />
            )}
            <span>{message.text}</span>
          </div>
        )}

        {/* 活動狀態控制 */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <span>🎯</span> 活動狀態控制
          </h2>

          {/* 目前狀態顯示 */}
          <div className={`p-4 rounded-lg border-2 mb-4 ${settings?.activityTabEnabled
            ? 'bg-green-50 border-green-200'
            : 'bg-orange-50 border-orange-200'
            }`}>
            <div className="flex items-center gap-3">
              <span className="text-3xl">
                {settings?.activityTabEnabled ? '🎊' : '🔒'}
              </span>
              <div>
                <h3 className={`font-semibold text-lg ${settings?.activityTabEnabled ? 'text-green-800' : 'text-orange-800'
                  }`}>
                  {settings?.activityTabEnabled ? '活動進行中' : '活動尚未開始'}
                </h3>
                <p className={`text-sm ${settings?.activityTabEnabled ? 'text-green-600' : 'text-orange-600'
                  }`}>
                  {settings?.activityTabEnabled
                    ? '用戶點擊「現場活動」分頁時，可以使用照片上傳、照片牆、快問快答'
                    : '用戶點擊「現場活動」分頁時，會看到「尚未開放」畫面'}
                </p>
              </div>
            </div>
          </div>

          {/* 切換按鈕 */}
          <div className="flex gap-4">
            {settings?.activityTabEnabled ? (
              <button
                onClick={() => {
                  setSettings(prev => prev ? { ...prev, activityTabEnabled: false } : null)
                }}
                className="flex items-center gap-2 px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
              >
                <span>🔒</span>
                結束活動
              </button>
            ) : (
              <button
                onClick={() => {
                  setSettings(prev => prev ? { ...prev, activityTabEnabled: true } : null)
                }}
                className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <span>🎉</span>
                開始活動！
              </button>
            )}

            <button
              onClick={handleSaveSettings}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              {saving ? '儲存中...' : '儲存變更'}
            </button>
          </div>

          <p className="text-xs text-gray-500 mt-3">
            💡 點擊「開始活動」或「結束活動」後，需點擊「儲存變更」才會生效
          </p>
        </div>

        {/* Alias 對照表 */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <span>📋</span> Alias 對照表（分頁切換設定）
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Alias 名稱</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">目前指向</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">LINE Server Rich Menu ID</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">說明</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-100">
                  <td className="py-3 px-4">
                    <code className="bg-gray-100 px-2 py-1 rounded text-xs">richmenu-alias-venue-info</code>
                  </td>
                  <td className="py-3 px-4">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                      🏢 會場資訊
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    {settings?.lineAliases?.['richmenu-alias-venue-info'] ? (
                      <div className="flex flex-col gap-1">
                        <code className="text-xs text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded">
                          {settings.lineAliases['richmenu-alias-venue-info'].richMenuId.substring(0, 20)}...
                        </code>
                        {settings.lineAliases['richmenu-alias-venue-info'].richMenuName && (
                          <span className="text-xs text-gray-500">
                            ({settings.lineAliases['richmenu-alias-venue-info'].richMenuName})
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-orange-600">⚠️ 未設定</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-gray-500">固定指向會場資訊 Rich Menu</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-3 px-4">
                    <code className="bg-gray-100 px-2 py-1 rounded text-xs">richmenu-alias-activity</code>
                  </td>
                  <td className="py-3 px-4">
                    {settings?.activityTabEnabled ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                        🎊 現場活動
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-orange-100 text-orange-800 rounded-full text-xs font-medium">
                        🔒 尚未開放
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    {settings?.lineAliases?.['richmenu-alias-activity'] ? (
                      <div className="flex flex-col gap-1">
                        <code className="text-xs text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded">
                          {settings.lineAliases['richmenu-alias-activity'].richMenuId.substring(0, 20)}...
                        </code>
                        {settings.lineAliases['richmenu-alias-activity'].richMenuName && (
                          <span className="text-xs text-gray-500">
                            ({settings.lineAliases['richmenu-alias-activity'].richMenuName})
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-orange-600">⚠️ 未設定</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-gray-500">
                    {settings?.activityTabEnabled
                      ? '活動進行中，指向現場活動 Rich Menu'
                      : '活動未開始，指向尚未開放 Rich Menu'}
                  </td>
                </tr>
              </tbody>
            </table>
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
                    {/* Rich Menu 圖片預覽 */}
                    <div className="flex-shrink-0">
                      <RichMenuThumbnail
                        richMenuId={menu.richMenuId}
                        name={menu.name}
                        hasImage={menu.hasImage}
                      />
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

                      {/* 功能類型指定 */}
                      <div className="mt-3 flex items-center gap-2">
                        <span className="text-xs text-gray-500">功能類型:</span>
                        <select
                          value={menu.menuType || ''}
                          onChange={(e) => handleAssignMenuType(menu.richMenuId, e.target.value)}
                          disabled={assigningType[menu.richMenuId]}
                          className={`text-xs px-2 py-1 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent ${assigningType[menu.richMenuId] ? 'opacity-50 cursor-not-allowed' : ''
                            } ${menu.menuType === 'venue_info' ? 'bg-blue-50 border-blue-300' :
                              menu.menuType === 'activity' ? 'bg-green-50 border-green-300' :
                                menu.menuType === 'unavailable' ? 'bg-orange-50 border-orange-300' :
                                  'bg-white border-gray-300'
                            }`}
                        >
                          <option value="">未指定</option>
                          <option value="venue_info">🏢 會場資訊</option>
                          <option value="activity">🎊 現場活動</option>
                          <option value="unavailable">🔒 尚未開放</option>
                        </select>
                        {assigningType[menu.richMenuId] && (
                          <RefreshCw className="w-3 h-3 animate-spin text-blue-500" />
                        )}
                      </div>
                    </div>
                    <div className="ml-4 flex flex-col gap-2">
                      {menu.richMenuId === defaultRichMenuId ? (
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
                        disabled={deleting[menu.richMenuId] || menu.richMenuId === defaultRichMenuId}
                        className="flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white text-xs rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        title={menu.richMenuId === defaultRichMenuId ? '無法刪除預設 Rich Menu' : ''}
                      >
                        <Trash2 className="w-3 h-3" />
                        {deleting[menu.richMenuId] ? '刪除中...' : '刪除'}
                      </button>
                      <button
                        onClick={() => openEditModal(menu.richMenuId)}
                        disabled={loadingEdit}
                        className="flex items-center gap-1 px-3 py-1.5 bg-purple-600 text-white text-xs rounded hover:bg-purple-700 disabled:opacity-50"
                      >
                        <Edit2 className="w-3 h-3" />
                        編輯
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

      {/* 編輯 Modal */}
      {editingMenu && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">編輯 Rich Menu</h2>
              <button
                onClick={() => setEditingMenu(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* 基本資訊 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">
                    名稱 (管理用)
                  </label>
                  <input
                    type="text"
                    value={editingMenu.name}
                    onChange={(e) => setEditingMenu({ ...editingMenu, name: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">
                    Chat Bar 文字 (用戶可見)
                  </label>
                  <input
                    type="text"
                    value={editingMenu.chatBarText}
                    onChange={(e) => setEditingMenu({ ...editingMenu, chatBarText: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="selected"
                  checked={editingMenu.selected}
                  onChange={(e) => setEditingMenu({ ...editingMenu, selected: e.target.checked })}
                  className="w-4 h-4"
                />
                <label htmlFor="selected" className="text-sm font-medium text-gray-700">
                  預設展開 (selected)
                </label>
              </div>


              {/* 視覺化按鈕區域編輯器 */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-900">按鈕區域 ({editingMenu.areas.length})</h3>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setIsDrawMode(!isDrawMode)
                        setSelectedAreaIndex(null)
                      }}
                      className={`flex items-center gap-1 px-3 py-1.5 text-xs rounded ${isDrawMode
                        ? 'bg-green-600 text-white hover:bg-green-700'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                    >
                      <MousePointer2 className="w-3 h-3" />
                      {isDrawMode ? '繪製模式' : '選擇模式'}
                    </button>
                    <button
                      onClick={addArea}
                      className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                    >
                      <Plus className="w-3 h-3" />
                      新增區域
                    </button>
                  </div>
                </div>

                {/* 圖片編輯區域 */}
                <div className="mb-4 p-4 bg-gray-100 rounded-lg">
                  <div className="text-xs text-gray-600 mb-2">
                    {isDrawMode
                      ? (isDrawing ? '💡 移動滑鼠調整大小，再點一下確定範圍 (按 Esc 取消)' : '💡 點一下開始繪製按鈕區域')
                      : '💡 點擊區域可選中編輯，切換到繪製模式可新增區域'}
                  </div>
                  <div
                    ref={imageContainerRef}
                    className="relative w-full bg-gray-200 rounded overflow-hidden select-none"
                    style={{
                      aspectRatio: '2500 / 1686',
                      cursor: isDrawMode ? 'crosshair' : 'default'
                    }}
                    onClick={handleCanvasClick}
                    onMouseMove={handleMouseMove}
                  >
                    {/* Rich Menu 圖片背景 */}
                    <img
                      src={`/api/line/setup-richmenu/get-image?richMenuId=${editingMenu.richMenuId}`}
                      alt="Rich Menu"
                      className="absolute inset-0 w-full h-full object-cover"
                      onLoad={updateImageContainerSize}
                      onError={(e) => {
                        e.currentTarget.style.display = 'none'
                      }}
                    />

                    {/* 無圖片時的佔位 */}
                    <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm pointer-events-none">
                      {/* 這會在圖片載入失敗時顯示 */}
                    </div>

                    {/* 已有的區域覆蓋層 */}
                    {imageContainerSize && editingMenu.areas.map((area, index) => {
                      const canvasRect = actualToCanvas(
                        area.bounds.x,
                        area.bounds.y,
                        area.bounds.width,
                        area.bounds.height
                      )
                      return (
                        <div
                          key={index}
                          className={`absolute border-2 transition-colors ${selectedAreaIndex === index
                            ? 'border-blue-500 bg-blue-500/30'
                            : 'border-yellow-400 bg-yellow-400/20 hover:bg-yellow-400/30'
                            }`}
                          style={{
                            left: canvasRect.x,
                            top: canvasRect.y,
                            width: canvasRect.width,
                            height: canvasRect.height,
                            pointerEvents: isDrawMode ? 'none' : 'auto'
                          }}
                          onClick={(e) => handleAreaClick(index, e)}
                        >
                          <span className={`absolute top-0 left-0 px-1 text-xs font-bold ${selectedAreaIndex === index
                            ? 'bg-blue-500 text-white'
                            : 'bg-yellow-400 text-gray-900'
                            }`}>
                            {index + 1}
                          </span>
                        </div>
                      )
                    })}

                    {/* 繪製中的區域 */}
                    {isDrawing && (() => {
                      const rect = getDrawingRect()
                      if (!rect) return null
                      return (
                        <div
                          className="absolute border-2 border-dashed border-green-500 bg-green-500/20"
                          style={{
                            left: rect.x,
                            top: rect.y,
                            width: rect.width,
                            height: rect.height,
                            pointerEvents: 'none'
                          }}
                        />
                      )
                    })()}
                  </div>
                </div>


                {editingMenu.areas.length === 0 ? (
                  <p className="text-gray-500 text-sm">無按鈕區域</p>
                ) : (
                  <div className="space-y-4">
                    {editingMenu.areas.map((area, index) => (
                      <div
                        key={index}
                        className={`p-4 rounded-lg cursor-pointer transition-colors ${selectedAreaIndex === index
                          ? 'bg-blue-100 border-2 border-blue-500'
                          : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'
                          }`}
                        onClick={() => setSelectedAreaIndex(selectedAreaIndex === index ? null : index)}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <span className={`text-sm font-medium ${selectedAreaIndex === index ? 'text-blue-700' : 'text-gray-900'
                            }`}>
                            區域 {index + 1} {selectedAreaIndex === index && '(選中)'}
                          </span>
                          <button
                            onClick={(e) => { e.stopPropagation(); removeArea(index) }}
                            className="text-red-600 hover:text-red-800"
                            title="刪除區域"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                        </div>

                        {/* 座標 */}
                        <div className="grid grid-cols-4 gap-2 mb-3">
                          <div>
                            <label className="block text-xs text-gray-600 mb-1">X</label>
                            <input
                              type="number"
                              value={area.bounds.x}
                              onChange={(e) => updateEditingArea(index, 'bounds.x', e.target.value)}
                              className="w-full px-2 py-1 text-sm border rounded text-gray-900"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-600 mb-1">Y</label>
                            <input
                              type="number"
                              value={area.bounds.y}
                              onChange={(e) => updateEditingArea(index, 'bounds.y', e.target.value)}
                              className="w-full px-2 py-1 text-sm border rounded text-gray-900"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-600 mb-1">寬度</label>
                            <input
                              type="number"
                              value={area.bounds.width}
                              onChange={(e) => updateEditingArea(index, 'bounds.width', e.target.value)}
                              className="w-full px-2 py-1 text-sm border rounded text-gray-900"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-600 mb-1">高度</label>
                            <input
                              type="number"
                              value={area.bounds.height}
                              onChange={(e) => updateEditingArea(index, 'bounds.height', e.target.value)}
                              className="w-full px-2 py-1 text-sm border rounded text-gray-900"
                            />
                          </div>
                        </div>

                        {/* 動作 */}
                        <div className="space-y-2">
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-xs text-gray-600 mb-1">類型</label>
                              <select
                                value={area.action.type}
                                onChange={(e) => updateEditingArea(index, 'action.type', e.target.value)}
                                className="w-full px-2 py-1 text-sm border rounded text-gray-900"
                              >
                                <option value="uri">URI (連結)</option>
                                <option value="richmenuswitch">切換選單 (Rich Menu)</option>
                                <option value="postback">Postback</option>
                                <option value="message">訊息</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs text-gray-600 mb-1">標籤</label>
                              <input
                                type="text"
                                value={area.action.label || ''}
                                onChange={(e) => updateEditingArea(index, 'action.label', e.target.value)}
                                className="w-full px-2 py-1 text-sm border rounded text-gray-900"
                              />
                            </div>
                          </div>

                          {/* 根據類型顯示不同的欄位 */}
                          {area.action.type === 'richmenuswitch' ? (
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="block text-xs text-gray-600 mb-1">Rich Menu Alias ID</label>
                                <input
                                  type="text"
                                  value={area.action.richMenuAliasId || ''}
                                  onChange={(e) => updateEditingArea(index, 'action.richMenuAliasId', e.target.value)}
                                  placeholder="richmenu-alias-xxx"
                                  className="w-full px-2 py-1 text-sm border rounded text-gray-900"
                                />
                              </div>
                              <div>
                                <label className="block text-xs text-gray-600 mb-1">Data (可選)</label>
                                <input
                                  type="text"
                                  value={area.action.data || ''}
                                  onChange={(e) => updateEditingArea(index, 'action.data', e.target.value)}
                                  placeholder="switch_tab:xxx"
                                  className="w-full px-2 py-1 text-sm border rounded text-gray-900"
                                />
                              </div>
                            </div>
                          ) : (
                            <div>
                              <label className="block text-xs text-gray-600 mb-1">
                                {area.action.type === 'uri' ? 'URI' : area.action.type === 'postback' ? 'Data' : '文字'}
                              </label>
                              <input
                                type="text"
                                value={area.action.type === 'uri' ? (area.action.uri || '') : (area.action.data || '')}
                                onChange={(e) => updateEditingArea(index, area.action.type === 'uri' ? 'action.uri' : 'action.data', e.target.value)}
                                className="w-full px-2 py-1 text-sm border rounded text-gray-900"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* 底部按鈕 */}
            <div className="sticky bottom-0 bg-gray-50 border-t px-6 py-4 flex justify-end gap-3">
              <button
                onClick={() => setEditingMenu(null)}
                className="px-4 py-2 text-gray-700 border rounded-lg hover:bg-gray-100"
              >
                取消
              </button>
              <button
                onClick={saveEdit}
                disabled={savingEdit}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {savingEdit ? '儲存中...' : '儲存變更'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
