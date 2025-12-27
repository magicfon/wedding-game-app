'use client'

import { ArrowLeft, Car, Train, Bus } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'

export default function TransportPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white">
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
        {/* 停車優惠資訊 - 置頂醒目 */}
        <div className="bg-gradient-to-r from-red-500 via-orange-500 to-amber-500 rounded-2xl p-1 mb-6 shadow-xl animate-pulse">
          <div className="bg-white rounded-xl p-5">
            <div className="flex items-center justify-center gap-3 mb-3">
              <Car className="w-8 h-8 text-red-500" />
              <h3 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-amber-600">
                🚗 停車優惠 🚗
              </h3>
              <Car className="w-8 h-8 text-red-500" />
            </div>
            <p className="text-xl font-bold text-center text-gray-800 leading-relaxed">
              B3-B6空間自由停放<br />
              <span className="text-red-600">於喜宴當日提供4小時停車券給賓客折抵~~</span>
            </p>
          </div>
        </div>

        {/* 交通路線圖 - 標題 */}
        <h2 className="text-2xl font-bold text-amber-800 mb-6 text-center">交通路線圖</h2>

        {/* 開車前往 */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Car className="w-6 h-6 text-amber-600" />
            <h3 className="text-xl font-bold text-amber-700">開車前往</h3>
          </div>

          <div className="space-y-4">
            <div className="border-l-4 border-amber-400 pl-4">
              <h4 className="font-semibold text-amber-800 mb-2">南下的賓客</h4>
              <p className="text-gray-700">
                經國道一號下中山四路交流道 ▶ 右轉中山四路 ▶ 左轉林森四路即可抵達
              </p>
            </div>

            <div className="border-l-4 border-amber-400 pl-4">
              <h4 className="font-semibold text-amber-800 mb-2">北上的賓客</h4>
              <p className="text-gray-700">
                經台88線前往 ▶ 於2-鳳山出口下交流道 ▶ 左轉鳳頂路 ▶ 右轉中安路 ▶ 右轉中山四路 ▶ 左轉林森四路即可抵達
              </p>
            </div>
          </div>
        </div>

        {/* 大眾交通 */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Train className="w-6 h-6 text-amber-600" />
            <h3 className="text-xl font-bold text-amber-700">大眾交通</h3>
          </div>

          <div className="space-y-4">
            <div className="border-l-4 border-blue-400 pl-4">
              <h4 className="font-semibold text-amber-800 mb-2">公車</h4>
              <ul className="text-gray-700 space-y-2">
                <li>• 搭乘214、紅21、紅22號公車至圖書總館站 ▶ 往新光路直走 ▶ 中華五路右轉 ▶ 林森四路右轉</li>
                <li>• 搭乘70A、70B、70D、205、214號公車至新光路口(圖書總館) ▶ 往中華五路直走 ▶ 林森四路右轉</li>
              </ul>
            </div>

            <div className="border-l-4 border-green-400 pl-4">
              <h4 className="font-semibold text-amber-800 mb-2">捷運 / 左營高鐵站 / 高雄火車站</h4>
              <p className="text-gray-700">
                搭乘捷運至R8三多商圈站(1號出口) ▶ 往中山二路走 ▶ 林森四路右轉
              </p>
            </div>

            <div className="border-l-4 border-emerald-400 pl-4">
              <h4 className="font-semibold text-amber-800 mb-2">輕軌</h4>
              <p className="text-gray-700">
                搭乘輕軌至C8高雄展覽館站 ▶ 往成功二路走 ▶ 林森四路左轉
              </p>
            </div>
          </div>
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
      </div>
    </div>
  )
}
