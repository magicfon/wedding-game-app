import { NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const nameQuery = searchParams.get('name')
        const tableQuery = searchParams.get('table')

        if (!nameQuery && !tableQuery) {
            return NextResponse.json({ guests: [] })
        }

        const supabase = createSupabaseAdmin()

        // 搜尋 guest_list
        let query = supabase
            .from('guest_list')
            .select('guest_name, table_number, notes, total_guests')

        if (nameQuery) {
            query = query.ilike('guest_name', `%${nameQuery}%`)
        }

        if (tableQuery) {
            query = query.eq('table_number', tableQuery)
        }

        const { data: guests, error } = await query.limit(50)

        if (error) {
            console.error('Error searching guest list:', error)
            return NextResponse.json(
                { error: 'Failed to search guests' },
                { status: 500 }
            )
        }

        return NextResponse.json({ guests })
    } catch (error) {
        console.error('Error in GET /api/guests/search:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
