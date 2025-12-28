'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import AdminLayout from '@/components/AdminLayout'
import {
    Search,
    Plus,
    Edit2,
    Trash2,
    Save,
    X,
    User,
    Smartphone,
    Users
} from 'lucide-react'

interface LineUser {
    line_id: string
    display_name: string
    avatar_url: string | null
    table_number: string | null
}

interface ManualGuest {
    id: number
    guest_name: string
    table_number: string
    notes: string | null
}

export default function GuestManagementPage() {
    const router = useRouter()
    const [activeTab, setActiveTab] = useState<'line' | 'manual'>('line')
    const [users, setUsers] = useState<LineUser[]>([])
    const [guests, setGuests] = useState<ManualGuest[]>([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')

    // 編輯狀態
    const [editingId, setEditingId] = useState<string | number | null>(null)
    const [editTable, setEditTable] = useState('')
    const [editName, setEditName] = useState('')
    const [editNotes, setEditNotes] = useState('')

    // 新增狀態
    const [showAddModal, setShowAddModal] = useState(false)
    const [newGuestName, setNewGuestName] = useState('')
    const [newGuestTable, setNewGuestTable] = useState('')
    const [newGuestNotes, setNewGuestNotes] = useState('')

    // 載入資料
    const fetchData = async () => {
        try {
            setLoading(true)
            const response = await fetch('/api/admin/guests')
            const data = await response.json()

            if (data.error) throw new Error(data.error)

            setUsers(data.users || [])
            setGuests(data.guests || [])
        } catch (error) {
            console.error('Error fetching guests:', error)
            alert('載入資料失敗')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchData()
    }, [])

    // 更新 LINE 用戶桌次
    const handleUpdateLineUser = async (user: LineUser) => {
        if (!editTable.trim()) {
            alert('請輸入桌次')
            return
        }

        try {
            const response = await fetch('/api/admin/guests', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'user',
                    id: user.line_id,
                    table_number: editTable.trim()
                })
            })

            if (response.ok) {
                setUsers(users.map(u =>
                    u.line_id === user.line_id ? { ...u, table_number: editTable.trim() } : u
                ))
                setEditingId(null)
            } else {
                alert('更新失敗')
            }
        } catch (error) {
            console.error('Error updating user:', error)
            alert('更新發生錯誤')
        }
    }

    // 更新手動賓客
    const handleUpdateGuest = async (guest: ManualGuest) => {
        if (!editName.trim() || !editTable.trim()) {
            alert('姓名和桌次為必填')
            return
        }

        try {
            const response = await fetch('/api/admin/guests', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'guest',
                    id: guest.id,
                    name: editName.trim(),
                    table_number: editTable.trim(),
                    notes: editNotes.trim()
                })
            })

            if (response.ok) {
                setGuests(guests.map(g =>
                    g.id === guest.id ? {
                        ...g,
                        guest_name: editName.trim(),
                        table_number: editTable.trim(),
                        notes: editNotes.trim()
                    } : g
                ))
                setEditingId(null)
            } else {
                alert('更新失敗')
            }
        } catch (error) {
            console.error('Error updating guest:', error)
            alert('更新發生錯誤')
        }
    }

    // 新增手動賓客
    const handleAddGuest = async () => {
        if (!newGuestName.trim() || !newGuestTable.trim()) {
            alert('姓名和桌次為必填')
            return
        }

        try {
            const response = await fetch('/api/admin/guests', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: newGuestName.trim(),
                    table_number: newGuestTable.trim(),
                    notes: newGuestNotes.trim()
                })
            })

            const data = await response.json()
            if (response.ok) {
                setGuests([data.guest, ...guests])
                setShowAddModal(false)
                setNewGuestName('')
                setNewGuestTable('')
                setNewGuestNotes('')
            } else {
                alert('新增失敗')
            }
        } catch (error) {
            console.error('Error adding guest:', error)
            alert('新增發生錯誤')
        }
    }

    // 刪除手動賓客
    const handleDeleteGuest = async (id: number) => {
        if (!confirm('確定要刪除這筆資料嗎？')) return

        try {
            const response = await fetch(`/api/admin/guests?id=${id}`, {
                method: 'DELETE'
            })

            if (response.ok) {
                setGuests(guests.filter(g => g.id !== id))
            } else {
                alert('刪除失敗')
            }
        } catch (error) {
            console.error('Error deleting guest:', error)
            alert('刪除發生錯誤')
        }
    }

    // 篩選資料
    const filteredUsers = users.filter(user =>
        user.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (user.table_number && user.table_number.toLowerCase().includes(searchQuery.toLowerCase()))
    )

    const filteredGuests = guests.filter(guest =>
        guest.guest_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        guest.table_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (guest.notes && guest.notes.toLowerCase().includes(searchQuery.toLowerCase()))
    )

    return (
        <AdminLayout title="賓客桌次管理">
            <div className="max-w-6xl mx-auto space-y-6">

                {/* 頂部操作區 */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-xl shadow-sm">
                    {/* 頁籤切換 */}
                    <div className="flex bg-gray-100 p-1 rounded-lg">
                        <button
                            onClick={() => setActiveTab('line')}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'line'
                                    ? 'bg-white text-purple-600 shadow-sm'
                                    : 'text-gray-600 hover:text-gray-900'
                                }`}
                        >
                            <span className="flex items-center gap-2">
                                <Smartphone className="w-4 h-4" />
                                LINE 用戶 ({users.length})
                            </span>
                        </button>
                        <button
                            onClick={() => setActiveTab('manual')}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'manual'
                                    ? 'bg-white text-purple-600 shadow-sm'
                                    : 'text-gray-600 hover:text-gray-900'
                                }`}
                        >
                            <span className="flex items-center gap-2">
                                <Users className="w-4 h-4" />
                                手動名單 ({guests.length})
                            </span>
                        </button>
                    </div>

                    <div className="flex gap-2 w-full md:w-auto">
                        {/* 搜尋框 */}
                        <div className="relative flex-1 md:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="搜尋姓名或桌次..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                            />
                        </div>

                        {/* 新增按鈕 (只在手動名單顯示) */}
                        {activeTab === 'manual' && (
                            <button
                                onClick={() => setShowAddModal(true)}
                                className="flex items-center gap-1 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm transition-colors"
                            >
                                <Plus className="w-4 h-4" />
                                新增賓客
                            </button>
                        )}
                    </div>
                </div>

                {/* 列表內容 */}
                <div className="bg-white rounded-xl shadow-sm overflow-hidden min-h-[400px]">
                    {loading ? (
                        <div className="flex justify-center items-center h-64">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                        </div>
                    ) : activeTab === 'line' ? (
                        // LINE 用戶列表
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50 text-gray-600 text-xs uppercase">
                                    <tr>
                                        <th className="px-6 py-4 font-medium">LINE 用戶</th>
                                        <th className="px-6 py-4 font-medium">桌次</th>
                                        <th className="px-6 py-4 font-medium text-right">操作</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {filteredUsers.length === 0 ? (
                                        <tr>
                                            <td colSpan={3} className="px-6 py-8 text-center text-gray-500">
                                                找不到符合的資料
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredUsers.map((user) => (
                                            <tr key={user.line_id} className="hover:bg-gray-50">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        {user.avatar_url ? (
                                                            <img src={user.avatar_url} alt={user.display_name} className="w-8 h-8 rounded-full" />
                                                        ) : (
                                                            <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-gray-500">
                                                                <User className="w-4 h-4" />
                                                            </div>
                                                        )}
                                                        <span className="font-medium text-gray-900">{user.display_name}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    {editingId === user.line_id ? (
                                                        <input
                                                            type="text"
                                                            value={editTable}
                                                            onChange={(e) => setEditTable(e.target.value)}
                                                            className="w-24 px-2 py-1 border border-purple-300 rounded focus:ring-2 focus:ring-purple-200"
                                                            placeholder="輸入桌次"
                                                            autoFocus
                                                        />
                                                    ) : (
                                                        <span className={`px-2 py-1 rounded text-sm ${user.table_number ? 'bg-purple-50 text-purple-700 font-medium' : 'text-gray-400 italic'}`}>
                                                            {user.table_number || '尚未設定'}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    {editingId === user.line_id ? (
                                                        <div className="flex justify-end gap-2">
                                                            <button
                                                                onClick={() => handleUpdateLineUser(user)}
                                                                className="p-1 text-green-600 hover:bg-green-50 rounded"
                                                            >
                                                                <Save className="w-5 h-5" />
                                                            </button>
                                                            <button
                                                                onClick={() => setEditingId(null)}
                                                                className="p-1 text-red-600 hover:bg-red-50 rounded"
                                                            >
                                                                <X className="w-5 h-5" />
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <button
                                                            onClick={() => {
                                                                setEditingId(user.line_id)
                                                                setEditTable(user.table_number || '')
                                                            }}
                                                            className="text-gray-400 hover:text-purple-600 transition-colors"
                                                        >
                                                            <Edit2 className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        // 手動名單列表
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50 text-gray-600 text-xs uppercase">
                                    <tr>
                                        <th className="px-6 py-4 font-medium">賓客姓名</th>
                                        <th className="px-6 py-4 font-medium">桌次</th>
                                        <th className="px-6 py-4 font-medium">備註 (搜尋關鍵字)</th>
                                        <th className="px-6 py-4 font-medium text-right">操作</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {filteredGuests.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                                                {guests.length === 0 ? '目前沒有手動名單資料，請點擊「新增賓客」' : '找不到符合的資料'}
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredGuests.map((guest) => (
                                            <tr key={guest.id} className="hover:bg-gray-50">
                                                <td className="px-6 py-4">
                                                    {editingId === guest.id ? (
                                                        <input
                                                            type="text"
                                                            value={editName}
                                                            onChange={(e) => setEditName(e.target.value)}
                                                            className="w-32 px-2 py-1 border border-purple-300 rounded"
                                                        />
                                                    ) : (
                                                        <span className="font-medium text-gray-900">{guest.guest_name}</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4">
                                                    {editingId === guest.id ? (
                                                        <input
                                                            type="text"
                                                            value={editTable}
                                                            onChange={(e) => setEditTable(e.target.value)}
                                                            className="w-24 px-2 py-1 border border-purple-300 rounded"
                                                        />
                                                    ) : (
                                                        <span className="bg-green-50 text-green-700 px-2 py-1 rounded text-sm font-medium">
                                                            {guest.table_number}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4">
                                                    {editingId === guest.id ? (
                                                        <input
                                                            type="text"
                                                            value={editNotes}
                                                            onChange={(e) => setEditNotes(e.target.value)}
                                                            className="w-full px-2 py-1 border border-purple-300 rounded"
                                                            placeholder="備註"
                                                        />
                                                    ) : (
                                                        <span className="text-gray-500 text-sm">{guest.notes || '-'}</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    {editingId === guest.id ? (
                                                        <div className="flex justify-end gap-2">
                                                            <button
                                                                onClick={() => handleUpdateGuest(guest)}
                                                                className="p-1 text-green-600 hover:bg-green-50 rounded"
                                                            >
                                                                <Save className="w-5 h-5" />
                                                            </button>
                                                            <button
                                                                onClick={() => setEditingId(null)}
                                                                className="p-1 text-red-600 hover:bg-red-50 rounded"
                                                            >
                                                                <X className="w-5 h-5" />
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <div className="flex justify-end gap-3">
                                                            <button
                                                                onClick={() => {
                                                                    setEditingId(guest.id)
                                                                    setEditName(guest.guest_name)
                                                                    setEditTable(guest.table_number)
                                                                    setEditNotes(guest.notes || '')
                                                                }}
                                                                className="text-gray-400 hover:text-purple-600 transition-colors"
                                                            >
                                                                <Edit2 className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteGuest(guest.id)}
                                                                className="text-gray-400 hover:text-red-600 transition-colors"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* 新增 Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in-95">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">新增賓客名單</h2>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    賓客姓名 <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={newGuestName}
                                    onChange={(e) => setNewGuestName(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                                    placeholder="請輸入姓名"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    桌次 <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={newGuestTable}
                                    onChange={(e) => setNewGuestTable(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                                    placeholder="例如: 主桌, A1, B2"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    備註
                                </label>
                                <input
                                    type="text"
                                    value={newGuestNotes}
                                    onChange={(e) => setNewGuestNotes(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                                    placeholder="可選填，將作為額外搜尋關鍵字"
                                />
                            </div>

                            <div className="flex gap-3 mt-6 pt-2">
                                <button
                                    onClick={() => setShowAddModal(false)}
                                    className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
                                >
                                    取消
                                </button>
                                <button
                                    onClick={handleAddGuest}
                                    className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors font-medium"
                                >
                                    確認新增
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </AdminLayout>
    )
}
