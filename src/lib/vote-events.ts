import { createSupabaseBrowser } from './supabase'

// 投票事件介面
export interface VoteEvent {
  event_type: 'vote_cast'
  photo_id: number
  user_line_id: string
  created_at: string
}

// 觸發投票事件
export const triggerVoteEvent = async (photoId: number, userLineId: string) => {
  try {
    const supabase = createSupabaseBrowser()
    
    // 插入投票事件到 vote_events 表（如果存在）
    // 或者使用現有的 votes 表來觸發事件
    const { error } = await supabase
      .from('votes')
      .select('id')
      .eq('photo_id', photoId)
      .eq('voter_line_id', userLineId)
      .single()
    
    if (error && error.code !== 'PGRST116') { // PGRST116 是 "not found" 錯誤
      console.error('檢查投票記錄時發生錯誤:', error)
      return
    }
    
    // 如果是新的投票，觸發事件
    if (error?.code === 'PGRST116') {
      console.log('🗳️ 觸發新的投票事件:', { photoId, userLineId })
      
      // 這裡可以添加額外的事件處理邏輯
      // 例如：發送通知、更新統計等
    }
    
  } catch (error) {
    console.error('觸發投票事件時發生錯誤:', error)
  }
}

// 監聽投票事件
export const subscribeToVoteEvents = (callback: (event: VoteEvent) => void) => {
  const supabase = createSupabaseBrowser()
  
  const subscription = supabase
    .channel('vote-events')
    .on('postgres_changes', 
      { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'votes' 
      },
      (payload) => {
        const voteEvent: VoteEvent = {
          event_type: 'vote_cast',
          photo_id: payload.new.photo_id,
          user_line_id: payload.new.voter_line_id,
          created_at: payload.new.created_at
        }
        
        callback(voteEvent)
      }
    )
    .subscribe()
    
  return subscription
}