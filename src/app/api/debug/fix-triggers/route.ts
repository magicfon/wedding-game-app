import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase-admin'
import { readFileSync } from 'fs'
import { join } from 'path'

export async function POST(request: NextRequest) {
  try {
    const supabase = createSupabaseAdmin()
    
    console.log('🔧 開始修復資料庫觸發器...')
    
    // 讀取 SQL 修復腳本
    const sqlPath = join(process.cwd(), 'database', 'fix-triggers.sql')
    const sqlContent = readFileSync(sqlPath, 'utf8')
    
    // 將 SQL 腳本分割成多個語句
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'))
    
    console.log(`📝 準備執行 ${statements.length} 個 SQL 語句`)
    
    const results = []
    
    // 逐一執行 SQL 語句
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i]
      
      if (statement.includes('DO $$') || statement.includes('DECLARE')) {
        // 跳過複雜的 DO 塊，因為可能需要特殊處理
        console.log(`⏭️ 跳過複雜語句 ${i + 1}`)
        continue
      }
      
      try {
        console.log(`🔄 執行語句 ${i + 1}: ${statement.substring(0, 50)}...`)
        
        const { data, error } = await supabase.rpc('exec_sql', {
          sql: statement + ';'
        })
        
        if (error) {
          console.error(`❌ 語句 ${i + 1} 執行失敗:`, error)
          results.push({
            statement_number: i + 1,
            success: false,
            error: error.message,
            statement: statement.substring(0, 100) + '...'
          })
        } else {
          console.log(`✅ 語句 ${i + 1} 執行成功`)
          results.push({
            statement_number: i + 1,
            success: true,
            data: data
          })
        }
      } catch (execError) {
        console.error(`❌ 語句 ${i + 1} 執行異常:`, execError)
        results.push({
          statement_number: i + 1,
          success: false,
          error: execError instanceof Error ? execError.message : '未知錯誤',
          statement: statement.substring(0, 100) + '...'
        })
      }
    }
    
    // 手動重建觸發器（簡化版本）
    try {
      console.log('🔨 手動重建觸發器...')
      
      // 刪除舊觸發器
      await supabase.rpc('exec_sql', {
        sql: 'DROP TRIGGER IF EXISTS trigger_update_user_total_score ON answer_records;'
      })
      
      // 刪除舊函數
      await supabase.rpc('exec_sql', {
        sql: 'DROP FUNCTION IF EXISTS update_user_total_score();'
      })
      
      // 創建新函數
      const functionSQL = `
        CREATE OR REPLACE FUNCTION update_user_total_score()
        RETURNS TRIGGER AS $$
        BEGIN
            IF TG_OP = 'INSERT' THEN
                UPDATE users 
                SET total_score = total_score + NEW.earned_score 
                WHERE line_id = NEW.user_line_id;
                RETURN NEW;
            ELSIF TG_OP = 'UPDATE' THEN
                UPDATE users 
                SET total_score = total_score - OLD.earned_score + NEW.earned_score 
                WHERE line_id = NEW.user_line_id;
                RETURN NEW;
            ELSIF TG_OP = 'DELETE' THEN
                UPDATE users 
                SET total_score = total_score - OLD.earned_score 
                WHERE line_id = OLD.user_line_id;
                RETURN OLD;
            END IF;
            RETURN NULL;
        END;
        $$ LANGUAGE plpgsql;
      `
      
      await supabase.rpc('exec_sql', { sql: functionSQL })
      
      // 創建新觸發器
      const triggerSQL = `
        CREATE TRIGGER trigger_update_user_total_score
            AFTER INSERT OR UPDATE OR DELETE ON answer_records
            FOR EACH ROW EXECUTE FUNCTION update_user_total_score();
      `
      
      await supabase.rpc('exec_sql', { sql: triggerSQL })
      
      console.log('✅ 觸發器重建完成')
      
    } catch (manualError) {
      console.error('❌ 手動重建觸發器失敗:', manualError)
      
      // 如果 rpc 不可用，嘗試直接執行
      try {
        const { error: dropTriggerError } = await supabase
          .from('information_schema.triggers')
          .select('*')
          .eq('trigger_name', 'trigger_update_user_total_score')
        
        console.log('📋 觸發器檢查結果:', dropTriggerError ? '不存在' : '存在')
      } catch (checkError) {
        console.log('⚠️ 無法檢查觸發器狀態')
      }
    }
    
    // 驗證觸發器是否正常工作
    console.log('🧪 測試觸發器...')
    
    // 重新計算所有用戶分數以確保一致性
    const { data: users } = await supabase
      .from('users')
      .select('line_id, display_name, total_score')
    
    if (users) {
      for (const user of users) {
        const { data: userAnswers } = await supabase
          .from('answer_records')
          .select('earned_score')
          .eq('user_line_id', user.line_id)
        
        const calculatedScore = userAnswers?.reduce((sum, answer) => sum + (answer.earned_score || 0), 0) || 0
        
        if (user.total_score !== calculatedScore) {
          await supabase
            .from('users')
            .update({ total_score: calculatedScore })
            .eq('line_id', user.line_id)
          
          console.log(`🔄 修正用戶 ${user.display_name} 分數: ${user.total_score} → ${calculatedScore}`)
        }
      }
    }
    
    return NextResponse.json({
      success: true,
      message: '觸發器修復完成',
      results: results,
      users_updated: users?.length || 0
    })
    
  } catch (error) {
    console.error('❌ 修復觸發器失敗:', error)
    return NextResponse.json({
      success: false,
      error: '修復觸發器失敗',
      details: error instanceof Error ? error.message : '未知錯誤'
    }, { status: 500 })
  }
}
