'use client'

import { useEffect } from 'react'
import { Utensils, Star, Loader2 } from 'lucide-react'
import { useLiff } from '@/hooks/useLiff'

export default function MenuPage() {
  const { isReady, isLoggedIn, login, loading: liffLoading } = useLiff()

  // 檢查登入狀態，未登入則觸發登入流程
  useEffect(() => {
    if (isReady && !liffLoading && !isLoggedIn) {
      // LIFF login 會自動導回當前頁面
      login()
    }
  }, [isReady, isLoggedIn, liffLoading, login])

  // 載入中
  if (!isReady || liffLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-green-600 animate-spin" />
      </div>
    )
  }

  // 未登入不顯示內容
  if (!isLoggedIn) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white">
      {/* 頂部導航 */}
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <h1 className="text-xl font-bold text-gray-900">菜單</h1>
        </div>
      </div>

      {/* 主要內容 */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* 歡迎訊息 */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            婚禮宴席菜單
          </h2>
          <p className="text-gray-600">
            精心準備的婚禮宴席菜單，期待您的品嚐
          </p>
        </div>

        {/* 菜單內容 */}
        <div className="space-y-4">
          {/* 前菜 */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-green-100 rounded-lg">
                <Utensils className="w-5 h-5 text-green-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">前菜</h3>
            </div>
            <ul className="space-y-2 text-gray-700">
              <li className="flex justify-between">
                <span>綜合生魚片</span>
                <span className="text-sm text-gray-500">鮮美海鮮</span>
              </li>
              <li className="flex justify-between">
                <span>法式鵝肝醬</span>
                <span className="text-sm text-gray-500">經典法式</span>
              </li>
              <li className="flex justify-between">
                <span>煙燻鮭魚</span>
                <span className="text-sm text-gray-500">北歐風味</span>
              </li>
            </ul>
          </div>

          {/* 湯品 */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Star className="w-5 h-5 text-blue-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">湯品</h3>
            </div>
            <ul className="space-y-2 text-gray-700">
              <li className="flex justify-between">
                <span>松茸清湯</span>
                <span className="text-sm text-gray-500">養生選擇</span>
              </li>
              <li className="flex justify-between">
                <span>鮑魚濃湯</span>
                <span className="text-sm text-gray-500">濃郁鮮美</span>
              </li>
            </ul>
          </div>

          {/* 主菜 */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 rounded-lg">
                <Utensils className="w-5 h-5 text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">主菜</h3>
            </div>
            <ul className="space-y-2 text-gray-700">
              <li className="flex justify-between">
                <span>炭烤牛排</span>
                <span className="text-sm text-gray-500">澳洲和牛</span>
              </li>
              <li className="flex justify-between">
                <span>香煎龍蝦</span>
                <span className="text-sm text-gray-500">新鮮海鮮</span>
              </li>
              <li className="flex justify-between">
                <span>紅酒燉牛肉</span>
                <span className="text-sm text-gray-500">法式經典</span>
              </li>
              <li className="flex justify-between">
                <span>清蒸石斑魚</span>
                <span className="text-sm text-gray-500">台灣海鮮</span>
              </li>
            </ul>
          </div>

          {/* 甜點 */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-pink-100 rounded-lg">
                <Star className="w-5 h-5 text-pink-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">甜點</h3>
            </div>
            <ul className="space-y-2 text-gray-700">
              <li className="flex justify-between">
                <span>法式焦糖布丁</span>
                <span className="text-sm text-gray-500">經典甜點</span>
              </li>
              <li className="flex justify-between">
                <span>巧克力慕斯</span>
                <span className="text-sm text-gray-500">濃郁口感</span>
              </li>
              <li className="flex justify-between">
                <span>水果拼盤</span>
                <span className="text-sm text-gray-500">當季水果</span>
              </li>
            </ul>
          </div>
        </div>

        {/* 提示訊息 */}
        <div className="mt-8 bg-yellow-50 rounded-2xl p-6">
          <h3 className="font-semibold text-yellow-800 mb-2">
            💡 飲食注意事項
          </h3>
          <ul className="text-sm text-yellow-700 space-y-2">
            <li>• 如有食物過敏，請提前告知服務人員</li>
            <li>• 可提供素食選擇，請預先告知</li>
            <li>• 菜單可能因季節性食材而調整</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
