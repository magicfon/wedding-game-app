'use client'

import { useState, useEffect } from 'react'
import AdminLayout from '@/components/AdminLayout'
import { 
  Trophy, 
  Timer, 
  Target, 
  Award,
  Settings,
  Save,
  RotateCcw,
  Info,
  CheckCircle
} from 'lucide-react'

interface ScoringRules {
  speed_bonus_multiplier: number
  top_answer_bonus: number[]
  wrong_answer_penalty: number
  timeout_penalty_default: number
  max_bonus_points: number
}

export default function ScoringRulesPage() {
  const [rules, setRules] = useState<ScoringRules>({
    speed_bonus_multiplier: 0.5,
    top_answer_bonus: [50, 30, 20],
    wrong_answer_penalty: 0,
    timeout_penalty_default: 10,
    max_bonus_points: 50
  })
  
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null)

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 3000)
  }

  const handleSave = async () => {
    setLoading(true)
    try {
      // 這裡可以保存到資料庫或配置文件
      // 目前先顯示成功訊息
      await new Promise(resolve => setTimeout(resolve, 1000)) // 模擬保存
      showMessage('success', '計分規則已保存')
    } catch (error) {
      showMessage('error', '保存失敗')
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setRules({
      speed_bonus_multiplier: 0.5,
      top_answer_bonus: [50, 30, 20],
      wrong_answer_penalty: 0,
      timeout_penalty_default: 10,
      max_bonus_points: 50
    })
    showMessage('success', '已重置為預設值')
  }

  return (
    <AdminLayout title="計分規則設定">
      <div className="space-y-8">
        {/* 訊息提示 */}
        {message && (
          <div className={`p-4 rounded-lg flex items-center space-x-2 ${
            message.type === 'success' 
              ? 'bg-green-100 text-green-800 border border-green-200' 
              : 'bg-red-100 text-red-800 border border-red-200'
          }`}>
            <CheckCircle className="w-5 h-5" />
            <span>{message.text}</span>
          </div>
        )}

        {/* 計分規則說明 */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-center space-x-2 mb-4">
            <Info className="w-6 h-6 text-blue-600" />
            <h2 className="text-lg font-semibold text-blue-900">計分規則說明</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
            <div>
              <h3 className="font-medium mb-2">✅ 答對加分</h3>
              <p>基礎分數 + 速度加成 + 排名加分</p>
            </div>
            <div>
              <h3 className="font-medium mb-2">❌ 答錯處理</h3>
              <p>不扣分（可設定扣分規則）</p>
            </div>
            <div>
              <h3 className="font-medium mb-2">⏰ 未答題扣分</h3>
              <p>超時未作答將扣除設定分數</p>
            </div>
            <div>
              <h3 className="font-medium mb-2">🏆 前三名加分</h3>
              <p>答對且速度最快的前三名額外加分</p>
            </div>
          </div>
        </div>

        {/* 速度加成設定 */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center space-x-2 mb-6">
            <Timer className="w-6 h-6 text-pink-500" />
            <h2 className="text-xl font-bold">速度加成設定</h2>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                速度加成倍數
              </label>
              <div className="flex items-center space-x-4">
                <input
                  type="number"
                  min="0"
                  max="1"
                  step="0.1"
                  value={rules.speed_bonus_multiplier}
                  onChange={(e) => setRules({
                    ...rules,
                    speed_bonus_multiplier: parseFloat(e.target.value) || 0
                  })}
                  className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                />
                <span className="text-sm text-gray-500">
                  (剩餘時間比例 × 基礎分數 × 此倍數)
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                例如：基礎分數100分，剩餘時間50%，倍數0.5 → 速度加成 = 100 × 0.5 × 0.5 = 25分
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                最大加成分數
              </label>
              <input
                type="number"
                min="0"
                max="200"
                value={rules.max_bonus_points}
                onChange={(e) => setRules({
                  ...rules,
                  max_bonus_points: parseInt(e.target.value) || 0
                })}
                className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
              />
              <span className="text-sm text-gray-500 ml-2">分</span>
            </div>
          </div>
        </div>

        {/* 排名加分設定 */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center space-x-2 mb-6">
            <Award className="w-6 h-6 text-yellow-500" />
            <h2 className="text-xl font-bold">前三名排名加分</h2>
          </div>
          
          <div className="grid grid-cols-3 gap-4">
            {[0, 1, 2].map((index) => (
              <div key={index} className="text-center">
                <div className={`w-16 h-16 mx-auto mb-3 rounded-full flex items-center justify-center text-white font-bold text-xl ${
                  index === 0 ? 'bg-yellow-500' :
                  index === 1 ? 'bg-gray-400' :
                  'bg-orange-500'
                }`}>
                  {index + 1}
                </div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  第 {index + 1} 名加分
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={rules.top_answer_bonus[index]}
                  onChange={(e) => {
                    const newBonus = [...rules.top_answer_bonus]
                    newBonus[index] = parseInt(e.target.value) || 0
                    setRules({
                      ...rules,
                      top_answer_bonus: newBonus
                    })
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 text-center"
                />
                <span className="text-sm text-gray-500">分</span>
              </div>
            ))}
          </div>
          
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">
              💡 排名加分會在所有人答題完畢後，根據答題速度自動給予前三名答對者額外分數
            </p>
          </div>
        </div>

        {/* 扣分規則設定 */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center space-x-2 mb-6">
            <Target className="w-6 h-6 text-red-500" />
            <h2 className="text-xl font-bold">扣分規則設定</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                答錯扣分
              </label>
              <input
                type="number"
                min="0"
                max="50"
                value={rules.wrong_answer_penalty}
                onChange={(e) => setRules({
                  ...rules,
                  wrong_answer_penalty: parseInt(e.target.value) || 0
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                設為 0 表示答錯不扣分（推薦設定）
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                未答題扣分
              </label>
              <input
                type="number"
                min="0"
                max="50"
                value={rules.timeout_penalty_default}
                onChange={(e) => setRules({
                  ...rules,
                  timeout_penalty_default: parseInt(e.target.value) || 0
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                超時未作答的預設扣分（可在題目中個別設定）
              </p>
            </div>
          </div>
        </div>

        {/* 計分預覽 */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center space-x-2 mb-6">
            <Trophy className="w-6 h-6 text-purple-500" />
            <h2 className="text-xl font-bold">計分預覽</h2>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-medium mb-3">假設情境：基礎分數 100 分的題目</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
              <div className="bg-green-100 p-3 rounded">
                <h4 className="font-medium text-green-800">第1名答對</h4>
                <p className="text-green-700">
                  100 + {Math.floor(100 * rules.speed_bonus_multiplier * 0.8)} + {rules.top_answer_bonus[0]} 
                  = {100 + Math.floor(100 * rules.speed_bonus_multiplier * 0.8) + rules.top_answer_bonus[0]} 分
                </p>
                <p className="text-xs text-green-600">剩餘時間80%</p>
              </div>
              
              <div className="bg-blue-100 p-3 rounded">
                <h4 className="font-medium text-blue-800">第2名答對</h4>
                <p className="text-blue-700">
                  100 + {Math.floor(100 * rules.speed_bonus_multiplier * 0.6)} + {rules.top_answer_bonus[1]} 
                  = {100 + Math.floor(100 * rules.speed_bonus_multiplier * 0.6) + rules.top_answer_bonus[1]} 分
                </p>
                <p className="text-xs text-blue-600">剩餘時間60%</p>
              </div>
              
              <div className="bg-red-100 p-3 rounded">
                <h4 className="font-medium text-red-800">答錯</h4>
                <p className="text-red-700">
                  -{rules.wrong_answer_penalty} = {-rules.wrong_answer_penalty} 分
                </p>
                <p className="text-xs text-red-600">不論速度</p>
              </div>
              
              <div className="bg-gray-100 p-3 rounded">
                <h4 className="font-medium text-gray-800">未答題</h4>
                <p className="text-gray-700">
                  -{rules.timeout_penalty_default} = {-rules.timeout_penalty_default} 分
                </p>
                <p className="text-xs text-gray-600">超時扣分</p>
              </div>
            </div>
          </div>
        </div>

        {/* 操作按鈕 */}
        <div className="flex justify-between">
          <button
            onClick={handleReset}
            className="flex items-center space-x-2 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <RotateCcw className="w-5 h-5" />
            <span>重置預設值</span>
          </button>
          
          <button
            onClick={handleSave}
            disabled={loading}
            className="flex items-center space-x-2 px-6 py-3 bg-pink-500 text-white rounded-lg hover:bg-pink-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : (
              <Save className="w-5 h-5" />
            )}
            <span>{loading ? '保存中...' : '保存設定'}</span>
          </button>
        </div>
      </div>
    </AdminLayout>
  )
}
