import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const encoder = new TextEncoder()
  
  // Create a readable stream for SSE
  const stream = new ReadableStream({
    async start(controller) {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )

      // Send initial connection message
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'connected' })}\n\n`))

      try {
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
              const data = {
                type: 'state_update',
                payload: payload
              }
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
            }
          )
          .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
              console.log('Subscribed to lottery_machine_state changes')
            } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
              console.error('Subscription closed or error:', status)
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
        console.error('SSE error:', error)
        const errorData = {
          type: 'error',
          message: error instanceof Error ? error.message : 'Unknown error'
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
