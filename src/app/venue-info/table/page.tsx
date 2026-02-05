'use client'

import { useState, useEffect } from 'react'
import { Users, Search, Loader2, ChevronDown } from 'lucide-react'
import { useLiff } from '@/hooks/useLiff'

interface Guest {
    guest_name: string
    table_number: string
    notes?: string
    total_guests?: number
}

export default function TablePage() {
    const { profile, isReady, isLoggedIn, login, loading: liffLoading } = useLiff()

    // 檢查登入狀態，未登入則觸發登入流程
    useEffect(() => {
        if (isReady && !liffLoading && !isLoggedIn) {
            // LIFF login 會自動導回當前頁面
            login()
        }
    }, [isReady, isLoggedIn, liffLoading, login])
    const [myTable, setMyTable] = useState<string | null>(null)
    const [myName, setMyName] = useState<string | null>(null)
    const [searchQuery, setSearchQuery] = useState('')
    const [searchResults, setSearchResults] = useState<Guest[]>([])
    const [loadingMyTable, setLoadingMyTable] = useState(true)
    const [searching, setSearching] = useState(false)
    const [searchMode, setSearchMode] = useState<'name' | 'table'>('name')
    const [availableTables, setAvailableTables] = useState<string[]>([])
    const [loadingTables, setLoadingTables] = useState(false)
    const [selectedTable, setSelectedTable] = useState<string>('')
    const [isDropdownOpen, setIsDropdownOpen] = useState(false)

    // 1. 載入用戶自己的桌次
    useEffect(() => {
        async function fetchMyTable() {
            if (!isReady || !profile?.userId) {
                setLoadingMyTable(false)
                return
            }

            try {
                const response = await fetch(`/api/guests/my-table?lineId=${profile.userId}`)
                const data = await response.json()

                if (data.table_number) {
                    setMyTable(data.table_number)
                    setMyName(data.display_name)
                }
            } catch (error) {
                console.error('Error fetching my table:', error)
            } finally {
                setLoadingMyTable(false)
            }
        }

        if (isReady) {
            fetchMyTable()
        }
    }, [isReady, profile])

    // 切換搜尋模式時清空查詢和結果
    const handleModeChange = (mode: 'name' | 'table') => {
        setSearchMode(mode)
        setSearchQuery('')
        setSelectedTable('')
        setSearchResults([])
        setIsDropdownOpen(false)
    }

    // 載入所有可用的桌次
    useEffect(() => {
        async function fetchTables() {
            setLoadingTables(true)
            try {
                const response = await fetch('/api/guests/tables')
                const data = await response.json()
                setAvailableTables(data.tables || [])
            } catch (error) {
                console.error('Error fetching tables:', error)
            } finally {
                setLoadingTables(false)
            }
        }

        fetchTables()
    }, [])

    // 2. 搜尋手動名單
    useEffect(() => {
        const delayDebounceFn = setTimeout(async () => {
            // 依姓名查詢：需要輸入文字
            if (searchMode === 'name') {
                if (!searchQuery.trim()) {
                    setSearchResults([])
                    return
                }

                setSearching(true)
                try {
                    const response = await fetch(`/api/guests/search?name=${encodeURIComponent(searchQuery)}`)
                    const data = await response.json()
                    setSearchResults(data.guests || [])
                } catch (error) {
                    console.error('Error searching guests:', error)
                } finally {
                    setSearching(false)
                }
            }
            // 依桌次查詢：使用下拉式選單選擇
            else if (searchMode === 'table') {
                if (!selectedTable) {
                    setSearchResults([])
                    return
                }

                setSearching(true)
                try {
                    const response = await fetch(`/api/guests/search?table=${encodeURIComponent(selectedTable)}`)
                    const data = await response.json()
                    setSearchResults(data.guests || [])
                } catch (error) {
                    console.error('Error searching guests:', error)
                } finally {
                    setSearching(false)
                }
            }
        }, 300)

        return () => clearTimeout(delayDebounceFn)
    }, [searchQuery, searchMode, selectedTable])

    // 載入中
    if (!isReady || liffLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
            </div>
        )
    }

    // 未登入不顯示內容
    if (!isLoggedIn) {
        return null
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white">
            {/* 頂部導航 */}
            <div className="bg-white shadow-sm sticky top-0 z-10">
                <div className="max-w-4xl mx-auto px-4 py-3">
                    <h1 className="text-xl font-bold text-gray-900">桌次查詢</h1>
                </div>
            </div>

            {/* 主要內容 */}
            <div className="max-w-4xl mx-auto px-4 py-8">

                {/* 如果正在載入 LINE 資料 */}
                {loadingMyTable && (
                    <div className="flex justify-center py-8">
                        <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
                    </div>
                )}

                {/* 用戶自己的桌次 (如果有找到) */}
                {!loadingMyTable && myTable && (
                    <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl shadow-lg p-6 mb-8 text-white relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
                        <div className="absolute bottom-0 left-0 w-24 h-24 bg-black/10 rounded-full -ml-12 -mb-12 blur-xl"></div>

                        <div className="relative z-10 flex items-center gap-4">
                            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                                <Users className="w-8 h-8" />
                            </div>
                            <div>
                                <h2 className="text-xl font-medium text-purple-100 mb-1">
                                    {myName ? `Hi, ${myName}` : '您的座位'}
                                </h2>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-lg text-purple-200">桌次</span>
                                    <span className="text-4xl font-bold shadow-sm">{myTable}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* 搜尋區域 (總是顯示) */}
                <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        查詢其他賓客桌次
                    </h3>

                    {/* 搜尋模式切換 Tab */}
                    <div className="flex mb-4 border-b border-gray-200">
                        <button
                            onClick={() => handleModeChange('name')}
                            className={`flex-1 py-2 px-4 text-center font-medium transition-colors ${searchMode === 'name'
                                ? 'text-purple-600 border-b-2 border-purple-600'
                                : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            依姓名查詢
                        </button>
                        <button
                            onClick={() => handleModeChange('table')}
                            className={`flex-1 py-2 px-4 text-center font-medium transition-colors ${searchMode === 'table'
                                ? 'text-purple-600 border-b-2 border-purple-600'
                                : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            依桌次查詢
                        </button>
                    </div>

                    <div className="relative">
                        {searchMode === 'name' ? (
                            // 依姓名查詢：維持輸入窗格
                            <>
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="輸入姓名搜尋 (例如: 志明)"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 bg-gray-50 focus:bg-white transition-colors"
                                />
                            </>
                        ) : (
                            // 依桌次查詢：改為下拉式選單
                            <div className="relative">
                                <button
                                    type="button"
                                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                    disabled={loadingTables}
                                    className="w-full pl-4 pr-10 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 bg-gray-50 focus:bg-white transition-colors flex items-center justify-between"
                                >
                                    <span className={selectedTable ? 'text-gray-900' : 'text-gray-400'}>
                                        {selectedTable ? `桌次 ${selectedTable}` : '選擇桌次號碼'}
                                    </span>
                                    {loadingTables ? (
                                        <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
                                    ) : (
                                        <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                                    )}
                                </button>

                                {/* 下拉式選單選項 */}
                                {isDropdownOpen && !loadingTables && (
                                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-20 max-h-60 overflow-y-auto">
                                        {availableTables.length === 0 ? (
                                            <div className="px-4 py-3 text-gray-500 text-center">
                                                無可用桌次
                                            </div>
                                        ) : (
                                            availableTables.map((table) => (
                                                <button
                                                    key={table}
                                                    type="button"
                                                    onClick={() => {
                                                        setSelectedTable(table)
                                                        setIsDropdownOpen(false)
                                                    }}
                                                    className={`w-full px-4 py-3 text-left hover:bg-purple-50 transition-colors ${selectedTable === table ? 'bg-purple-100 text-purple-700 font-medium' : 'text-gray-900'}`}
                                                >
                                                    桌次 {table}
                                                </button>
                                            ))
                                        )}
                                    </div>
                                )}

                                {/* 點擊外部關閉下拉式選單 */}
                                {isDropdownOpen && (
                                    <div
                                        className="fixed inset-0 z-10"
                                        onClick={() => setIsDropdownOpen(false)}
                                    />
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* 搜尋結果 */}
                {searching ? (
                    <div className="text-center py-8">
                        <Loader2 className="w-8 h-8 text-purple-600 animate-spin mx-auto" />
                        <p className="mt-2 text-gray-500 text-sm">搜尋中...</p>
                    </div>
                ) : (searchMode === 'name' && searchQuery) || (searchMode === 'table' && selectedTable) ? (
                    searchResults.length === 0 ? (
                        <div className="bg-white rounded-2xl shadow p-8 text-center border border-gray-100">
                            <p className="text-gray-500">
                                找不到符合「{searchMode === 'name' ? searchQuery : `桌次 ${selectedTable}`}」的賓客
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <div className="flex justify-between items-center px-2">
                                <h4 className="text-sm font-medium text-gray-500">搜尋結果 ({searchResults.length})</h4>
                            </div>
                            {searchResults.map((guest, index) => (
                                <div
                                    key={index}
                                    className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex items-center justify-between"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 font-bold">
                                            {guest.guest_name[0]}
                                        </div>
                                        <div>
                                            <p className="font-bold text-gray-900 text-lg flex items-center gap-2">
                                                {guest.guest_name}
                                                {guest.total_guests && guest.total_guests > 1 && (
                                                    <span className="text-xs font-normal bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full">
                                                        {guest.total_guests}人
                                                    </span>
                                                )}
                                            </p>
                                            {guest.notes && (
                                                <p className="text-xs text-gray-500 mt-0.5">{guest.notes}</p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className="block text-xs text-gray-400 mb-0.5">桌次</span>
                                        <span className="block text-xl font-bold text-purple-600 bg-purple-50 px-3 py-1 rounded-lg">
                                            {guest.table_number}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )
                ) : null}

                {/* 提示訊息 */}
                <div className="mt-8 bg-amber-50 rounded-2xl p-6 border border-amber-100">
                    <h3 className="font-semibold text-amber-800 mb-3 flex items-center gap-2">
                        💡 貼心提醒
                    </h3>
                    <ul className="text-sm text-amber-700 space-y-2 list-disc list-inside">
                        <li>請依照現場工作人員引導或桌次指示入座。</li>
                        <li>若查無您的桌次，請直接洽詢現場接待人員。</li>
                        <li>桌次安排可能因臨時狀況微調。</li>
                    </ul>
                </div>
            </div>
        </div>
    )
}
