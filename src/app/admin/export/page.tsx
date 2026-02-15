'use client'

import { useState, useRef, useEffect } from 'react'

const STAGES = [
    { label: '正在連接資料庫...', percent: 5, minMs: 2000 },
    { label: '正在抓取用戶與照片資料...', percent: 15, minMs: 3000 },
    { label: '正在下載賓客照片...', percent: 35, minMs: 8000 },
    { label: '正在下載婚紗照...', percent: 60, minMs: 15000 },
    { label: '正在生成 HTML 頁面...', percent: 80, minMs: 3000 },
    { label: '正在打包 ZIP 檔案...', percent: 90, minMs: 5000 },
    { label: '正在傳送...', percent: 95, minMs: 5000 },
]

export default function ExportPage() {
    const [status, setStatus] = useState<'idle' | 'exporting' | 'done' | 'error'>('idle')
    const [currentStage, setCurrentStage] = useState(0)
    const [smoothPercent, setSmoothPercent] = useState(0)
    const [elapsedTime, setElapsedTime] = useState(0)
    const [errorMsg, setErrorMsg] = useState('')
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
    const stageTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
    const downloadUrlRef = useRef<string | null>(null)
    const startTimeRef = useRef(0)

    // 清理
    useEffect(() => {
        return () => {
            if (timerRef.current) clearInterval(timerRef.current)
            if (stageTimerRef.current) clearInterval(stageTimerRef.current)
            if (downloadUrlRef.current) URL.revokeObjectURL(downloadUrlRef.current)
        }
    }, [])

    const startExport = async () => {
        setStatus('exporting')
        setCurrentStage(0)
        setSmoothPercent(2)
        setElapsedTime(0)
        setErrorMsg('')

        startTimeRef.current = Date.now()

        // 計時器
        timerRef.current = setInterval(() => {
            setElapsedTime(Math.floor((Date.now() - startTimeRef.current) / 1000))
        }, 1000)

        // 階段動畫 — 每隔一段時間前進到下一階段
        let stageIdx = 0
        const advanceStage = () => {
            if (stageIdx < STAGES.length - 1) {
                stageIdx++
                setCurrentStage(stageIdx)
                setSmoothPercent(STAGES[stageIdx].percent)
                stageTimerRef.current = setTimeout(advanceStage, STAGES[stageIdx].minMs)
            }
        }
        stageTimerRef.current = setTimeout(advanceStage, STAGES[0].minMs)

        try {
            // 直接下載 ZIP（乾淨的二進位回應）
            const response = await fetch('/api/admin/export-offline')
            if (!response.ok) {
                const text = await response.text()
                throw new Error(`HTTP ${response.status}: ${text}`)
            }

            const blob = await response.blob()
            if (blob.size < 100) {
                throw new Error('下載的檔案太小，可能匯出失敗')
            }

            downloadUrlRef.current = URL.createObjectURL(blob)
            setSmoothPercent(100)
            setCurrentStage(STAGES.length)
            setStatus('done')
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : '未知錯誤'
            setErrorMsg(message)
            setStatus('error')
        } finally {
            if (timerRef.current) clearInterval(timerRef.current)
            if (stageTimerRef.current) clearTimeout(stageTimerRef.current as unknown as number)
        }
    }

    const doDownload = () => {
        if (downloadUrlRef.current) {
            const a = document.createElement('a')
            a.href = downloadUrlRef.current
            a.download = `wedding-game-offline-${new Date().toISOString().split('T')[0]}.zip`
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
        }
    }

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60)
        const s = seconds % 60
        return m > 0 ? `${m}分${String(s).padStart(2, '0')}秒` : `${s}秒`
    }

    const stageLabel = currentStage < STAGES.length ? STAGES[currentStage].label : '匯出完成！'

    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #fce7f3 0%, #f3e8ff 50%, #e0e7ff 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            padding: '20px',
        }}>
            <div style={{
                background: 'white', borderRadius: '24px', padding: '40px',
                boxShadow: '0 20px 60px rgba(0,0,0,0.1)',
                maxWidth: '500px', width: '100%', textAlign: 'center',
            }}>
                {/* 標題 */}
                <div style={{ fontSize: '3rem', marginBottom: '12px' }}>📦</div>
                <h1 style={{
                    fontSize: '1.6rem', fontWeight: 700, marginBottom: '8px',
                    background: 'linear-gradient(135deg, #ec4899, #8b5cf6)',
                    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                }}>
                    離線匯出
                </h1>
                <p style={{ color: '#666', marginBottom: '30px', fontSize: '0.95rem' }}>
                    匯出所有遊戲資料為離線 HTML 頁面
                </p>

                {/* 閒置狀態 */}
                {status === 'idle' && (
                    <div>
                        <div style={{
                            background: '#f9fafb', borderRadius: '14px', padding: '20px',
                            marginBottom: '24px', textAlign: 'left', fontSize: '0.9rem', color: '#555',
                            lineHeight: 1.8,
                        }}>
                            <div style={{ fontWeight: 600, marginBottom: '10px' }}>📋 匯出內容包含：</div>
                            <div>👤 用戶與排行榜</div>
                            <div>📸 照片牆與祝福語</div>
                            <div>💒 婚紗照</div>
                            <div>❓ 問答紀錄</div>
                            <div>🗳️ 投票紀錄明細</div>
                            <div>🎰 抽獎紀錄</div>
                            <div>🖼️ 照片幻燈片</div>
                        </div>
                        <button onClick={startExport} style={{
                            background: 'linear-gradient(135deg, #ec4899, #8b5cf6)',
                            color: 'white', border: 'none', padding: '14px 40px',
                            borderRadius: '14px', fontSize: '1.1rem', fontWeight: 700,
                            cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s',
                            boxShadow: '0 4px 15px rgba(236,72,153,0.3)',
                        }}
                            onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(236,72,153,0.4)' }}
                            onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 15px rgba(236,72,153,0.3)' }}
                        >
                            🚀 開始匯出
                        </button>
                    </div>
                )}

                {/* 匯出中 */}
                {status === 'exporting' && (
                    <div>
                        {/* 進度條 */}
                        <div style={{
                            background: '#f3f4f6', borderRadius: '10px', height: '16px',
                            overflow: 'hidden', marginBottom: '16px',
                        }}>
                            <div style={{
                                height: '100%', borderRadius: '10px',
                                background: 'linear-gradient(90deg, #ec4899, #8b5cf6, #ec4899)',
                                backgroundSize: '200% 100%',
                                width: `${smoothPercent}%`,
                                transition: 'width 1.5s ease',
                                animation: 'shimmer 2s linear infinite',
                            }} />
                        </div>

                        {/* 百分比 */}
                        <div style={{ fontSize: '2.2rem', fontWeight: 700, color: '#8b5cf6', marginBottom: '8px' }}>
                            {smoothPercent}%
                        </div>

                        {/* 當前步驟 */}
                        <div style={{ color: '#555', fontSize: '1rem', marginBottom: '14px', fontWeight: 500 }}>
                            {stageLabel}
                        </div>

                        {/* 經過時間 */}
                        <div style={{ color: '#999', fontSize: '0.9rem', marginBottom: '20px' }}>
                            ⏱️ 已經過 {formatTime(elapsedTime)}
                        </div>

                        {/* 載入動畫 */}
                        <div>
                            <div style={{
                                display: 'inline-block', width: '44px', height: '44px',
                                border: '4px solid #f3f4f6', borderTopColor: '#ec4899',
                                borderRadius: '50%',
                                animation: 'spin 1s linear infinite',
                            }} />
                        </div>

                        <p style={{ marginTop: '16px', color: '#bbb', fontSize: '0.8rem' }}>
                            匯出過程可能需要 1-5 分鐘，請勿關閉此頁面
                        </p>

                        <style>{`
              @keyframes spin { to { transform: rotate(360deg) } }
              @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
            `}</style>
                    </div>
                )}

                {/* 完成 */}
                {status === 'done' && (
                    <div>
                        <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🎉</div>
                        <div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#059669', marginBottom: '8px' }}>
                            匯出完成！
                        </div>
                        <div style={{ color: '#666', fontSize: '0.95rem', marginBottom: '24px' }}>
                            耗時 {formatTime(elapsedTime)}
                        </div>
                        <button onClick={doDownload} style={{
                            background: 'linear-gradient(135deg, #10b981, #059669)',
                            color: 'white', border: 'none', padding: '16px 44px',
                            borderRadius: '14px', fontSize: '1.15rem', fontWeight: 700,
                            cursor: 'pointer', boxShadow: '0 4px 15px rgba(16,185,129,0.3)',
                            transition: 'transform 0.2s',
                            marginBottom: '16px',
                        }}
                            onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                            onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                        >
                            📥 下載 ZIP 檔案
                        </button>
                        <div style={{ marginTop: '14px' }}>
                            <button onClick={() => { setStatus('idle'); downloadUrlRef.current = null; setSmoothPercent(0) }} style={{
                                background: 'transparent', border: '2px solid #e5e7eb',
                                padding: '10px 24px', borderRadius: '10px', fontSize: '0.9rem',
                                cursor: 'pointer', color: '#666',
                            }}>
                                🔄 重新匯出
                            </button>
                        </div>
                        <p style={{ marginTop: '20px', fontSize: '0.85rem', color: '#999', lineHeight: 1.6 }}>
                            下載 ZIP 後解壓縮<br />打開 <b>index.html</b> 即可離線瀏覽所有頁面
                        </p>
                    </div>
                )}

                {/* 錯誤 */}
                {status === 'error' && (
                    <div>
                        <div style={{ fontSize: '3rem', marginBottom: '16px' }}>❌</div>
                        <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#dc2626', marginBottom: '8px' }}>
                            匯出失敗
                        </div>
                        <div style={{
                            background: '#fef2f2', borderRadius: '10px', padding: '14px',
                            marginBottom: '20px', color: '#991b1b', fontSize: '0.9rem',
                            wordBreak: 'break-all',
                        }}>
                            {errorMsg}
                        </div>
                        <button onClick={() => { setStatus('idle'); setSmoothPercent(0) }} style={{
                            background: 'linear-gradient(135deg, #ec4899, #8b5cf6)',
                            color: 'white', border: 'none', padding: '12px 30px',
                            borderRadius: '12px', fontSize: '1rem', fontWeight: 600, cursor: 'pointer',
                        }}>
                            🔄 重試
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}
