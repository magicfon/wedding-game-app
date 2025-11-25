import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase-server'

// 獲取用戶分數和調整記錄
export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServer()
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'users'

    if (type === 'users') {
      // 獲取用戶分數排行榜
      const { data, error } = await supabase
        .from('users')
        .select('line_id, display_name, avatar_url, quiz_score, join_time')
        .order('quiz_score', { ascending: false })

      if (error) throw error
      return NextResponse.json({ users: data })
    }

    if (type === 'adjustments') {
      // 獲取分數調整記錄
      const { data, error } = await supabase
        .from('score_adjustments')
        .select(`
          id,
          user_line_id,
          admin_id,
          adjustment_score,
          reason,
          created_at,
          users!score_adjustments_user_line_id_fkey (
            display_name,
            avatar_url
          )
        `)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) throw error
      return NextResponse.json({ adjustments: data })
    }

    return NextResponse.json({ error: '無效的查詢類型' }, { status: 400 })
  } catch (error) {
    console.error('Error in scores GET:', error)
    return NextResponse.json({ error: '獲取資料失敗' }, { status: 500 })
  }
}

// 調整用戶分數
export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServer()
    const body = await request.json()

    const { user_line_id, adjustment_score, reason, admin_id } = body

    // 驗證必要欄位
    if (!user_line_id || adjustment_score === undefined || !reason) {
      return NextResponse.json({
        error: '缺少必要參數：user_line_id, adjustment_score, reason'
      }, { status: 400 })
    }

    // 驗證分數調整範圍（防止惡意操作）
    if (Math.abs(adjustment_score) > 1000) {
      return NextResponse.json({
        error: '單次調整分數不能超過 ±1000'
      }, { status: 400 })
    }

    // 檢查用戶是否存在
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('line_id, display_name, quiz_score')
      .eq('line_id', user_line_id)
      .single()

    if (userError || !user) {
      return NextResponse.json({ error: '用戶不存在' }, { status: 404 })
    }

    // 檢查調整後分數是否會變成負數
    const newScore = user.quiz_score + adjustment_score
    if (newScore < 0) {
      return NextResponse.json({
        error: `調整後分數不能為負數。目前分數: ${user.quiz_score}，調整分數: ${adjustment_score}`
      }, { status: 400 })
    }

    // 插入分數調整記錄（觸發器會自動更新用戶總分）
    const { data: adjustment, error: adjustmentError } = await supabase
      .from('score_adjustments')
      .insert({
        user_line_id,
        admin_id: admin_id || 'system',
        adjustment_score: parseInt(adjustment_score),
        reason: reason.trim()
      })
      .select()
      .single()

    if (adjustmentError) throw adjustmentError

    // 獲取更新後的用戶分數
    const { data: updatedUser, error: updatedUserError } = await supabase
      .from('users')
      .select('line_id, display_name, quiz_score')
      .eq('line_id', user_line_id)
      .single()

    if (updatedUserError) throw updatedUserError

    return NextResponse.json({
      success: true,
      message: `成功調整 ${user.display_name} 的分數 ${adjustment_score > 0 ? '+' : ''}${adjustment_score} 分`,
      adjustment,
      user: {
        ...user,
        old_score: user.quiz_score,
        new_score: updatedUser.quiz_score
      }
    })
  } catch (error) {
    console.error('Error in scores POST:', error)
    return NextResponse.json({
      error: '分數調整失敗',
      details: error instanceof Error ? error.message : '未知錯誤'
    }, { status: 500 })
  }
}

// 批量調整分數
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createSupabaseServer()
    const body = await request.json()

    const { adjustments, admin_id } = body

    if (!Array.isArray(adjustments) || adjustments.length === 0) {
      return NextResponse.json({
        error: '批量調整需要提供調整列表'
      }, { status: 400 })
    }

    // 驗證每個調整項目
    for (const adj of adjustments) {
      if (!adj.user_line_id || adj.adjustment_score === undefined || !adj.reason) {
        return NextResponse.json({
          error: '每個調整項目都需要 user_line_id, adjustment_score, reason'
        }, { status: 400 })
      }

      if (Math.abs(adj.adjustment_score) > 1000) {
        return NextResponse.json({
          error: `用戶 ${adj.user_line_id} 的調整分數超過限制 (±1000)`
        }, { status: 400 })
      }
    }

    const results = []
    const errors = []

    // 逐一處理每個調整
    for (const adj of adjustments) {
      try {
        // 檢查用戶是否存在
        const { data: user, error: userError } = await supabase
          .from('users')
          .select('line_id, display_name, quiz_score')
          .eq('line_id', adj.user_line_id)
          .single()

        if (userError || !user) {
          errors.push(`用戶 ${adj.user_line_id} 不存在`)
          continue
        }

        // 檢查調整後分數
        const newScore = user.quiz_score + adj.adjustment_score
        if (newScore < 0) {
          errors.push(`用戶 ${user.display_name} 調整後分數會變成負數`)
          continue
        }

        // 插入分數調整記錄
        const { data: adjustment, error: adjustmentError } = await supabase
          .from('score_adjustments')
          .insert({
            user_line_id: adj.user_line_id,
            admin_id: admin_id || 'system',
            adjustment_score: parseInt(adj.adjustment_score),
            reason: adj.reason.trim()
          })
          .select()
          .single()

        if (adjustmentError) throw adjustmentError

        results.push({
          user_line_id: adj.user_line_id,
          display_name: user.display_name,
          adjustment_score: adj.adjustment_score,
          old_score: user.quiz_score,
          new_score: user.quiz_score + adj.adjustment_score
        })
      } catch (error) {
        errors.push(`處理用戶 ${adj.user_line_id} 時發生錯誤: ${error instanceof Error ? error.message : '未知錯誤'}`)
      }
    }

    return NextResponse.json({
      success: true,
      message: `批量調整完成。成功: ${results.length} 筆，失敗: ${errors.length} 筆`,
      results,
      errors
    })
  } catch (error) {
    console.error('Error in scores PATCH:', error)
    return NextResponse.json({
      error: '批量調整失敗',
      details: error instanceof Error ? error.message : '未知錯誤'
    }, { status: 500 })
  }
}
