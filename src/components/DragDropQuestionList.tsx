'use client'

import { useState, useRef } from 'react'
import { 
  GripVertical, 
  FileText, 
  Image as ImageIcon, 
  Video,
  Eye,
  EyeOff
} from 'lucide-react'

interface SimplifiedQuestion {
  id: number
  question_text: string
  display_order: number
  media_type: 'text' | 'image' | 'video'
  is_active: boolean
  media_url?: string
}

interface DragDropQuestionListProps {
  questions: SimplifiedQuestion[]
  onReorder: (questionIds: number[]) => Promise<void>
  onEdit: (questionId: number) => void  // 只傳遞 ID，讓父組件處理編輯邏輯
  onToggleActive: (questionId: number, isActive: boolean) => void
  loading?: boolean
}

export default function DragDropQuestionList({
  questions,
  onReorder,
  onEdit,
  onToggleActive,
  loading = false
}: DragDropQuestionListProps) {
  const [draggedItem, setDraggedItem] = useState<number | null>(null)
  const [dragOverItem, setDragOverItem] = useState<number | null>(null)
  const [isReordering, setIsReordering] = useState(false)
  const dragCounter = useRef(0)

  const getMediaIcon = (mediaType: string) => {
    switch (mediaType) {
      case 'image':
        return <ImageIcon className="w-4 h-4 text-blue-500" />
      case 'video':
        return <Video className="w-4 h-4 text-purple-500" />
      default:
        return <FileText className="w-4 h-4 text-gray-500" />
    }
  }

  const handleDragStart = (e: React.DragEvent, questionId: number) => {
    setDraggedItem(questionId)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/html', questionId.toString())
    
    // 設置拖拽圖像透明度
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '0.5'
    }
  }

  const handleDragEnd = (e: React.DragEvent) => {
    setDraggedItem(null)
    setDragOverItem(null)
    dragCounter.current = 0
    
    // 恢復透明度
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '1'
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDragEnter = (e: React.DragEvent, questionId: number) => {
    e.preventDefault()
    dragCounter.current++
    setDragOverItem(questionId)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    dragCounter.current--
    if (dragCounter.current === 0) {
      setDragOverItem(null)
    }
  }

  const handleDrop = async (e: React.DragEvent, targetQuestionId: number) => {
    e.preventDefault()
    dragCounter.current = 0
    setDragOverItem(null)

    if (!draggedItem || draggedItem === targetQuestionId) {
      setDraggedItem(null)
      return
    }

    try {
      setIsReordering(true)
      
      // 創建新的順序陣列
      const newQuestions = [...questions]
      const draggedIndex = newQuestions.findIndex(q => q.id === draggedItem)
      const targetIndex = newQuestions.findIndex(q => q.id === targetQuestionId)
      
      if (draggedIndex === -1 || targetIndex === -1) return
      
      // 移動項目
      const [draggedQuestion] = newQuestions.splice(draggedIndex, 1)
      newQuestions.splice(targetIndex, 0, draggedQuestion)
      
      // 提取新的 ID 順序
      const newOrder = newQuestions.map(q => q.id)
      
      // 調用重新排序函數
      await onReorder(newOrder)
      
    } catch (error) {
      console.error('重新排序失敗:', error)
    } finally {
      setIsReordering(false)
      setDraggedItem(null)
    }
  }

  const truncateText = (text: string, maxLength: number = 60) => {
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + '...'
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-gray-100 rounded-lg p-4 animate-pulse">
            <div className="flex items-center space-x-3">
              <div className="w-6 h-6 bg-gray-300 rounded"></div>
              <div className="flex-1 h-4 bg-gray-300 rounded"></div>
              <div className="w-16 h-4 bg-gray-300 rounded"></div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {questions.map((question, index) => (
        <div
          key={question.id}
          draggable={!isReordering}
          onDragStart={(e) => handleDragStart(e, question.id)}
          onDragEnd={handleDragEnd}
          onDragOver={handleDragOver}
          onDragEnter={(e) => handleDragEnter(e, question.id)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, question.id)}
          className={`bg-white rounded-lg border-2 p-4 transition-all duration-200 cursor-move ${
            draggedItem === question.id
              ? 'border-blue-400 shadow-lg scale-105'
              : dragOverItem === question.id
                ? 'border-green-400 bg-green-50'
                : 'border-gray-200 hover:border-gray-300'
          } ${isReordering ? 'pointer-events-none opacity-60' : ''}`}
        >
          <div className="flex items-center space-x-3">
            {/* 拖拽手柄 */}
            <div className="flex items-center space-x-2 flex-shrink-0">
              <GripVertical className={`w-5 h-5 ${
                isReordering ? 'text-gray-300' : 'text-gray-400 hover:text-gray-600'
              }`} />
              <div className="bg-gray-100 text-gray-600 text-sm font-medium px-2 py-1 rounded min-w-[2rem] text-center">
                {index + 1}
              </div>
            </div>

            {/* 媒體類型圖標 */}
            <div className="flex-shrink-0">
              {getMediaIcon(question.media_type)}
            </div>

            {/* 題目內容 */}
            <div className="flex-1 min-w-0">
              <p className="text-gray-900 font-medium truncate">
                {truncateText(question.question_text)}
              </p>
              <div className="flex items-center space-x-2 mt-1">
                <span className="text-xs text-gray-500">
                  ID: {question.id}
                </span>
                <span className="text-xs text-gray-500">
                  順序: {question.display_order}
                </span>
              </div>
            </div>

            {/* 媒體預覽 */}
            {question.media_url && (
              <div className="flex-shrink-0">
                {question.media_type === 'image' && (
                  <img
                    src={question.media_url}
                    alt="題目圖片"
                    className="w-12 h-12 object-cover rounded border"
                  />
                )}
                {question.media_type === 'video' && (
                  <video
                    src={question.media_url}
                    muted
                    playsInline
                    className="w-12 h-12 object-cover rounded border"
                    onMouseEnter={(e) => {
                      const video = e.target as HTMLVideoElement
                      video.play().catch(() => {})
                    }}
                    onMouseLeave={(e) => {
                      const video = e.target as HTMLVideoElement
                      video.pause()
                      video.currentTime = 0
                    }}
                  >
                    影片
                  </video>
                )}
              </div>
            )}

            {/* 狀態和操作 */}
            <div className="flex items-center space-x-2 flex-shrink-0">
              {/* 啟用狀態 */}
              <button
                onClick={() => onToggleActive(question.id, !question.is_active)}
                className={`p-1 rounded transition-colors ${
                  question.is_active
                    ? 'text-green-600 hover:bg-green-100'
                    : 'text-gray-400 hover:bg-gray-100'
                }`}
                title={question.is_active ? '點擊停用' : '點擊啟用'}
              >
                {question.is_active ? (
                  <Eye className="w-4 h-4" />
                ) : (
                  <EyeOff className="w-4 h-4" />
                )}
              </button>

              {/* 編輯按鈕 */}
              <button
                onClick={() => onEdit(question.id)}
                className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
              >
                編輯
              </button>
            </div>
          </div>

          {/* 拖拽提示 */}
          {dragOverItem === question.id && draggedItem !== question.id && (
            <div className="mt-2 text-center text-green-600 text-sm font-medium">
              ↓ 放置到這裡 ↓
            </div>
          )}
        </div>
      ))}

      {/* 重新排序中的提示 */}
      {isReordering && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 flex items-center space-x-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
            <span className="text-gray-700">正在更新題目順序...</span>
          </div>
        </div>
      )}

      {/* 空狀態 */}
      {questions.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <p className="text-lg font-medium">尚無題目</p>
          <p className="text-sm">請先新增題目</p>
        </div>
      )}
    </div>
  )
}
