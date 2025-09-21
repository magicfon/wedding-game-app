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
}

export const useLiff = (): UseLiffReturn => {
  const [isReady, setIsReady] = useState(false)
  const [profile, setProfile] = useState<LiffProfile | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true)
        const success = await initLiff()
        
        if (success) {
          setIsReady(true)
          
          // 如果已經登入，獲取用戶資料
          if (isLoggedIn()) {
            const userProfile = await getProfile()
            setProfile(userProfile)
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
    if (isReady) {
      liffLogin()
    }
  }

  return {
    isReady,
    isInLiff: isReady ? isInLiff() : false,
    isLoggedIn: isReady ? isLoggedIn() : false,
    profile,
    login,
    error,
    loading
  }
}
