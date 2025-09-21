import { createClient } from '@supabase/supabase-js'
import { createBrowserClient, createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// 客戶端 Supabase 實例
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// 瀏覽器端 Supabase 實例
export const createSupabaseBrowser = () =>
  createBrowserClient(supabaseUrl, supabaseAnonKey)

// 服務端 Supabase 實例
export const createSupabaseServer = () => {
  const cookieStore = cookies()

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value
      },
      set(name: string, value: string, options: any) {
        cookieStore.set({ name, value, ...options })
      },
      remove(name: string, options: any) {
        cookieStore.delete({ name, ...options })
      },
    },
  })
}

// 資料庫表格類型定義
export interface User {
  line_id: string
  display_name: string
  avatar_url: string
  total_score: number
  join_time: string
  is_active: boolean
}

export interface Question {
  id: number
  question_text: string
  option_a: string
  option_b: string
  option_c: string
  option_d: string
  correct_answer: 'A' | 'B' | 'C' | 'D'
  base_score: number
  penalty_enabled: boolean
  penalty_score: number
  timeout_penalty_enabled: boolean
  timeout_penalty_score: number
  time_limit: number
  is_active: boolean
}

export interface AnswerRecord {
  id: number
  user_line_id: string
  question_id: number
  selected_answer: 'A' | 'B' | 'C' | 'D' | null
  answer_time: number
  is_correct: boolean
  earned_score: number
  created_at: string
}

export interface Photo {
  id: number
  uploader_line_id: string
  google_drive_file_id: string
  file_name: string
  blessing_message: string
  is_public: boolean
  vote_count: number
  upload_time: string
}

export interface Vote {
  id: number
  voter_line_id: string
  photo_id: number
  created_at: string
}

export interface ScoreAdjustment {
  id: number
  user_line_id: string
  admin_id: string
  adjustment_score: number
  reason: string
  created_at: string
}
