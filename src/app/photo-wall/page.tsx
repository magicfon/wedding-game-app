'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowser, Photo } from '@/lib/supabase'
import Layout from '@/components/Layout'
import { Heart, MessageSquare, User, Clock, Trophy, Filter } from 'lucide-react'

interface PhotoWithUser extends Photo {
  uploader: {
    display_name: string
    avatar_url: string
  }
  user_vote_count?: number
}

export default function PhotoWallPage() {
  const [photos, setPhotos] = useState<PhotoWithUser[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [sortBy, setSortBy] = useState<'votes' | 'time'>('votes')
  const [userVotes, setUserVotes] = useState<Record<number, number>>({})
  const [availableVotes, setAvailableVotes] = useState(3)
  const [votingEnabled, setVotingEnabled] = useState(false)
  
  const router = useRouter()
  const supabase = createSupabaseBrowser()

  // 獲取用戶資訊
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/line')
        return
      }
      setUser(user)
    }

    getUser()
  }, [supabase.auth, router])

  // 獲取投票設定
  const fetchVotingSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('game_state')
        .select('voting_enabled, votes_per_user')
        .single()

      if (error) throw error
      
      setVotingEnabled(data.voting_enabled)
      setAvailableVotes(data.votes_per_user)
    } catch (error) {
      console.error('Error fetching voting settings:', error)
    }
  }

  // 獲取用戶投票記錄
  const fetchUserVotes = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('votes')
        .select('photo_id')
        .eq('voter_line_id', user.id)

      if (error) throw error

      // 計算每張照片的投票數
      const voteCount: Record<number, number> = {}
      data.forEach(vote => {
        voteCount[vote.photo_id] = (voteCount[vote.photo_id] || 0) + 1
      })
      
      setUserVotes(voteCount)
    } catch (error) {
      console.error('Error fetching user votes:', error)
    }
  }

  // 獲取照片列表
  const fetchPhotos = async () => {
    try {
      const { data, error } = await supabase
        .from('photos')
        .select(`
          *,
          uploader:users!photos_uploader_line_id_fkey(display_name, avatar_url)
        `)
        .eq('is_public', true)
        .order(sortBy === 'votes' ? 'vote_count' : 'upload_time', 
               { ascending: sortBy === 'votes' ? false : false })

      if (error) throw error
      
      setPhotos(data as PhotoWithUser[])
    } catch (error) {
      console.error('Error fetching photos:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!user) return

    fetchVotingSettings()
    fetchUserVotes()
    fetchPhotos()

    // 訂閱照片變化
    const photosSubscription = supabase
      .channel('photos_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'photos'
      }, () => {
        fetchPhotos()
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'votes'
      }, () => {
        fetchPhotos()
        fetchUserVotes()
      })
      .subscribe()

    return () => {
      photosSubscription.unsubscribe()
    }
  }, [user, sortBy])

  const handleVote = async (photoId: number) => {
    if (!user || !votingEnabled) return

    const currentVotes = userVotes[photoId] || 0
    const totalUsedVotes = Object.values(userVotes).reduce((sum, count) => sum + count, 0)

    if (totalUsedVotes >= availableVotes) {
      alert('您的投票額度已用完！')
      return
    }

    try {
      const { error } = await supabase
        .from('votes')
        .insert({
          voter_line_id: user.id,
          photo_id: photoId
        })

      if (error) throw error

      // 更新本地狀態
      setUserVotes(prev => ({
        ...prev,
        [photoId]: (prev[photoId] || 0) + 1
      }))
    } catch (error) {
      console.error('Error voting:', error)
      alert('投票失敗，請稍後再試')
    }
  }

  const getRemainingVotes = () => {
    const used = Object.values(userVotes).reduce((sum, count) => sum + count, 0)
    return Math.max(0, availableVotes - used)
  }

  if (loading) {
    return (
      <Layout title="照片牆">
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500"></div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout title="照片牆">
      <div className="max-w-6xl mx-auto">
        {/* 頂部控制列 */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex flex-col sm:flex-row items-center justify-between space-y-4 sm:space-y-0">
            <div className="flex items-center space-x-4">
              <h2 className="text-2xl font-bold text-gray-800">照片牆</h2>
              <span className="bg-pink-100 text-pink-700 px-3 py-1 rounded-full text-sm font-medium">
                {photos.length} 張照片
              </span>
            </div>

            <div className="flex items-center space-x-4">
              {/* 投票狀態 */}
              {votingEnabled && (
                <div className="flex items-center space-x-2 bg-blue-50 px-3 py-2 rounded-lg">
                  <Trophy className="w-5 h-5 text-blue-600" />
                  <span className="text-blue-700 font-medium">
                    剩餘票數: {getRemainingVotes()}
                  </span>
                </div>
              )}

              {/* 排序選擇 */}
              <div className="flex items-center space-x-2">
                <Filter className="w-5 h-5 text-gray-600" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'votes' | 'time')}
                  className="border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-pink-500"
                >
                  <option value="votes">按票數排序</option>
                  <option value="time">按時間排序</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* 照片網格 */}
        {photos.length === 0 ? (
          <div className="text-center py-16">
            <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md mx-auto">
              <Heart className="w-16 h-16 text-gray-400 mx-auto mb-6" />
              <h3 className="text-xl font-semibold text-gray-800 mb-2">還沒有照片</h3>
              <p className="text-gray-600 mb-6">成為第一個分享美好回憶的人吧！</p>
              <button
                onClick={() => router.push('/photo-upload')}
                className="bg-pink-500 hover:bg-pink-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
              >
                上傳照片
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {photos.map((photo) => (
              <div key={photo.id} className="bg-white rounded-2xl shadow-lg overflow-hidden">
                {/* 照片 */}
                <div className="relative aspect-square">
                  <img
                    src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/wedding-photos/${photo.google_drive_file_id}`}
                    alt="Wedding photo"
                    className="w-full h-full object-cover"
                  />
                  
                  {/* 投票按鈕 */}
                  {votingEnabled && (
                    <button
                      onClick={() => handleVote(photo.id)}
                      disabled={getRemainingVotes() <= 0}
                      className={`absolute top-3 right-3 p-2 rounded-full shadow-lg transition-all duration-200 ${
                        getRemainingVotes() <= 0
                          ? 'bg-gray-300 cursor-not-allowed'
                          : 'bg-white hover:bg-pink-50 hover:scale-110'
                      }`}
                    >
                      <Heart className={`w-5 h-5 ${
                        userVotes[photo.id] > 0 ? 'text-red-500 fill-current' : 'text-gray-600'
                      }`} />
                    </button>
                  )}

                  {/* 票數顯示 */}
                  <div className="absolute bottom-3 left-3 bg-black/70 text-white px-2 py-1 rounded-lg flex items-center space-x-1">
                    <Heart className="w-4 h-4" />
                    <span className="text-sm font-medium">{photo.vote_count}</span>
                  </div>
                </div>

                {/* 照片資訊 */}
                <div className="p-4">
                  {/* 上傳者資訊 */}
                  <div className="flex items-center space-x-3 mb-3">
                    <img
                      src={photo.uploader.avatar_url || '/default-avatar.png'}
                      alt="Avatar"
                      className="w-8 h-8 rounded-full"
                    />
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <User className="w-4 h-4 text-gray-500" />
                        <span className="text-sm font-medium text-gray-800">
                          {photo.uploader.display_name}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <span className="text-xs text-gray-500">
                          {new Date(photo.upload_time).toLocaleString('zh-TW')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 祝福訊息 */}
                  {photo.blessing_message && (
                    <div className="bg-pink-50 rounded-lg p-3">
                      <div className="flex items-start space-x-2">
                        <MessageSquare className="w-4 h-4 text-pink-500 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-gray-700 leading-relaxed">
                          {photo.blessing_message}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* 投票統計 */}
                  {userVotes[photo.id] > 0 && (
                    <div className="mt-3 text-center">
                      <span className="bg-red-100 text-red-700 px-2 py-1 rounded-full text-xs font-medium">
                        您投了 {userVotes[photo.id]} 票
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 底部提示 */}
        <div className="bg-blue-50 rounded-xl p-4 mt-8 text-center">
          <p className="text-blue-700 text-sm">
            💡 {votingEnabled 
              ? `每人有 ${availableVotes} 票，可以投給不同照片或同一張照片多次投票`
              : '投票功能目前關閉中，請等待主持人開啟'
            }
          </p>
        </div>
      </div>
    </Layout>
  )
}
