// Common types for lottery mode components

export interface Photo {
    id: number
    image_url: string
    user_id: string
    display_name: string
    blessing_message: string
    avatar_url: string
    thumbnail_small_url?: string
    thumbnail_medium_url?: string
    thumbnail_large_url?: string
    media_type?: 'image' | 'video'
}

export interface LotteryModeProps {
    photos: Photo[]
    winnerPhoto: Photo
    winnerIndex: number
    onAnimationComplete: (winnerPhoto: Photo) => void
    isAnimating: boolean
    scale: number
}

export type AnimationMode = 'fast_shuffle' | 'slot_machine' | 'waterfall' | 'tournament' | 'spiral'

export const ANIMATION_MODE_INFO: Record<AnimationMode, { name: string; icon: string; description: string }> = {
    fast_shuffle: {
        name: '快速切換',
        icon: '🔀',
        description: '單張照片快速隨機切換，最終停在中獎者'
    },
    slot_machine: {
        name: '老虎機',
        icon: '🎰',
        description: '經典三欄老虎機，中間欄停在中獎者'
    },
    waterfall: {
        name: '瀑布流',
        icon: '🌊',
        description: '照片如瀑布般流動，中獎照片飛入中央'
    },
    tournament: {
        name: '淘汰賽',
        icon: '🏆',
        description: '多輪淘汰，最終 2 張對決揭曉'
    },
    spiral: {
        name: '螺旋',
        icon: '🌀',
        description: '照片螺旋旋轉，中心放大揭曉中獎者'
    }
}
