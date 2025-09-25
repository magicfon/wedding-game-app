'use client'

import { useState, useEffect } from 'react'
import { useLiff } from '@/hooks/useLiff'
import { useRouter } from 'next/navigation'
import AdminLayout from '@/components/AdminLayout'
import { Settings, Clock, AlertTriangle } from 'lucide-react'

interface Question {
  id: number
  question_text: string
  timeout_penalty_enabled: boolean
  timeout_penalty_score: number
}

interface BatchUpdateResult {
  success: boolean
  message: string
  updated_questions: number
  settings: {
    timeout_penalty_enabled: boolean
    timeout_penalty_score: number
  }
}

export default function BatchSettingsPage() {
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [result, setResult] = useState<BatchUpdateResult | null>(null)
  
  const { isLoggedIn, isAdmin, loading: liffLoading, adminLoading } = useLiff()
  const router = useRouter()

  // 檢查管理員權限
  useEffect(() => {
    if (liffLoading || adminLoading) return
    if (!isLoggedIn || !isAdmin) {
      router.push('/')
    }
  }, [liffLoading, adminLoading, isLoggedIn, isAdmin, router])

  // 載入題目列表
  const fetchQuestions = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/questions/batch-update')
      const data = await response.json()
      
      if (data.success) {
        setQuestions(data.questions || [])
      } else {
        console.error('載入題目失敗:', data.error)
      }
    } catch (error) {
      console.error('載入題目錯誤:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isLoggedIn && isAdmin) {
      fetchQuestions()
    }
  }, [isLoggedIn, isAdmin])

  // 批量設定所有題目超時扣10分
  const handleSetTimeoutPenalty = async () => {
    if (!confirm('確定要將所有題目設定為超時扣10分嗎？')) return

    try {
      setUpdating(true)
      setResult(null)

      const response = await fetch('/api/admin/questions/batch-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          update_type: 'timeout_penalty',
          timeout_penalty_enabled: true,
          timeout_penalty_score: 10
        })
      })

      const data = await response.json()
      setResult(data)

      if (data.success) {
        // 重新載入題目列表
        await fetchQuestions()
      }
    } catch (error) {
      console.error('批量更新錯誤:', error)
      setResult({
        success: false,
        message: '批量更新失敗：' + (error instanceof Error ? error.message : '未知錯誤'),
        updated_questions: 0,
        settings: { timeout_penalty_enabled: false, timeout_penalty_score: 0 }
      })
    } finally {
      setUpdating(false)
    }
  }

  // 如果還在載入中，顯示載入畫面
  if (liffLoading || adminLoading || loading) {
    return (
      <AdminLayout title="批量設定">
        <div className="flex justify-center items-center py-12">
          <div className="text-gray-500">載入中...</div>
        </div>
      </AdminLayout>
    )
  }

  const timeoutEnabledCount = questions.filter(q => q.timeout_penalty_enabled).length
  const timeoutDisabledCount = questions.length - timeoutEnabledCount
  const penalty10Count = questions.filter(q => q.timeout_penalty_score === 10).length

  return (
    <AdminLayout title="批量設定">
      <div className="max-w-6xl mx-auto">
        
        {/* 統計資訊 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex items-center">
              <Settings className="w-8 h-8 text-blue-500 mr-3" />
              <div>
                <p className="text-sm text-gray-500">總題目數</p>
                <p className="text-2xl font-bold text-gray-900">{questions.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex items-center">
              <Clock className="w-8 h-8 text-green-500 mr-3" />
              <div>
                <p className="text-sm text-gray-500">已啟用超時扣分</p>
                <p className="text-2xl font-bold text-green-600">{timeoutEnabledCount}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex items-center">
              <AlertTriangle className="w-8 h-8 text-red-500 mr-3" />
              <div>
                <p className="text-sm text-gray-500">未啟用超時扣分</p>
                <p className="text-2xl font-bold text-red-600">{timeoutDisabledCount}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-purple-500 text-white rounded-full flex items-center justify-center mr-3 font-bold">10</div>
              <div>
                <p className="text-sm text-gray-500">扣分設為10分</p>
                <p className="text-2xl font-bold text-purple-600">{penalty10Count}</p>
              </div>
            </div>
          </div>
        </div>

        {/* 批量操作按鈕 */}
        <div className="bg-white p-6 rounded-lg shadow-md mb-8">
          <h3 className="text-lg font-semibold mb-4">批量操作</h3>
          
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={handleSetTimeoutPenalty}
              disabled={updating}
              className="flex items-center justify-center px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Clock className="w-5 h-5 mr-2" />
              {updating ? '設定中...' : '所有題目設定超時扣10分'}
            </button>
          </div>

          <p className="text-sm text-gray-500 mt-2">
            這將會把所有題目的超時扣分設定為啟用並扣除10分
          </p>
        </div>

        {/* 更新結果 */}
        {result && (
          <div className={`p-4 rounded-lg mb-8 ${result.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
            <h4 className="font-semibold mb-2">
              {result.success ? '✅ 更新成功' : '❌ 更新失敗'}
            </h4>
            <p>{result.message}</p>
            {result.success && (
              <p className="mt-1 text-sm">
                已更新 {result.updated_questions} 個題目
              </p>
            )}
          </div>
        )}

        {/* 題目列表 */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="px-6 py-4 bg-gray-50 border-b">
            <h3 className="text-lg font-semibold">題目超時設定狀況</h3>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    題目
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    超時扣分
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    扣分數值
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    狀態
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {questions.map((question) => (
                  <tr key={question.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        #{question.id}
                      </div>
                      <div className="text-sm text-gray-500 max-w-xs truncate">
                        {question.question_text}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        question.timeout_penalty_enabled 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {question.timeout_penalty_enabled ? '✅ 已啟用' : '❌ 未啟用'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {question.timeout_penalty_score} 分
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {question.timeout_penalty_enabled && question.timeout_penalty_score === 10 ? (
                        <span className="text-green-600 font-medium">✅ 已設定</span>
                      ) : (
                        <span className="text-red-600 font-medium">❌ 需設定</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
