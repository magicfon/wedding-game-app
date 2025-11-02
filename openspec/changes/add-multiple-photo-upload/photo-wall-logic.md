# 照片牆顯示多張照片的邏輯設計

## 1. 照片牆資料獲取

### 1.1 修改照片查詢邏輯

#### 現有查詢保持不變
```typescript
// 照片牆 API 保持現有的查詢邏輯
export async function GET(request: NextRequest) {
  const supabase = createSupabaseAdmin();
  
  const { data: photos, error } = await supabase
    .from('photos')
    .select(`
      id,
      image_url,
      blessing_message_with_sequence,
      is_public,
      vote_count,
      created_at,
      user_id,
      users (
        display_name,
        picture_url
      ),
      thumbnail_small_url,
      thumbnail_medium_url,
      thumbnail_large_url
    `)
    .eq('is_public', true)
    .order('created_at', { ascending: false });
    
  // 現有的邏輯不需要修改，因為我們在資料庫層面已經處理了祝福語序號
  return NextResponse.json({ photos });
}
```

### 1.2 照片分組查詢（可選功能）

#### 為未來功能準備的查詢
```typescript
// 可選：獲取同群組照片的查詢
export async function getPhotoGroup(uploadGroupId: string) {
  const supabase = createSupabaseAdmin();
  
  const { data: groupPhotos, error } = await supabase
    .from('photos')
    .select(`
      id,
      image_url,
      blessing_message_with_sequence,
      photo_sequence,
      upload_group_id,
      created_at,
      user_id,
      users (
        display_name,
        picture_url
      )
    `)
    .eq('upload_group_id', uploadGroupId)
    .order('photo_sequence', { ascending: true });
    
  return { photos: groupPhotos, error };
}
```

## 2. 照片牆顯示邏輯

### 2.1 保持現有的時間排序

#### 照片排序邏輯
```typescript
// 照片牆組件中的排序邏輯保持不變
const PhotoWall: React.FC = () => {
  const [photos, setPhotos] = useState<Photo[]>([]);
  
  // 現有的排序邏輯已經按 created_at 降序排列
  // 這確保了同群組的照片按時間順序顯示
  useEffect(() => {
    loadPhotos();
  }, []);
  
  return (
    <div className="masonry-grid">
      {photos.map((photo) => (
        <PhotoCard key={photo.id} photo={photo} />
      ))}
    </div>
  );
};
```

### 2.2 照片卡片組件更新

#### 顯示帶序號的祝福語
```typescript
interface PhotoCardProps {
  photo: Photo;
  onVote: (photoId: number) => void;
  onLightboxOpen: (photo: Photo) => void;
}

const PhotoCard: React.FC<PhotoCardProps> = ({ photo, onVote, onLightboxOpen }) => {
  // 使用 blessing_message_with_sequence 而不是 blessing_message
  const displayMessage = photo.blessing_message_with_sequence || photo.blessing_message;
  
  return (
    <div className="photo-card">
      {/* 照片圖片 */}
      <div className="photo-container">
        <img
          src={photo.thumbnail_medium_url}
          alt={displayMessage}
          onClick={() => onLightboxOpen(photo)}
          loading="lazy"
        />
      </div>
      
      {/* 照片資訊 */}
      <div className="photo-info">
        {/* 上傳者資訊 */}
        <div className="user-info">
          <img
            src={photo.users.picture_url}
            alt={photo.users.display_name}
            className="avatar"
          />
          <span className="username">{photo.users.display_name}</span>
        </div>
        
        {/* 祝福語 - 使用帶序號的版本 */}
        {displayMessage && (
          <p className="blessing-message">
            {displayMessage}
          </p>
        )}
        
        {/* 投票資訊 */}
        <div className="vote-info">
          <button
            onClick={() => onVote(photo.id)}
            className="vote-button"
          >
            <Heart className="w-4 h-4" />
            {photo.vote_count}
          </button>
        </div>
      </div>
    </div>
  );
};
```

## 3. 照片燈箱顯示

### 3.1 燈箱組件更新

#### 顯示完整的祝福語資訊
```typescript
interface PhotoLightboxProps {
  photo: Photo;
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (direction: 'prev' | 'next') => void;
}

const PhotoLightbox: React.FC<PhotoLightboxProps> = ({
  photo,
  isOpen,
  onClose,
  onNavigate
}) => {
  // 顯示帶序號的祝福語
  const displayMessage = photo.blessing_message_with_sequence || photo.blessing_message;
  
  return (
    <Dialog isOpen={isOpen} onClose={onClose} size="fullscreen">
      <div className="lightbox-content">
        {/* 關閉按鈕 */}
        <button onClick={onClose} className="close-button">
          <X className="w-6 h-6" />
        </button>
        
        {/* 照片顯示 */}
        <div className="photo-display">
          <img
            src={photo.image_url}
            alt={displayMessage}
            className="fullscreen-photo"
          />
        </div>
        
        {/* 照片資訊面板 */}
        <div className="photo-panel">
          {/* 上傳者資訊 */}
          <div className="user-section">
            <img
              src={photo.users.picture_url}
              alt={photo.users.display_name}
              className="user-avatar"
            />
            <div>
              <h3 className="user-name">{photo.users.display_name}</h3>
              <p className="upload-time">
                {formatDate(photo.created_at)}
              </p>
            </div>
          </div>
          
          {/* 祝福語 */}
          {displayMessage && (
            <div className="blessing-section">
              <h4 className="section-title">祝福語</h4>
              <p className="blessing-text">{displayMessage}</p>
            </div>
          )}
          
          {/* 投票按鈕 */}
          <div className="action-section">
            <button
              onClick={() => onVote(photo.id)}
              className="vote-action"
            >
              <Heart className="w-5 h-5 mr-2" />
              投票 ({photo.vote_count})
            </button>
          </div>
        </div>
        
        {/* 導航按鈕 */}
        <button
          onClick={() => onNavigate('prev')}
          className="nav-button prev"
        >
          <ChevronLeft className="w-8 h-8" />
        </button>
        <button
          onClick={() => onNavigate('next')}
          className="nav-button next"
        >
          <ChevronRight className="w-8 h-8" />
        </button>
      </div>
    </Dialog>
  );
};
```

## 4. 投票功能整合

### 4.1 投票邏輯保持不變

#### 現有投票功能
```typescript
// 投票 API 不需要修改，因為每張照片仍然是獨立的投票對象
export async function POST(request: NextRequest) {
  const supabase = createSupabaseAdmin();
  const { photoId, voterLineId } = await request.json();
  
  // 現有的投票邏輯保持不變
  const { data, error } = await supabase
    .from('photo_votes')
    .insert({
      photo_id: photoId,
      voter_id: voterLineId
    });
    
  // 觸發器會自動更新 photos 表的 vote_count
  return NextResponse.json({ success: !error });
}
```

### 4.2 投票狀態管理

#### 投票 Hook
```typescript
const usePhotoVoting = () => {
  const [votedPhotos, setVotedPhotos] = useState<Set<number>>(new Set());
  
  const voteForPhoto = async (photoId: number) => {
    if (votedPhotos.has(photoId)) {
      return; // 已經投過票
    }
    
    try {
      const response = await fetch('/api/photo/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photoId, voterLineId: userLineId })
      });
      
      if (response.ok) {
        setVotedPhotos(prev => new Set([...prev, photoId]));
      }
    } catch (error) {
      console.error('投票失敗:', error);
    }
  };
  
  return {
    votedPhotos,
    voteForPhoto,
    hasVoted: (photoId: number) => votedPhotos.has(photoId)
  };
};
```

## 5. 效能優化

### 5.1 照片載入優化

#### 虛擬滾動和分頁
```typescript
const usePhotoWall = () => {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  
  const loadMorePhotos = async () => {
    if (loading || !hasMore) return;
    
    setLoading(true);
    
    try {
      const response = await fetch(`/api/photo/list?page=${page}&limit=20`);
      const data = await response.json();
      
      if (data.photos.length === 0) {
        setHasMore(false);
      } else {
        setPhotos(prev => [...prev, ...data.photos]);
        setPage(prev => prev + 1);
      }
    } catch (error) {
      console.error('載入照片失敗:', error);
    } finally {
      setLoading(false);
    }
  };
  
  return {
    photos,
    loading,
    hasMore,
    loadMorePhotos
  };
};
```

### 5.2 圖片載入優化

#### 懶載入和預載入
```typescript
const OptimizedImage: React.FC<{
  src: string;
  alt: string;
  thumbnail?: string;
}> = ({ src, alt, thumbnail }) => {
  const [imageSrc, setImageSrc] = useState(thumbnail || src);
  const [isLoaded, setIsLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // 載入高解析度圖片
            const img = new Image();
            img.onload = () => {
              setImageSrc(src);
              setIsLoaded(true);
            };
            img.src = src;
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 }
    );
    
    if (imgRef.current) {
      observer.observe(imgRef.current);
    }
    
    return () => observer.disconnect();
  }, [src]);
  
  return (
    <img
      ref={imgRef}
      src={imageSrc}
      alt={alt}
      className={`transition-opacity duration-300 ${isLoaded ? 'opacity-100' : 'opacity-75'}`}
      loading="lazy"
    />
  );
};
```

## 6. 響應式設計

### 6.1 瀑布流佈局

#### 響應式網格
```css
/* 照片牆響應式設計 */
.photo-wall {
  column-count: 1;
  column-gap: 1rem;
}

@media (min-width: 640px) {
  .photo-wall {
    column-count: 2;
  }
}

@media (min-width: 768px) {
  .photo-wall {
    column-count: 3;
  }
}

@media (min-width: 1024px) {
  .photo-wall {
    column-count: 4;
  }
}

.photo-card {
  break-inside: avoid;
  margin-bottom: 1rem;
}
```

### 6.2 行動裝置優化

#### 觸控優化
```typescript
const MobilePhotoCard: React.FC<PhotoCardProps> = ({ photo, onVote, onLightboxOpen }) => {
  const [touchStart, setTouchStart] = useState<number | null>(null);
  
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientX);
  };
  
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart) return;
    
    const touchEnd = e.changedTouches[0].clientX;
    const diff = touchStart - touchEnd;
    
    // 左滑打開燈箱
    if (Math.abs(diff) > 50) {
      onLightboxOpen(photo);
    }
    
    setTouchStart(null);
  };
  
  return (
    <div
      className="photo-card"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* 照片內容 */}
    </div>
  );
};
```

## 7. 可訪問性改進

### 7.1 鍵盤導航

#### 鍵盤支援
```typescript
const AccessiblePhotoWall: React.FC = () => {
  const [focusedIndex, setFocusedIndex] = useState(-1);
  
  const handleKeyDown = (e: KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowRight':
        setFocusedIndex(prev => Math.min(prev + 1, photos.length - 1));
        break;
      case 'ArrowLeft':
        setFocusedIndex(prev => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        if (focusedIndex >= 0) {
          onLightboxOpen(photos[focusedIndex]);
        }
        break;
    }
  };
  
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [focusedIndex]);
  
  return (
    <div className="photo-wall" role="grid" aria-label="照片牆">
      {photos.map((photo, index) => (
        <div
          key={photo.id}
          role="gridcell"
          tabIndex={focusedIndex === index ? 0 : -1}
          aria-label={`照片 ${index + 1}: ${photo.blessing_message_with_sequence}`}
          onFocus={() => setFocusedIndex(index)}
        >
          <PhotoCard photo={photo} />
        </div>
      ))}
    </div>
  );
};
```

### 7.2 螢幕閱讀器支援

#### ARIA 標籤
```typescript
const AccessiblePhotoCard: React.FC<PhotoCardProps> = ({ photo }) => {
  return (
    <article
      className="photo-card"
      aria-labelledby={`photo-title-${photo.id}`}
      aria-describedby={`photo-description-${photo.id}`}
    >
      <img
        src={photo.thumbnail_medium_url}
        alt=""
        aria-hidden="true"
      />
      
      <div className="photo-info">
        <h3 id={`photo-title-${photo.id}`} className="sr-only">
          {photo.users.display_name} 的照片
        </h3>
        
        <p id={`photo-description-${photo.id}`} className="blessing-message">
          {photo.blessing_message_with_sequence}
        </p>
        
        <div className="vote-info">
          <span aria-label={`獲得 ${photo.vote_count} 票`}>
            {photo.vote_count} 票
          </span>
        </div>
      </div>
    </article>
  );
};
```

## 8. 測試策略

### 8.1 單元測試

#### 照片卡片測試
```typescript
describe('PhotoCard', () => {
  test('should display blessing message with sequence', () => {
    const photo = {
      id: 1,
      blessing_message_with_sequence: '祝福語 (1/3)',
      blessing_message: '祝福語',
      users: { display_name: '測試用戶' }
    };
    
    render(<PhotoCard photo={photo} />);
    
    expect(screen.getByText('祝福語 (1/3)')).toBeInTheDocument();
  });
  
  test('should fallback to original blessing message', () => {
    const photo = {
      id: 1,
      blessing_message: '原始祝福語',
      users: { display_name: '測試用戶' }
    };
    
    render(<PhotoCard photo={photo} />);
    
    expect(screen.getByText('原始祝福語')).toBeInTheDocument();
  });
});
```

### 8.2 整合測試

#### 照片牆載入測試
```typescript
describe('PhotoWall Integration', () => {
  test('should load and display photos with sequence numbers', async () => {
    // 模擬 API 響應
    mockApiResponse('/api/photo/list', {
      photos: [
        {
          id: 1,
          blessing_message_with_sequence: '祝福 (1/3)',
          created_at: '2023-01-01T10:00:00Z'
        },
        {
          id: 2,
          blessing_message_with_sequence: '祝福 (2/3)',
          created_at: '2023-01-01T10:01:00Z'
        }
      ]
    });
    
    render(<PhotoWall />);
    
    await waitFor(() => {
      expect(screen.getByText('祝福 (1/3)')).toBeInTheDocument();
      expect(screen.getByText('祝福 (2/3)')).toBeInTheDocument();
    });
  });
});