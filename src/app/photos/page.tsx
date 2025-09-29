'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowser } from '@/lib/supabase'
import Layout from '@/components/Layout'
import { Camera, Heart, ImageIcon, Upload, Users, Slideshow, Trophy, Settings } from 'lucide-react'

export default function PhotosPage() {
  const [user, setUser] = useState<any>(null)
  const [stats, setStats] = useState({
    totalPhotos: 0,
    totalVotes: 0,
    userPhotos: 0,
    userVotes: 0
  })
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createSupabaseBrowser()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/line')
        return
      }
      setUser(user)
      await fetchStats(user.id)
    }

    getUser()
  }, [supabase.auth, router])

  const fetchStats = async (userId: string) => {
    try {
      // 獲取統計數據
      const [photosResult, votesResult, userPhotosResult, userVotesResult] = await Promise.all([
        supabase.from('photos').select('*', { count: 'exact', head: true }).eq('is_public', true),
        supabase.from('votes').select('*', { count: 'exact', head: true }),
        supabase.from('photos').select('*', { count: 'exact', head: true }).eq('uploader_line_id', userId),
        supabase.from('votes').select('*', { count: 'exact', head: true }).eq('voter_line_id', userId)
      ])

      setStats({
        totalPhotos: photosResult.count || 0,
        totalVotes: votesResult.count || 0,
        userPhotos: userPhotosResult.count || 0,
        userVotes: userVotesResult.count || 0
      })
    } catch (error) {
      console.error('Error fetching stats:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Layout title="照片功能">
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500"></div>
        </div>
      </Layout>
    )
  }

  const features = [
    {
      id: 'upload',
      title: '📸 照片上傳',
      description: '分享美好時刻，留下珍貴回憶',
      icon: <Upload className="w-8 h-8 text-blue-500" />,
      path: '/photo-upload',
      color: 'bg-blue-50 hover:bg-blue-100 border-blue-200',
      stats: `已上傳 ${stats.userPhotos} 張照片`
    },
    {
      id: 'wall',
      title: '🖼️ 照片牆',
      description: '瀏覽所有照片，為喜歡的投票',
      icon: <ImageIcon className="w-8 h-8 text-green-500" />,
      path: '/photo-wall',
      color: 'bg-green-50 hover:bg-green-100 border-green-200',
      stats: `共 ${stats.totalPhotos} 張照片`
    },
    {
      id: 'slideshow',
      title: '❤️ 快門傳情',
      description: '輪播欣賞精彩瞬間',
      icon: <Slideshow className="w-8 h-8 text-purple-500" />,
      path: '/photo-slideshow',
      color: 'bg-purple-50 hover:bg-purple-100 border-purple-200',
      stats: '自動輪播展示'
    }
  ]

  return (
    <Layout title="照片功能">
      <div className="max-w-6xl mx-auto">
        {/* 歡迎區域 */}
        <div className="bg-gradient-to-r from-pink-500 to-purple-600 rounded-2xl shadow-lg p-8 mb-8 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">📸 照片分享中心</h1>
              <p className="text-pink-100 text-lg">
                捕捉美好瞬間，分享愛的記憶
              </p>
            </div>
            <div className="hidden md:block">
              <Camera className="w-20 h-20 text-pink-200" />
            </div>
          </div>
        </div>

        {/* 統計卡片 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-4 text-center">
            <ImageIcon className="w-8 h-8 text-blue-500 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-800">{stats.totalPhotos}</div>
            <div className="text-sm text-gray-600">總照片數</div>
          </div>
          
          <div className="bg-white rounded-xl shadow-lg p-4 text-center">
            <Heart className="w-8 h-8 text-red-500 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-800">{stats.totalVotes}</div>
            <div className="text-sm text-gray-600">總投票數</div>
          </div>
          
          <div className="bg-white rounded-xl shadow-lg p-4 text-center">
            <Upload className="w-8 h-8 text-green-500 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-800">{stats.userPhotos}</div>
            <div className="text-sm text-gray-600">我的照片</div>
          </div>
          
          <div className="bg-white rounded-xl shadow-lg p-4 text-center">
            <Trophy className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-800">{stats.userVotes}</div>
            <div className="text-sm text-gray-600">我的投票</div>
          </div>
        </div>

        {/* 功能卡片 */}
        <div className="grid md:grid-cols-3 gap-6">
          {features.map((feature) => (
            <div
              key={feature.id}
              onClick={() => router.push(feature.path)}
              className={`${feature.color} border-2 rounded-2xl p-6 cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-105`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  {feature.icon}
                  <h3 className="text-xl font-bold text-gray-800">
                    {feature.title}
                  </h3>
                </div>
              </div>
              
              <p className="text-gray-700 mb-4 leading-relaxed">
                {feature.description}
              </p>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 font-medium">
                  {feature.stats}
                </span>
                <div className="bg-white/70 rounded-full p-2">
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* 使用提示 */}
        <div className="bg-blue-50 rounded-xl p-6 mt-8">
          <div className="flex items-start space-x-3">
            <div className="bg-blue-100 rounded-full p-2">
              <Settings className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h4 className="font-semibold text-blue-800 mb-2">💡 使用提示</h4>
              <ul className="text-blue-700 text-sm space-y-1">
                <li>• 上傳的照片可選擇公開展示或私下傳送給新人</li>
                <li>• 在照片牆中可以為喜歡的照片投票</li>
                <li>• 快門傳情會自動輪播展示所有公開照片</li>
                <li>• 每人都有投票額度限制，請珍惜使用</li>
              </ul>
            </div>
          </div>
        </div>

        {/* 快速操作按鈕 */}
        <div className="flex flex-col sm:flex-row gap-4 mt-8">
          <button
            onClick={() => router.push('/photo-upload')}
            className="flex-1 bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center space-x-2"
          >
            <Camera className="w-5 h-5" />
            <span>立即上傳照片</span>
          </button>
          
          <button
            onClick={() => router.push('/photo-wall')}
            className="flex-1 bg-white border-2 border-gray-200 hover:border-gray-300 text-gray-700 font-semibold py-4 px-6 rounded-xl transition-all duration-200 hover:shadow-lg flex items-center justify-center space-x-2"
          >
            <Users className="w-5 h-5" />
            <span>瀏覽照片牆</span>
          </button>
        </div>
      </div>
    </Layout>
  )
}
