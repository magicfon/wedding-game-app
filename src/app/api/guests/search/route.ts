import { NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const query = searchParams.get('name')

        if (!query) {
            return NextResponse.json({ guests: [] })
        }

        const supabase = createSupabaseAdmin()

        // 搜尋 guest_list
        const { data: guests, error } = await supabase
            .from('guest_list')
            .select('guest_name, table_number, notes')
            .ilike('guest_name', `%${query}%`)
            .limit(20)

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
