import { NextResponse } from 'next/server';
import { createSupabaseAdmin } from '@/lib/supabase-admin';

// 用戶在線心跳 API
export async function POST(request: Request) {
  try {
    const { lineId } = await request.json();

    if (!lineId) {
      return NextResponse.json({ error: 'Line ID required' }, { status: 400 });
    }

    const supabase = createSupabaseAdmin();

    // 更新用戶的最後活躍時間
    const { error } = await supabase
      .from('users')
      .update({
        last_active_at: new Date().toISOString(),
        is_in_quiz_page: true,
        updated_at: new Date().toISOString()
      })
      .eq('line_id', lineId);

    if (error) {
      console.error('Error updating user heartbeat:', error);
      return NextResponse.json({ error: 'Failed to update heartbeat' }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Heartbeat error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// 用戶離開快問快答頁面
export async function DELETE(request: Request) {
  try {
    const { lineId } = await request.json();

    if (!lineId) {
      return NextResponse.json({ error: 'Line ID required' }, { status: 400 });
    }

    const supabase = createSupabaseAdmin();

    // 標記用戶離開快問快答頁面
    const { error } = await supabase
      .from('users')
      .update({
        is_in_quiz_page: false,
        updated_at: new Date().toISOString()
      })
      .eq('line_id', lineId);

    if (error) {
      console.error('Error updating user leave status:', error);
      return NextResponse.json({ error: 'Failed to update leave status' }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Leave status error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
