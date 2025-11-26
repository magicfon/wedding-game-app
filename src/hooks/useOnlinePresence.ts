import { useEffect, useState } from 'react'
import { createSupabaseBrowser } from '@/lib/supabase'

export function useOnlinePresence() {
    const [onlineCount, setOnlineCount] = useState(0)
    const supabase = createSupabaseBrowser()

    useEffect(() => {
        // 建立一個 Presence channel
        const channel = supabase.channel('online-users')

        channel
            .on('presence', { event: 'sync' }, () => {
                const newState = channel.presenceState()
                // 計算所有在線的使用者數量
                // presenceState 回傳的是一個物件，key 是 presence key (通常是 user id)，value 是該使用者的 presence data 陣列
                // 因為同一個使用者可能開啟多個分頁，所以我們計算所有 presence data 的總數，或者只計算 unique keys
                // 這裡我們計算 unique keys (即 unique users)
                const count = Object.keys(newState).length
                setOnlineCount(count)
            })
            .on('presence', { event: 'join' }, ({ key, newPresences }) => {
                // 當有人加入時，重新計算
                // 這裡其實依賴 sync 事件通常就足夠了，但為了即時性也可以在這裡處理
                // 簡單起見，我們主要依賴 sync 更新狀態，因為 sync 會在 join/leave 後觸發
                console.log('User joined:', key, newPresences)
            })
            .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
                console.log('User left:', key, leftPresences)
            })
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    // 訂閱成功後，追蹤當前使用者
                    // 這裡可以傳入使用者的資訊，例如 id, name 等
                    // 暫時傳入一個空的物件，或者隨機 ID
                    const userStatus = {
                        online_at: new Date().toISOString(),
                    }
                    await channel.track(userStatus)
                }
            })

        return () => {
            channel.unsubscribe()
        }
    }, [supabase])

    return onlineCount
}
