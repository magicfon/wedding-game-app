import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase-admin'

export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseAdmin()
    const url = new URL(request.url)
    const questionId = url.searchParams.get('questionId')

    if (!questionId) {
      return NextResponse.json({
        success: false,
        error: '請提供 questionId 參數'
      }, { status: 400 })
    }

    console.log('Testing answer distribution for question ID:', questionId)

    // 1. 先獲取答題記錄
    const { data: answerRecords, error: answerError } = await supabase
      .from('answer_records')
      .select('selected_answer, user_line_id')
      .eq('question_id', questionId)

    if (answerError) throw answerError

    console.log('Answer records:', answerRecords)

    if (!answerRecords || answerRecords.length === 0) {
      return NextResponse.json({
        success: true,
        message: '沒有找到答題記錄',
        distribution: ['A', 'B', 'C', 'D'].map(option => ({
          answer: option,
          count: 0,
          users: []
        }))
      })
    }

    // 2. 獲取所有相關用戶的資料
    const lineIds = [...new Set(answerRecords.map(record => record.user_line_id))]
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('line_id, display_name, avatar_url')
      .in('line_id', lineIds)

    if (usersError) throw usersError

    console.log('Users data:', users)

    // 3. 創建用戶查找映射
    const userMap = new Map()
    users?.forEach(user => {
      userMap.set(user.line_id, user)
    })

    // 4. 統計每個答案的分佈
    const distribution = ['A', 'B', 'C', 'D'].map(option => {
      const optionAnswers = answerRecords.filter(record => record.selected_answer === option)
      const optionUsers = optionAnswers.map(record => {
        const user = userMap.get(record.user_line_id)
        return {
          line_id: record.user_line_id,
          display_name: user?.display_name || '未知用戶',
          avatar_url: user?.avatar_url || null
        }
      }).filter(user => user.display_name !== '未知用戶') // 過濾掉無效用戶
      
      return {
        answer: option,
        count: optionUsers.length,
        users: optionUsers
      }
    })

    const totalAnswers = distribution.reduce((sum, d) => sum + d.count, 0)

    return NextResponse.json({
      success: true,
      questionId,
      totalAnswers,
      distribution,
      rawData: {
        answerRecords,
        users,
        lineIds
      }
    })

  } catch (error) {
    console.error('Error testing answer distribution:', error)
    return NextResponse.json({
      success: false,
      error: (error as Error).message
    }, { status: 500 })
  }
}
