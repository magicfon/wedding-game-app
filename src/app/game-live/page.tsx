'use client'

import { useState, useEffect } from 'react'
import { createSupabaseBrowser } from '@/lib/supabase'
import Layout from '@/components/Layout'
import { Play, Pause, Users, Trophy, Clock, HelpCircle } from 'lucide-react'

export default function GameLivePage() {
  const [gameState, setGameState] = useState<any>(null)
  const [currentQuestion, setCurrentQuestion] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createSupabaseBrowser()

  useEffect(() => {
    const fetchGameState = async () => {
      try {
        const { data: gameData } = await supabase
          .from('game_state')
          .select('*')
          .single()

        setGameState(gameData)

        if (gameData?.current_question_id) {
          const { data: questionData } = await supabase
            .from('questions')
            .select('*')
            .eq('id', gameData.current_question_id)
            .single()

          setCurrentQuestion(questionData)
        }
      } catch (error) {
        console.error('Error fetching game state:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchGameState()

    // 訂閱即時更新
    const subscription = supabase
      .channel('game_live')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'game_state'
      }, () => {
        fetchGameState()
      })
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase])

  if (loading) {
    return (
      <Layout title="遊戲實況">
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500"></div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout title="遊戲實況">
      <div className="max-w-4xl mx-auto">
        {/* 遊戲狀態 */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-800">🎮 遊戲實況</h2>
            <div className="flex items-center space-x-4">
              {gameState?.is_game_active ? (
                <div className="flex items-center space-x-2 text-green-600">
                  <Play className="w-5 h-5" />
                  <span className="font-semibold">遊戲進行中</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2 text-gray-500">
                  <Pause className="w-5 h-5" />
                  <span className="font-semibold">遊戲暫停</span>
                </div>
              )}
            </div>
          </div>

          {gameState?.is_paused && (
            <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded-lg mb-4">
              ⏸️ 遊戲暫停中，請等待主持人繼續遊戲
            </div>
          )}
        </div>

        {/* 當前題目 */}
        {currentQuestion && gameState?.is_game_active && !gameState?.is_paused ? (
          <div className="bg-white rounded-2xl shadow-lg p-8 mb-6">
            <div className="text-center mb-6">
              <div className="flex items-center justify-center space-x-2 mb-4">
                <HelpCircle className="w-6 h-6 text-blue-500" />
                <h3 className="text-xl font-semibold text-gray-800">當前題目</h3>
              </div>
              <div className="bg-blue-50 rounded-lg p-6">
                <h4 className="text-2xl font-bold text-gray-800 mb-6">
                  {currentQuestion.question_text}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { key: 'A', text: currentQuestion.option_a },
                    { key: 'B', text: currentQuestion.option_b },
                    { key: 'C', text: currentQuestion.option_c },
                    { key: 'D', text: currentQuestion.option_d },
                  ].map((option) => (
                    <div
                      key={option.key}
                      className="bg-white p-4 rounded-lg border-2 border-gray-200"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-bold">
                          {option.key}
                        </div>
                        <span className="text-lg">{option.text}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-lg p-8 mb-6 text-center">
            <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-800 mb-2">等待中</h3>
            <p className="text-gray-600">目前沒有進行中的題目</p>
          </div>
        )}

        {/* 參與提示 */}
        <div className="bg-gradient-to-r from-pink-100 to-purple-100 rounded-2xl p-6 text-center">
          <Trophy className="w-12 h-12 text-pink-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-800 mb-2">想要參與答題？</h3>
          <p className="text-gray-600 mb-4">前往快問快答頁面開始遊戲！</p>
          <a
            href="/quiz"
            className="inline-flex items-center space-x-2 bg-pink-500 hover:bg-pink-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
          >
            <HelpCircle className="w-5 h-5" />
            <span>參與答題</span>
          </a>
        </div>
      </div>
    </Layout>
  )
}
