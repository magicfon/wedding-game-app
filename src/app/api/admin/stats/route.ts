import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServer } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    // 檢查環境變數
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    if (!supabaseUrl || supabaseUrl === 'https://placeholder.supabase.co') {
      return NextResponse.json({
        error: 'Supabase URL not configured',
        stats: {
          totalUsers: 0,
          totalQuestions: 0,
          totalPhotos: 0,
          gameActive: false,
          totalAnswers: 0,
          activeAdmins: 0
        }
      }, { status: 500 })
    }

    if (!supabaseKey || supabaseKey === 'placeholder-key') {
      return NextResponse.json({
        error: 'Supabase key not configured',
        stats: {
          totalUsers: 0,
          totalQuestions: 0,
          totalPhotos: 0,
          gameActive: false,
          totalAnswers: 0,
          activeAdmins: 0
        }
      }, { status: 500 })
    }

    const supabase = await createSupabaseServer()

    // 並行查詢所有統計數據
    const [
      usersResult,
      questionsResult,
      photosResult,
      gameStateResult,
      answersResult,
      adminsResult
    ] = await Promise.all([
      // 總用戶數
      supabase.from('users').select('*', { count: 'exact', head: true }),
      
      // 總問題數
      supabase.from('questions').select('*', { count: 'exact', head: true }),
      
      // 總照片數
      supabase.from('photos').select('*', { count: 'exact', head: true }),
      
      // 遊戲狀態
      supabase.from('game_state').select('is_game_active').single(),
      
      // 總答題數
      supabase.from('answer_records').select('*', { count: 'exact', head: true }),
      
      // 活躍管理員數
      supabase.from('admin_line_ids').select('*', { count: 'exact', head: true }).eq('is_active', true)
    ])

    // 處理結果
    const stats = {
      totalUsers: usersResult.count || 0,
      totalQuestions: questionsResult.count || 0,
      totalPhotos: photosResult.count || 0,
      gameActive: gameStateResult.data?.is_game_active || false,
      totalAnswers: answersResult.count || 0,
      activeAdmins: adminsResult.count || 0
    }

    // 收集錯誤信息（如果有）
    const errors = []
    if (usersResult.error) errors.push(`Users: ${usersResult.error.message}`)
    if (questionsResult.error) errors.push(`Questions: ${questionsResult.error.message}`)
    if (photosResult.error) errors.push(`Photos: ${photosResult.error.message}`)
    if (gameStateResult.error) errors.push(`Game State: ${gameStateResult.error.message}`)
    if (answersResult.error) errors.push(`Answers: ${answersResult.error.message}`)
    if (adminsResult.error) errors.push(`Admins: ${adminsResult.error.message}`)

    return NextResponse.json({
      success: true,
      stats,
      errors: errors.length > 0 ? errors : null,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Stats API error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
      stats: {
        totalUsers: 0,
        totalQuestions: 0,
        totalPhotos: 0,
        gameActive: false,
        totalAnswers: 0,
        activeAdmins: 0
      }
    }, { status: 500 })
  }
}
