'use client'

import { ArrowLeft, Car } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'

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
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* 交通路線圖 */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden mb-6">
          <Image
            src="/transport/transport-info.jpg"
            alt="交通路線圖"
            width={800}
            height={1000}
            className="w-full h-auto"
            priority
          />
        </div>

        {/* 地圖 */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden mb-6">
          <Image
            src="/transport/transport-map.jpg"
            alt="會場地圖"
            width={800}
            height={800}
            className="w-full h-auto"
          />
        </div>

        {/* 停車場入口照片 */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden mb-6">
          <Image
            src="/transport/parking-entrance.jpg"
            alt="停車場入口"
            width={800}
            height={500}
            className="w-full h-auto"
          />
        </div>

        {/* 停車優惠資訊 */}
        <div className="bg-gradient-to-r from-amber-50 to-yellow-50 rounded-2xl p-6 border border-amber-200">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-amber-100 rounded-xl flex-shrink-0">
              <Car className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-amber-900 mb-2">
                停車優惠
              </h3>
              <p className="text-amber-800 leading-relaxed">
                B3-B6空間自由停放,於喜宴當日提供4小時停車券給賓客折抵~~
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
