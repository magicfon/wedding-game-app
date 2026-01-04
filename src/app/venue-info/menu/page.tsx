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
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6 text-center">
          <h2 className="text-2xl font-bold text-amber-800 mb-2">
            — 婚宴桌席菜單 —
          </h2>
          <p className="text-gray-600">
            萊特薇庭 Light Wedding
          </p>
        </div>

        {/* 菜單內容 */}
        <div className="space-y-4">
          {/* 喜慶八圍碟 */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="p-2 bg-amber-100 rounded-lg">
                <Star className="w-5 h-5 text-amber-600" />
              </div>
              <h3 className="text-lg font-bold text-amber-800">喜慶八圍碟</h3>
            </div>
            <div className="grid grid-cols-2 gap-2 text-gray-700 text-center">
              <span>青瓜香醋雲耳海蜇</span>
              <span>桂花蓮子大甲蜜芋頭</span>
              <span>普羅旺斯嫩煎櫻桃鴨</span>
              <span>藥膳老酒紹興醉雞</span>
              <span>烏魚子杏桃乳酪起司</span>
              <span>紅寶石冰釀山楂</span>
              <span>白蘭地山葵藜麥中卷</span>
              <span>蜜汁冷燻松阪肉</span>
            </div>
          </div>

          {/* 主菜 */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="p-2 bg-red-100 rounded-lg">
                <Utensils className="w-5 h-5 text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-amber-800">主菜</h3>
            </div>
            <ul className="space-y-3 text-gray-700 text-center">
              <li className="py-1 border-b border-gray-100">花好月常圓</li>
              <li className="py-1 border-b border-gray-100">和風鮑魚沙拉杯（位上）</li>
              <li className="py-1 border-b border-gray-100">金華花膠鹿野雞</li>
              <li className="py-1 border-b border-gray-100">秘製豬肋排搭奶油鮮蔬</li>
              <li className="py-1 border-b border-gray-100">翡翠蹄筋燒烏參</li>
              <li className="py-1 border-b border-gray-100">蔥香鮮露海中斑</li>
              <li className="py-1 border-b border-gray-100">薑黃櫻花蝦栗子飄香飯</li>
              <li className="py-1 border-b border-gray-100">瑤柱蟲草田園蔬</li>
              <li className="py-1">黃金竹蟶燉瑤柱</li>
            </ul>
          </div>

          {/* 甜點 */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="p-2 bg-pink-100 rounded-lg">
                <Star className="w-5 h-5 text-pink-600" />
              </div>
              <h3 className="text-lg font-bold text-amber-800">甜點</h3>
            </div>
            <p className="text-center text-gray-700">哈根達斯冰淇淋</p>
          </div>
        </div>

        {/* 提示訊息 */}
        <div className="mt-8 bg-amber-50 rounded-2xl p-6">
          <h3 className="font-semibold text-amber-800 mb-2">
            💡 飲食注意事項
          </h3>
          <ul className="text-sm text-amber-700 space-y-2">
            <li>• 如有食物過敏，請提前告知服務人員</li>
            <li>• 可提供素食選擇，請預先告知</li>
            <li>• 配合季節變化，本公司保有菜單內容更改權益</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
