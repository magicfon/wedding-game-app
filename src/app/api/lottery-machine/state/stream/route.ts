import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const encoder = new TextEncoder()

  // Create a readable stream for SSE
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        // Send initial connection message
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'connected' })}\n\n`))

        // Subscribe to lottery_machine_state changes
        const channel = supabase
          .channel('lottery-machine-state-changes')
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'lottery_machine_state'
            },
            (payload) => {
              console.log('lottery_machine_state 變更:', payload)
              // 發送 lottery_state 事件格式
              if (payload.new) {
                const data = {
                  type: 'lottery_state',
                  state: payload.new
                }
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
              }
            }
          )
          .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
              console.log('已訂閱 lottery_machine_state 變更')
            } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
              console.error('訂閱關閉或錯誤:', status)
              controller.close()
            }
          })

        // Keep connection alive with heartbeat
        const heartbeatInterval = setInterval(() => {
          controller.enqueue(encoder.encode(`: heartbeat\n\n`))
        }, 30000)

        // Clean up when client disconnects
        request.signal.addEventListener('abort', () => {
          clearInterval(heartbeatInterval)
          supabase.removeChannel(channel)
          controller.close()
        })

      } catch (error) {
        console.error('SSE 錯誤:', error)
        const errorData = {
          type: 'error',
          message: error instanceof Error ? error.message : '未知錯誤'
        }
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(errorData)}\n\n`))
        controller.close()
      }
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no'
    }
  })
}
