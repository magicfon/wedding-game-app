import { NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

// GET: 獲取所有賓客資料 (含 LINE 用戶和手動名單)
export async function GET() {
    try {
        const supabase = createSupabaseAdmin()

        // 獲取 LINE 用戶 (全部欄位)
        const { data: users, error: usersError } = await supabase
            .from('users')
            .select('*')
            .order('created_at', { ascending: false })

        if (usersError) throw usersError

        // 獲取管理員資料以取得 admin_level
        const { data: adminData } = await supabase
            .from('admin_line_ids')
            .select('line_id, admin_level, is_active')
            .eq('is_active', true)

        // 將 admin_level 合併到用戶資料中
        const adminMap = new Map(
            (adminData || []).map(admin => [admin.line_id, admin.admin_level])
        )
        const usersWithAdminLevel = (users || []).map(user => ({
            ...user,
            admin_level: user.is_admin ? (adminMap.get(user.line_id) || 'event') : null
        }))

        // 獲取手動名單
        const { data: guests, error: guestsError } = await supabase
            .from('guest_list')
            .select('*')
            .order('created_at', { ascending: false })

        if (guestsError) throw guestsError

        return NextResponse.json({
            users: usersWithAdminLevel,
            guests: guests || []
        })
    } catch (error) {
        console.error('Error in GET /api/admin/guests:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

// POST: 新增手動賓客 (支援單筆或批量)
export async function POST(request: Request) {
    try {
        const body = await request.json()
        const supabase = createSupabaseAdmin()

        // 批量新增
        if (body.guests && Array.isArray(body.guests)) {
            const validGuests = body.guests
                .filter((g: any) => g.name && g.table_number)
                .map((g: any) => {
                    const adultsNum = parseInt(g.adults) || 0
                    const childrenNum = parseInt(g.children) || 0
                    const vegetarianNum = parseInt(g.vegetarian) || 0
                    // 大人可為0，但大人+素食大人不得為0，若都為0則預設大人=1
                    const finalAdults = (adultsNum + vegetarianNum === 0) ? 1 : adultsNum
                    return {
                        guest_name: g.name.trim(),
                        table_number: g.table_number.trim(),
                        adults: finalAdults,
                        children: childrenNum,
                        vegetarian: vegetarianNum,
                        total_guests: finalAdults + childrenNum + vegetarianNum,
                        notes: g.notes?.trim() || null
                    }
                })

            if (validGuests.length === 0) {
                return NextResponse.json(
                    { error: 'No valid guests to import' },
                    { status: 400 }
                )
            }

            const { data, error } = await supabase
                .from('guest_list')
                .insert(validGuests)
                .select()

            if (error) throw error

            return NextResponse.json({
                success: true,
                imported: data?.length || 0,
                guests: data
            })
        }

        // 單筆新增
        const { name, table_number, adults, children, vegetarian, total_guests, notes } = body

        if (!name || !table_number) {
            return NextResponse.json(
                { error: 'Name and table number are required' },
                { status: 400 }
            )
        }

        const adultsNum = parseInt(adults) || 0
        const childrenNum = parseInt(children) || 0
        const vegetarianNum = parseInt(vegetarian) || 0
        // 大人可為0，但大人+素食大人不得為0
        const finalAdults = (adultsNum + vegetarianNum === 0) ? 1 : adultsNum

        const { data, error } = await supabase
            .from('guest_list')
            .insert({
                guest_name: name,
                table_number,
                adults: finalAdults,
                children: childrenNum,
                vegetarian: vegetarianNum,
                total_guests: finalAdults + childrenNum + vegetarianNum,
                notes
            })
            .select()
            .single()

        if (error) throw error

        return NextResponse.json({ success: true, guest: data })
    } catch (error) {
        console.error('Error in POST /api/admin/guests:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

// PUT: 更新用戶資料 (支援 LINE 用戶和手動賓客)
export async function PUT(request: Request) {
    try {
        const body = await request.json()
        const { type, id, table_number, name, notes, display_name, is_active, total_score, linked_guest_id } = body

        if (!type || !id) {
            return NextResponse.json(
                { error: 'Type and ID are required' },
                { status: 400 }
            )
        }

        const supabase = createSupabaseAdmin()

        if (type === 'user') {
            // 更新 LINE 用戶 - 支援多個欄位
            const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
            if (table_number !== undefined) updates.table_number = table_number
            if (display_name !== undefined) updates.display_name = display_name
            if (is_active !== undefined) updates.is_active = is_active
            if (total_score !== undefined) updates.total_score = parseInt(total_score) || 0

            // 處理賓客連結
            if (linked_guest_id !== undefined) {
                updates.linked_guest_id = linked_guest_id || null

                // 如果選擇了賓客，自動同步桌次
                if (linked_guest_id) {
                    const { data: guestData } = await supabase
                        .from('guest_list')
                        .select('table_number')
                        .eq('id', linked_guest_id)
                        .single()

                    if (guestData?.table_number) {
                        updates.table_number = guestData.table_number
                    }
                }
            }

            const { error } = await supabase
                .from('users')
                .update(updates)
                .eq('line_id', id)

            if (error) throw error
        } else if (type === 'guest') {
            // 更新手動賓客
            const updates: any = { table_number }
            if (name) updates.guest_name = name
            if (body.adults !== undefined) updates.adults = parseInt(body.adults) || 0
            if (body.children !== undefined) updates.children = parseInt(body.children) || 0
            if (body.vegetarian !== undefined) updates.vegetarian = parseInt(body.vegetarian) || 0
            if (body.total_guests !== undefined) updates.total_guests = parseInt(body.total_guests) || 0
            if (notes !== undefined) updates.notes = notes

            const { error } = await supabase
                .from('guest_list')
                .update(updates)
                .eq('id', id)

            if (error) throw error

            // 同步更新所有連結到此賓客的 LINE 用戶桌次
            if (table_number !== undefined) {
                const { error: syncError } = await supabase
                    .from('users')
                    .update({
                        table_number,
                        updated_at: new Date().toISOString()
                    })
                    .eq('linked_guest_id', id)

                if (syncError) {
                    console.error('Error syncing linked users:', syncError)
                    // 不阻擋主要操作，只記錄錯誤
                }
            }
        } else {
            return NextResponse.json(
                { error: 'Invalid type' },
                { status: 400 }
            )
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error in PUT /api/admin/guests:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

// DELETE: 刪除賓客 (支援 LINE 用戶和手動賓客)
export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')
        const type = searchParams.get('type') || 'guest' // 預設為 guest

        if (!id) {
            return NextResponse.json(
                { error: 'ID is required' },
                { status: 400 }
            )
        }

        const supabase = createSupabaseAdmin()

        if (type === 'user') {
            // 刪除 LINE 用戶
            const { error } = await supabase
                .from('users')
                .delete()
                .eq('line_id', id)

            if (error) throw error
        } else {
            // 刪除手動賓客
            const { error } = await supabase
                .from('guest_list')
                .delete()
                .eq('id', id)

            if (error) throw error
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error in DELETE /api/admin/guests:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
