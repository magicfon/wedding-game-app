'use client'

import { useState, useEffect } from 'react'
import { initLiff, isInLiff, isLoggedIn, getProfile, liffLogin, type LiffProfile } from '@/lib/liff'

interface UseLiffReturn {
  isReady: boolean
  isInLiff: boolean
  isLoggedIn: boolean
  profile: LiffProfile | null
  login: () => void
  error: string | null
  loading: boolean
  isAdmin: boolean
  adminInfo: { lineId: string; displayName: string } | null
  adminLoading: boolean
}

export const useLiff = (): UseLiffReturn => {
  const [isReady, setIsReady] = useState(false)
  const [profile, setProfile] = useState<LiffProfile | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [adminInfo, setAdminInfo] = useState<{ lineId: string; displayName: string } | null>(null)
  const [adminLoading, setAdminLoading] = useState(false)

  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true)
        const success = await initLiff()
        
        if (success) {
          setIsReady(true)
          
          // 如果已經登入，獲取用戶資料並同步到資料庫
          if (isLoggedIn()) {
            const userProfile = await getProfile()
            setProfile(userProfile)
            
            // 同步用戶資料到資料庫
            if (userProfile) {
              try {
                const response = await fetch('/api/auth/liff-sync', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({ profile: userProfile }),
                })
                
                if (response.ok) {
                  const data = await response.json()
                  console.log('User synced to database:', data)
                } else {
                  console.error('Failed to sync user to database')
                }
              } catch (error) {
                console.error('Error syncing user:', error)
              }

              // 檢查管理員身份
              try {
                setAdminLoading(true)
                const adminResponse = await fetch('/api/admin/check-line-admin', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({ lineId: userProfile.userId }),
                })
                
                if (adminResponse.ok) {
                  const adminData = await adminResponse.json()
                  if (adminData.isAdmin) {
                    setIsAdmin(true)
                    setAdminInfo(adminData.adminInfo)
                    console.log('User is admin:', adminData.adminInfo)
                  }
                } else {
                  console.error('Failed to check admin status')
                }
              } catch (error) {
                console.error('Error checking admin status:', error)
              } finally {
                setAdminLoading(false)
              }
            }
          }
        } else {
          setError('LIFF 初始化失敗')
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : '未知錯誤')
      } finally {
        setLoading(false)
      }
    }

    init()
  }, [])

  const login = () => {
    console.log('Login clicked, isReady:', isReady)
    if (isReady) {
      console.log('Calling liffLogin()...')
      liffLogin()
    } else {
      console.log('LIFF not ready yet')
      setError('LIFF 尚未初始化完成，請稍後再試')
    }
  }

  return {
    isReady,
    isInLiff: isReady ? isInLiff() : false,
    isLoggedIn: isReady ? isLoggedIn() : false,
    profile,
    login,
    error,
    loading,
    isAdmin,
    adminInfo,
    adminLoading
  }
}
