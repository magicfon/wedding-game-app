'use client'

import { useState } from 'react'
import { useSoundEffects } from '@/hooks/useSoundEffects'
import { SoundToggle } from '@/components/SoundToggle'
import { SOUND_EFFECTS, SoundEffectType } from '@/hooks/useSoundEffects'
import Layout from '@/components/Layout'
import { Volume2, Play, CheckCircle, XCircle, Clock, Trophy, Vote } from 'lucide-react'

export default function SoundTestPage() {
  const { isSoundEnabled, toggleSound, playSound, preloadSounds, isLoaded } = useSoundEffects()
  const [isPreloading, setIsPreloading] = useState(false)

  const handlePreload = async () => {
    setIsPreloading(true)
    await preloadSounds()
    setIsPreloading(false)
  }

  const soundButtons: { id: SoundEffectType; label: string; icon: React.ReactNode; color: string }[] = [
    { id: 'GAME_START', label: '遊戲開始', icon: <Play className="w-5 h-5" />, color: 'bg-green-500 hover:bg-green-600' },
    { id: 'COUNTDOWN', label: '倒數計時', icon: <Clock className="w-5 h-5" />, color: 'bg-yellow-500 hover:bg-yellow-600' },
    { id: 'TIME_UP', label: '時間結束', icon: <XCircle className="w-5 h-5" />, color: 'bg-red-500 hover:bg-red-600' },
    { id: 'CORRECT_ANSWER', label: '正確答案', icon: <CheckCircle className="w-5 h-5" />, color: 'bg-blue-500 hover:bg-blue-600' },
    { id: 'LEADERBOARD', label: '排行榜', icon: <Trophy className="w-5 h-5" />, color: 'bg-purple-500 hover:bg-purple-600' },
    { id: 'VOTE', label: '投票', icon: <Vote className="w-5 h-5" />, color: 'bg-pink-500 hover:bg-pink-600' },
  ]

  return (
    <Layout title="音效測試">
      <div className="min-h-screen bg-gradient-to-br from-purple-100 to-pink-100 p-8">
        <div className="max-w-4xl mx-auto">
          {/* 標題區域 */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-800 mb-4 flex items-center justify-center space-x-3">
              <Volume2 className="w-8 h-8 text-purple-600" />
              音效測試
            </h1>
            <p className="text-gray-600 text-lg">
              測試遊戲實況頁面的各種音效
            </p>
          </div>

          {/* 狀態指示器 */}
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className={`w-4 h-4 rounded-full mx-auto mb-2 ${isLoaded ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                <div className="text-sm font-medium text-gray-700">音效載入狀態</div>
                <div className="text-xs text-gray-500">{isLoaded ? '已載入' : '載入中'}</div>
              </div>
              <div className="text-center">
                <div className={`w-4 h-4 rounded-full mx-auto mb-2 ${isSoundEnabled ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                <div className="text-sm font-medium text-gray-700">音效開關狀態</div>
                <div className="text-xs text-gray-500">{isSoundEnabled ? '已啟用' : '已停用'}</div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center space-x-2 mb-2">
                  <SoundToggle isEnabled={isSoundEnabled} onToggle={toggleSound} />
                </div>
                <div className="text-sm font-medium text-gray-700">音效控制</div>
                <div className="text-xs text-gray-500">點擊切換開關</div>
              </div>
            </div>
          </div>

          {/* 預載按鈕 */}
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
            <button
              onClick={handlePreload}
              disabled={isPreloading || isLoaded}
              className="w-full bg-purple-500 hover:bg-purple-600 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2"
            >
              {isPreloading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>預載中...</span>
                </>
              ) : isLoaded ? (
                <>
                  <CheckCircle className="w-5 h-5" />
                  <span>音效已載入</span>
                </>
              ) : (
                <>
                  <Volume2 className="w-5 h-5" />
                  <span>預載音效</span>
                </>
              )}
            </button>
          </div>

          {/* 音效測試按鈕 */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">音效測試</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {soundButtons.map((sound) => (
                <button
                  key={sound.id}
                  onClick={() => playSound(sound.id)}
                  disabled={!isLoaded || !isSoundEnabled}
                  className={`${sound.color} text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {sound.icon}
                  <span>{sound.label}</span>
                </button>
              ))}
            </div>
            
            {!isLoaded && (
              <div className="mt-4 text-center text-gray-500 text-sm">
                請先預載音效後再進行測試
              </div>
            )}
            
            {!isSoundEnabled && (
              <div className="mt-4 text-center text-gray-500 text-sm">
                請啟用音效後再進行測試
              </div>
            )}
          </div>

          {/* 音效檔案列表 */}
          <div className="bg-white rounded-2xl shadow-lg p-6 mt-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">音效檔案</h2>
            <div className="space-y-2">
              {Object.entries(SOUND_EFFECTS).map(([key, filename]) => (
                <div key={key} className="flex items-center justify-between py-2 border-b border-gray-200">
                  <span className="font-medium text-gray-700">{key}</span>
                  <code className="text-sm bg-gray-100 px-2 py-1 rounded">{filename}</code>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}