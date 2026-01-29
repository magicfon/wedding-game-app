'use client'

import { useEffect } from 'react'
import { Loader2 } from 'lucide-react'
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
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-amber-200 rounded-full animate-pulse" />
            <Loader2 className="w-8 h-8 text-amber-600 animate-spin absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          </div>
          <p className="text-amber-700 font-medium animate-pulse">載入菜單中...</p>
        </div>
      </div>
    )
  }

  // 未登入不顯示內容
  if (!isLoggedIn) {
    return null
  }

  // 喜慶八圍碟
  const appetizers = [
    { left: '青瓜香醋雲耳海蜇', right: '桂花蓮子大甲蜜芋頭' },
    { left: '普羅旺斯嫩煎櫻桃鴨', right: '藥膳老酒紹興醉雞' },
    { left: '烏魚子杏桃乳酪起司', right: '紅寶石冰釀山楂' },
    { left: '白蘭地山葵藜麥中卷', right: '蜜汁冷燻松阪肉' },
  ]

  // 主菜
  const mainCourses = [
    { name: '花好月常圓', highlight: true },
    { name: '明太子焗烤鮮龍蝦（每人半隻）', highlight: false },
    { name: '核桃牛肝菌菇燉鹿野雞', highlight: false },
    { name: '日式照燒牛小排搭奶油鮮蔬', highlight: false },
    { name: '碧綠XO醬爆三鮮', highlight: false },
    { name: '古法欖菜海中斑', highlight: false },
    { name: '櫻花蝦錦繡珍鮑飄香飯', highlight: false },
    { name: '蟲草松茸五彩蔬', highlight: false },
    { name: '花膠鼎湯燉海參（位上）', highlight: false },
    { name: '哈根達斯冰淇淋', highlight: true },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 relative overflow-hidden">
      {/* 裝飾背景 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-20 -right-20 w-80 h-80 bg-gradient-to-br from-amber-200/30 to-orange-200/30 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-tr from-yellow-200/30 to-amber-200/30 rounded-full blur-3xl" />
        <div className="absolute top-1/2 right-0 w-64 h-64 bg-gradient-to-bl from-orange-100/40 to-transparent rounded-full blur-2xl" />
      </div>

      {/* 頂部導航 */}
      <div className="bg-white/80 backdrop-blur-md shadow-sm sticky top-0 z-10 border-b border-amber-100">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <h1 className="text-xl font-bold bg-gradient-to-r from-amber-700 to-orange-600 bg-clip-text text-transparent text-center">
            婚宴菜單
          </h1>
        </div>
      </div>

      {/* 主要內容 */}
      <div className="max-w-4xl mx-auto px-4 py-8 relative z-1">
        {/* Logo 與標題 - 仿照原始菜單風格 */}
        <div className="relative bg-gradient-to-br from-white to-amber-50/50 rounded-3xl shadow-xl p-8 mb-8 border border-amber-100 overflow-hidden">
          {/* 裝飾線條 */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-amber-300 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-amber-300 to-transparent" />

          {/* 蝴蝶裝飾 */}
          <div className="absolute top-4 left-4 opacity-20">
            <svg className="w-16 h-16 text-amber-600" viewBox="0 0 100 100" fill="currentColor">
              <path d="M50 50 Q20 20 10 50 Q20 80 50 50 Q80 80 90 50 Q80 20 50 50" />
            </svg>
          </div>
          <div className="absolute bottom-4 right-4 opacity-20 rotate-180">
            <svg className="w-16 h-16 text-amber-600" viewBox="0 0 100 100" fill="currentColor">
              <path d="M50 50 Q20 20 10 50 Q20 80 50 50 Q80 80 90 50 Q80 20 50 50" />
            </svg>
          </div>

          <div className="text-center relative z-10">
            <div className="mb-4">
              <span className="text-3xl font-serif tracking-wider text-amber-700">萊特薇庭</span>
            </div>
            <p className="text-amber-600/80 text-sm tracking-widest uppercase mb-6">Light Wedding</p>
            <div className="flex items-center justify-center gap-4 mb-4">
              <span className="w-16 h-px bg-gradient-to-r from-transparent to-amber-300" />
              <h2 className="text-2xl font-bold text-amber-800 tracking-widest">婚宴桌席菜單</h2>
              <span className="w-16 h-px bg-gradient-to-l from-transparent to-amber-300" />
            </div>
          </div>
        </div>

        {/* 喜慶八圍碟 */}
        <div className="relative bg-gradient-to-br from-white to-amber-50/30 rounded-3xl shadow-xl p-8 mb-6 border border-amber-100 overflow-hidden group hover:shadow-2xl transition-all duration-500">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-100/0 to-amber-100/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

          <div className="relative z-10">
            <div className="text-center mb-6">
              <h3 className="inline-block text-xl font-bold text-amber-800 relative">
                喜慶八圍碟
                <span className="absolute -bottom-2 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent" />
              </h3>
            </div>

            <div className="space-y-3">
              {appetizers.map((item, index) => (
                <div
                  key={index}
                  className="flex justify-center gap-8 text-gray-700 group/item"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <span className="text-center min-w-[140px] py-1 hover:text-amber-700 transition-colors duration-300">
                    {item.left}
                  </span>
                  <span className="text-amber-300">•</span>
                  <span className="text-center min-w-[140px] py-1 hover:text-amber-700 transition-colors duration-300">
                    {item.right}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 主菜 */}
        <div className="relative bg-gradient-to-br from-white to-amber-50/30 rounded-3xl shadow-xl p-8 mb-6 border border-amber-100 overflow-hidden group hover:shadow-2xl transition-all duration-500">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-100/0 to-amber-100/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

          <div className="relative z-10">
            <div className="text-center mb-6">
              <h3 className="inline-block text-xl font-bold text-amber-800 relative">
                主菜
                <span className="absolute -bottom-2 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent" />
              </h3>
            </div>

            <ul className="space-y-3 text-center">
              {mainCourses.map((dish, index) => (
                <li
                  key={index}
                  className={`py-2 border-b border-amber-100/60 last:border-0 transition-all duration-300 hover:bg-amber-50/50 rounded-lg ${dish.highlight
                    ? 'text-amber-800 font-semibold text-lg'
                    : 'text-gray-700'
                    }`}
                >
                  {dish.name}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* 備注 */}
        <div className="relative bg-gradient-to-br from-amber-100/80 to-orange-100/60 rounded-3xl shadow-xl p-6 border border-amber-200 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-200/20 via-transparent to-orange-200/20" />
          <div className="relative z-10">
            <div className="text-center text-amber-800">
              <p className="text-sm text-amber-700/80">
                配合季節變化，本公司保有菜單內容更改權益
              </p>
            </div>
          </div>
        </div>

        {/* 飲食注意事項 */}
        <div className="mt-8 relative bg-white/70 backdrop-blur-sm rounded-3xl p-6 border border-amber-100 shadow-lg">
          <h3 className="font-semibold text-amber-800 mb-4 flex items-center gap-2">
            <span className="text-2xl">💡</span>
            <span>飲食注意事項</span>
          </h3>
          <ul className="text-sm text-amber-700/90 space-y-3">
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 flex-shrink-0" />
              <span>如有食物過敏，請提前告知服務人員</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 flex-shrink-0" />
              <span>可提供素食選擇，請預先告知</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 flex-shrink-0" />
              <span>配合季節變化，本公司保有菜單內容更改權益</span>
            </li>
          </ul>
        </div>

        {/* 底部留白 */}
        <div className="h-8" />
      </div>
    </div>
  )
}
