'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import AdminLayout from '@/components/AdminLayout'
import { CheckCircle, X, AlertCircle } from 'lucide-react'

interface SystemSettings {
  maxPhotoUploadCount: number;
}

export default function SystemSettingsPage() {
  const [settings, setSettings] = useState<SystemSettings>({
    maxPhotoUploadCount: 3
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const router = useRouter();
  
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
  
  return (
    <AdminLayout title="系統設定">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-6">系統設定</h2>
          
          {/* 設定訊息 */}
          {message && (
            <div className={`mb-6 p-4 rounded-lg flex items-center space-x-3 ${
              message.type === 'success' 
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
              onClick={() => router.push('/admin/simple-dashboard')}
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
      </div>
    </AdminLayout>
  );
}