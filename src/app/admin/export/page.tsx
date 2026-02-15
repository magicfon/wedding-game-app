'use client'

import { useState, useRef } from 'react'

interface ProgressStep {
    step: string
    percent: number
}

export default function ExportPage() {
    const [status, setStatus] = useState<'idle' | 'exporting' | 'done' | 'error'>('idle')
    const [progress, setProgress] = useState<ProgressStep>({ step: '', percent: 0 })
    const [elapsedTime, setElapsedTime] = useState(0)
    const [errorMsg, setErrorMsg] = useState('')
    const timerRef = useRef<NodeJS.Timeout | null>(null)
    const downloadUrlRef = useRef<string | null>(null)

    const startExport = async () => {
        setStatus('exporting')
        setProgress({ step: '正在連接資料庫...', percent: 2 })
        setElapsedTime(0)
        setErrorMsg('')

        // 計時器
        const startTime = Date.now()
        timerRef.current = setInterval(() => {
            setElapsedTime(Math.floor((Date.now() - startTime) / 1000))
        }, 1000)

        try {
            const response = await fetch('/api/admin/export-offline?stream=1')
            if (!response.ok) throw new Error(`HTTP ${response.status}`)
            if (!response.body) throw new Error('No response body')

            const reader = response.body.getReader()
            const decoder = new TextDecoder()
            let buffer = ''
            let zipChunks: Uint8Array[] = []
            let receivingZip = false

            while (true) {
                const { done, value } = await reader.read()
                if (done) break

                if (receivingZip) {
                    zipChunks.push(value)
                    continue
                }

                buffer += decoder.decode(value, { stream: true })

                // 檢查是否切換到 ZIP 二進位模式
                const zipMarkerIdx = buffer.indexOf('\n---ZIP_START---\n')
                if (zipMarkerIdx !== -1) {
                    // 處理 marker 前的 SSE 事件
                    const textPart = buffer.substring(0, zipMarkerIdx)
                    processSSEText(textPart)
                    // marker 後的可能有部分 ZIP 二進位資料
                    const afterMarker = buffer.substring(zipMarkerIdx + '\n---ZIP_START---\n'.length)
                    if (afterMarker.length > 0) {
                        zipChunks.push(new TextEncoder().encode(afterMarker))
                    }
                    receivingZip = true
                    setProgress({ step: '正在下載打包檔案...', percent: 95 })
                    continue
                }

                processSSEText(buffer)
                // 保留最後一行（可能不完整）
                const lastNewline = buffer.lastIndexOf('\n')
                if (lastNewline !== -1) {
                    buffer = buffer.substring(lastNewline + 1)
                }
            }

            // 建立下載 Blob
            if (zipChunks.length > 0) {
                const blob = new Blob(zipChunks as BlobPart[], { type: 'application/zip' })
                downloadUrlRef.current = URL.createObjectURL(blob)
            }

            setProgress({ step: '匯出完成！', percent: 100 })
            setStatus('done')
        } catch (err: any) {
            setErrorMsg(err.message || '未知錯誤')
            setStatus('error')
        } finally {
            if (timerRef.current) clearInterval(timerRef.current)
        }
    }

    const processSSEText = (text: string) => {
        const lines = text.split('\n')
        for (const line of lines) {
            if (line.startsWith('data: ')) {
                try {
                    const data = JSON.parse(line.substring(6))
                    if (data.step && data.percent !== undefined) {
                        setProgress({ step: data.step, percent: data.percent })
                    }
                } catch { /* skip malformed lines */ }
            }
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
        return m > 0 ? `${m}分${s}秒` : `${s}秒`
    }

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
                            background: '#f3f4f6', borderRadius: '10px', height: '14px',
                            overflow: 'hidden', marginBottom: '16px',
                        }}>
                            <div style={{
                                height: '100%', borderRadius: '10px',
                                background: 'linear-gradient(90deg, #ec4899, #8b5cf6)',
                                width: `${progress.percent}%`,
                                transition: 'width 0.5s ease',
                            }} />
                        </div>

                        {/* 百分比 */}
                        <div style={{ fontSize: '2rem', fontWeight: 700, color: '#8b5cf6', marginBottom: '8px' }}>
                            {progress.percent}%
                        </div>

                        {/* 當前步驟 */}
                        <div style={{ color: '#666', fontSize: '0.95rem', marginBottom: '12px' }}>
                            {progress.step}
                        </div>

                        {/* 經過時間 */}
                        <div style={{ color: '#999', fontSize: '0.85rem' }}>
                            ⏱️ 已經過 {formatTime(elapsedTime)}
                        </div>

                        {/* 載入動畫 */}
                        <div style={{ marginTop: '20px' }}>
                            <div style={{
                                display: 'inline-block', width: '40px', height: '40px',
                                border: '4px solid #f3f4f6', borderTopColor: '#ec4899',
                                borderRadius: '50%',
                                animation: 'spin 1s linear infinite',
                            }} />
                        </div>
                        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
                    </div>
                )}

                {/* 完成 */}
                {status === 'done' && (
                    <div>
                        <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🎉</div>
                        <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#059669', marginBottom: '8px' }}>
                            匯出完成！
                        </div>
                        <div style={{ color: '#666', fontSize: '0.9rem', marginBottom: '24px' }}>
                            耗時 {formatTime(elapsedTime)}
                        </div>
                        <button onClick={doDownload} style={{
                            background: 'linear-gradient(135deg, #10b981, #059669)',
                            color: 'white', border: 'none', padding: '14px 40px',
                            borderRadius: '14px', fontSize: '1.1rem', fontWeight: 700,
                            cursor: 'pointer', boxShadow: '0 4px 15px rgba(16,185,129,0.3)',
                            transition: 'transform 0.2s',
                            marginBottom: '12px',
                        }}
                            onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                            onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                        >
                            📥 下載 ZIP 檔案
                        </button>
                        <div style={{ marginTop: '16px' }}>
                            <button onClick={() => { setStatus('idle'); downloadUrlRef.current = null }} style={{
                                background: 'transparent', border: '2px solid #e5e7eb',
                                padding: '10px 24px', borderRadius: '10px', fontSize: '0.9rem',
                                cursor: 'pointer', color: '#666',
                            }}>
                                🔄 重新匯出
                            </button>
                        </div>
                        <p style={{ marginTop: '16px', fontSize: '0.85rem', color: '#999' }}>
                            下載 ZIP 後解壓縮，打開 index.html 即可瀏覽
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
                        }}>
                            {errorMsg}
                        </div>
                        <button onClick={() => setStatus('idle')} style={{
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
