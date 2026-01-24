'use client'

import { useState, useEffect, useRef } from 'react'
import { Gift } from 'lucide-react'

interface Photo {
  id: number
  image_url: string
  user_id: string
  display_name: string
  avatar_url: string
}

interface LotteryMachineState {
  is_lottery_active: boolean
  is_drawing: boolean
  current_draw_id: number | null
}

interface Winner {
  photo: Photo
  order: number
}

interface TrackNode {
  id: number
  x: number
  y: number
}

interface TrackConfig {
  startPoint: { x: number; y: number }
  endPoint: { x: number; y: number }
  nodes: TrackNode[]
}

export default function LotteryMachineLivePage() {
  const [photos, setPhotos] = useState<Photo[]>([])
  const [winners, setWinners] = useState<Winner[]>([])
  const [lotteryState, setLotteryState] = useState<LotteryMachineState>({
    is_lottery_active: false,
    is_drawing: false,
    current_draw_id: null
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [trackConfig, setTrackConfig] = useState<TrackConfig>({
    startPoint: { x: 50, y: 75 },
    endPoint: { x: 15, y: 8 },
    nodes: [
      { id: 1, x: 95, y: 75 },
      { id: 2, x: 95, y: 55 },
      { id: 3, x: 5, y: 55 },
      { id: 4, x: 5, y: 25 },
      { id: 5, x: 25, y: 25 }
    ]
  })
  const [isEditorMode, setIsEditorMode] = useState(false)
  const [draggingNode, setDraggingNode] = useState<{ type: 'start' | 'end' | 'node', index?: number } | null>(null)

  const chamberRef = useRef<HTMLDivElement>(null)
  const photosContainerRef = useRef<HTMLDivElement>(null)
  const platformSlotsRef = useRef<HTMLDivElement>(null)
  const animationFrameRef = useRef<number | null>(null)

  // 載入照片
  useEffect(() => {
    fetchPhotos()
  }, [])

  // 照片載入後啟動彈跳動畫
  useEffect(() => {
    if (photos.length > 0) {
      // 等待 DOM 渲染完成後再啟動動畫
      const timer = setTimeout(() => {
        if (chamberRef.current && photosContainerRef.current) {
          startBounceAnimation()
        }
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [photos])

  // 待機狀態也顯示氣泡效果
  useEffect(() => {
    const airBubbles = document.getElementById('airBubbles')
    if (!airBubbles) return
    
    const bubbleInterval = setInterval(() => {
      const bubble = document.createElement('div')
      bubble.className = 'bubble'
      bubble.style.left = `${10 + Math.random() * 80}%`
      bubble.style.animationDuration = `${1 + Math.random() * 0.5}s`
      bubble.style.width = `${4 + Math.random() * 6}px`
      bubble.style.height = bubble.style.width
      airBubbles.appendChild(bubble)
      setTimeout(() => bubble.remove(), 1400)
    }, 100)
    
    return () => clearInterval(bubbleInterval)
  }, [])

  // 訂閱 Realtime 更新
  useEffect(() => {
    const eventSource = new EventSource('/api/lottery-machine/state/stream')

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data)
      console.log('Realtime 更新:', data)

      if (data.type === 'lottery_state') {
        setLotteryState(data.state)
      } else if (data.type === 'new_winner') {
        setWinners(prev => [...prev, data.winner])
      }
    }

    eventSource.onerror = () => {
      console.error('Realtime 連接錯誤')
      setError('無法連接到即時更新')
    }

    return () => {
      eventSource.close()
    }
  }, [])

  const fetchPhotos = async () => {
    try {
      const response = await fetch('/api/lottery-machine/photos')
      const data = await response.json()

      if (data.success) {
        setPhotos(data.photos || [])
        setLoading(false)
      } else {
        setError(data.error || '載入照片失敗')
        setLoading(false)
      }
    } catch (err) {
      console.error('載入照片失敗:', err)
      setError('載入照片失敗')
      setLoading(false)
    }
  }

  const startBounceAnimation = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
    }

    const container = photosContainerRef.current
    if (!container) return

    const photoElements = container.querySelectorAll('.photo-item')
    const chamberRect = chamberRef.current?.getBoundingClientRect()
    if (!chamberRect || photoElements.length === 0) return

    // 初始化照片位置到腔體內
    const photoSize = 42 // 彩球直徑
    photoElements.forEach((photoEl: Element) => {
      const el = photoEl as HTMLElement
      const currentLeft = parseFloat(el.style.left || '0')
      const currentTop = parseFloat(el.style.top || '0')
      
      // 確保照片在腔體範圍內
      let x = Math.min(Math.max(0, currentLeft), chamberRect.width - photoSize)
      let y = Math.min(Math.max(0, currentTop), chamberRect.height - photoSize)
      
      // 如果照片在腔體外，重新定位到中心
      if (x < 0 || x > chamberRect.width - photoSize || y < 0 || y > chamberRect.height - photoSize) {
        x = (chamberRect.width - photoSize) / 2 + (Math.random() - 0.5) * 50
        y = (chamberRect.height - photoSize) / 2 + (Math.random() - 0.5) * 50
      }
      
      el.style.left = `${x}px`
      el.style.top = `${y}px`
      
      // 確保有速度
      if (!el.dataset.vx || el.dataset.vx === '0') {
        el.dataset.vx = ((Math.random() - 0.5) * 10).toString()
      }
      if (!el.dataset.vy || el.dataset.vy === '0') {
        el.dataset.vy = ((Math.random() - 0.5) * 10).toString()
      }
    })

    const animate = () => {
      photoElements.forEach((photoEl: Element) => {
        const el = photoEl as HTMLElement
        const x = parseFloat(el.style.left || '0')
        const y = parseFloat(el.style.top || '0')
        const vx = parseFloat(el.dataset.vx || '0')
        const vy = parseFloat(el.dataset.vy || '0')
        
        // 重力
        let newVy = vy + 0.35
        
        // 氣流力
        const bottomFactor = y / chamberRect.height
        newVy -= 0.8 * (0.5 + bottomFactor * 1.5)
        
        // 側向氣流力
        const horizontalFactor = x / chamberRect.width
        const newVx = vx + (Math.random() - 0.5) * 0.4 + (Math.random() - 0.5) * 0.2
        
        // 摩擦力
        const friction = 0.995
        const finalVx = newVx * friction
        const finalVy = newVy * friction
        
        // 速度限制
        const maxVelocity = 15
        let clampedVx = finalVx
        let clampedVy = finalVy
        
        if (Math.abs(clampedVx) > maxVelocity) {
          clampedVx = Math.sign(clampedVx) * maxVelocity
        }
        if (Math.abs(clampedVy) > maxVelocity) {
          clampedVy = Math.sign(clampedVy) * maxVelocity
        }
        
        // 最小速度
        const minVelocity = 4
        const speed = Math.sqrt(clampedVx * clampedVx + clampedVy * clampedVy)
        if (speed < minVelocity) {
          const angle = Math.random() * Math.PI * 2
          clampedVx += Math.cos(angle) * minVelocity * 0.5
          clampedVy += Math.sin(angle) * minVelocity * 0.5
        }
        
        // 更新位置
        let newX = x + clampedVx
        let newY = y + clampedVy
        
        // 邊界碰撞
        const containerWidth = chamberRect.width
        const containerHeight = chamberRect.height
        
        if (newX < 0) {
          newX = 0
          clampedVx = -clampedVx * 0.85
        } else if (newX > containerWidth - photoSize) {
          newX = containerWidth - photoSize
          clampedVx = -clampedVx * 0.85
        }
        
        if (newY < 0) {
          newY = 0
          clampedVy = -clampedVy * 0.85
        } else if (newY > containerHeight - photoSize) {
          newY = containerHeight - photoSize
          clampedVy = -clampedVy * 0.85
          // 底部額外氣流力
          clampedVy -= 0.8 * 3
        }
        
        // 旋轉
        const rotation = parseFloat(el.dataset.rotation || '0')
        const rotationSpeed = parseFloat(el.dataset.rotationSpeed || '0')
        const newRotation = rotation + rotationSpeed + clampedVx * 0.5
        
        // 更新 DOM
        el.style.left = `${newX}px`
        el.style.top = `${newY}px`
        el.style.transform = `rotate(${newRotation}deg)`
        
        // 更新資料屬性
        el.dataset.vx = clampedVx.toString()
        el.dataset.vy = clampedVy.toString()
        el.dataset.rotation = newRotation.toString()
      })
      
      animationFrameRef.current = requestAnimationFrame(animate)
    }
    
    animate()
  }

  const drawWinner = async () => {
    if (lotteryState.is_drawing || photos.length === 0) return
    
    try {
      const response = await fetch('/api/lottery-machine/draw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      const data = await response.json()
      
      if (data.success) {
        setLotteryState(prev => ({ ...prev, is_drawing: true }))
        
        // 動畫效果
        await animateWinnerSelection(data.winner)
        
        setWinners(prev => [...prev, { photo: data.winner, order: prev.length + 1 }])
        setLotteryState(prev => ({ ...prev, is_drawing: false }))
      } else {
        setError(data.error || '抽獎失敗')
      }
    } catch (err) {
      console.error('抽獎失敗:', err)
      setError('抽獎失敗')
    }
  }

  const animateWinnerSelection = (winner: Photo): Promise<void> => {
    return new Promise(resolve => {
      // 選中一個照片並高亮
      const container = photosContainerRef.current
      if (!container) return
      
      const photoElements = container.querySelectorAll('.photo-item')
      const winnerEl = Array.from(photoElements).find((el: Element) => {
        const photoId = parseInt((el as HTMLElement).dataset.id || '0')
        return photoId === winner.id
      })
      
      if (winnerEl) {
        winnerEl.classList.add('selected')
        
        // 2秒後揭曉
        setTimeout(() => {
          resolve()
        }, 2000)
      } else {
        resolve()
      }
    })
  }

  const addToPlatform = (winner: Winner) => {
    const platformSlots = platformSlotsRef.current
    if (!platformSlots) return
    
    const winnerEl = document.createElement('div')
    winnerEl.className = 'platform-winner'
    winnerEl.innerHTML = `
      <div class="platform-winner-photo">
        <img src="${winner.photo.image_url}" alt="${winner.photo.display_name}">
      </div>
      <div class="platform-winner-rank">#${winner.order}</div>
    `
    platformSlots.appendChild(winnerEl)
  }

  // 拖曳處理
  const handleDragStart = (e: React.MouseEvent, type: 'start' | 'end' | 'node', index?: number) => {
    e.preventDefault()
    setDraggingNode({ type, index })
  }

  const handleDragMove = (e: React.MouseEvent) => {
    if (!draggingNode) return
    
    const rect = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    
    const clampedX = Math.max(0, Math.min(100, x))
    const clampedY = Math.max(0, Math.min(100, y))
    
    if (draggingNode.type === 'start') {
      setTrackConfig(prev => ({ ...prev, startPoint: { x: clampedX, y: clampedY } }))
    } else if (draggingNode.type === 'end') {
      setTrackConfig(prev => ({ ...prev, endPoint: { x: clampedX, y: clampedY } }))
    } else if (draggingNode.type === 'node' && draggingNode.index !== undefined) {
      setTrackConfig(prev => ({
        ...prev,
        nodes: prev.nodes.map((n, i) => i === draggingNode.index ? { ...n, x: clampedX, y: clampedY } : n)
      }))
    }
  }

  const handleDragEnd = () => {
    setDraggingNode(null)
  }

  const addNode = () => {
    const newId = trackConfig.nodes.length + 1
    const lastNode = trackConfig.nodes[trackConfig.nodes.length - 1] || trackConfig.startPoint
    setTrackConfig(prev => ({
      ...prev,
      nodes: [
        ...prev.nodes,
        {
          id: newId,
          x: Math.min(95, lastNode.x + 10),
          y: Math.max(5, lastNode.y - 10)
        }
      ]
    }))
  }

  const removeNode = (index: number) => {
    setTrackConfig(prev => ({
      ...prev,
      nodes: prev.nodes.filter((_, i) => i !== index).map((n, i) => ({ ...n, id: i + 1 }))
    }))
  }

  const saveTrackConfig = async () => {
    try {
      const response = await fetch('/api/lottery-machine/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trackConfig })
      })
      const data = await response.json()
      if (data.success) {
        alert('軌道設定已儲存')
      } else {
        alert('儲存失敗: ' + data.error)
      }
    } catch (err) {
      alert('儲存失敗')
    }
  }

  // 生成貝茲曲線路徑
  const generateTrackPath = () => {
    const { startPoint, endPoint, nodes } = trackConfig
    const containerWidth = window.innerWidth
    const containerHeight = window.innerHeight
    
    const start = { x: (startPoint.x / 100) * containerWidth, y: (startPoint.y / 100) * containerHeight }
    const end = { x: (endPoint.x / 100) * containerWidth, y: (endPoint.y / 100) * containerHeight }
    
    const controlPoints = nodes.map(n => ({
      x: (n.x / 100) * containerWidth,
      y: (n.y / 100) * containerHeight
    }))
    
    if (controlPoints.length === 0) {
      return `M ${start.x},${start.y} L ${end.x},${end.y}`
    }
    
    let path = `M ${start.x},${start.y}`
    for (let i = 0; i < controlPoints.length; i++) {
      const cp = controlPoints[i]
      if (i === controlPoints.length - 1) {
        path += ` Q ${cp.x},${cp.y} ${end.x},${end.y}`
      } else {
        const nextCp = controlPoints[i + 1]
        const midX = (cp.x + nextCp.x) / 2
        const midY = (cp.y + nextCp.y) / 2
        path += ` Q ${cp.x},${cp.y} ${midX},${midY}`
      }
    }
    
    return path
  }

  // 氣泡效果
  useEffect(() => {
    if (!lotteryState.is_lottery_active) return
    
    const airBubbles = document.getElementById('airBubbles')
    if (!airBubbles) return
    
    const bubbleInterval = setInterval(() => {
      const bubble = document.createElement('div')
      bubble.className = 'bubble'
      bubble.style.left = `${10 + Math.random() * 80}%`
      bubble.style.animationDuration = `${1 + Math.random() * 0.5}s`
      bubble.style.width = `${4 + Math.random() * 6}px`
      bubble.style.height = bubble.style.width
      airBubbles.appendChild(bubble)
      setTimeout(() => bubble.remove(), 1400)
    }, 100)
    
    return () => clearInterval(bubbleInterval)
  }, [lotteryState.is_lottery_active])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-100 via-purple-100 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <Gift className="w-32 h-32 text-gray-400 mx-auto mb-8 animate-pulse" />
          <h1 className="text-4xl font-bold text-gray-600 mb-4">彩票機</h1>
          <p className="text-xl text-gray-500">載入中...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-100 via-purple-100 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <Gift className="w-32 h-32 text-red-400 mx-auto mb-8" />
          <h1 className="text-4xl font-bold text-gray-600 mb-4">發生錯誤</h1>
          <p className="text-xl text-red-600">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="lottery-machine-live-page">
      {/* 標題 */}
      <div className="title">🎰 幸運抽獎機 🎰</div>

      {/* 編輯器控制按鈕 */}
      <div className="editor-controls">
        <button
          onClick={() => setIsEditorMode(!isEditorMode)}
          className={`editor-btn ${isEditorMode ? 'active' : ''}`}
        >
          {isEditorMode ? '✓ 完成編輯' : '✏️ 編輯軌道'}
        </button>
        {isEditorMode && (
          <>
            <button onClick={addNode} className="editor-btn">➕ 新增節點</button>
            <button onClick={saveTrackConfig} className="editor-btn save">💾 儲存設定</button>
          </>
        )}
      </div>

      {/* 主要內容區域 */}
      <div className="main-content" onMouseMove={handleDragMove} onMouseUp={handleDragEnd}>
        {/* 中獎者平台 */}
        <div className="winners-platform">
          <div className="platform-surface">
            <div className="platform-slots" ref={platformSlotsRef}>
              {winners.length === 0 && <span className="placeholder">等待得獎者...</span>}
            </div>
          </div>
          <div className="platform-base"></div>
        </div>

        {/* 軌道容器 */}
        <div className="track-container">
          {/* SVG 軌道 */}
          <div className="track-svg-container">
            <svg xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="trackGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" style={{ stopColor: 'rgba(100, 180, 255, 0.7)' }} />
                  <stop offset="50%" style={{ stopColor: 'rgba(150, 120, 200, 0.7)' }} />
                  <stop offset="100%" style={{ stopColor: 'rgba(200, 100, 150, 0.7)' }} />
                </linearGradient>
              </defs>
              <path id="trackPath" className="track-path" d={generateTrackPath()} />
            </svg>
          </div>

          {/* 軌道編輯器 */}
          {isEditorMode && (
            <div className="track-editor">
              {/* 起點 */}
              <div
                className={`track-node track-node-start ${draggingNode?.type === 'start' ? 'dragging' : ''}`}
                style={{
                  left: `${trackConfig.startPoint.x}%`,
                  top: `${trackConfig.startPoint.y}%`
                }}
                onMouseDown={(e) => handleDragStart(e, 'start')}
              >
                <span className="node-label">起點</span>
              </div>

              {/* 終點 */}
              <div
                className={`track-node track-node-end ${draggingNode?.type === 'end' ? 'dragging' : ''}`}
                style={{
                  left: `${trackConfig.endPoint.x}%`,
                  top: `${trackConfig.endPoint.y}%`
                }}
                onMouseDown={(e) => handleDragStart(e, 'end')}
              >
                <span className="node-label">終點</span>
              </div>

              {/* 節點 */}
              {trackConfig.nodes.map((node, index) => (
                <div
                  key={node.id}
                  className={`track-node ${draggingNode?.type === 'node' && draggingNode.index === index ? 'dragging' : ''}`}
                  style={{
                    left: `${node.x}%`,
                    top: `${node.y}%`
                  }}
                  onMouseDown={(e) => handleDragStart(e, 'node', index)}
                >
                  <span className="node-label">{node.id}</span>
                  <button
                    className="node-delete"
                    onClick={(e) => {
                      e.stopPropagation()
                      removeNode(index)
                    }}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 彩票機腔體 */}
        <div className="lottery-machine" ref={chamberRef}>
          <div className="chamber">
            <div className="chamber-glass"></div>
            
            <div className="photos-container" ref={photosContainerRef}>
              {photos.map(photo => (
                <div
                  key={photo.id}
                  className="photo-item"
                  data-id={photo.id}
                  data-vx={(Math.random() - 0.5) * 15}
                  data-vy={(Math.random() - 0.5) * 15}
                  data-rotation={Math.random() * 360}
                  data-rotation-speed={(Math.random() - 0.5) * 8}
                  style={{
                    left: `${Math.random() * 400}px`,
                    top: `${Math.random() * 200}px`
                  }}
                >
                  <img src={photo.image_url} alt={photo.display_name} />
                </div>
              ))}
            </div>

            {/* 底部氣流口 */}
            <div className="air-vents">
              <div className="vent"></div>
              <div className="vent"></div>
              <div className="vent"></div>
              <div className="vent"></div>
              <div className="vent"></div>
            </div>
            
            {/* 氣泡效果 */}
            <div className="air-bubbles" id="airBubbles"></div>
          </div>
        </div>
      </div>

      {/* 控制面板 */}
      <div className="control-panel">
        <button
          onClick={drawWinner}
          disabled={lotteryState.is_drawing || photos.length === 0}
          className="btn btn-draw"
        >
          <span className="btn-text">🎲 抽出得獎者</span>
          <span className="btn-glow"></span>
        </button>
        <button
          onClick={() => setWinners([])}
          className="btn btn-reset"
        >
          <span className="btn-text">🔄 重置</span>
        </button>
      </div>

      {/* 彩紙效果容器 */}
      <div className="confetti-container"></div>

      <style jsx>{`
        .lottery-machine-live-page {
          width: 100vw;
          height: 100vh;
          background: linear-gradient(135deg, #0a0a1a 0%, #16213e 100%);
          background-image:
            radial-gradient(ellipse at top, rgba(102, 126, 234, 0.15) 0%, transparent 50%),
            radial-gradient(ellipse at bottom, rgba(245, 87, 108, 0.1) 0%, transparent 50%);
          color: white;
          font-family: 'Outfit', sans-serif;
          overflow: hidden;
        }

        .title {
          text-align: center;
          font-size: clamp(1.1rem, 2.2vw, 1.8rem);
          font-weight: 700;
          background: linear-gradient(135deg, #f5af19 0%, #f12711 100%);
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          text-fill-color: transparent;
          padding: 12px 20px;
          margin-bottom: 8px;
          animation: titlePulse 2s ease-in-out infinite;
        }

        @keyframes titlePulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.02); }
        }

        .main-content {
          flex: 1;
          position: relative;
          min-height: 0;
        }

        .winners-platform {
          position: absolute;
          top: 5vh;
          left: 5%;
          width: clamp(180px, 15vw, 280px);
          z-index: 20;
        }

        .platform-surface {
          background: linear-gradient(180deg, #3a4a6e 0%, #2a3a5e 100%);
          border-radius: clamp(10px, 1vw, 14px) 0 0;
          padding: clamp(6px, 0.6vw, 10px);
          min-height: clamp(30px, 3vh, 50px);
          height: clamp(60px, 6vh, 100px);
          border: clamp(2px, 0.2vw, 3px) solid rgba(255,255,255,0.2);
          border-bottom: none;
          box-shadow: 0 -8px 30px rgba(102,126,234,0.3), inset 0 2px 10px rgba(255,255,255,0.1);
          transition: height 0.1s ease;
        }

        .platform-slots {
          display: flex;
          gap: clamp(6px, 0.6vw, 10px);
          justify-content: flex-start;
          align-items: center;
          flex-wrap: nowrap;
          min-height: clamp(40px, 4vh, 65px);
          overflow-x: auto;
        }

        .platform-slots .placeholder {
          color: rgba(255,255,255,0.7);
          font-size: clamp(0.6rem, 0.8vw, 0.8rem);
        }

        .platform-base {
          height: clamp(4px, 0.4vw, 8px);
          background: linear-gradient(180deg, #4a5a7e 0%, #2a3a5e 100%);
          border-radius: 0 0 clamp(6px, 0.6vw, 10px) clamp(6px, 0.6vw, 10px);
        }

        .platform-winner {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
          animation: winnerLand 0.5s ease-out;
        }

        @keyframes winnerLand {
          0% { transform: translateX(40px) scale(0.5); opacity: 0; }
          60% { transform: translateX(-3px) scale(1.1); }
          100% { transform: translateX(0) scale(1); opacity: 1; }
        }

        .platform-winner-photo {
          width: clamp(24px, 2.5vw, 40px);
          height: clamp(24px, 2.5vw, 40px);
          border-radius: 50%;
          overflow: hidden;
          border: clamp(2px, 0.2vw, 3px) solid #ffd700;
          box-shadow: 0 0 clamp(8px, 0.8vw, 12px) rgba(255,215,0,0.4);
          transition: width 0.2s ease, height 0.2s ease;
        }

        .platform-winner-photo img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .platform-winner-rank {
          font-size: clamp(0.4rem, 0.5vw, 0.6rem);
          color: #ffd700;
          background: rgba(255,215,0,0.15);
          padding: clamp(1px, 0.1vw, 2px) clamp(3px, 0.3vw, 5px);
          border-radius: clamp(4px, 0.4vw, 6px);
          font-weight: 600;
        }

        .track-container {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          z-index: 5;
          pointer-events: none;
        }

        .track-svg-container {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          z-index: 4;
        }

        .track-svg-container svg {
          width: 100%;
          height: 100%;
        }

        .track-path {
          fill: none;
          stroke: url(#trackGradient);
          stroke-width: 32;
          stroke-linecap: round;
          stroke-linejoin: round;
          filter: drop-shadow(0 2px 8px rgba(100,150,255,0.4));
        }

        .editor-controls {
          position: fixed;
          top: 16px;
          right: 16px;
          display: flex;
          gap: 8px;
          z-index: 1000;
        }

        .editor-btn {
          padding: 8px 16px;
          background: rgba(255, 255, 255, 0.1);
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-radius: 8px;
          color: white;
          font-size: 0.85rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .editor-btn:hover {
          background: rgba(255, 255, 255, 0.2);
          transform: translateY(-2px);
        }

        .editor-btn.active {
          background: linear-gradient(135deg, #f5af19 0%, #f12711 100%);
          border-color: #f5af19;
        }

        .editor-btn.save {
          background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
          border-color: #4CAF50;
        }

        .track-editor {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: auto;
          z-index: 50;
        }

        .track-node {
          position: absolute;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: move;
          transform: translate(-50%, -50%);
          transition: transform 0.1s ease, box-shadow 0.1s ease;
          z-index: 100;
        }

        .track-node:hover {
          transform: translate(-50%, -50%) scale(1.1);
        }

        .track-node.dragging {
          transform: translate(-50%, -50%) scale(1.2);
          box-shadow: 0 0 20px rgba(255, 215, 0, 0.8);
        }

        .track-node-start {
          background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
          border: 3px solid #81C784;
          box-shadow: 0 4px 15px rgba(76, 175, 80, 0.4);
        }

        .track-node-end {
          background: linear-gradient(135deg, #f44336 0%, #d32f2f 100%);
          border: 3px solid #E57373;
          box-shadow: 0 4px 15px rgba(244, 67, 54, 0.4);
        }

        .track-node:not(.track-node-start):not(.track-node-end) {
          background: linear-gradient(135deg, #2196F3 0%, #1976D2 100%);
          border: 3px solid #64B5F6;
          box-shadow: 0 4px 15px rgba(33, 150, 243, 0.4);
        }

        .node-label {
          color: white;
          font-size: 0.7rem;
          font-weight: 700;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
          pointer-events: none;
        }

        .node-delete {
          position: absolute;
          top: -8px;
          right: -8px;
          width: 20px;
          height: 20px;
          background: #f44336;
          border: 2px solid white;
          border-radius: 50%;
          color: white;
          font-size: 0.7rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          transition: opacity 0.2s ease;
        }

        .track-node:hover .node-delete {
          opacity: 1;
        }

        .node-delete:hover {
          background: #d32f2f;
          transform: scale(1.1);
        }

        .lottery-machine {
          position: absolute;
          bottom: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 55%;
          max-width: clamp(320px, 35vw, 520px);
          z-index: 10;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .chamber {
          position: relative;
          width: 100%;
          height: clamp(160px, 18vh, 280px);
          background: linear-gradient(180deg, #1a1a2e 0%, #16213e 100%);
          border-radius: clamp(14px, 1.4vw, 24px) 0 clamp(8px, 0.8vw, 14px) clamp(8px, 0.8vw, 14px);
          overflow: hidden;
          box-shadow: 0 0 clamp(35px, 3.5vw, 60px) rgba(102,126,234,0.35), inset 0 0 clamp(55px, 5.5vw, 90px) rgba(0,0,0,0.5);
          border: clamp(2px, 0.2vw, 3px) solid rgba(255,255,255,0.2);
        }

        .chamber-glass {
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, rgba(255,255,255,0.1) 0%, transparent 50%, rgba(255,255,255,0.05) 100%);
          pointer-events: none;
          z-index: 10;
        }

        .photos-container {
          position: absolute;
          top: clamp(6px, 0.6vw, 10px);
          left: clamp(6px, 0.6vw, 10px);
          right: clamp(6px, 0.6vw, 10px);
          bottom: clamp(18px, 2vh, 30px);
          overflow: hidden;
        }

        .photo-item {
          position: absolute;
          width: clamp(30px, 3.5vw, 55px);
          height: clamp(30px, 3.5vw, 55px);
          border-radius: 50%;
          overflow: hidden;
          box-shadow: 0 clamp(1px, 0.1vw, 3px) clamp(6px, 0.6vw, 10px) rgba(0,0,0,0.4);
          border: clamp(1px, 0.1vw, 2px) solid rgba(255,255,255,0.3);
          cursor: pointer;
          will-change: transform, left, top;
          z-index: 1;
        }

        .photo-item img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .photo-item.selected {
          z-index: 100;
          border-color: #ffd700;
          box-shadow: 0 0 clamp(14px, 1.5vw, 25px) rgba(255,215,0,0.8);
          animation: selectedPulse 0.4s ease-in-out infinite;
        }

        @keyframes selectedPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }

        .air-vents {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: clamp(14px, 1.5vh, 24px);
          display: flex;
          justify-content: space-evenly;
          align-items: center;
          background: linear-gradient(180deg, #1a1a2e 0%, #0a0a15 100%);
          border-top: clamp(1px, 0.1vw, 2px) solid rgba(255,255,255,0.1);
          border-radius: 0 0 clamp(6px, 0.6vw, 10px) clamp(6px, 0.6vw, 10px);
        }

        .vent {
          width: clamp(18px, 2vw, 32px);
          height: clamp(6px, 0.6vw, 10px);
          background: linear-gradient(180deg, #2a3a5e 0%, #1a2540 100%);
          border-radius: clamp(2px, 0.2vw, 4px);
          position: relative;
        }

        .vent::after {
          content: '';
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: clamp(8px, 0.8vw, 14px);
          height: clamp(1px, 0.1vw, 2px);
          background: rgba(100,200,255,0.4);
          border-radius: clamp(1px, 0.1vw, 2px);
          animation: ventGlow 1s ease-in-out infinite alternate;
        }

        @keyframes ventGlow {
          0% { opacity: 0.3; }
          100% { opacity: 0.9; }
        }

        .air-bubbles {
          position: absolute;
          bottom: clamp(14px, 1.5vh, 24px);
          left: 0;
          right: 0;
          height: calc(100% - clamp(20px, 2vh, 35px));
          pointer-events: none;
          overflow: hidden;
        }

        .bubble {
          position: absolute;
          bottom: clamp(-7px, -0.7vh, -12px);
          width: clamp(6px, 0.6vw, 10px);
          height: clamp(6px, 0.6vw, 10px);
          background: radial-gradient(circle at 30% 30%, rgba(100,200,255,0.5), rgba(100,200,255,0.1));
          border-radius: 50%;
          animation: bubbleRise 1.3s ease-out infinite;
        }

        @keyframes bubbleRise {
          0% { transform: translateY(0) scale(1); opacity: 0.7; }
          100% { transform: translateY(clamp(-70px, -7vh, -120px)) scale(0.3); opacity: 0; }
        }

        .control-panel {
          display: flex;
          gap: 12px;
          justify-content: center;
          flex-shrink: 0;
          padding: 5px 0;
        }

        .btn {
          position: relative;
          padding: 8px 22px;
          font-size: 0.85rem;
          font-weight: 600;
          font-family: 'Outfit', sans-serif;
          border: none;
          border-radius: 50px;
          cursor: pointer;
          overflow: hidden;
          transition: all 0.3s ease;
        }

        .btn-draw {
          background: linear-gradient(135deg, #f5af19 0%, #f12711 100%);
          color: #1a1a2e;
          box-shadow: 0 6px 25px rgba(245,175,25,0.4);
        }

        .btn-draw:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 10px 35px rgba(245,175,25,0.6);
        }

        .btn-draw:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .btn-glow {
          position: absolute;
          inset: -50%;
          background: linear-gradient(45deg, transparent 40%, rgba(255,255,255,0.3) 50%, transparent 60%);
          animation: btnGlow 3s linear infinite;
        }

        @keyframes btnGlow {
          0% { transform: translateX(-100%) rotate(45deg); }
          100% { transform: translateX(100%) rotate(45deg); }
        }

        .btn-reset {
          background: rgba(255,255,255,0.1);
          color: white;
          border: 2px solid rgba(255,255,255,0.2);
        }

        .btn-reset:hover {
          background: rgba(255,255,255,0.2);
        }

        .btn-text {
          position: relative;
          z-index: 1;
        }

        .confetti-container {
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 1000;
          overflow: hidden;
        }
      `}</style>
    </div>
  )
}
