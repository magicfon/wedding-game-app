import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase-server'

// 檢查請求者是否為管理員
async function checkAdminPermission(requesterLineId: string, supabase: any) {
  // 允許管理後台呼叫 (管理後台已有自己的認證機制)
  if (requesterLineId === 'admin') {
    return true
  }

  const { data } = await supabase
    .from('admin_line_ids')
    .select('line_id')
    .eq('line_id', requesterLineId)
    .eq('is_active', true)
    .single()

  return !!data
}

// 獲取所有管理員
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const requesterLineId = url.searchParams.get('requester')

    if (!requesterLineId) {
      return NextResponse.json({ error: 'Requester Line ID required' }, { status: 400 })
    }

    const supabase = await createSupabaseServer()

    // 檢查權限
    const hasPermission = await checkAdminPermission(requesterLineId, supabase)
    if (!hasPermission) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // 獲取所有管理員
    const { data: admins, error } = await supabase
      .from('admin_line_ids')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ admins })

  } catch (error) {
    console.error('Get admins error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// 添加新管理員
export async function POST(request: NextRequest) {
  try {
    const { requesterLineId, newAdminLineId, displayName, notes } = await request.json()

    if (!requesterLineId || !newAdminLineId) {
      return NextResponse.json({ error: 'Required fields missing' }, { status: 400 })
    }

    const supabase = await createSupabaseServer()

    // 檢查權限
    const hasPermission = await checkAdminPermission(requesterLineId, supabase)
    if (!hasPermission) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // 檢查是否已存在該管理員記錄（包含已停用的）
    const { data: existingAdmin } = await supabase
      .from('admin_line_ids')
      .select('*')
      .eq('line_id', newAdminLineId)
      .single()

    let resultAdmin
    if (existingAdmin) {
      // 如果已存在，重新啟用並更新資料
      const { data: updatedAdmin, error: updateError } = await supabase
        .from('admin_line_ids')
        .update({
          is_active: true,
          display_name: displayName || existingAdmin.display_name,
          notes: notes || existingAdmin.notes
        })
        .eq('line_id', newAdminLineId)
        .select()
        .single()

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 })
      }
      resultAdmin = updatedAdmin
    } else {
      // 新增管理員
      const { data: newAdmin, error } = await supabase
        .from('admin_line_ids')
        .insert({
          line_id: newAdminLineId,
          display_name: displayName,
          notes: notes,
          created_by: requesterLineId
        })
        .select()
        .single()

      if (error) {
        if (error.code === '23505') { // 唯一約束違反
          return NextResponse.json({ error: 'Admin already exists' }, { status: 409 })
        }
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
      resultAdmin = newAdmin
    }

    // 更新 users 表格的 is_admin 狀態
    await supabase
      .from('users')
      .update({ is_admin: true })
      .eq('line_id', newAdminLineId)

    // 記錄操作
    await supabase
      .from('admin_actions')
      .insert({
        admin_line_id: requesterLineId,
        action: existingAdmin ? 'reactivate_admin' : 'add_admin',
        target_type: 'admin',
        target_id: newAdminLineId,
        details: { displayName, notes }
      })

    return NextResponse.json({ message: 'Admin added successfully', admin: resultAdmin })

  } catch (error) {
    console.error('Add admin error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// 移除管理員
export async function DELETE(request: NextRequest) {
  try {
    const { requesterLineId, targetLineId } = await request.json()

    if (!requesterLineId || !targetLineId) {
      return NextResponse.json({ error: 'Required fields missing' }, { status: 400 })
    }

    const supabase = await createSupabaseServer()

    // 檢查權限
    const hasPermission = await checkAdminPermission(requesterLineId, supabase)
    if (!hasPermission) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // 防止自己移除自己
    if (requesterLineId === targetLineId) {
      return NextResponse.json({ error: 'Cannot remove yourself' }, { status: 400 })
    }

    // 停用管理員（軟刪除）
    const { error } = await supabase
      .from('admin_line_ids')
      .update({ is_active: false })
      .eq('line_id', targetLineId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // 更新用戶表格
    await supabase
      .from('users')
      .update({ is_admin: false })
      .eq('line_id', targetLineId)

    // 記錄操作
    await supabase
      .from('admin_actions')
      .insert({
        admin_line_id: requesterLineId,
        action: 'remove_admin',
        target_type: 'admin',
        target_id: targetLineId
      })

    return NextResponse.json({ message: 'Admin removed successfully' })

  } catch (error) {
    console.error('Remove admin error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
