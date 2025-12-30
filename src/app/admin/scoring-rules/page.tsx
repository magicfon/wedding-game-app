'use client'

import { useState, useEffect } from 'react'
import { createSupabaseBrowser } from '@/lib/supabase'
import AdminLayout from '@/components/AdminLayout'
import { 
  Trophy, 
  Clock, 
  CheckCircle,
  XCircle,
  Info,
  Dice1,
  Users,
  Save,
  RefreshCw
} from 'lucide-react'

// 計分規則配置 - 隨機計分系統
interface ScoringRules {
  id?: number
  base_score: number           // 基礎分數
  random_bonus_min: number      // 隨機加成最小值
  random_bonus_max: number      // 隨機加成最大值
  participation_score: number  // 答錯參與獎（鼓勵大家都答題）
  timeout_score: number        // 超時分數
  updated_at?: string
}

const DEFAULT_SCORING_RULES: ScoringRules = {
  base_score: 50,
  random_bonus_min: 1,
  random_bonus_max: 50,
  participation_score: 50,
  timeout_score: 0
}

export default function ScoringRulesPage() {
  const [rules, setRules] = useState<ScoringRules>(DEFAULT_SCORING_RULES)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null)

  const supabase = createSupabaseBrowser()

  useEffect(() => {
    fetchScoringRules()
  }, [])

  const fetchScoringRules = async () => {
    try {
      const { data, error } = await supabase
        .from('scoring_rules')
        .select('*')
        .order('id', { ascending: false })
        .limit(1)
        .single()

      if (error) {
        // 如果表不存在或沒有數據，使用預設值
        console.log('使用預設計分規則')
        setRules(DEFAULT_SCORING_RULES)
      } else if (data) {
        setRules(data as ScoringRules)
      }
    } catch (error) {
      console.error('Error fetching scoring rules:', error)
      setRules(DEFAULT_SCORING_RULES)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      if (rules.id) {
        // 更新現有規則
        const { error } = await supabase
          .from('scoring_rules')
          .update({
            base_score: rules.base_score,
            random_bonus_min: rules.random_bonus_min,
            random_bonus_max: rules.random_bonus_max,
            participation_score: rules.participation_score,
            timeout_score: rules.timeout_score
          })
          .eq('id', rules.id)

        if (error) throw error
      } else {
        // 插入新規則
        const { error } = await supabase
          .from('scoring_rules')
          .insert({
            base_score: rules.base_score,
            random_bonus_min: rules.random_bonus_min,
            random_bonus_max: rules.random_bonus_max,
            participation_score: rules.participation_score,
            timeout_score: rules.timeout_score
          })

        if (error) throw error
      }

      showMessage('success', '計分規則已更新')
      fetchScoringRules()
    } catch (error) {
      console.error('Error saving scoring rules:', error)
      showMessage('error', '儲存失敗：' + (error instanceof Error ? error.message : '未知錯誤'))
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
              <h3 className="font-semibold text-blue-900">隨機計分系統說明</h3>
              <p className="text-sm text-blue-800">
                本系統採用隨機計分機制，讓遊戲更具趣味性和公平性。
                在此頁面修改設定後會立即儲存到資料庫，新的計分規則會在下一題開始時生效。
              </p>
            </div>
          </div>
        </div>

        {/* 計分規則設定 */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold flex items-center">
              <Trophy className="w-6 h-6 mr-2 text-pink-500" />
              計分規則設定
            </h2>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center"
            >
              {saving ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  儲存中...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  儲存變更
                </>
              )}
            </button>
          </div>

          <div className="space-y-6">
            {/* 基礎分數 */}
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center space-x-3 mb-3">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <Trophy className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">基礎分數</h3>
                  <p className="text-sm text-gray-500">答對題目時的基礎得分</p>
                </div>
              </div>
              <div className="ml-13">
                <div className="flex items-center space-x-4">
                  <input
                    type="number"
                    value={rules.base_score}
                    onChange={(e) => setRules({...rules, base_score: parseInt(e.target.value) || 0})}
                    className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 text-black"
                  />
                  <span className="text-2xl font-bold text-green-600">{rules.base_score} 分</span>
                </div>
              </div>
            </div>

            {/* 隨機加成 */}
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center space-x-3 mb-3">
                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                  <Dice1 className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">隨機加成</h3>
                  <p className="text-sm text-gray-500">答對時額外獲得的隨機分數</p>
                </div>
              </div>
              <div className="ml-13 space-y-3">
                <div className="flex items-center space-x-4">
                  <span className="text-sm text-gray-600 w-20">最小值：</span>
                  <input
                    type="number"
                    value={rules.random_bonus_min}
                    onChange={(e) => setRules({...rules, random_bonus_min: parseInt(e.target.value) || 0})}
                    className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 text-black"
                  />
                  <span className="text-sm text-gray-500">分</span>
                </div>
                <div className="flex items-center space-x-4">
                  <span className="text-sm text-gray-600 w-20">最大值：</span>
                  <input
                    type="number"
                    value={rules.random_bonus_max}
                    onChange={(e) => setRules({...rules, random_bonus_max: parseInt(e.target.value) || 0})}
                    className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 text-black"
                  />
                  <span className="text-sm text-gray-500">分</span>
                </div>
                <div className="bg-purple-50 p-3 rounded-lg">
                  <p className="text-sm text-purple-800">
                    答對時總分 = 基礎分數 ({rules.base_score}) + 隨機加成 ({rules.random_bonus_min}-{rules.random_bonus_max})
                  </p>
                  <p className="text-sm text-purple-800 mt-1">
                    總分範圍：{rules.base_score + rules.random_bonus_min} - {rules.base_score + rules.random_bonus_max} 分
                  </p>
                </div>
              </div>
            </div>

            {/* 參與獎 */}
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center space-x-3 mb-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">參與獎</h3>
                  <p className="text-sm text-gray-500">答錯時仍可獲得的鼓勵分數</p>
                </div>
              </div>
              <div className="ml-13">
                <div className="flex items-center space-x-4">
                  <input
                    type="number"
                    value={rules.participation_score}
                    onChange={(e) => setRules({...rules, participation_score: parseInt(e.target.value) || 0})}
                    className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 text-black"
                  />
                  <span className="text-2xl font-bold text-blue-600">{rules.participation_score} 分</span>
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  鼓勵所有參與者都嘗試作答，答錯仍有分數可拿
                </p>
              </div>
            </div>

            {/* 超時分數 */}
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center space-x-3 mb-3">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <Clock className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">超時分數</h3>
                  <p className="text-sm text-gray-500">超過時間限制未作答時的得分</p>
                </div>
              </div>
              <div className="ml-13">
                <div className="flex items-center space-x-4">
                  <input
                    type="number"
                    value={rules.timeout_score}
                    onChange={(e) => setRules({...rules, timeout_score: parseInt(e.target.value) || 0})}
                    className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 text-black"
                  />
                  <span className="text-2xl font-bold text-red-600">{rules.timeout_score} 分</span>
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  超時未作答不獲得分數
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 計分範例 */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-bold mb-6 flex items-center">
            <Trophy className="w-6 h-6 mr-2 text-pink-500" />
            計分範例
          </h2>

          <div className="space-y-4">
            <div className="flex items-start space-x-4 p-4 bg-green-50 rounded-lg">
              <div className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center flex-shrink-0">
                <CheckCircle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-semibold text-green-900">答對題目</h4>
                <p className="text-sm text-green-800">
                  獲得基礎分數 {rules.base_score} 分 + 隨機加成 {rules.random_bonus_min}-{rules.random_bonus_max} 分
                </p>
                <p className="text-sm text-green-800">
                  總分範圍：{rules.base_score + rules.random_bonus_min} - {rules.base_score + rules.random_bonus_max} 分
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-4 p-4 bg-blue-50 rounded-lg">
              <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center flex-shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-semibold text-blue-900">答錯題目</h4>
                <p className="text-sm text-blue-800">
                  獲得參與獎 {rules.participation_score} 分
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-4 p-4 bg-red-50 rounded-lg">
              <div className="w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center flex-shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-semibold text-red-900">超時未作答</h4>
                <p className="text-sm text-red-800">
                  獲得 {rules.timeout_score} 分
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 更新時間 */}
        {rules.updated_at && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <p className="text-sm text-gray-600">
              上次更新時間：{new Date(rules.updated_at).toLocaleString('zh-TW')}
            </p>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
