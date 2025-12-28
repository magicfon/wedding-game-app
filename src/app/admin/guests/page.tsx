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
    Users,
    Upload,
    FileText,
    AlertCircle
} from 'lucide-react'

interface LineUser {
    line_id: string
    display_name: string
    avatar_url: string | null
    table_number: string | null
    total_score: number
    is_active: boolean
    join_time: string | null
    created_at: string | null
}

interface ManualGuest {
    id: number
    guest_name: string
    table_number: string
    adults: number
    children: number
    total_guests: number
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
    const [editDisplayName, setEditDisplayName] = useState('')
    const [editIsActive, setEditIsActive] = useState(true)
    const [editAdults, setEditAdults] = useState(1)
    const [editChildren, setEditChildren] = useState(0)
    const [editNotes, setEditNotes] = useState('')

    // 新增狀態
    const [showAddModal, setShowAddModal] = useState(false)
    const [newGuestName, setNewGuestName] = useState('')
    const [newGuestTable, setNewGuestTable] = useState('')
    const [newGuestAdults, setNewGuestAdults] = useState(1)
    const [newGuestChildren, setNewGuestChildren] = useState(0)
    const [newGuestNotes, setNewGuestNotes] = useState('')

    // CSV 匯入狀態
    const [showImportModal, setShowImportModal] = useState(false)
    const [csvData, setCsvData] = useState<{ name: string, table_number: string, adults: number, children: number, total_guests: number, notes: string }[]>([])
    const [csvError, setCsvError] = useState('')
    const [importing, setImporting] = useState(false)

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

    // 更新 LINE 用戶資料
    const handleUpdateLineUser = async (user: LineUser) => {
        try {
            const response = await fetch('/api/admin/guests', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'user',
                    id: user.line_id,
                    table_number: editTable.trim() || null,
                    display_name: editDisplayName.trim() || user.display_name,
                    is_active: editIsActive
                })
            })

            if (response.ok) {
                setUsers(users.map(u =>
                    u.line_id === user.line_id ? {
                        ...u,
                        table_number: editTable.trim() || null,
                        display_name: editDisplayName.trim() || u.display_name,
                        is_active: editIsActive
                    } : u
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

    // 刪除 LINE 用戶
    const handleDeleteLineUser = async (user: LineUser) => {
        if (!confirm(`確定要刪除用戶「${user.display_name}」嗎？此操作無法復原。`)) return

        try {
            const response = await fetch(`/api/admin/guests?id=${user.line_id}&type=user`, {
                method: 'DELETE'
            })

            if (response.ok) {
                setUsers(users.filter(u => u.line_id !== user.line_id))
            } else {
                alert('刪除失敗')
            }
        } catch (error) {
            console.error('Error deleting user:', error)
            alert('刪除發生錯誤')
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
                    adults: editAdults,
                    children: editChildren,
                    total_guests: editAdults + editChildren,
                    notes: editNotes.trim()
                })
            })

            if (response.ok) {
                setGuests(guests.map(g =>
                    g.id === guest.id ? {
                        ...g,
                        guest_name: editName.trim(),
                        table_number: editTable.trim(),
                        adults: editAdults,
                        children: editChildren,
                        total_guests: editAdults + editChildren,
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
                    adults: newGuestAdults,
                    children: newGuestChildren,
                    total_guests: newGuestAdults + newGuestChildren,
                    notes: newGuestNotes.trim()
                })
            })

            const data = await response.json()
            if (response.ok) {
                setGuests([data.guest, ...guests])
                setShowAddModal(false)
                setNewGuestName('')
                setNewGuestTable('')
                setNewGuestAdults(1)
                setNewGuestChildren(0)
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

    // CSV 解析
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setCsvError('')
        setCsvData([])

        const reader = new FileReader()
        reader.onload = (event) => {
            try {
                const text = event.target?.result as string
                const lines = text.split(/\r?\n/).filter(line => line.trim())

                if (lines.length < 2) {
                    setCsvError('CSV 檔案至少需要標題行和一筆資料')
                    return
                }

                // 解析標題行
                const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
                const nameIdx = headers.findIndex(h => h.includes('name') || h.includes('姓名') || h.includes('名字'))
                const tableIdx = headers.findIndex(h => h.includes('table') || h.includes('桌') || h.includes('座位'))
                const adultsIdx = headers.findIndex(h => h.includes('adult') || h.includes('大人'))
                const childrenIdx = headers.findIndex(h => h.includes('child') || h.includes('小孩') || h.includes('兒童'))
                const totalIdx = headers.findIndex(h => h.includes('total') || h.includes('總') || h.includes('人數'))
                const notesIdx = headers.findIndex(h => h.includes('notes') || h.includes('備註') || h.includes('note'))

                if (nameIdx === -1 || tableIdx === -1) {
                    setCsvError('CSV 需包含「姓名」和「桌次」欄位 (name/姓名, table/桌次)')
                    return
                }

                // 解析資料行
                const parsedData = []
                for (let i = 1; i < lines.length; i++) {
                    const values = lines[i].split(',')
                    const name = values[nameIdx]?.trim()
                    const table_number = values[tableIdx]?.trim()
                    const adults = adultsIdx !== -1 ? parseInt(values[adultsIdx]?.trim()) || 1 : 1
                    const children = childrenIdx !== -1 ? parseInt(values[childrenIdx]?.trim()) || 0 : 0
                    const total_guests = totalIdx !== -1 ? parseInt(values[totalIdx]?.trim()) || (adults + children) : (adults + children)
                    const notes = notesIdx !== -1 ? values[notesIdx]?.trim() || '' : ''

                    if (name && table_number) {
                        parsedData.push({ name, table_number, adults, children, total_guests, notes })
                    }
                }

                if (parsedData.length === 0) {
                    setCsvError('CSV 中沒有有效的資料行')
                    return
                }

                setCsvData(parsedData)
            } catch (err) {
                setCsvError('CSV 解析失敗，請確認格式正確')
            }
        }
        reader.readAsText(file)
    }

    // CSV 匯入
    const handleImportCSV = async () => {
        if (csvData.length === 0) return

        setImporting(true)
        try {
            const response = await fetch('/api/admin/guests', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ guests: csvData })
            })

            const data = await response.json()
            if (response.ok) {
                alert(`成功匯入 ${data.imported} 筆賓客資料！`)
                setShowImportModal(false)
                setCsvData([])
                fetchData() // 重新載入
            } else {
                setCsvError(data.error || '匯入失敗')
            }
        } catch (error) {
            setCsvError('匯入發生錯誤')
        } finally {
            setImporting(false)
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
        <AdminLayout title="用戶管理">
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
                            <>
                                <button
                                    onClick={() => setShowImportModal(true)}
                                    className="flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm transition-colors"
                                >
                                    <Upload className="w-4 h-4" />
                                    匯入 CSV
                                </button>
                                <button
                                    onClick={() => setShowAddModal(true)}
                                    className="flex items-center gap-1 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm transition-colors"
                                >
                                    <Plus className="w-4 h-4" />
                                    新增賓客
                                </button>
                            </>
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
                                        <th className="px-4 py-4 font-medium">用戶</th>
                                        <th className="px-4 py-4 font-medium">桌次</th>
                                        <th className="px-4 py-4 font-medium text-center">積分</th>
                                        <th className="px-4 py-4 font-medium text-center">狀態</th>
                                        <th className="px-4 py-4 font-medium">加入時間</th>
                                        <th className="px-4 py-4 font-medium text-right">操作</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {filteredUsers.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                                                找不到符合的資料
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredUsers.map((user) => (
                                            <tr key={user.line_id} className={`hover:bg-gray-50 ${!user.is_active ? 'opacity-50' : ''}`}>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-3">
                                                        {user.avatar_url ? (
                                                            <img src={user.avatar_url} alt={user.display_name} className="w-8 h-8 rounded-full" />
                                                        ) : (
                                                            <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-gray-500">
                                                                <User className="w-4 h-4" />
                                                            </div>
                                                        )}
                                                        <div>
                                                            {editingId === user.line_id ? (
                                                                <input
                                                                    type="text"
                                                                    value={editDisplayName}
                                                                    onChange={(e) => setEditDisplayName(e.target.value)}
                                                                    className="w-28 px-2 py-1 border border-purple-300 rounded text-sm"
                                                                    placeholder="顯示名稱"
                                                                />
                                                            ) : (
                                                                <span className="font-medium text-gray-900">{user.display_name}</span>
                                                            )}
                                                            <div className="text-xs text-gray-400 truncate max-w-[120px]" title={user.line_id}>
                                                                {user.line_id.substring(0, 12)}...
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    {editingId === user.line_id ? (
                                                        <input
                                                            type="text"
                                                            value={editTable}
                                                            onChange={(e) => setEditTable(e.target.value)}
                                                            className="w-20 px-2 py-1 border border-purple-300 rounded text-sm"
                                                            placeholder="桌次"
                                                        />
                                                    ) : (
                                                        <span className={`px-2 py-1 rounded text-sm ${user.table_number ? 'bg-purple-50 text-purple-700 font-medium' : 'text-gray-400 italic'}`}>
                                                            {user.table_number || '未設定'}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <span className="font-bold text-amber-600">{user.total_score || 0}</span>
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    {editingId === user.line_id ? (
                                                        <button
                                                            onClick={() => setEditIsActive(!editIsActive)}
                                                            className={`px-2 py-1 rounded text-xs font-medium ${editIsActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
                                                        >
                                                            {editIsActive ? '啟用' : '停用'}
                                                        </button>
                                                    ) : (
                                                        <span className={`px-2 py-1 rounded text-xs font-medium ${user.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                            {user.is_active ? '啟用' : '停用'}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-500">
                                                    {user.join_time ? new Date(user.join_time).toLocaleDateString('zh-TW') : '-'}
                                                </td>
                                                <td className="px-4 py-3 text-right">
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
                                                        <div className="flex justify-end gap-3">
                                                            <button
                                                                onClick={() => {
                                                                    setEditingId(user.line_id)
                                                                    setEditTable(user.table_number || '')
                                                                    setEditDisplayName(user.display_name)
                                                                    setEditIsActive(user.is_active)
                                                                }}
                                                                className="text-gray-400 hover:text-purple-600 transition-colors"
                                                            >
                                                                <Edit2 className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteLineUser(user)}
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
                    ) : (
                        // 手動名單列表
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50 text-gray-600 text-xs uppercase">
                                    <tr>
                                        <th className="px-4 py-4 font-medium">賓客姓名</th>
                                        <th className="px-4 py-4 font-medium">桌次</th>
                                        <th className="px-4 py-4 font-medium text-center">大人</th>
                                        <th className="px-4 py-4 font-medium text-center">小孩</th>
                                        <th className="px-4 py-4 font-medium text-center">總人數</th>
                                        <th className="px-4 py-4 font-medium">備註</th>
                                        <th className="px-4 py-4 font-medium text-right">操作</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {filteredGuests.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                                                {guests.length === 0 ? '目前沒有手動名單資料，請點擊「新增賓客」' : '找不到符合的資料'}
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredGuests.map((guest) => (
                                            <tr key={guest.id} className="hover:bg-gray-50">
                                                <td className="px-4 py-3">
                                                    {editingId === guest.id ? (
                                                        <input
                                                            type="text"
                                                            value={editName}
                                                            onChange={(e) => setEditName(e.target.value)}
                                                            className="w-28 px-2 py-1 border border-purple-300 rounded text-sm"
                                                        />
                                                    ) : (
                                                        <span className="font-medium text-gray-900">{guest.guest_name}</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3">
                                                    {editingId === guest.id ? (
                                                        <input
                                                            type="text"
                                                            value={editTable}
                                                            onChange={(e) => setEditTable(e.target.value)}
                                                            className="w-16 px-2 py-1 border border-purple-300 rounded text-sm"
                                                        />
                                                    ) : (
                                                        <span className="bg-green-50 text-green-700 px-2 py-1 rounded text-sm font-medium">
                                                            {guest.table_number}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    {editingId === guest.id ? (
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            value={editAdults}
                                                            onChange={(e) => setEditAdults(parseInt(e.target.value) || 0)}
                                                            className="w-14 px-2 py-1 border border-purple-300 rounded text-sm text-center"
                                                        />
                                                    ) : (
                                                        <span className="text-gray-700">{guest.adults || 1}</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    {editingId === guest.id ? (
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            value={editChildren}
                                                            onChange={(e) => setEditChildren(parseInt(e.target.value) || 0)}
                                                            className="w-14 px-2 py-1 border border-purple-300 rounded text-sm text-center"
                                                        />
                                                    ) : (
                                                        <span className="text-gray-700">{guest.children || 0}</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <span className="font-bold text-purple-700">{guest.total_guests || ((guest.adults || 1) + (guest.children || 0))}</span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    {editingId === guest.id ? (
                                                        <input
                                                            type="text"
                                                            value={editNotes}
                                                            onChange={(e) => setEditNotes(e.target.value)}
                                                            className="w-24 px-2 py-1 border border-purple-300 rounded text-sm"
                                                            placeholder="備註"
                                                        />
                                                    ) : (
                                                        <span className="text-gray-500 text-sm">{guest.notes || '-'}</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-right">
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
                                                                    setEditAdults(guest.adults || 1)
                                                                    setEditChildren(guest.children || 0)
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

                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        大人人數
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={newGuestAdults}
                                        onChange={(e) => setNewGuestAdults(parseInt(e.target.value) || 0)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                                    />
                                </div>
                                <div className="flex-1">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        小孩人數
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={newGuestChildren}
                                        onChange={(e) => setNewGuestChildren(parseInt(e.target.value) || 0)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                                    />
                                </div>
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

            {/* CSV 匯入 Modal */}
            {showImportModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold text-gray-900">匯入 CSV 賓客名單</h2>
                            <button
                                onClick={() => {
                                    setShowImportModal(false)
                                    setCsvData([])
                                    setCsvError('')
                                }}
                                className="p-1 hover:bg-gray-100 rounded"
                            >
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>

                        {/* 說明 */}
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                            <div className="flex items-start gap-2">
                                <FileText className="w-5 h-5 text-blue-600 mt-0.5" />
                                <div className="text-sm text-blue-800">
                                    <p className="font-medium mb-1">CSV 格式說明</p>
                                    <p>請上傳包含以下欄位的 CSV 檔案：</p>
                                    <ul className="list-disc list-inside mt-1 space-y-0.5">
                                        <li><strong>姓名</strong> (必填)：name 或 姓名</li>
                                        <li><strong>桌次</strong> (必填)：table 或 桌次</li>
                                        <li><strong>大人</strong> (選填)：adult 或 大人</li>
                                        <li><strong>小孩</strong> (選填)：child 或 小孩</li>
                                        <li><strong>總人數</strong> (選填)：total 或 人數</li>
                                        <li><strong>備註</strong> (選填)：notes 或 備註</li>
                                    </ul>
                                </div>
                            </div>
                        </div>

                        {/* 上傳區域 */}
                        <div className="mb-4">
                            <input
                                type="file"
                                accept=".csv"
                                onChange={handleFileChange}
                                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100 cursor-pointer"
                            />
                        </div>

                        {/* 錯誤訊息 */}
                        {csvError && (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 flex items-center gap-2">
                                <AlertCircle className="w-5 h-5 text-red-600" />
                                <span className="text-sm text-red-700">{csvError}</span>
                            </div>
                        )}

                        {/* 預覽 */}
                        {csvData.length > 0 && (
                            <div className="mb-4">
                                <h3 className="text-sm font-medium text-gray-700 mb-2">
                                    預覽 ({csvData.length} 筆資料, 共 {csvData.reduce((sum, r) => sum + r.total_guests, 0)} 人)
                                </h3>
                                <div className="border rounded-lg overflow-hidden max-h-64 overflow-y-auto">
                                    <table className="w-full text-sm">
                                        <thead className="bg-gray-50 sticky top-0">
                                            <tr>
                                                <th className="px-2 py-2 text-left font-medium text-gray-600">姓名</th>
                                                <th className="px-2 py-2 text-left font-medium text-gray-600">桌次</th>
                                                <th className="px-2 py-2 text-center font-medium text-gray-600">大人</th>
                                                <th className="px-2 py-2 text-center font-medium text-gray-600">小孩</th>
                                                <th className="px-2 py-2 text-center font-medium text-gray-600">總人數</th>
                                                <th className="px-2 py-2 text-left font-medium text-gray-600">備註</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {csvData.slice(0, 20).map((row, idx) => (
                                                <tr key={idx}>
                                                    <td className="px-2 py-2 text-gray-900">{row.name}</td>
                                                    <td className="px-2 py-2 text-gray-900">{row.table_number}</td>
                                                    <td className="px-2 py-2 text-center text-gray-700">{row.adults}</td>
                                                    <td className="px-2 py-2 text-center text-gray-700">{row.children}</td>
                                                    <td className="px-2 py-2 text-center font-bold text-purple-700">{row.total_guests}</td>
                                                    <td className="px-2 py-2 text-gray-500">{row.notes || '-'}</td>
                                                </tr>
                                            ))}
                                            {csvData.length > 20 && (
                                                <tr>
                                                    <td colSpan={6} className="px-3 py-2 text-center text-gray-500 italic">
                                                        ...還有 {csvData.length - 20} 筆資料
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* 按鈕 */}
                        <div className="flex gap-3 pt-2">
                            <button
                                onClick={() => {
                                    setShowImportModal(false)
                                    setCsvData([])
                                    setCsvError('')
                                }}
                                className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
                            >
                                取消
                            </button>
                            <button
                                onClick={handleImportCSV}
                                disabled={csvData.length === 0 || importing}
                                className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium"
                            >
                                {importing ? '匯入中...' : `確認匯入 (${csvData.length} 筆)`}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AdminLayout>
    )
}
