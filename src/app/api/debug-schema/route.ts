
import { NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase-server'

export async function GET() {
    try {
        const supabase = createSupabaseAdmin()

        const { data, error } = await supabase
            .from('photos')
            .select('*')
            .limit(1)

        if (error) {
            return NextResponse.json({ error: error.message, details: error }, { status: 500 })
        }

        if (!data || data.length === 0) {
            return NextResponse.json({ message: 'No photos found' })
        }

        const photo = data[0]
        const columns = Object.keys(photo)

        const requiredColumns = [
            'thumbnail_url_template',
            'thumbnail_small_url',
            'thumbnail_medium_url',
            'thumbnail_large_url',
            'thumbnail_generated_at'
        ]

        const missingColumns = requiredColumns.filter(col => !columns.includes(col))

        return NextResponse.json({
            success: true,
            columns,
            missingColumns,
            hasAllColumns: missingColumns.length === 0
        })

    } catch (error) {
        return NextResponse.json({
            error: 'Server error',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 })
    }
}
