'use client'

import { useState } from 'react'
import { Users, Search } from 'lucide-react'

interface Guest {
  line_id: string
  display_name: string
  table_number: string
}

export default function TablePage() {
  const [myTable, setMyTable] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [guests, setGuests] = useState<Guest[]>([])
  const [loading, setLoading] = useState(true)

  // TODO: 從資料庫載入用戶的桌次和其他賓客資訊
  // 這裡先使用模擬資料
  useState(() => {
    // 模擬載入用戶桌次
    setMyTable('A-1')

    // 模擬載入其他賓客資訊
    const mockGuests: Guest[] = [
      { line_id: '1', display_name: '張三', table_number: 'A-1' },
      { line_id: '2', display_name: '李四', table_number: 'A-1' },
      { line_id: '3', display_name: '王五', table_number: 'A-2' },
      { line_id: '4', display_name: '趙六', table_number: 'B-1' },
      { line_id: '5', display_name: '錢七', table_number: 'B-1' },
    ]
    setGuests(mockGuests)
    setLoading(false)
  })

  // 過濾賓客
  const filteredGuests = guests.filter(guest =>
    guest.display_name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // 按桌次分組
  const groupedGuests = filteredGuests.reduce((acc, guest) => {
    const table = guest.table_number
    if (!acc[table]) {
      acc[table] = []
    }
    acc[table].push(guest)
    return acc
  }, {} as Record<string, Guest[]>)

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white">
      {/* 頂部導航 */}
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <h1 className="text-xl font-bold text-gray-900">桌次</h1>
        </div>
      </div>

      {/* 主要內容 */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* 我的桌次 */}
        <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl shadow-lg p-6 mb-6 text-white">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 rounded-xl">
              <Users className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">您的桌次</h2>
              <p className="text-3xl font-bold mt-1">
                {myTable || '尚未安排'}
              </p>
            </div>
          </div>
        </div>

        {/* 搜尋其他賓客 */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            尋找其他賓客
          </h3>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="輸入姓名搜尋..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* 搜尋結果 */}
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">載入中...</p>
          </div>
        ) : searchQuery && filteredGuests.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <p className="text-gray-600">找不到符合的賓客</p>
          </div>
        ) : searchQuery ? (
          <div className="space-y-4">
            {filteredGuests.map((guest) => (
              <div
                key={guest.line_id}
                className="bg-white rounded-xl shadow-md p-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                    <span className="text-purple-600 font-semibold">
                      {guest.display_name[0]}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {guest.display_name}
                    </p>
                    <p className="text-sm text-gray-600">
                      桌次：{guest.table_number}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* 桌次列表 */
          <div className="space-y-4">
            {Object.entries(groupedGuests).map(([tableNumber, tableGuests]) => (
              <div
                key={tableNumber}
                className="bg-white rounded-2xl shadow-lg overflow-hidden"
              >
                <div className="bg-purple-600 px-6 py-3">
                  <h3 className="text-lg font-bold text-white">
                    桌次 {tableNumber}
                  </h3>
                  <p className="text-purple-200 text-sm">
                    {tableGuests.length} 位賓客
                  </p>
                </div>
                <div className="p-4 space-y-3">
                  {tableGuests.map((guest) => (
                    <div
                      key={guest.line_id}
                      className="flex items-center gap-3"
                    >
                      <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                        <span className="text-purple-600 font-semibold text-sm">
                          {guest.display_name[0]}
                        </span>
                      </div>
                      <span className="text-gray-900">
                        {guest.display_name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 提示訊息 */}
        <div className="mt-8 bg-yellow-50 rounded-2xl p-6">
          <h3 className="font-semibold text-yellow-800 mb-2">
            💡 提示
          </h3>
          <ul className="text-sm text-yellow-700 space-y-2">
            <li>• 請依照桌次入座</li>
            <li>• 如有特殊飲食需求，請告知服務人員</li>
            <li>• 桌次安排可能因實際情況調整</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
