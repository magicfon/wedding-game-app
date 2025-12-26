'use client'

import { ArrowLeft, MapPin, Car, Train, Navigation } from 'lucide-react'
import Link from 'next/link'

export default function TransportPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* 頂部導航 */}
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center">
          <Link href="/venue-info" className="p-2 -ml-2">
            <ArrowLeft className="w-6 h-6 text-gray-600" />
          </Link>
          <h1 className="text-xl font-bold text-gray-900 ml-2">交通資訊</h1>
        </div>
      </div>

      {/* 主要內容 */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* 會場位置 */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex items-start gap-4 mb-4">
            <div className="p-3 bg-blue-100 rounded-xl">
              <MapPin className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">會場位置</h2>
              <p className="text-gray-600 mt-1">婚禮會場地址</p>
            </div>
          </div>
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-lg font-medium text-gray-900">
              台北市信義區信義路五段7號
            </p>
            <p className="text-sm text-gray-600 mt-2">
              台北世界貿易中心
            </p>
          </div>
        </div>

        {/* 大眾運輸 */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex items-start gap-4 mb-4">
            <div className="p-3 bg-green-100 rounded-xl">
              <Train className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">大眾運輸</h2>
              <p className="text-gray-600 mt-1">捷運、公車資訊</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="border-l-4 border-green-500 pl-4">
              <h3 className="font-semibold text-gray-900 mb-1">捷運</h3>
              <p className="text-sm text-gray-600">
                搭乘捷運板南線至「台北世貿中心站」
              </p>
              <p className="text-sm text-gray-600">
                從 2 號出口步行約 5 分鐘
              </p>
            </div>

            <div className="border-l-4 border-blue-500 pl-4">
              <h3 className="font-semibold text-gray-900 mb-1">公車</h3>
              <p className="text-sm text-gray-600">
                可搭乘以下公車至「台北世貿中心」站：
              </p>
              <ul className="text-sm text-gray-600 mt-2 space-y-1 list-disc list-inside">
                <li>235、277、信義幹線</li>
                <li>紅 32、藍 28</li>
              </ul>
            </div>
          </div>
        </div>

        {/* 停車資訊 */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex items-start gap-4 mb-4">
            <div className="p-3 bg-purple-100 rounded-xl">
              <Car className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">停車資訊</h2>
              <p className="text-gray-600 mt-1">免費停車位</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-purple-50 rounded-xl p-4">
              <h3 className="font-semibold text-gray-900 mb-2">停車場位置</h3>
              <p className="text-sm text-gray-600">
                台北世界貿易中心地下停車場
              </p>
            </div>

            <div className="bg-purple-50 rounded-xl p-4">
              <h3 className="font-semibold text-gray-900 mb-2">停車費用</h3>
              <p className="text-sm text-gray-600">
                婚禮當日免費停車
              </p>
              <p className="text-sm text-gray-600 mt-1">
                請向櫃檯出示婚禮邀請函
              </p>
            </div>

            <div className="bg-purple-50 rounded-xl p-4">
              <h3 className="font-semibold text-gray-900 mb-2">停車場入口</h3>
              <p className="text-sm text-gray-600">
                信義路五段主入口
              </p>
            </div>
          </div>
        </div>

        {/* 導航提示 */}
        <div className="bg-yellow-50 rounded-2xl p-6">
          <div className="flex items-start gap-3">
            <Navigation className="w-6 h-6 text-yellow-600 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-yellow-800 mb-2">
                導航提示
              </h3>
              <ul className="text-sm text-yellow-700 space-y-2">
                <li>• 建議使用 Google Maps 或其他導航 App</li>
                <li>• 搜尋「台北世界貿易中心」</li>
                <li>• 預留額外時間找尋停車位</li>
                <li>• 如遇交通管制，請依現場指示</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
