'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useLiff } from '@/hooks/useLiff'
import { 
  HelpCircle, 
  Plus, 
  Edit, 
  Trash2, 
  Save, 
  X, 
  Clock, 
  Award, 
  AlertCircle,
  CheckCircle,
  Home,
  ArrowLeft
} from 'lucide-react'

interface Question {
  id: number
  question_text: string
  option_a: string
  option_b: string
  option_c: string
  option_d: string
  correct_answer: 'A' | 'B' | 'C' | 'D'
  points: number
  time_limit: number
  penalty_enabled: boolean
  penalty_score: number
  timeout_penalty_enabled: boolean
  timeout_penalty_score: number
  speed_bonus_enabled: boolean
  max_bonus_points: number
  is_active: boolean
  created_at: string
  created_by?: string
}

interface QuestionFormData {
  question_text: string
  option_a: string
  option_b: string
  option_c: string
  option_d: string
  correct_answer: 'A' | 'B' | 'C' | 'D'
  points: number
  time_limit: number
  penalty_enabled: boolean
  penalty_score: number
  timeout_penalty_enabled: boolean
  timeout_penalty_score: number
  speed_bonus_enabled: boolean
  max_bonus_points: number
}

const initialFormData: QuestionFormData = {
  question_text: '',
  option_a: '',
  option_b: '',
  option_c: '',
  option_d: '',
  correct_answer: 'A',
  points: 10,
  time_limit: 30,
  penalty_enabled: false,
  penalty_score: 0,
  timeout_penalty_enabled: false,
  timeout_penalty_score: 0,
  speed_bonus_enabled: true,
  max_bonus_points: 5
}

export default function QuestionsManagePage() {
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null)
  const [formData, setFormData] = useState<QuestionFormData>(initialFormData)
  const [submitting, setSubmitting] = useState(false)
  const [showActiveOnly, setShowActiveOnly] = useState(true)
  
  const { isLoggedIn, profile, isAdmin, loading: liffLoading, adminLoading } = useLiff()
  const router = useRouter()

  // 檢查管理員權限 - 等待載入完成後再檢查
  useEffect(() => {
    // 如果還在載入中，不做任何操作
    if (liffLoading || adminLoading) {
      return
    }

    // 如果沒有登入或不是管理員，跳轉首頁
    if (!isLoggedIn || !isAdmin) {
      console.log('Not logged in or not admin, redirecting to home')
      router.push('/')
    }
  }, [liffLoading, adminLoading, isLoggedIn, isAdmin, router])

  // 載入問題列表
  const fetchQuestions = useCallback(async () => {
    try {
      setLoading(true)
      const url = `/api/admin/questions${showActiveOnly ? '?active=true' : ''}`
      const response = await fetch(url)
      const data = await response.json()
      
      if (data.success) {
        setQuestions(data.questions)
      } else {
        console.error('Failed to fetch questions:', data.error)
      }
    } catch (error) {
      console.error('Error fetching questions:', error)
    } finally {
      setLoading(false)
    }
  }, [showActiveOnly])

  useEffect(() => {
    // 等待載入完成且確認是管理員後才載入問題
    if (!liffLoading && !adminLoading && isAdmin) {
      fetchQuestions()
    }
  }, [liffLoading, adminLoading, isAdmin, fetchQuestions])

  // 處理表單提交
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      // 使用安全 API 進行新增，原始 API 進行編輯
      const url = editingQuestion ? '/api/admin/questions' : '/api/admin/questions/safe'
      const method = editingQuestion ? 'PUT' : 'POST'
      const payload = editingQuestion 
        ? { ...formData, id: editingQuestion.id, updated_by: profile?.userId }
        : { ...formData, created_by: profile?.userId }

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      const data = await response.json()
      
      if (data.success) {
        setShowForm(false)
        setEditingQuestion(null)
        setFormData(initialFormData)
        fetchQuestions()
      } else {
        console.error('Failed to save question:', data)
        
        // 如果是新增問題失敗，嘗試測試 API
        if (!editingQuestion) {
          console.log('Testing with diagnostic API...')
          try {
            const testResponse = await fetch('/api/admin/questions/test', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(payload),
            })
            const testData = await testResponse.json()
            console.log('Test API result:', testData)
            alert('儲存失敗：' + data.error + '\n\n請查看瀏覽器控制台的詳細錯誤信息')
          } catch (testError) {
            console.error('Test API also failed:', testError)
            alert('儲存失敗：' + data.error)
          }
        } else {
          alert('儲存失敗：' + data.error)
        }
      }
    } catch (error) {
      console.error('Error saving question:', error)
      alert('儲存時發生錯誤')
    } finally {
      setSubmitting(false)
    }
  }

  // 刪除問題
  const handleDelete = async (questionId: number) => {
    if (!confirm('確定要刪除這個問題嗎？')) return

    try {
      const response = await fetch(`/api/admin/questions?id=${questionId}&deleted_by=${profile?.userId}`, {
        method: 'DELETE',
      })

      const data = await response.json()
      
      if (data.success) {
        fetchQuestions()
      } else {
        console.error('Failed to delete question:', data.error)
        alert('刪除失敗：' + data.error)
      }
    } catch (error) {
      console.error('Error deleting question:', error)
      alert('刪除時發生錯誤')
    }
  }

  // 開始編輯
  const handleEdit = (question: Question) => {
    setEditingQuestion(question)
    setFormData({
      question_text: question.question_text,
      option_a: question.option_a,
      option_b: question.option_b,
      option_c: question.option_c,
      option_d: question.option_d,
      correct_answer: question.correct_answer,
      points: question.points,
      time_limit: question.time_limit,
      penalty_enabled: question.penalty_enabled,
      penalty_score: question.penalty_score,
      timeout_penalty_enabled: question.timeout_penalty_enabled,
      timeout_penalty_score: question.timeout_penalty_score,
      speed_bonus_enabled: question.speed_bonus_enabled,
      max_bonus_points: question.max_bonus_points
    })
    setShowForm(true)
  }

  // 取消編輯
  const handleCancel = () => {
    setShowForm(false)
    setEditingQuestion(null)
    setFormData(initialFormData)
  }

  // 顯示載入狀態
  if (liffLoading || adminLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md mx-auto text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">載入問題管理</h2>
          <p className="text-gray-900">正在驗證管理員權限...</p>
        </div>
      </div>
    )
  }

  // 如果不是管理員，不顯示任何內容（會被 useEffect 重定向）
  if (!isAdmin) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => router.push('/admin/dashboard')}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="text-sm">返回控制台</span>
              </button>
              <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center">
                <HelpCircle className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">問題管理</h1>
                <p className="text-sm text-gray-900">管理快問快答題目</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/')}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <Home className="w-4 h-4" />
                <span className="text-sm">首頁</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Controls */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h2 className="text-lg font-semibold text-gray-900">
                問題列表 ({questions.length} 個問題)
              </h2>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={showActiveOnly}
                  onChange={(e) => setShowActiveOnly(e.target.checked)}
                  className="rounded border-gray-300"
                />
                <span className="text-sm text-gray-900">只顯示啟用的問題</span>
              </label>
            </div>
            <div className="flex items-center space-x-2">
                <button
                  onClick={async () => {
                    console.log('Checking environment variables...')
                    try {
                      const response = await fetch('/api/debug/env-check')
                      const data = await response.json()
                      console.log('Environment check result:', data)
                      
                      // 顯示關鍵信息
                      const supabaseStatus = data.supabase
                      let message = '環境變數檢查結果：\n\n'
                      message += `Supabase URL: ${supabaseStatus?.url?.valid ? '✅ 正常' : '❌ 有問題'}\n`
                      message += `Supabase Key: ${supabaseStatus?.key?.valid ? '✅ 正常' : '❌ 有問題'}\n`
                      message += `Line Channel ID: ${data.otherVars?.lineChannelId ? '✅ 正常' : '❌ 缺失'}\n\n`
                      
                      if (supabaseStatus?.url?.issues?.length > 0) {
                        message += 'URL 問題：' + supabaseStatus.url.issues.join(', ') + '\n'
                      }
                      if (supabaseStatus?.key?.issues?.length > 0) {
                        message += 'Key 問題：' + supabaseStatus.key.issues.join(', ') + '\n'
                      }
                      
                      message += '\n完整結果：\n' + JSON.stringify(data, null, 2)
                      alert(message)
                    } catch (error) {
                      console.error('Environment check failed:', error)
                      alert('環境變數檢查失敗：' + error)
                    }
                  }}
                  className="flex items-center space-x-1 bg-orange-500 hover:bg-orange-600 text-white px-2 py-1 rounded text-xs"
                >
                  <span>環境變數</span>
                </button>
                <button
                  onClick={async () => {
                    console.log('Testing write permissions...')
                    try {
                      const response = await fetch('/api/debug/write-test', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' }
                      })
                      const data = await response.json()
                      console.log('Write test result:', data)
                      
                      let message = '寫入權限測試結果：\n\n'
                      message += `總測試數: ${data.summary?.totalTests || 0}\n`
                      message += `通過測試: ${data.summary?.passedTests || 0}\n`
                      message += `失敗測試: ${data.summary?.failedTests || 0}\n\n`
                      
                      if (data.testResults) {
                        data.testResults.forEach((result: any, index: number) => {
                          message += `${index + 1}. ${result.test}: ${result.success ? '✅' : '❌'}\n`
                          if (!result.success && result.error) {
                            message += `   錯誤: ${result.error}\n`
                          }
                        })
                      }
                      
                      message += '\n詳細結果請查看控制台'
                      alert(message)
                    } catch (error) {
                      console.error('Write test failed:', error)
                      alert('寫入測試失敗：' + error)
                    }
                  }}
                  className="flex items-center space-x-1 bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded text-xs"
                >
                  <span>寫入測試</span>
                </button>
                <button
                  onClick={async () => {
                    console.log('Testing service key...')
                    try {
                      const response = await fetch('/api/debug/service-key-test', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' }
                      })
                      const data = await response.json()
                      console.log('Service key test result:', data)
                      
                      let message = '服務密鑰測試結果：\n\n'
                      if (data.success) {
                        message += '✅ 服務密鑰測試成功！\n'
                        message += '✅ 可以正常插入資料\n'
                        message += '✅ 新增題目功能應該可以正常使用了\n'
                      } else {
                        message += '❌ 服務密鑰測試失敗\n'
                        message += `錯誤: ${data.error}\n`
                        if (data.details) {
                          message += `詳細: ${JSON.stringify(data.details)}\n`
                        }
                      }
                      
                      message += '\n詳細結果請查看控制台'
                      alert(message)
                    } catch (error) {
                      console.error('Service key test failed:', error)
                      alert('服務密鑰測試失敗：' + error)
                    }
                  }}
                  className="flex items-center space-x-1 bg-green-500 hover:bg-green-600 text-white px-2 py-1 rounded text-xs"
                >
                  <span>服務密鑰測試</span>
                </button>
              <button
                onClick={async () => {
                  console.log('Testing basic API...')
                  try {
                    const response = await fetch('/api/debug/basic-test')
                    const data = await response.json()
                    console.log('Basic API test result:', data)
                    alert('基本 API 測試結果已記錄在控制台')
                  } catch (error) {
                    console.error('Basic test failed:', error)
                    alert('基本測試失敗：' + error)
                  }
                }}
                className="flex items-center space-x-1 bg-gray-500 hover:bg-gray-600 text-white px-2 py-1 rounded text-xs"
              >
                <span>基本</span>
              </button>
              <button
                onClick={async () => {
                  console.log('Testing direct Supabase...')
                  try {
                    const response = await fetch('/api/debug/direct-supabase')
                    const data = await response.json()
                    console.log('Direct Supabase test result:', data)
                    alert('直接 Supabase 測試結果已記錄在控制台')
                  } catch (error) {
                    console.error('Direct Supabase test failed:', error)
                    alert('Supabase 測試失敗：' + error)
                  }
                }}
                className="flex items-center space-x-1 bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded text-xs"
              >
                <AlertCircle className="w-3 h-3" />
                <span>DB</span>
              </button>
              <button
                onClick={() => setShowForm(true)}
                className="flex items-center space-x-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>新增問題</span>
              </button>
            </div>
          </div>
        </div>

        {/* Question Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-gray-900">
                    {editingQuestion ? '編輯問題' : '新增問題'}
                  </h3>
                  <button
                    onClick={handleCancel}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* 問題內容 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      問題內容 *
                    </label>
                    <textarea
                      value={formData.question_text}
                      onChange={(e) => setFormData({ ...formData, question_text: e.target.value })}
                      required
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                      placeholder="請輸入問題內容..."
                    />
                  </div>

                  {/* 選項 */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {(['A', 'B', 'C', 'D'] as const).map((option) => (
                      <div key={option}>
                        <label className="block text-sm font-medium text-gray-900 mb-2">
                          選項 {option} *
                        </label>
                        <input
                          type="text"
                          value={formData[`option_${option.toLowerCase()}` as keyof QuestionFormData] as string}
                          onChange={(e) => setFormData({ 
                            ...formData, 
                            [`option_${option.toLowerCase()}`]: e.target.value 
                          })}
                          required
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                          placeholder={`選項 ${option}`}
                        />
                      </div>
                    ))}
                  </div>

                  {/* 正確答案 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      正確答案 *
                    </label>
                    <select
                      value={formData.correct_answer}
                      onChange={(e) => setFormData({ ...formData, correct_answer: e.target.value as 'A' | 'B' | 'C' | 'D' })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                    >
                      <option value="A">A</option>
                      <option value="B">B</option>
                      <option value="C">C</option>
                      <option value="D">D</option>
                    </select>
                  </div>

                  {/* 分數設定 */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-2">
                        <Award className="w-4 h-4 inline mr-1" />
                        基礎分數
                      </label>
                      <input
                        type="number"
                        value={formData.points}
                        onChange={(e) => setFormData({ ...formData, points: parseInt(e.target.value) || 0 })}
                        min="0"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-2">
                        <Clock className="w-4 h-4 inline mr-1" />
                        答題時間 (秒)
                      </label>
                      <input
                        type="number"
                        value={formData.time_limit}
                        onChange={(e) => setFormData({ ...formData, time_limit: parseInt(e.target.value) || 30 })}
                        min="5"
                        max="300"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-2">
                        最大加成分數
                      </label>
                      <input
                        type="number"
                        value={formData.max_bonus_points}
                        onChange={(e) => setFormData({ ...formData, max_bonus_points: parseInt(e.target.value) || 0 })}
                        min="0"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                      />
                    </div>
                  </div>

                  {/* 扣分設定 */}
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-3">扣分設定</h4>
                    
                    <div className="space-y-3">
                      <label className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={formData.penalty_enabled}
                          onChange={(e) => setFormData({ ...formData, penalty_enabled: e.target.checked })}
                          className="rounded border-gray-300"
                        />
                        <span className="text-sm text-gray-900">答錯扣分</span>
                        {formData.penalty_enabled && (
                          <input
                            type="number"
                            value={formData.penalty_score}
                            onChange={(e) => setFormData({ ...formData, penalty_score: parseInt(e.target.value) || 0 })}
                            min="0"
                            className="w-20 px-2 py-1 border border-gray-300 rounded text-sm text-gray-900"
                            placeholder="分數"
                          />
                        )}
                      </label>

                      <label className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={formData.timeout_penalty_enabled}
                          onChange={(e) => setFormData({ ...formData, timeout_penalty_enabled: e.target.checked })}
                          className="rounded border-gray-300"
                        />
                        <span className="text-sm text-gray-900">超時扣分</span>
                        {formData.timeout_penalty_enabled && (
                          <input
                            type="number"
                            value={formData.timeout_penalty_score}
                            onChange={(e) => setFormData({ ...formData, timeout_penalty_score: parseInt(e.target.value) || 0 })}
                            min="0"
                            className="w-20 px-2 py-1 border border-gray-300 rounded text-sm text-gray-900"
                            placeholder="分數"
                          />
                        )}
                      </label>

                      <label className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={formData.speed_bonus_enabled}
                          onChange={(e) => setFormData({ ...formData, speed_bonus_enabled: e.target.checked })}
                          className="rounded border-gray-300"
                        />
                        <span className="text-sm text-gray-900">啟用速度加成</span>
                      </label>
                    </div>
                  </div>

                  {/* 提交按鈕 */}
                  <div className="flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={handleCancel}
                      className="px-4 py-2 border border-gray-300 text-gray-900 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      取消
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="flex items-center space-x-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
                    >
                      <Save className="w-4 h-4" />
                      <span>{submitting ? '儲存中...' : '儲存'}</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Questions List */}
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
              <p className="text-gray-900 mt-2">載入問題中...</p>
            </div>
          ) : questions.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
              <HelpCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-900">還沒有任何問題</p>
              <button
                onClick={() => setShowForm(true)}
                className="mt-4 bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg transition-colors"
              >
                新增第一個問題
              </button>
            </div>
          ) : (
            questions.map((question, index) => (
              <div key={question.id} className="bg-white rounded-2xl shadow-lg p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-3">
                      <span className="bg-blue-100 text-blue-800 text-sm font-medium px-2.5 py-0.5 rounded">
                        Q{index + 1}
                      </span>
                      {question.is_active ? (
                        <span className="bg-green-100 text-green-800 text-xs font-medium px-2 py-1 rounded flex items-center">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          啟用
                        </span>
                      ) : (
                        <span className="bg-red-100 text-red-800 text-xs font-medium px-2 py-1 rounded flex items-center">
                          <AlertCircle className="w-3 h-3 mr-1" />
                          停用
                        </span>
                      )}
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <span className="flex items-center">
                          <Award className="w-4 h-4 mr-1" />
                          {question.points}分
                        </span>
                        <span className="flex items-center">
                          <Clock className="w-4 h-4 mr-1" />
                          {question.time_limit}秒
                        </span>
                      </div>
                    </div>
                    
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      {question.question_text}
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4">
                      {[
                        { key: 'A', value: question.option_a },
                        { key: 'B', value: question.option_b },
                        { key: 'C', value: question.option_c },
                        { key: 'D', value: question.option_d }
                      ].map(option => (
                        <div 
                          key={option.key}
                          className={`p-3 rounded-lg border ${
                            option.key === question.correct_answer 
                              ? 'bg-green-50 border-green-200 text-green-800' 
                              : 'bg-gray-50 border-gray-200 text-gray-900'
                          }`}
                        >
                          <span className="font-medium">{option.key}.</span> {option.value}
                          {option.key === question.correct_answer && (
                            <CheckCircle className="w-4 h-4 inline ml-2 text-green-600" />
                          )}
                        </div>
                      ))}
                    </div>

                    {/* 設定標籤 */}
                    <div className="flex flex-wrap gap-2">
                      {question.penalty_enabled && (
                        <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded">
                          答錯扣{question.penalty_score}分
                        </span>
                      )}
                      {question.timeout_penalty_enabled && (
                        <span className="bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded">
                          超時扣{question.timeout_penalty_score}分
                        </span>
                      )}
                      {question.speed_bonus_enabled && (
                        <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                          速度加成最多{question.max_bonus_points}分
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={() => handleEdit(question)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="編輯"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(question.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="刪除"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  )
}
