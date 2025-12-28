import { NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

// GET: 獲取所有賓客資料 (含 LINE 用戶和手動名單)
export async function GET() {
    try {
        const supabase = createSupabaseAdmin()

        // 獲取 LINE 用戶
        const { data: users, error: usersError } = await supabase
            .from('users')
            .select('line_id, display_name, avatar_url, table_number')
            .order('created_at', { ascending: false })

        if (usersError) throw usersError

        // 獲取手動名單
        const { data: guests, error: guestsError } = await supabase
            .from('guest_list')
            .select('*')
            .order('created_at', { ascending: false })

        if (guestsError) throw guestsError

        return NextResponse.json({
            users: users || [],
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

// POST: 新增手動賓客
export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { name, table_number, notes } = body

        if (!name || !table_number) {
            return NextResponse.json(
                { error: 'Name and table number are required' },
                { status: 400 }
            )
        }

        const supabase = createSupabaseAdmin()

        const { data, error } = await supabase
            .from('guest_list')
            .insert({
                guest_name: name,
                table_number,
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

// PUT: 更新桌次 (支援 LINE 用戶和手動賓客)
export async function PUT(request: Request) {
    try {
        const body = await request.json()
        const { type, id, table_number, name, notes } = body

        if (!type || !id) {
            return NextResponse.json(
                { error: 'Type and ID are required' },
                { status: 400 }
            )
        }

        const supabase = createSupabaseAdmin()

        if (type === 'user') {
            // 更新 LINE 用戶
            const { error } = await supabase
                .from('users')
                .update({ table_number })
                .eq('line_id', id)

            if (error) throw error
        } else if (type === 'guest') {
            // 更新手動賓客
            const updates: any = { table_number }
            if (name) updates.guest_name = name
            if (notes !== undefined) updates.notes = notes

            const { error } = await supabase
                .from('guest_list')
                .update(updates)
                .eq('id', id)

            if (error) throw error
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

// DELETE: 刪除手動賓客
export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')

        if (!id) {
            return NextResponse.json(
                { error: 'ID is required' },
                { status: 400 }
            )
        }

        const supabase = createSupabaseAdmin()

        const { error } = await supabase
            .from('guest_list')
            .delete()
            .eq('id', id)

        if (error) throw error

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error in DELETE /api/admin/guests:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
