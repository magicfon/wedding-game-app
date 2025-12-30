'use client'

import { useState, useEffect } from 'react'
import { createSupabaseBrowser } from '@/lib/supabase'
import AdminLayout from '@/components/AdminLayout'
import { 
  Trophy, 
  Clock, 
  CheckCircle,
  XCircle,
  Save,
  RefreshCw,
  Info
} from 'lucide-react'

interface ScoringRule {
  id: number
  question_text: string
  base_score: number
  penalty_enabled: boolean
  penalty_score: number
  timeout_penalty_enabled: boolean
  timeout_penalty_score: number
  time_limit: number
  correct_answer: string
}

interface GlobalSettings {
  default_base_score: number
  default_penalty_score: number
  default_timeout_penalty_score: number
  default_time_limit: number
}

export default function ScoringRulesPage() {
  const [questions, setQuestions] = useState<ScoringRule[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null)
  const [globalSettings, setGlobalSettings] = useState<GlobalSettings>({
    default_base_score: 100,
    default_penalty_score: 50,
    default_timeout_penalty_score: 10,
    default_time_limit: 30
  })

  const supabase = createSupabaseBrowser()

  useEffect(() => {
    fetchQuestions()
  }, [])

  const fetchQuestions = async () => {
    try {
      const { data, error } = await supabase
        .from('questions')
        .select('*')
        .order('id', { ascending: true })

      if (error) throw error
      setQuestions(data as ScoringRule[])
    } catch (error) {
      console.error('Error fetching questions:', error)
      showMessage('error', '載入題目失敗')
    } finally {
      setLoading(false)
    }
  }

  const updateQuestion = async (questionId: number, updates: Partial<ScoringRule>) => {
    try {
      const { error } = await supabase
        .from('questions')
        .update(updates)
        .eq('id', questionId)

      if (error) throw error
      showMessage('success', '更新成功')
      fetchQuestions()
    } catch (error) {
      console.error('Error updating question:', error)
      showMessage('error', '更新失敗')
    }
  }

  const applyToAll = async (field: keyof ScoringRule, value: any) => {
    if (!confirm('確定要將此設定套用到所有題目嗎？此操作無法復原。')) {
      return
    }

    setSaving(true)
    try {
      const { error } = await supabase
        .from('questions')
        .update({ [field]: value })
        .neq('id', 0) // Update all

      if (error) throw error
      showMessage('success', '已套用到所有題目')
      fetchQuestions()
    } catch (error) {
      console.error('Error applying to all:', error)
      showMessage('error', '套用失敗')
    } finally {
      setSaving(false)
    }
  }

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 3000)
  }

  if (loading) {
    return (
      <AdminLayout title="計分規則設定">
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500"></div>
          <p className="ml-4 text-gray-600">載入中...</p>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout title="計分規則設定">
      <div className="space-y-6">
        {/* 訊息提示 */}
        {message && (
          <div className={`p-4 rounded-lg flex items-center space-x-2 ${
            message.type === 'success' 
              ? 'bg-green-100 text-green-800 border border-green-200' 
              : 'bg-red-100 text-red-800 border border-red-200'
          }`}>
            {message.type === 'success' ? (
              <CheckCircle className="w-5 h-5" />
            ) : (
              <XCircle className="w-5 h-5" />
            )}
            <span>{message.text}</span>
          </div>
        )}

        {/* 計分規則說明 */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-start space-x-3">
            <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="space-y-2">
              <h3 className="font-semibold text-blue-900">計分規則說明</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• <strong>基礎分數</strong>：答對題目可獲得的分數（預設 100 分）</li>
                <li>• <strong>答錯扣分</strong>：答錯時扣除的分數（可選功能）</li>
                <li>• <strong>超時扣分</strong>：超過時間限制未作答時扣除的分數（可選功能）</li>
                <li>• <strong>時間限制</strong>：答題時間上限（秒，預設 30 秒）</li>
              </ul>
            </div>
          </div>
        </div>

        {/* 全局設定 */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-bold mb-6 flex items-center">
            <Trophy className="w-6 h-6 mr-2 text-pink-500" />
            全局設定（套用到所有題目）
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                基礎分數
              </label>
              <div className="flex space-x-2">
                <input
                  type="number"
                  value={globalSettings.default_base_score}
                  onChange={(e) => setGlobalSettings({...globalSettings, default_base_score: parseInt(e.target.value) || 0})}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 text-black"
                />
                <button
                  onClick={() => applyToAll('base_score', globalSettings.default_base_score)}
                  disabled={saving}
                  className="px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 disabled:bg-gray-300 transition-colors flex items-center"
                >
                  {saving ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                答錯扣分數
              </label>
              <div className="flex space-x-2">
                <input
                  type="number"
                  value={globalSettings.default_penalty_score}
                  onChange={(e) => setGlobalSettings({...globalSettings, default_penalty_score: parseInt(e.target.value) || 0})}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 text-black"
                />
                <button
                  onClick={() => applyToAll('penalty_score', globalSettings.default_penalty_score)}
                  disabled={saving}
                  className="px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 disabled:bg-gray-300 transition-colors flex items-center"
                >
                  {saving ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                超時扣分數
              </label>
              <div className="flex space-x-2">
                <input
                  type="number"
                  value={globalSettings.default_timeout_penalty_score}
                  onChange={(e) => setGlobalSettings({...globalSettings, default_timeout_penalty_score: parseInt(e.target.value) || 0})}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 text-black"
                />
                <button
                  onClick={() => applyToAll('timeout_penalty_score', globalSettings.default_timeout_penalty_score)}
                  disabled={saving}
                  className="px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 disabled:bg-gray-300 transition-colors flex items-center"
                >
                  {saving ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                時間限制（秒）
              </label>
              <div className="flex space-x-2">
                <input
                  type="number"
                  value={globalSettings.default_time_limit}
                  onChange={(e) => setGlobalSettings({...globalSettings, default_time_limit: parseInt(e.target.value) || 0})}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 text-black"
                />
                <button
                  onClick={() => applyToAll('time_limit', globalSettings.default_time_limit)}
                  disabled={saving}
                  className="px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 disabled:bg-gray-300 transition-colors flex items-center"
                >
                  {saving ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 題目列表 */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold flex items-center">
              <Trophy className="w-6 h-6 mr-2 text-pink-500" />
              題目計分設定
            </h2>
            <span className="text-sm text-gray-500">
              共 {questions.length} 題
            </span>
          </div>

          <div className="space-y-4">
            {questions.map((question) => (
              <div key={question.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="mb-4">
                  <h3 className="font-medium text-gray-900">
                    題目 {question.id}: {question.question_text}
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* 基礎分數 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      基礎分數
                    </label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="number"
                        value={question.base_score}
                        onChange={(e) => {
                          const newQuestions = questions.map(q => 
                            q.id === question.id ? {...q, base_score: parseInt(e.target.value) || 0} : q
                          )
                          setQuestions(newQuestions)
                        }}
                        onBlur={() => updateQuestion(question.id, { base_score: question.base_score })}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 text-black"
                      />
                      <span className="text-sm text-gray-500">分</span>
                    </div>
                  </div>

                  {/* 答錯扣分 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      答錯扣分
                    </label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={question.penalty_enabled}
                        onChange={(e) => {
                          const newQuestions = questions.map(q => 
                            q.id === question.id ? {...q, penalty_enabled: e.target.checked} : q
                          )
                          setQuestions(newQuestions)
                          updateQuestion(question.id, { penalty_enabled: e.target.checked })
                        }}
                        className="w-4 h-4 text-pink-500 rounded focus:ring-pink-500"
                      />
                      <input
                        type="number"
                        value={question.penalty_score}
                        onChange={(e) => {
                          const newQuestions = questions.map(q => 
                            q.id === question.id ? {...q, penalty_score: parseInt(e.target.value) || 0} : q
                          )
                          setQuestions(newQuestions)
                        }}
                        onBlur={() => updateQuestion(question.id, { penalty_score: question.penalty_score })}
                        disabled={!question.penalty_enabled}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 text-black disabled:bg-gray-100 disabled:cursor-not-allowed"
                      />
                      <span className="text-sm text-gray-500">分</span>
                    </div>
                  </div>

                  {/* 超時扣分 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      超時扣分
                    </label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={question.timeout_penalty_enabled}
                        onChange={(e) => {
                          const newQuestions = questions.map(q => 
                            q.id === question.id ? {...q, timeout_penalty_enabled: e.target.checked} : q
                          )
                          setQuestions(newQuestions)
                          updateQuestion(question.id, { timeout_penalty_enabled: e.target.checked })
                        }}
                        className="w-4 h-4 text-pink-500 rounded focus:ring-pink-500"
                      />
                      <input
                        type="number"
                        value={question.timeout_penalty_score}
                        onChange={(e) => {
                          const newQuestions = questions.map(q => 
                            q.id === question.id ? {...q, timeout_penalty_score: parseInt(e.target.value) || 0} : q
                          )
                          setQuestions(newQuestions)
                        }}
                        onBlur={() => updateQuestion(question.id, { timeout_penalty_score: question.timeout_penalty_score })}
                        disabled={!question.timeout_penalty_enabled}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 text-black disabled:bg-gray-100 disabled:cursor-not-allowed"
                      />
                      <span className="text-sm text-gray-500">分</span>
                    </div>
                  </div>

                  {/* 時間限制 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Clock className="w-4 h-4 inline mr-1" />
                      時間限制
                    </label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="number"
                        value={question.time_limit}
                        onChange={(e) => {
                          const newQuestions = questions.map(q => 
                            q.id === question.id ? {...q, time_limit: parseInt(e.target.value) || 0} : q
                          )
                          setQuestions(newQuestions)
                        }}
                        onBlur={() => updateQuestion(question.id, { time_limit: question.time_limit })}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 text-black"
                      />
                      <span className="text-sm text-gray-500">秒</span>
                    </div>
                  </div>
                </div>

                {/* 正確答案提示 */}
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    <span>正確答案: <strong className="text-gray-700">{question.correct_answer}</strong></span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
