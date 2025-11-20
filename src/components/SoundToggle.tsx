import { Volume2, VolumeX } from 'lucide-react'

interface SoundToggleProps {
  isEnabled: boolean
  onToggle: () => void
  className?: string
}

export const SoundToggle: React.FC<SoundToggleProps> = ({ 
  isEnabled, 
  onToggle, 
  className = '' 
}) => {
  return (
    <button
      onClick={onToggle}
      className={`
        p-3 rounded-full bg-white bg-opacity-20 hover:bg-opacity-30 
        transition-all duration-200 backdrop-blur-sm border border-white border-opacity-30
        ${isEnabled ? 'ring-2 ring-white ring-opacity-50' : ''}
        ${className}
      `}
      aria-label={isEnabled ? '關閉音效' : '開啟音效'}
      title={isEnabled ? '點擊關閉音效' : '點擊開啟音效'}
    >
      {isEnabled ? (
        <Volume2 className="w-6 h-6 text-white drop-shadow-lg" />
      ) : (
        <VolumeX className="w-6 h-6 text-white drop-shadow-lg opacity-70" />
      )}
    </button>
  )
}