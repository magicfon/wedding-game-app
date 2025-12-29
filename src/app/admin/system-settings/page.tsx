'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import AdminLayout from '@/components/AdminLayout'
import {
  CheckCircle,
  X,
  AlertCircle,
  Trash2,
  HardDrive,
  FileImage,
  RefreshCw,
  AlertTriangle
} from 'lucide-react'

interface SystemSettings {
  maxPhotoUploadCount: number;
}

interface MediaAnalysis {
  total_files: number
  used_files: number
  unused_files: number
  total_size_bytes: number
  unused_size_bytes: number
  total_size_mb: string
  unused_size_mb: string
  space_utilization: string
}

interface UnusedFile {
  name: string
  size: number
  size_mb: string
  created_at: string
  last_modified: string
}

interface CleanupResult {
  success: boolean
  message: string
  deleted_count: number
  total_files: number
  used_files: number
  remaining_files: number
  total_size_saved: number
  size_saved_mb: string
  deleted_files: Array<{
    name: string
    size: number
    created_at: string
  }>
}

export default function SystemSettingsPage() {
  const [settings, setSettings] = useState<SystemSettings>({
    maxPhotoUploadCount: 3
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const router = useRouter();

  // Media cleanup states
  const [analysis, setAnalysis] = useState<MediaAnalysis | null>(null)
  const [unusedFiles, setUnusedFiles] = useState<UnusedFile[]>([])
  const [mediaLoading, setMediaLoading] = useState(false)
  const [cleanupResult, setCleanupResult] = useState<CleanupResult | null>(null)
  const [lastCleanup, setLastCleanup] = useState<string | null>(null)
  // Track which section is expanded
  const [activeSection, setActiveSection] = useState<'settings' | 'media'>('settings')

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/photo/upload');
      const data = await response.json();
      if (data.success) {
        setSettings(data.data);
      }
    } catch (error) {
      console.error('載入設定失敗:', error);
      showMessage('error', '載入設定失敗');
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/photo/upload', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });

      const data = await response.json();
      if (data.success) {
        showMessage('success', '設定已更新');
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      showMessage('error', '更新設定失敗: ' + (error instanceof Error ? error.message : '未知錯誤'));
    } finally {
      setSaving(false);
    }
  };

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  // Media cleanup functions
  const loadAnalysis = async () => {
    setMediaLoading(true)
    try {
      const response = await fetch('/api/admin/media/cleanup')
      const data = await response.json()

      if (data.success) {
        setAnalysis(data.analysis)
        setUnusedFiles(data.unused_files || [])
      } else {
        console.error('分析失敗:', data.error)
        showMessage('error', '載入分析失敗：' + data.error)
      }
    } catch (error) {
      console.error('載入分析錯誤:', error)
      showMessage('error', '載入分析時發生錯誤')
    } finally {
      setMediaLoading(false)
    }
  }

  const performCleanup = async () => {
    if (!confirm(`確定要刪除 ${unusedFiles.length} 個未使用的媒體檔案嗎？\n\n這個操作無法撤銷！`)) {
      return
    }

    setMediaLoading(true)
    try {
      const response = await fetch('/api/admin/media/cleanup', {
        method: 'POST'
      })
      const data = await response.json()

      if (data.success) {
        setCleanupResult(data)
        setLastCleanup(new Date().toLocaleString('zh-TW'))
        // 重新載入分析
        await loadAnalysis()
      } else {
        console.error('清理失敗:', data.error)
        showMessage('error', '清理失敗：' + data.error)
      }
    } catch (error) {
      console.error('清理錯誤:', error)
      showMessage('error', '清理時發生錯誤')
    } finally {
      setMediaLoading(false)
    }
  }

  return (
    <AdminLayout title="系統設定">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* 設定訊息 */}
        {message && (
          <div className={`p-4 rounded-lg flex items-center space-x-3 ${message.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
            }`}>
            {message.type === 'success' ? (
              <CheckCircle className="w-5 h-5 text-green-500" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-500" />
            )}
            <span className="text-sm font-medium">{message.text}</span>
            <button
              onClick={() => setMessage(null)}
              className="ml-auto text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Tabs for switching between sections */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="flex border-b">
            <button
              onClick={() => setActiveSection('settings')}
              className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${activeSection === 'settings'
                  ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-500'
                  : 'text-gray-600 hover:bg-gray-50'
                }`}
            >
              一般設定
            </button>
            <button
              onClick={() => {
                setActiveSection('media')
                if (!analysis) {
                  loadAnalysis()
                }
              }}
              className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${activeSection === 'media'
                  ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-500'
                  : 'text-gray-600 hover:bg-gray-50'
                }`}
            >
              <div className="flex items-center justify-center space-x-2">
                <HardDrive className="w-4 h-4" />
                <span>媒體清理</span>
              </div>
            </button>
          </div>

          {/* 一般設定區塊 */}
          {activeSection === 'settings' && (
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-6">一般設定</h2>

              {/* 照片上傳設定 */}
              <div className="space-y-6">
                <div>
                  <label htmlFor="maxPhotoUploadCount" className="block text-sm font-medium text-gray-700 mb-2">
                    最大照片上傳數量
                  </label>

                  <div className="flex items-center space-x-4">
                    <input
                      type="number"
                      id="maxPhotoUploadCount"
                      min="1"
                      max="10"
                      value={settings.maxPhotoUploadCount}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        maxPhotoUploadCount: parseInt(e.target.value, 10) || 1
                      }))}
                      className="w-20 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      disabled={saving}
                    />

                    <span className="text-sm text-gray-500">張照片</span>
                  </div>

                  <p className="mt-2 text-sm text-gray-600">
                    設定用戶一次可以上傳的最大照片數量。建議範圍：1-10 張
                  </p>

                  {/* 預覽 */}
                  <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-700">
                      用戶將能夠一次上傳最多 <span className="font-semibold">{settings.maxPhotoUploadCount}</span> 張照片
                    </p>

                    {/* 視覺化預覽 */}
                    <div className="mt-3 flex space-x-2">
                      {Array.from({ length: Math.min(settings.maxPhotoUploadCount, 5) }, (_, i) => (
                        <div
                          key={i}
                          className="w-12 h-12 bg-gray-200 rounded border-2 border-dashed border-gray-300 flex items-center justify-center"
                        >
                          <span className="text-xs text-gray-400">📷</span>
                        </div>
                      ))}

                      {settings.maxPhotoUploadCount > 5 && (
                        <div className="w-12 h-12 bg-gray-100 rounded border-2 border-dashed border-gray-300 flex items-center justify-center">
                          <span className="text-xs text-gray-500">+{settings.maxPhotoUploadCount - 5}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* 注意事項 */}
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="text-sm font-medium text-blue-800 mb-2">注意事項</h3>
                  <ul className="text-sm text-blue-700 space-y-1">
                    <li>• 數量過多可能影響伺服器效能</li>
                    <li>• 建議根據網路頻寬和用戶需求調整</li>
                    <li>• 變更會立即生效，影響所有用戶</li>
                    <li>• 現有上傳的照片不受影響</li>
                  </ul>
                </div>
              </div>

              {/* 操作按鈕 */}
              <div className="mt-8 flex justify-between">
                <button
                  onClick={() => router.push('/admin/dashboard')}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  返回儀表板
                </button>

                <button
                  onClick={saveSettings}
                  disabled={saving || loading}
                  className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
                >
                  {saving ? '儲存中...' : '儲存設定'}
                </button>
              </div>
            </div>
          )}

          {/* 媒體清理區塊 */}
          {activeSection === 'media' && (
            <div className="p-6">
              {/* 控制面板 */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-gray-900">儲存空間分析</h2>
                  <button
                    onClick={loadAnalysis}
                    disabled={mediaLoading}
                    className="flex items-center space-x-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
                  >
                    <RefreshCw className={`w-4 h-4 ${mediaLoading ? 'animate-spin' : ''}`} />
                    <span>{mediaLoading ? '分析中...' : '重新分析'}</span>
                  </button>
                </div>

                {lastCleanup && (
                  <div className="mb-4 p-3 bg-green-100 border border-green-300 rounded-lg">
                    <p className="text-green-800 text-sm">
                      <CheckCircle className="w-4 h-4 inline mr-1" />
                      上次清理時間：{lastCleanup}
                    </p>
                  </div>
                )}

                {analysis && (
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <div className="flex items-center space-x-2 mb-2">
                        <FileImage className="w-5 h-5 text-blue-600" />
                        <span className="text-sm font-medium text-blue-900">總檔案數</span>
                      </div>
                      <p className="text-2xl font-bold text-blue-900">{analysis.total_files}</p>
                      <p className="text-sm text-blue-700">{analysis.total_size_mb} MB</p>
                    </div>

                    <div className="bg-green-50 p-4 rounded-lg">
                      <div className="flex items-center space-x-2 mb-2">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        <span className="text-sm font-medium text-green-900">使用中</span>
                      </div>
                      <p className="text-2xl font-bold text-green-900">{analysis.used_files}</p>
                      <p className="text-sm text-green-700">{analysis.space_utilization}% 利用率</p>
                    </div>

                    <div className="bg-orange-50 p-4 rounded-lg">
                      <div className="flex items-center space-x-2 mb-2">
                        <AlertTriangle className="w-5 h-5 text-orange-600" />
                        <span className="text-sm font-medium text-orange-900">未使用</span>
                      </div>
                      <p className="text-2xl font-bold text-orange-900">{analysis.unused_files}</p>
                      <p className="text-sm text-orange-700">{analysis.unused_size_mb} MB</p>
                    </div>

                    <div className="bg-red-50 p-4 rounded-lg">
                      <div className="flex items-center space-x-2 mb-2">
                        <Trash2 className="w-5 h-5 text-red-600" />
                        <span className="text-sm font-medium text-red-900">可清理</span>
                      </div>
                      <p className="text-2xl font-bold text-red-900">{unusedFiles.length}</p>
                      <p className="text-sm text-red-700">節省 {analysis.unused_size_mb} MB</p>
                    </div>
                  </div>
                )}
              </div>

              {/* 清理結果 */}
              {cleanupResult && (
                <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                    <div>
                      <p className="text-green-900 font-medium">{cleanupResult.message}</p>
                      <div className="mt-2 text-sm text-green-800">
                        <p>• 刪除檔案：{cleanupResult.deleted_count} 個</p>
                        <p>• 節省空間：{cleanupResult.size_saved_mb} MB</p>
                        <p>• 剩餘檔案：{cleanupResult.remaining_files} 個</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 未使用檔案列表 */}
              {unusedFiles.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">
                      未使用的檔案 ({unusedFiles.length} 個)
                    </h3>
                    <button
                      onClick={performCleanup}
                      disabled={mediaLoading}
                      className="flex items-center space-x-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>{mediaLoading ? '清理中...' : '清理所有未使用檔案'}</span>
                    </button>
                  </div>

                  <div className="overflow-x-auto border rounded-lg">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            檔案名稱
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            大小
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            上傳時間
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            最後修改
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {unusedFiles.map((file, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">
                              {file.name}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {file.size_mb} MB
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {new Date(file.created_at).toLocaleString('zh-TW')}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {new Date(file.last_modified).toLocaleString('zh-TW')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* 無未使用檔案 */}
              {analysis && unusedFiles.length === 0 && (
                <div className="text-center py-8">
                  <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">儲存空間已優化</h3>
                  <p className="text-gray-600">所有媒體檔案都在使用中，無需清理</p>
                </div>
              )}

              {/* 載入中 */}
              {mediaLoading && !analysis && (
                <div className="text-center py-8">
                  <RefreshCw className="w-12 h-12 text-blue-500 mx-auto mb-4 animate-spin" />
                  <p className="text-gray-600">正在分析儲存空間...</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}