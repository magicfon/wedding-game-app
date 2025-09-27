'use client'

import { useState } from 'react'

interface AnswerDistribution {
  answer: string
  count: number
  users: Array<{
    line_id: string
    display_name: string
    avatar_url: string | null
  }>
}

interface TestResult {
  success: boolean
  questionId: string
  totalAnswers: number
  distribution: AnswerDistribution[]
  rawData?: any
  error?: string
}

export default function AnswerTest() {
  const [questionId, setQuestionId] = useState('')
  const [result, setResult] = useState<TestResult | null>(null)
  const [loading, setLoading] = useState(false)

  const testAnswerDistribution = async () => {
    if (!questionId.trim()) {
      alert('請輸入題目 ID')
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/debug/test-answer-distribution?questionId=${encodeURIComponent(questionId.trim())}`)
      const data = await response.json()
      setResult(data)
    } catch (error) {
      setResult({
        success: false,
        questionId: questionId.trim(),
        totalAnswers: 0,
        distribution: [],
        error: (error as Error).message
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">答題分佈測試工具</h1>
        
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-2">題目 ID</label>
              <input
                type="text"
                value={questionId}
                onChange={(e) => setQuestionId(e.target.value)}
                className="w-full border rounded px-3 py-2"
                placeholder="輸入題目 ID（例如：1, 2, 3...）"
                onKeyPress={(e) => e.key === 'Enter' && testAnswerDistribution()}
              />
            </div>
            <button
              onClick={testAnswerDistribution}
              disabled={loading}
              className="bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
            >
              {loading ? '測試中...' : '測試'}
            </button>
          </div>
          <p className="text-sm text-gray-600 mt-2">
            提示：打開瀏覽器開發者工具的 Console 查看詳細日誌
          </p>
        </div>

        {result && (
          <div className="space-y-6">
            {/* 測試結果摘要 */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold mb-4">測試結果</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className={`text-2xl font-bold ${result.success ? 'text-green-600' : 'text-red-600'}`}>
                    {result.success ? '✅' : '❌'}
                  </div>
                  <div className="text-sm text-gray-600">狀態</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{result.questionId}</div>
                  <div className="text-sm text-gray-600">題目 ID</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">{result.totalAnswers}</div>
                  <div className="text-sm text-gray-600">總答題數</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {result.distribution?.filter(d => d.count > 0).length || 0}
                  </div>
                  <div className="text-sm text-gray-600">有人選擇的選項</div>
                </div>
              </div>
              
              {result.error && (
                <div className="mt-4 p-4 bg-red-100 border border-red-300 rounded">
                  <p className="text-red-700 font-medium">錯誤：{result.error}</p>
                </div>
              )}
            </div>

            {/* 答題分佈 */}
            {result.success && result.distribution && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-bold mb-4">答題分佈</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {result.distribution.map((dist) => (
                    <div key={dist.answer} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-lg font-bold">選項 {dist.answer}</h3>
                        <span className="bg-blue-100 text-blue-800 text-sm font-medium px-2 py-1 rounded">
                          {dist.count} 人
                        </span>
                      </div>
                      
                      {dist.users && dist.users.length > 0 ? (
                        <div className="space-y-2">
                          {dist.users.map((user, index) => (
                            <div key={index} className="flex items-center gap-2">
                              {user.avatar_url ? (
                                <img 
                                  src={user.avatar_url} 
                                  alt={user.display_name}
                                  className="w-8 h-8 rounded-full object-cover"
                                />
                              ) : (
                                <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center text-xs font-bold">
                                  {user.display_name?.charAt(0) || '?'}
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{user.display_name}</p>
                                <p className="text-xs text-gray-500 truncate">{user.line_id}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-500 text-sm">無人選擇</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 原始數據 */}
            {result.success && result.rawData && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-bold mb-4">原始數據</h2>
                <div className="space-y-4">
                  <div>
                    <h3 className="font-medium mb-2">答題記錄 ({result.rawData.answerRecords?.length || 0} 筆)</h3>
                    <pre className="bg-gray-100 p-3 rounded text-xs overflow-auto max-h-40">
                      {JSON.stringify(result.rawData.answerRecords, null, 2)}
                    </pre>
                  </div>
                  <div>
                    <h3 className="font-medium mb-2">用戶資料 ({result.rawData.users?.length || 0} 筆)</h3>
                    <pre className="bg-gray-100 p-3 rounded text-xs overflow-auto max-h-40">
                      {JSON.stringify(result.rawData.users, null, 2)}
                    </pre>
                  </div>
                  <div>
                    <h3 className="font-medium mb-2">LINE ID 列表</h3>
                    <p className="text-sm text-gray-600">{result.rawData.lineIds?.join(', ')}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
