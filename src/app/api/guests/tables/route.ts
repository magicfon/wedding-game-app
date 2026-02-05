import { NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

export async function GET() {
    try {
        const supabase = createSupabaseAdmin()

        // 獲取所有不重複的桌次號碼，並按數字排序
        const { data: tables, error } = await supabase
            .from('guest_list')
            .select('table_number')
            .not('table_number', 'is', null)
            .order('table_number', { ascending: true })

        if (error) {
            console.error('Error fetching tables:', error)
            return NextResponse.json(
                { error: 'Failed to fetch tables' },
                { status: 500 }
            )
        }

        // 提取不重複的桌次號碼
        const uniqueTables = Array.from(
            new Set(tables.map((t: any) => t.table_number))
        )

        return NextResponse.json({ tables: uniqueTables })
    } catch (error) {
        console.error('Error in GET /api/guests/tables:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
