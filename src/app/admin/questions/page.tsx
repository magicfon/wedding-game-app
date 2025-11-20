'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useLiff } from '@/hooks/useLiff'
import AdminLayout from '@/components/AdminLayout'
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
  ArrowLeft,
  Image as ImageIcon,
  Video,
  FileText,
  List,
  Grid3X3,
  HardDrive
} from 'lucide-react'
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
  penalty_enabled: boolean
  penalty_score: number
  timeout_penalty_enabled: boolean
  timeout_penalty_score: number
  speed_bonus_enabled: boolean
  max_bonus_points: number
  is_active: boolean
  created_at: string
  created_by?: string
  // 媒體支援欄位
  media_type: 'text' | 'image' | 'video'
  media_url?: string
  media_thumbnail_url?: string
  media_alt_text?: string
  media_duration?: number
  // 排序欄位
  display_order: number
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
  // 媒體支援欄位
  media_type: 'text' | 'image' | 'video'
  media_url?: string
  media_thumbnail_url?: string
  media_alt_text?: string
  media_duration?: number
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
  max_bonus_points: 5,
  // 媒體支援預設值
  media_type: 'text',
  media_url: undefined,
  media_thumbnail_url: undefined,
  media_alt_text: undefined,
  media_duration: undefined
}

export default function QuestionsManagePage() {
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null)
  const [formData, setFormData] = useState<QuestionFormData>(initialFormData)
  const [submitting, setSubmitting] = useState(false)
  const [showActiveOnly, setShowActiveOnly] = useState(true)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [cleanupLoading, setCleanupLoading] = useState(false)
  const [cleanupResult, setCleanupResult] = useState<string | null>(null)

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
      // 媒體欄位
      media_type: question.media_type || 'text',
      media_url: question.media_url,
      media_thumbnail_url: question.media_thumbnail_url,
      media_alt_text: question.media_alt_text,
      media_duration: question.media_duration
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
    <AdminLayout title="問題管理">
      <div className="max-w-7xl mx-auto">
        {/* Main Content */}
        <div className="space-y-6">
          {/* Controls */}
          <div className="bg-white rounded-2xl shadow-lg p-4 md:p-6 mb-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              {/* 左側：標題和篩選選項 */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 flex-wrap">
                <h2 className="text-lg font-semibold text-gray-900 whitespace-nowrap">
                  問題列表 ({questions.length} 個問題)
                </h2>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={showActiveOnly}
                    onChange={(e) => setShowActiveOnly(e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm text-gray-900 whitespace-nowrap">只顯示啟用的問題</span>
                </label>

                {/* 視圖模式切換 */}
                <div className="flex items-center bg-gray-100 rounded-lg p-1">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`flex items-center space-x-1 px-3 py-1 rounded text-sm transition-colors ${viewMode === 'grid'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                      }`}
                  >
                    <Grid3X3 className="w-4 h-4" />
                    <span>卡片</span>
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`flex items-center space-x-1 px-3 py-1 rounded text-sm transition-colors ${viewMode === 'list'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                      }`}
                  >
                    <List className="w-4 h-4" />
                    <span>列表</span>
                  </button>
                </div>
              </div>

              {/* 右側：操作按鈕 */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={handleMediaDiagnosis}
                  disabled={cleanupLoading}
                  className="flex items-center space-x-2 bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded-lg transition-colors disabled:opacity-50 text-sm whitespace-nowrap"
                  title="診斷媒體清理問題"
                >
                  <AlertCircle className="w-4 h-4" />
                  <span className="hidden sm:inline">診斷</span>
                </button>
                <button
                  onClick={handleMediaCleanup}
                  disabled={cleanupLoading}
                  className="flex items-center space-x-2 bg-orange-500 hover:bg-orange-600 text-white px-3 md:px-4 py-2 rounded-lg transition-colors disabled:opacity-50 text-sm whitespace-nowrap"
                  title="清理未使用的媒體檔案"
                >
                  <HardDrive className="w-4 h-4" />
                  <span className="hidden sm:inline">{cleanupLoading ? '處理中...' : '媒體清理'}</span>
                </button>
                <button
                  onClick={() => setShowForm(true)}
                  className="flex items-center space-x-2 bg-green-500 hover:bg-green-600 text-white px-3 md:px-4 py-2 rounded-lg transition-colors text-sm whitespace-nowrap"
                >
                  <Plus className="w-4 h-4" />
                  <span>新增問題</span>
                </button>
              </div>
            </div>
          </div>

          {/* Cleanup Result */}
          {cleanupResult && (
            <div className={`p-4 rounded-lg border ${cleanupResult.includes('✅')
                ? 'bg-green-50 border-green-300 text-green-800'
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
                    media_type: q.media_type,
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
                  </div>
                </div>
              ))
            )}
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

                    {/* 媒體類型選擇 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-2">題目類型</label>
                      <div className="grid grid-cols-3 gap-4">
                        {[
                          { value: 'text', label: '純文字', icon: FileText, color: 'gray' },
                          { value: 'image', label: '圖片', icon: ImageIcon, color: 'blue' },
                          { value: 'video', label: '影片', icon: Video, color: 'purple' }
                        ].map(({ value, label, icon: Icon, color }) => (
                          <button
                            key={value}
                            type="button"
                            onClick={() => setFormData({
                              ...formData,
                              media_type: value as 'text' | 'image' | 'video',
                              ...(value !== formData.media_type && {
                                media_url: undefined,
                                media_thumbnail_url: undefined,
                                media_alt_text: undefined,
                                media_duration: undefined
                              })
                            })}
                            className={`flex flex-col items-center p-4 rounded-lg border-2 transition-colors ${formData.media_type === value
                                ? `border-${color}-500 bg-${color}-50 text-${color}-700`
                                : 'border-gray-200 hover:border-gray-300 text-gray-600'
                              }`}
                          >
                            <Icon className="w-8 h-8 mb-2" />
                            <span className="font-medium">{label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* 媒體上傳 */}
                    {(formData.media_type === 'image' || formData.media_type === 'video') && (
                      <div>
                        <label className="block text-sm font-medium text-gray-900 mb-2">
                          {formData.media_type === 'image' ? '圖片上傳' : '影片上傳'}
                        </label>
                        <MediaUpload
                          mediaType={formData.media_type}
                          currentMediaUrl={formData.media_url}
                          currentThumbnailUrl={formData.media_thumbnail_url}
                          currentAltText={formData.media_alt_text}
                          onMediaChange={(data) => setFormData({
                            ...formData,
                            media_url: data.mediaUrl || undefined,
                            media_thumbnail_url: data.thumbnailUrl || undefined,
                            media_alt_text: data.altText || undefined
                          })}
                          disabled={submitting}
                        />
                      </div>
                    )}

                    {/* 選項 */}
                    <div className="grid grid-cols-2 gap-4">
                      {['A', 'B', 'C', 'D'].map((option) => (
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
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
                            placeholder={`請輸入選項 ${option}...`}
                          />
                        </div>
                      ))}
                    </div>

                    {/* 正確答案 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-2">
                        正確答案 *
                      </label>
                      <div className="flex space-x-4">
                        {['A', 'B', 'C', 'D'].map((option) => (
                          <label key={option} className="flex items-center">
                            <input
                              type="radio"
                              name="correct_answer"
                              value={option}
                              checked={formData.correct_answer === option}
                              onChange={(e) => setFormData({ ...formData, correct_answer: e.target.value as 'A' | 'B' | 'C' | 'D' })}
                              className="mr-2"
                            />
                            <span className="text-gray-900">選項 {option}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* 基礎設定 */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-900 mb-2">
                          基礎分數
                        </label>
                        <input
                          type="number"
                          value={formData.points}
                          onChange={(e) => setFormData({ ...formData, points: parseInt(e.target.value) })}
                          min="1"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-900 mb-2">
                          答題時間 (秒)
                        </label>
                        <input
                          type="number"
                          value={formData.time_limit}
                          onChange={(e) => setFormData({ ...formData, time_limit: parseInt(e.target.value) })}
                          min="5"
                          max="300"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
                        />
                      </div>
                    </div>

                    {/* 進階設定 */}
                    <div className="space-y-4">
                      <h4 className="font-medium text-gray-900">進階設定</h4>

                      {/* 答錯扣分 */}
                      <div className="flex items-center space-x-4">
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={formData.penalty_enabled}
                            onChange={(e) => setFormData({ ...formData, penalty_enabled: e.target.checked })}
                            className="mr-2"
                          />
                          <span className="text-gray-900">答錯扣分</span>
                        </label>
                        {formData.penalty_enabled && (
                          <input
                            type="number"
                            value={formData.penalty_score}
                            onChange={(e) => setFormData({ ...formData, penalty_score: parseInt(e.target.value) })}
                            min="0"
                            className="w-20 px-2 py-1 border border-gray-300 rounded text-black"
                            placeholder="分數"
                          />
                        )}
                      </div>

                      {/* 超時扣分 */}
                      <div className="flex items-center space-x-4">
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={formData.timeout_penalty_enabled}
                            onChange={(e) => setFormData({ ...formData, timeout_penalty_enabled: e.target.checked })}
                            className="mr-2"
                          />
                          <span className="text-gray-900">超時扣分</span>
                        </label>
                        {formData.timeout_penalty_enabled && (
                          <input
                            type="number"
                            value={formData.timeout_penalty_score}
                            onChange={(e) => setFormData({ ...formData, timeout_penalty_score: parseInt(e.target.value) })}
                            min="0"
                            className="w-20 px-2 py-1 border border-gray-300 rounded text-black"
                            placeholder="分數"
                          />
                        )}
                      </div>

                      {/* 速度加成 */}
                      <div className="flex items-center space-x-4">
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={formData.speed_bonus_enabled}
                            onChange={(e) => setFormData({ ...formData, speed_bonus_enabled: e.target.checked })}
                            className="mr-2"
                          />
                          <span className="text-gray-900">速度加成</span>
                        </label>
                        {formData.speed_bonus_enabled && (
                          <input
                            type="number"
                            value={formData.max_bonus_points}
                            onChange={(e) => setFormData({ ...formData, max_bonus_points: parseInt(e.target.value) })}
                            min="0"
                            className="w-20 px-2 py-1 border border-gray-300 rounded text-black"
                            placeholder="最高分"
                          />
                        )}
                      </div>
                    </div>

                    {/* 按鈕 */}
                    <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-200">
                      <button
                        type="button"
                        onClick={handleCancel}
                        className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                      >
                        取消
                      </button>
                      <button
                        type="submit"
                        disabled={submitting}
                        className="flex items-center space-x-2 bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg transition-colors disabled:opacity-50"
                      >
                        {submitting && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
                        <Save className="w-4 h-4" />
                        <span>{submitting ? '儲存中...' : '儲存'}</span>
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  )
}