import { NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const lineId = searchParams.get('lineId')

        if (!lineId) {
            return NextResponse.json(
                { error: 'Missing lineId parameter' },
                { status: 400 }
            )
        }

        const supabase = createSupabaseAdmin()

        // 查詢 users 表格
        const { data: user, error } = await supabase
            .from('users')
            .select('table_number, display_name')
            .eq('line_id', lineId)
            .single()

        if (error) {
            // 如果找不到用戶，這不是錯誤，只是還沒資料
            if (error.code === 'PGRST116') {
                return NextResponse.json({ table_number: null })
            }

            console.error('Error fetching user table:', error)
            return NextResponse.json(
                { error: 'Failed to fetch user table info' },
                { status: 500 }
            )
        }

        return NextResponse.json({
            table_number: user?.table_number || null,
            display_name: user?.display_name
        })
    } catch (error) {
        console.error('Error in GET /api/guests/my-table:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
