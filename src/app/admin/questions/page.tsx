'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import AdminLayout from '@/components/AdminLayout'
import {
  Plus, Edit, Trash2, Save, X,
  HelpCircle, Clock, Award, AlertCircle, CheckCircle,
  Image as ImageIcon, Video, FileText,
  List, Settings, Move, ArrowRight
} from 'lucide-react'
import { useLiff } from '@/hooks/useLiff'
import MediaUpload from '@/components/MediaUpload'
import DragDropQuestionList from '@/components/DragDropQuestionList'

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
  is_active: boolean
  display_order: number
  created_at: string
  // Advanced settings
  penalty_enabled: boolean
  penalty_score: number
  timeout_penalty_enabled: boolean
  timeout_penalty_score: number
  speed_bonus_enabled: boolean
  max_bonus_points: number
  // Media settings
  media_type: 'text' | 'image' | 'video'
  media_url?: string
  media_thumbnail_url?: string
  media_alt_text?: string
  media_duration?: number
  category: 'formal' | 'test' | 'backup'
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
  media_type: 'text' | 'image' | 'video'
  media_url: string
  media_thumbnail_url: string
  media_alt_text: string
  media_duration: number
  category: 'formal' | 'test' | 'backup'
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
  speed_bonus_enabled: false,
  max_bonus_points: 0,
  media_type: 'text',
  media_url: '',
  media_thumbnail_url: '',
  media_alt_text: '',
  media_duration: 0,
  category: 'formal'
}

export default function QuestionsManagePage() {
  const { isLoggedIn, isAdmin, loading: liffLoading, profile } = useLiff()
  const router = useRouter()
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)

  const [showForm, setShowForm] = useState(false)
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null)
  const [formData, setFormData] = useState<QuestionFormData>(initialFormData)
  const [submitting, setSubmitting] = useState(false)
  const [cleanupLoading, setCleanupLoading] = useState(false)
  const [cleanupResult, setCleanupResult] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'formal' | 'test' | 'backup'>('formal')
  const [showActiveOnly, setShowActiveOnly] = useState(false)
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list')

  const fetchQuestions = useCallback(async () => {
    try {
      setLoading(true)
      const url = `/api/admin/questions?category=${activeTab}${showActiveOnly ? '&active=true' : ''}`
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
  }, [activeTab, showActiveOnly])

  const handleCancel = () => {
    setShowForm(false)
    setEditingQuestion(null)
    setFormData(initialFormData)
  }

  // 檢查管理員權限
  useEffect(() => {
    if (!liffLoading) {
      if (!isLoggedIn || !isAdmin) {
        router.push('/')
        return
      }
      fetchQuestions()
    }
  }, [liffLoading, isAdmin, fetchQuestions, isLoggedIn, router])

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

      console.log('📝 Submitting question form:', payload)

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

  // 重新排序題目
  const handleReorder = async (questionIds: number[]) => {
    try {
      const response = await fetch('/api/admin/questions/reorder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ questionIds })
      })

      const data = await response.json()

      if (data.success) {
        console.log('✅ 題目重新排序成功')
        // 重新載入題目列表
        await fetchQuestions()
      } else {
        console.error('❌ 重新排序失敗:', data.error)
        alert('重新排序失敗：' + data.error)
      }
    } catch (error) {
      console.error('Error reordering questions:', error)
      alert('重新排序時發生錯誤')
    }
  }

  // 切換題目啟用狀態
  const handleToggleActive = async (questionId: number, isActive: boolean) => {
    try {
      const response = await fetch('/api/admin/questions', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: questionId,
          is_active: isActive
        })
      })

      const data = await response.json()

      if (data.success) {
        console.log('✅ 題目狀態更新成功')
        // 重新載入題目列表
        await fetchQuestions()
      } else {
        console.error('❌ 狀態更新失敗:', data.error)
        alert('狀態更新失敗：' + data.error)
      }
    } catch (error) {
      console.error('Error toggling question status:', error)
      alert('狀態更新時發生錯誤')
    }
  }

  // 移動題目分類
  const handleMoveCategory = async (questionId: number, newCategory: 'formal' | 'test' | 'backup') => {
    try {
      console.log(`🔄 Moving question ${questionId} to ${newCategory}...`)
      const response = await fetch('/api/admin/questions', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: questionId,
          category: newCategory,
          updated_by: profile?.userId
        })
      })

      const data = await response.json()

      if (data.success) {
        console.log('✅ 題目分類更新成功')
        // 重新載入題目列表
        await fetchQuestions()
      } else {
        console.error('❌ 分類更新失敗:', data.error)
        alert('分類更新失敗：' + data.error)
      }
    } catch (error) {
      console.error('Error moving question category:', error)
      alert('分類更新時發生錯誤')
    }
  }

  // 媒體清理診斷函數
  const handleMediaDiagnosis = async () => {
    setCleanupLoading(true)
    setCleanupResult(null)

    try {
      console.log('🔍 開始診斷媒體清理問題...')

      const response = await fetch('/api/debug/media-cleanup-debug')
      const data = await response.json()

      if (data.success) {
        const diagnosis = data.diagnosis
        const storageScan = diagnosis.storage_scan || {}
        const dbAnalysis = diagnosis.database_analysis || {}
        const matchingAnalysis = diagnosis.matching_analysis || {}
        const summary = diagnosis.summary || {}

        // 計算目錄資訊
        const directoriesInfo = Object.entries(storageScan.files_by_directory || {})
          .map(([dir, files]: [string, any]) => `  - ${dir}: ${files.length} 個檔案`)
          .join('\n')

        const message = `🔍 Supabase Storage 媒體診斷報告：

📁 Storage 掃描結果：
- 總檔案數：${storageScan.total_files || 0} 個
- 掃描目錄：${summary.directories_scanned || 0} 個
- 預期檔案：${summary.expected_files || 7} 個
- 符合預期：${summary.files_match_expected ? '✅ 是' : '❌ 否'}

📂 檔案分佈：
${directoriesInfo || '  - 無檔案'}

📋 資料庫分析：
- 總題目：${dbAnalysis.total_questions || 0} 個
- 使用媒體：${dbAnalysis.media_questions_count || 0} 個題目
- 使用路徑：${dbAnalysis.used_file_paths?.length || 0} 個

🔍 匹配分析：
- 使用中檔案：${matchingAnalysis.used_files_count || 0} 個
- 未使用檔案：${matchingAnalysis.unused_files_count || 0} 個
- 可清理：${summary.can_cleanup ? '✅ 是' : '❌ 否'}

🔐 系統狀態：
- Service Role Key：${diagnosis.system_info?.service_role_key_exists ? '✅ 已設定' : '❌ 未設定'}

📝 建議：
${diagnosis.recommendations?.join('\n') || '無建議'}

詳細資訊請查看瀏覽器控制台 (F12)`

        setCleanupResult(message)
        console.log('🔍 完整診斷結果:', data)
        alert(message)
      } else {
        console.error('❌ 診斷失敗:', data.error)
        const errorMessage = `❌ 診斷失敗：${data.error}`
        setCleanupResult(errorMessage)
        alert(errorMessage)
      }
    } catch (error) {
      console.error('❌ 診斷錯誤:', error)
      const errorMessage = '❌ 診斷時發生錯誤，請稍後再試'
      setCleanupResult(errorMessage)
      alert(errorMessage)
    } finally {
      setCleanupLoading(false)
    }
  }

  // 媒體清理函數
  const handleMediaCleanup = async () => {
    if (!confirm('確定要清理未使用的媒體檔案嗎？\n\n這個操作會刪除 Supabase Storage 中沒有被任何題目使用的媒體檔案，無法撤銷！')) {
      return
    }

    setCleanupLoading(true)
    setCleanupResult(null)

    try {
      console.log('🧹 開始清理未使用的媒體檔案...')

      const response = await fetch('/api/admin/media/cleanup', {
        method: 'POST'
      })

      const data = await response.json()

      if (data.success) {
        const message = `✅ 清理完成！\n\n刪除檔案：${data.deleted_count} 個\n節省空間：${data.size_saved_mb} MB\n剩餘檔案：${data.remaining_files} 個`
        setCleanupResult(message)
        alert(message)
        console.log('🎉 媒體檔案清理成功:', data)
      } else {
        console.error('❌ 媒體清理失敗:', data.error)
        const errorMessage = `❌ 清理失敗：${data.error}`
        setCleanupResult(errorMessage)
        alert(errorMessage)
      }
    } catch (error) {
      console.error('❌ 媒體清理錯誤:', error)
      const errorMessage = '❌ 清理時發生錯誤，請稍後再試'
      setCleanupResult(errorMessage)
      alert(errorMessage)
    } finally {
      setCleanupLoading(false)
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
      max_bonus_points: question.max_bonus_points,
      media_type: question.media_type || 'text',
      media_url: question.media_url || '',
      media_thumbnail_url: question.media_thumbnail_url || '',
      media_alt_text: question.media_alt_text || '',
      media_duration: question.media_duration || 0,
      category: question.category || 'formal'
    })
    setShowForm(true)
  }

  // 顯示載入狀態
  if (liffLoading) {
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

  if (!isLoggedIn || !isAdmin) {
    return null
  }

  return (
    <AdminLayout title="題庫管理">
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold text-gray-900">題目列表</h1>
            <div className="flex bg-gray-100 p-1 rounded-lg">
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-md transition-colors ${viewMode === 'list' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'
                  }`}
                title="列表視圖"
              >
                <List className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'
                  }`}
                title="網格視圖"
              >
                <List className="w-5 h-5 rotate-90" />
              </button>
            </div>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={handleMediaDiagnosis}
              className="flex items-center space-x-2 px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors"
              disabled={cleanupLoading}
            >
              <CheckCircle className="w-5 h-5" />
              <span>媒體診斷</span>
            </button>
            <button
              onClick={handleMediaCleanup}
              className="flex items-center space-x-2 px-4 py-2 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition-colors"
              disabled={cleanupLoading}
            >
              <Trash2 className="w-5 h-5" />
              <span>清理媒體</span>
            </button>
            <button
              onClick={() => {
                setEditingQuestion(null)
                setFormData(initialFormData)
                setShowForm(true)
              }}
              className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors shadow-sm"
            >
              <Plus className="w-5 h-5" />
              <span>新增題目</span>
            </button>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('formal')}
              className={`${activeTab === 'formal'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              正式題庫
            </button>
            <button
              onClick={() => setActiveTab('test')}
              className={`${activeTab === 'test'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              測試題庫
            </button>
            <button
              onClick={() => setActiveTab('backup')}
              className={`${activeTab === 'backup'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              備用題庫
            </button>
          </nav>
        </div>
        {/* Filters */}
        <div className="flex items-center">
          <label className="flex items-center space-x-2 text-sm text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={showActiveOnly}
              onChange={(e) => setShowActiveOnly(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span>只顯示啟用中的題目</span>
          </label>
        </div>

        {/* Media Cleanup Result */}
        {cleanupResult && (
          <div className={`p-4 rounded-lg border ${cleanupResult.includes('✅')
            ? 'bg-green-50 border-green-200 text-green-800'
            : 'bg-red-50 border-red-300 text-red-800'
            }`}>
            <div className="flex items-start space-x-2">
              {cleanupResult.includes('✅') ? (
                <CheckCircle className="w-5 h-5 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 mt-0.5" />
              )}
              <div>
                <p className="font-medium">媒體清理結果</p>
                <pre className="text-sm mt-1 whitespace-pre-wrap">{cleanupResult}</pre>
                <button
                  onClick={() => setCleanupResult(null)}
                  className="text-sm underline mt-2 hover:no-underline"
                >
                  關閉
                </button>
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
          ) : viewMode === 'list' ? (
            /* 列表視圖 - 拖拽排序 */
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">拖拽排序</h3>
                <p className="text-sm text-gray-600">拖拽題目來調整順序，變更會立即保存</p>
              </div>
              <DragDropQuestionList
                questions={questions.map(q => ({
                  id: q.id,
                  question_text: q.question_text,
                  display_order: q.display_order || q.id,
                  media_type: q.media_type || 'text',
                  is_active: q.is_active,
                  media_url: q.media_url
                }))}
                onReorder={handleReorder}
                onEdit={(questionId) => {
                  const question = questions.find(q => q.id === questionId)
                  if (question) handleEdit(question)
                }}
                onToggleActive={handleToggleActive}
                loading={loading}
              />
            </div>
          ) : (
            /* 卡片視圖 - 原有的網格顯示 */
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

                    <div className="flex items-start space-x-3 mb-4">
                      {/* 媒體類型圖標 */}
                      <div className="flex-shrink-0 mt-1">
                        {question.media_type === 'image' && (
                          <div className="flex items-center text-blue-600">
                            <ImageIcon className="w-5 h-5" />
                          </div>
                        )}
                        {question.media_type === 'video' && (
                          <div className="flex items-center text-purple-600">
                            <Video className="w-5 h-5" />
                          </div>
                        )}
                        {(!question.media_type || question.media_type === 'text') && (
                          <div className="flex items-center text-gray-500">
                            <FileText className="w-5 h-5" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900">{question.question_text}</h3>
                        {question.media_url && (
                          <div className="mt-3">
                            {question.media_type === 'image' && (
                              <img
                                src={question.media_url}
                                alt={question.media_alt_text || '題目圖片'}
                                className="max-w-full h-auto max-h-48 rounded-lg shadow-sm"
                              />
                            )}
                            {question.media_type === 'video' && (
                              <video
                                src={question.media_url}
                                poster={question.media_thumbnail_url}
                                controls
                                playsInline
                                className="max-w-full h-auto max-h-48 rounded-lg shadow-sm"
                                onMouseEnter={(e) => {
                                  const video = e.target as HTMLVideoElement
                                  video.play()
                                }}
                                onMouseLeave={(e) => {
                                  const video = e.target as HTMLVideoElement
                                  video.pause()
                                  video.currentTime = 0
                                }}
                              >
                                您的瀏覽器不支援影片播放
                              </video>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 選項顯示 */}
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      {[
                        { key: 'A', value: question.option_a },
                        { key: 'B', value: question.option_b },
                        { key: 'C', value: question.option_c },
                        { key: 'D', value: question.option_d }
                      ].map(option => (
                        <div
                          key={option.key}
                          className={`p-3 rounded-lg border ${option.key === question.correct_answer
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

                  <div className="flex flex-col space-y-2 ml-2 border-l pl-2 border-gray-100">
                    <span className="text-xs text-gray-400 font-medium text-center mb-1">移動至</span>
                    {activeTab !== 'formal' && (
                      <button
                        onClick={() => handleMoveCategory(question.id, 'formal')}
                        className="px-2 py-1 text-xs bg-blue-50 text-blue-600 hover:bg-blue-100 rounded transition-colors whitespace-nowrap"
                        title="移動至正式題庫"
                      >
                        正式題庫
                      </button>
                    )}
                    {activeTab !== 'test' && (
                      <button
                        onClick={() => handleMoveCategory(question.id, 'test')}
                        className="px-2 py-1 text-xs bg-gray-100 text-gray-600 hover:bg-gray-200 rounded transition-colors whitespace-nowrap"
                        title="移動至測試題庫"
                      >
                        測試題庫
                      </button>
                    )}
                    {activeTab !== 'backup' && (
                      <button
                        onClick={() => handleMoveCategory(question.id, 'backup')}
                        className="px-2 py-1 text-xs bg-orange-50 text-orange-600 hover:bg-orange-100 rounded transition-colors whitespace-nowrap"
                        title="移動至備用題庫"
                      >
                        備用題庫
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
        {/* Question Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white z-10">
                <h2 className="text-xl font-bold text-gray-900">
                  {editingQuestion ? '編輯題目' : '新增題目'}
                </h2>
                <button
                  onClick={handleCancel}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                {/* 題目內容 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    題目內容 <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    required
                    value={formData.question_text}
                    onChange={(e) => setFormData({ ...formData, question_text: e.target.value })}
                    className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    rows={3}
                    placeholder="請輸入題目內容..."
                  />
                </div>

                {/* 媒體上傳 */}
                <div className="bg-gray-50 p-4 rounded-xl space-y-4">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    媒體設定
                  </label>

                  <div className="flex space-x-4 mb-4">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="radio"
                        name="media_type"
                        value="text"
                        checked={formData.media_type === 'text'}
                        onChange={() => setFormData({ ...formData, media_type: 'text', media_url: '' })}
                        className="text-blue-600 focus:ring-blue-500"
                      />
                      <span className="flex items-center text-sm text-gray-700">
                        <FileText className="w-4 h-4 mr-1" /> 純文字
                      </span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="radio"
                        name="media_type"
                        value="image"
                        checked={formData.media_type === 'image'}
                        onChange={() => setFormData({ ...formData, media_type: 'image' })}
                        className="text-blue-600 focus:ring-blue-500"
                      />
                      <span className="flex items-center text-sm text-gray-700">
                        <ImageIcon className="w-4 h-4 mr-1" /> 圖片
                      </span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="radio"
                        name="media_type"
                        value="video"
                        checked={formData.media_type === 'video'}
                        onChange={() => setFormData({ ...formData, media_type: 'video' })}
                        className="text-blue-600 focus:ring-blue-500"
                      />
                      <span className="flex items-center text-sm text-gray-700">
                        <Video className="w-4 h-4 mr-1" /> 影片
                      </span>
                    </label>
                  </div>

                  {formData.media_type !== 'text' && (
                    <MediaUpload
                      mediaType={formData.media_type as 'image' | 'video'}
                      currentMediaUrl={formData.media_url}
                      currentThumbnailUrl={formData.media_thumbnail_url}
                      currentAltText={formData.media_alt_text}
                      onMediaChange={(data) => {
                        setFormData(prev => ({
                          ...prev,
                          media_url: data.mediaUrl || '',
                          media_thumbnail_url: data.thumbnailUrl || '',
                          media_alt_text: data.altText || ''
                        }))
                      }}
                    />
                  )}
                </div>

                {/* 選項 */}
                <div className="space-y-4">
                  <h3 className="font-medium text-gray-900 flex items-center">
                    <List className="w-5 h-5 mr-2 text-gray-500" />
                    選項 <span className="text-red-500">*</span>
                  </h3>
                  {(['A', 'B', 'C', 'D'] as const).map((option) => {
                    const optionKey = `option_${option.toLowerCase()}` as keyof QuestionFormData;
                    return (
                      <div key={option}>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          選項 {option} <span className="text-red-500">*</span>
                        </label>
                        <div className="flex items-center space-x-2">
                          <input
                            type="radio"
                            name="correct_answer"
                            checked={formData.correct_answer === option}
                            onChange={() => setFormData({ ...formData, correct_answer: option })}
                            className="text-blue-600 focus:ring-blue-500"
                          />
                          <input
                            type="text"
                            required
                            value={formData[optionKey] as string}
                            onChange={(e) => setFormData({ ...formData, [optionKey]: e.target.value })}
                            className={`flex-1 rounded-lg shadow-sm focus:ring-blue-500 ${formData.correct_answer === option
                              ? 'border-green-500 focus:border-green-500 bg-green-50'
                              : 'border-gray-300 focus:border-blue-500'
                              }`}
                            placeholder={`輸入選項 ${option}...`}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* 進階設定 */}
                <div className="bg-gray-50 p-4 rounded-xl space-y-4">
                  <h3 className="font-medium text-gray-900 flex items-center">
                    <Settings className="w-5 h-5 mr-2 text-gray-500" />
                    進階設定
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        分數權重
                      </label>
                      <input
                        type="number"
                        required
                        min="1"
                        value={formData.points}
                        onChange={(e) => setFormData({ ...formData, points: parseInt(e.target.value) || 0 })}
                        className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        答題時間 (秒)
                      </label>
                      <input
                        type="number"
                        required
                        min="5"
                        value={formData.time_limit}
                        onChange={(e) => setFormData({ ...formData, time_limit: parseInt(e.target.value) || 0 })}
                        className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        題庫分類
                      </label>
                      <select
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                        className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      >
                        <option value="formal">正式題庫</option>
                        <option value="test">測試題庫</option>
                        <option value="backup">備用題庫</option>
                      </select>
                    </div>
                  </div>

                  <div className="border-t border-gray-200 pt-4 space-y-4">
                    {/* 答錯扣分 */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="penalty_enabled"
                          checked={formData.penalty_enabled}
                          onChange={(e) => setFormData({ ...formData, penalty_enabled: e.target.checked })}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <label htmlFor="penalty_enabled" className="text-sm font-medium text-gray-700">
                          啟用答錯扣分
                        </label>
                      </div>
                      {formData.penalty_enabled && (
                        <input
                          type="number"
                          min="0"
                          value={formData.penalty_score}
                          onChange={(e) => setFormData({ ...formData, penalty_score: parseInt(e.target.value) || 0 })}
                          className="w-24 rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                          placeholder="扣分分數"
                        />
                      )}
                    </div>

                    {/* 超時扣分 */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="timeout_penalty_enabled"
                          checked={formData.timeout_penalty_enabled}
                          onChange={(e) => setFormData({ ...formData, timeout_penalty_enabled: e.target.checked })}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <label htmlFor="timeout_penalty_enabled" className="text-sm font-medium text-gray-700">
                          啟用超時扣分
                        </label>
                      </div>
                      {formData.timeout_penalty_enabled && (
                        <input
                          type="number"
                          min="0"
                          value={formData.timeout_penalty_score}
                          onChange={(e) => setFormData({ ...formData, timeout_penalty_score: parseInt(e.target.value) || 0 })}
                          className="w-24 rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                          placeholder="扣分分數"
                        />
                      )}
                    </div>

                    {/* 速度加成 */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="speed_bonus_enabled"
                          checked={formData.speed_bonus_enabled}
                          onChange={(e) => setFormData({ ...formData, speed_bonus_enabled: e.target.checked })}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <label htmlFor="speed_bonus_enabled" className="text-sm font-medium text-gray-700">
                          啟用速度加成
                        </label>
                      </div>
                      {formData.speed_bonus_enabled && (
                        <input
                          type="number"
                          min="0"
                          value={formData.max_bonus_points}
                          onChange={(e) => setFormData({ ...formData, max_bonus_points: parseInt(e.target.value) || 0 })}
                          className="w-24 rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                          placeholder="最大加分"
                        />
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-6 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex items-center px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        儲存中...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        儲存題目
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}