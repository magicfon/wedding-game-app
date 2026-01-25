import { NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase-server'

// 診斷彩球機設定儲存問題
export async function GET() {
  const results: any = {
    timestamp: new Date().toISOString(),
    checks: []
  }

  try {
    const supabase = createSupabaseAdmin()

    // 檢查 1: 表格是否存在
    results.checks.push({ name: '檢查表格存在', status: '開始' })
    const { data: tables, error: tablesError } = await supabase
      .from('lottery_machine_config')
      .select('*')
      .limit(1)

    if (tablesError) {
      results.checks.push({ name: '檢查表格存在', status: '失敗', error: tablesError.message })
      return NextResponse.json({ success: false, results })
    }
    results.checks.push({ name: '檢查表格存在', status: '成功' })

    // 檢查 2: 記錄是否存在
    results.checks.push({ name: '檢查 id=1 記錄', status: '開始' })
    const { data: config, error: configError } = await supabase
      .from('lottery_machine_config')
      .select('*')
      .eq('id', 1)
      .single()

    if (configError) {
      if (configError.code === 'PGRST116') {
        // 記錄不存在
        results.checks.push({ name: '檢查 id=1 記錄', status: '失敗', error: '記錄不存在' })

        // 嘗試創建記錄
        results.checks.push({ name: '創建 id=1 記錄', status: '開始' })
        const { error: insertError } = await supabase
          .from('lottery_machine_config')
          .insert({
            id: 1,
            track_config: {},
            physics: {},
            chamber_style: {},
            platform_style: {}
          })

        if (insertError) {
          results.checks.push({ name: '創建 id=1 記錄', status: '失敗', error: insertError.message })
        } else {
          results.checks.push({ name: '創建 id=1 記錄', status: '成功' })
        }
      } else {
        results.checks.push({ name: '檢查 id=1 記錄', status: '失敗', error: configError.message })
      }
    } else {
      results.checks.push({ name: '檢查 id=1 記錄', status: '成功', data: config })
    }

    // 檢查 3: 測試更新
    results.checks.push({ name: '測試更新', status: '開始' })
    const testValue = { test: Date.now() }
    const { error: updateError } = await supabase
      .from('lottery_machine_config')
      .update({ track_config: testValue })
      .eq('id', 1)

    if (updateError) {
      results.checks.push({ name: '測試更新', status: '失敗', error: updateError.message })
    } else {
      results.checks.push({ name: '測試更新', status: '成功' })

      // 驗證更新
      const { data: verifyData } = await supabase
        .from('lottery_machine_config')
        .select('track_config')
        .eq('id', 1)
        .single()

      results.checks.push({ name: '驗證更新', status: '成功', data: verifyData })
    }

    // 檢查 4: 檢查 RLS 政策
    results.checks.push({ name: '檢查 RLS 政策', status: '開始' })
    const { data: policies, error: policiesError } = await supabase
      .rpc('get_policies_for_table', { table_name: 'lottery_machine_config' })

    if (policiesError) {
      results.checks.push({ name: '檢查 RLS 政策', status: '失敗', error: policiesError.message })
    } else {
      results.checks.push({ name: '檢查 RLS 政策', status: '成功', policies })
    }

    return NextResponse.json({ success: true, results })

  } catch (error) {
    results.checks.push({ name: '整體診斷', status: '失敗', error: error instanceof Error ? error.message : '未知錯誤' })
    return NextResponse.json({ success: false, results })
  }
}
