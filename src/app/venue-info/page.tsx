'use client'

import { ArrowLeft, MapPin, Utensils, Users } from 'lucide-react'
import Link from 'next/link'

export default function VenueInfoPage() {

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 to-white">
      {/* 頂部導航 */}
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center">
          <Link href="/" className="p-2 -ml-2">
            <ArrowLeft className="w-6 h-6 text-gray-600" />
          </Link>
          <h1 className="text-xl font-bold text-gray-900 ml-2">會場資訊</h1>
        </div>
      </div>

      {/* 主要內容 */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* 歡迎訊息 */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            歡迎參加婚禮！
          </h2>
          <p className="text-gray-600">
            感謝您的參與！以下為婚禮會場相關資訊
          </p>
        </div>

        {/* 功能卡片 */}
        <div className="grid grid-cols-1 gap-4">
          {/* 交通資訊 */}
          <Link
            href="/venue-info/transport"
            className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-shadow"
          >
            <div className="flex items-start gap-4">
              <div className="p-3 bg-blue-100 rounded-xl">
                <MapPin className="w-6 h-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                  交通資訊
                </h3>
                <p className="text-sm text-gray-600">
                  會場位置、停車資訊、大眾運輸
                </p>
              </div>
            </div>
          </Link>

          {/* 菜單 */}
          <Link
            href="/venue-info/menu"
            className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-shadow"
          >
            <div className="flex items-start gap-4">
              <div className="p-3 bg-green-100 rounded-xl">
                <Utensils className="w-6 h-6 text-green-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                  菜單
                </h3>
                <p className="text-sm text-gray-600">
                  婚禮宴席菜單詳情
                </p>
              </div>
            </div>
          </Link>

          {/* 桌次 */}
          <Link
            href="/venue-info/table"
            className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-shadow"
          >
            <div className="flex items-start gap-4">
              <div className="p-3 bg-purple-100 rounded-xl">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                  桌次
                </h3>
                <p className="text-sm text-gray-600">
                  查看您的座位安排
                </p>
              </div>
            </div>
          </Link>
        </div>

        {/* 提示訊息 */}
        <div className="mt-8 bg-yellow-50 rounded-2xl p-6">
          <h3 className="font-semibold text-yellow-800 mb-2">
            💡 提示
          </h3>
          <ul className="text-sm text-yellow-700 space-y-2">
            <li>• 請提前 30 分鐘到達會場</li>
            <li>• 會場提供免費停車位</li>
            <li>• 如有任何問題，請聯繫現場工作人員</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
