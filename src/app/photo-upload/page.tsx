'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useLiff } from '@/hooks/useLiff'
import Layout from '@/components/Layout'
import UploadProgress, { useUploadProgress } from '@/components/UploadProgress'
import { directUploadToSupabase, formatFileSize, needsResumableUpload, getUploadMethodDescription } from '@/lib/supabase-direct-upload'
import { Camera, Upload, Heart, Lock, Globe, Image as ImageIcon, X, Info, Video } from 'lucide-react'

interface Preview {
  file: File;
  preview: string; // Blob URL for preview (video uses thumbnail blob)
  id: string;
  sequence: number;
  type: 'image' | 'video';
  thumbnailFile?: File; // For video files
  isLargeFile?: boolean; // > 50MB
}

export default function PhotoUploadPage() {
  const [previews, setPreviews] = useState<Preview[]>([]); // Replaced selectedFiles with previews
  // const [selectedFiles, setSelectedFiles] = useState<File[]>([]); // Removed
  const [blessingMessage, setBlessingMessage] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [maxPhotoCount, setMaxPhotoCount] = useState(3); // 從設定 API 獲取
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { isReady, isLoggedIn, profile, loading } = useLiff();

  // 使用上傳進度 Hook
  const { progress, isUploading, error: uploadError, startUpload, updateProgress, completeUpload, failUpload, reset } = useUploadProgress();

  // 檢查登入狀態
  useEffect(() => {
    if (isReady && !loading && !isLoggedIn) {
      // 用戶未登入，提示登入
      alert('請先登入才能上傳照片')
      router.push('/')
    }
  }, [isReady, isLoggedIn, loading, router]);

  // 載入系統設定
  useEffect(() => {
    loadMaxPhotoCount();
  }, []);

  const loadMaxPhotoCount = async () => {
    try {
      const response = await fetch('/api/photo/upload');
      const data = await response.json();
      if (data.success) {
        setMaxPhotoCount(data.data.maxPhotoUploadCount || 3);
      }
    } catch (error) {
      console.error('載入設定失敗:', error);
    }
  }; // End of loadMaxPhotoCount

  const generateVideoThumbnail = (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadedmetadata = () => {
        video.currentTime = Math.min(1, video.duration);
      };
      video.onseeked = () => {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context failed'));
          return;
        }
        ctx.drawImage(video, 0, 0);
        canvas.toBlob((blob) => {
          if (blob) {
            const thumbFile = new File([blob], 'thumbnail.jpg', { type: 'image/jpeg' });
            resolve(thumbFile);
          } else {
            reject(new Error('Thumbnail failed'));
          }
        }, 'image/jpeg', 0.7);
      };
      video.onerror = () => reject(new Error('Video load failed'));
      video.src = URL.createObjectURL(file);
    });
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);

    // 驗證檔案數量
    if (files.length > maxPhotoCount) {
      setError(`最多只能選擇 ${maxPhotoCount} 張照片`);
      return;
    }

    // 驗證每個檔案的類型和大小
    const invalidTypeFiles: string[] = [];
    const oversizedFiles: { name: string; size: number }[] = [];

    const validFiles = files.filter(file => {
      if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
        invalidTypeFiles.push(file.name);
        return false;
      }

      // 檢查檔案大小（5GB limit for Supabase Pro）
      const MAX_SIZE = 5 * 1024 * 1024 * 1024; // 5GB
      if (file.size > MAX_SIZE) {
        oversizedFiles.push({ name: file.name, size: file.size });
        return false;
      }

      return true;
    });

    // 顯示具體的錯誤訊息
    if (invalidTypeFiles.length > 0) {
      setError(`以下檔案格式不支援：${invalidTypeFiles.join(', ')}`);
      return;
    }

    if (oversizedFiles.length > 0) {
      const fileList = oversizedFiles.map(f => {
        const sizeGB = (f.size / (1024 * 1024 * 1024)).toFixed(2);
        return `${f.name} (${sizeGB} GB)`;
      }).join('\n');
      setError(`以下檔案超過 5 GB 限制：\n${fileList}`);
      return;
    }

    if (validFiles.length !== files.length) {
      setError('部分檔案不符合要求，請選擇圖片或影片');
      return;
    }


    // 生成預覽
    const newPreviews = await Promise.all(validFiles.map(async (file, index) => {
      const isVideo = file.type.startsWith('video/');
      let previewUrl = '';
      let thumbnailFile: File | undefined;

      if (isVideo) {
        try {
          thumbnailFile = await generateVideoThumbnail(file);
          previewUrl = URL.createObjectURL(thumbnailFile);
        } catch (e) {
          console.error('Thumbnail generation failed', e);
          // Fallback: use a placeholder or the video itself (might not show on all browsers)
          previewUrl = '';
        }
      } else {
        previewUrl = URL.createObjectURL(file);
      }

      return {
        file,
        preview: previewUrl,
        id: `preview-${Date.now()}-${index}`,
        sequence: index + 1,
        type: isVideo ? 'video' : 'image',
        thumbnailFile,
        isLargeFile: file.size > 50 * 1024 * 1024 // 50MB check
      } as Preview;
    }));

    // Combine with existing (if we want to support append) or replace. 
    // The original code replaced: setSelectedFiles(validFiles);
    // But we need to store the extra metadata now.
    // The original code used a separate state for Previews inside generatePreviews, 
    // but actually generatePreviews just set selectedFiles state.
    // Wait, original `setSelectedFiles` stored just `File[]`. 
    // I need to update state to store `Preview[]` instead of `File[]` to keep the thumbnail info accessible during upload.
    // BUT checking original code: `const [selectedFiles, setSelectedFiles] = useState<File[]>([]);`
    // If I change the state type, I need to update all usages.
    // Let's refactor `selectedFiles` to store `Preview[]` objects which wrap the File.

    // Actually, to minimize impact, I can store `previews` in a new state and keep `selectedFiles` as File[]?
    // No, that's messy. Let's change `selectedFiles` to be `Preview[]` or simpler:
    // Just create a new state `filePreviews` and keep `selectedFiles` as is?
    // No, `handleFileSelect` logic needs to be robust. 

    // Let's change `selectedFiles` to `Preview[]` because we need the thumbnailFile for upload.
    // I need to update the `selectedFiles` type definition at the top of the component first?
    // The previous chunk updated the interface `Preview`.
    // I will use a separate state `previews` to store this info, OR change `selectedFiles`.
    // Changing `selectedFiles` to `Preview[]` seems best but requires updating `handleUpload` and `handleRemove`.
    // Let's do that.

    // Wait, I can't change the `useState` line in this chunk easily without potentially overlapping edits if I am not careful.
    // The `useState` line is line 19. My first chunk ended at line 16.
    // I will add a chunk to change the state definition.

    setError(null);
    setPreviews(newPreviews);
  };

  // NOTE: I need to add `const [previews, setPreviews] = useState<Preview[]>([]);`
  // and remove `selectedFiles` or sync them.
  // The original code had `selectedFiles` as Files. 
  // Efficient path: Replace `selectedFiles` usage with `previews`.

  // Let's assume I will replace the state definition in a separate chunk.

  const handleRemoveFile = (index: number) => {
    const newPreviews = previews.filter((_, i) => i !== index);
    setPreviews(newPreviews);

    if (newPreviews.length === 0) {
      setBlessingMessage('');
    }
  };

  const handleUpload = async () => {
    if (previews.length === 0 || !profile) return;

    try {
      startUpload();

      const uploadPromises = previews.map(async (preview, index) => {
        // 1. 如果是影片，先上傳縮圖
        let thumbnailUrl = '';
        if (preview.type === 'video' && preview.thumbnailFile) {
          console.log('🎬 [客戶端] 開始上傳影片縮圖:', preview.thumbnailFile.name, preview.thumbnailFile.size);
          const thumbResult = await directUploadToSupabase({
            file: preview.thumbnailFile,
            userId: profile.userId,
            onProgress: () => { } // 縮圖上傳很快，暫不顯示進度
          });
          if (thumbResult.success && thumbResult.data) {
            thumbnailUrl = thumbResult.data.fileUrl; // or publicUrl? library returns fileUrl as publicUrl
            console.log('✅ [客戶端] 縮圖上傳成功，URL:', thumbnailUrl);
          } else {
            console.error('❌ [客戶端] 縮圖上傳失敗:', thumbResult.error);
          }
        }

        // 2. 上傳主檔案
        const processedBlessingMessage = blessingMessage
          ? `${blessingMessage} (${index + 1}/${previews.length})`
          : blessingMessage;

        const uploadResult = await directUploadToSupabase({
          file: preview.file,
          userId: profile.userId,
          onProgress: (progress, status) => {
            const totalProgress = (index * 100 + progress) / previews.length;
            updateProgress(totalProgress);
          }
        });

        if (!uploadResult.success) {
          throw new Error(uploadResult.error || '上傳失敗');
        }

        // 3. 發送元數據
        const metadataFormData = new FormData();
        metadataFormData.append('fileName', uploadResult.data!.fileName);
        metadataFormData.append('fileUrl', uploadResult.data!.fileUrl);
        metadataFormData.append('fileSize', uploadResult.data!.fileSize.toString());
        metadataFormData.append('fileType', uploadResult.data!.fileType);
        metadataFormData.append('blessingMessage', processedBlessingMessage);
        metadataFormData.append('isPublic', isPublic.toString());
        metadataFormData.append('uploaderLineId', profile.userId);
        metadataFormData.append('mediaType', preview.type);
        if (thumbnailUrl) {
          console.log('📤 [客戶端] 發送 thumbnailUrl 到 API:', thumbnailUrl);
          metadataFormData.append('thumbnailUrl', thumbnailUrl);
        } else if (preview.type === 'video') {
          console.warn('⚠️ [客戶端] 影片沒有 thumbnailUrl！');
        }

        const response = await fetch('/api/photo/upload', {
          method: 'POST',
          body: metadataFormData
        });

        const data = await response.json();

        if (!data.success) {
          throw new Error(data.error || '照片資訊儲存失敗');
        }

        return data.data;
      });

      const results = await Promise.allSettled(uploadPromises);

      const successful = results.filter(r => r.status === 'fulfilled');
      const failed = results.filter(r => r.status === 'rejected');

      if (failed.length > 0) {
        throw new Error(`部分上傳失敗：${successful.length} 張成功，${failed.length} 張失敗`);
      }

      completeUpload();
      setUploadSuccess(true);

      setPreviews([]);
      setBlessingMessage('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      setTimeout(() => {
        router.push('/photo-wall');
      }, 2000);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '上傳失敗，請稍後再試';
      failUpload(errorMessage);
      console.error('Upload error:', error);
    }
  };

  const handleCancelUpload = () => {
    reset();
  };

  const clearSelection = () => {
    setPreviews([]);
    setBlessingMessage('');
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Layout title="照片上傳">
      {/* 成功訊息彈出框 */}
      {uploadSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl p-8 mx-4 max-w-md text-center transform animate-scaleIn">
            <div className="mb-4">
              <Heart className="w-16 h-16 text-pink-500 mx-auto animate-pulse" />
            </div>
            <h3 className="text-2xl font-bold text-black mb-2">上傳成功！</h3>
            <p className="text-black">感謝您的分享 ❤️</p>
            <p className="text-sm text-gray-500 mt-4">即將跳轉到照片牆...</p>
          </div>
        </div>
      )}

      <div className="max-w-2xl mx-auto">

        {/* 隱私設定 */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h3 className="text-lg font-semibold text-black mb-4">隱私設定</h3>
          <div className="space-y-4">
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="radio"
                name="privacy"
                checked={isPublic}
                onChange={() => setIsPublic(true)}
                className="w-4 h-4 text-pink-500"
              />
              <Globe className="w-5 h-5 text-green-500" />
              <div>
                <div className="font-medium text-black">公開展示</div>
                <div className="text-sm text-black">所有賓客都可以看到並投票</div>
              </div>
            </label>

            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="radio"
                name="privacy"
                checked={!isPublic}
                onChange={() => setIsPublic(false)}
                className="w-4 h-4 text-pink-500"
              />
              <Lock className="w-5 h-5 text-gray-500" />
              <div>
                <div className="font-medium text-black">私下傳送</div>
                <div className="text-sm text-black">只有林敬和孟庭可以看到</div>
              </div>
            </label>
          </div>
        </div>

        {/* 上傳區域 */}
        <div className="bg-white rounded-lg shadow p-8 mb-6">
          <div className="text-center mb-8">
            <Camera className="w-10 h-10 text-pink-500 mx-auto mb-4" />
            <p className="text-black">上傳照片並留下祝福的話語</p>
            <p className="text-sm text-gray-500">單次上傳最多可選擇 {maxPhotoCount} 張照片</p>
          </div>

          {/* 多檔案選擇器 */}
          <div className="mb-6">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,video/*"
              onChange={handleFileSelect}
              className="hidden"
            />

            {previews.length === 0 ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center cursor-pointer hover:border-pink-400 hover:bg-pink-50 transition-colors"
              >
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-lg text-black mb-2">點擊選擇照片或影片</p>
                <p className="text-sm text-black">支援 JPG, PNG, MP4, WebM</p>
                <p className="text-xs text-black mt-1">💡 影片檔案較大時上傳請耐心等候</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-lg font-medium text-black">
                    已選擇 {previews.length}/{maxPhotoCount} 個檔案
                  </h4>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600"
                  >
                    添加更多
                  </button>
                </div>

                {/* 錯誤提示 */}
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                    <p className="text-sm">{error}</p>
                  </div>
                )}

                {/* 預覽網格 */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {previews.map((preview, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={preview.preview || '/default-avatar.png'} // Fallback for failed thumbnail
                        alt={`預覽 ${index + 1}`}
                        className="w-full h-32 object-cover rounded-lg"
                      />

                      {/* Video Indicator */}
                      {preview.type === 'video' && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-lg">
                          <Video className="w-8 h-8 text-white drop-shadow-lg" />
                        </div>
                      )}

                      {/* 序號標籤 */}
                      <div className="absolute top-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-sm">
                        {index + 1}/{previews.length}
                      </div>

                      {/* 移除按鈕 */}
                      <button
                        onClick={() => handleRemoveFile(index)}
                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-4 h-4" />
                      </button>

                      {/* 檔案資訊 */}
                      <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-75 text-white p-2 text-xs">
                        <p className="truncate">{preview.file.name}</p>
                        <p>{formatFileSize(preview.file.size)}</p>
                        {needsResumableUpload(preview.file.size) && (
                          <p className="text-yellow-300">🔄 可恢復上傳</p>
                        )}
                        {preview.isLargeFile && (
                          <p className="text-orange-400 font-bold mt-1">⚠️ 檔案較大，請耐心等候</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 祝福語輸入 */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-black mb-4 flex items-center">
              <Heart className="w-5 h-5 text-pink-500 mr-2" />
              祝福語
            </h3>
            <textarea
              value={blessingMessage}
              onChange={(e) => setBlessingMessage(e.target.value)}
              placeholder="寫下您對新人的祝福..."
              className="w-full h-32 p-4 border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent text-black"
              maxLength={200}
            />
            <div className="text-right text-sm text-black mt-2">
              {blessingMessage.length}/200
            </div>

            {/* 預覽區域 */}
            {blessingMessage && previews.length > 0 && (
              <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium text-gray-700 mb-2">祝福語預覽：</p>
                {Array.from({ length: previews.length }, (_, index) => (
                  <p key={index} className="text-sm text-gray-600">
                    "{blessingMessage} ({index + 1}/{previews.length})"
                  </p>
                ))}
              </div>
            )}
          </div>

          {/* 上傳按鈕 */}
          <div className="text-center">
            <button
              onClick={handleUpload}
              disabled={previews.length === 0 || isUploading}
              className={`px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-200 ${previews.length === 0 || isUploading
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white shadow-lg hover:shadow-xl transform hover:scale-105'
                }`}
            >
              {isUploading ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>上傳中... {Math.round(progress)}%</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <ImageIcon className="w-5 h-5" />
                  <span>上傳照片</span>
                </div>
              )}
            </button>

            {/* 取消按鈕 */}
            {isUploading && (
              <button
                onClick={handleCancelUpload}
                className="ml-4 px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                取消上傳
              </button>
            )}
          </div>

          {/* 提示 */}
          <div className="bg-blue-50 rounded-xl p-4 mt-6 text-center">
            <p className="text-black text-sm mb-2">
              💡 上傳的照片或影片將會出現在照片牆和快門傳情中，讓所有賓客一起欣賞美好回憶！
            </p>
          </div>
        </div>

        {/* 上傳進度組件 */}
        <UploadProgress
          isUploading={isUploading}
          progress={progress}
          fileName={previews.length > 0 ? `${previews.length} 個檔案` : undefined}
          error={uploadError}
          onComplete={() => {
            reset();
          }}
          onCancel={handleCancelUpload}
          showPercentage={true}
          showFileName={true}
          size="medium"
        />
      </div>
    </Layout>
  );
}
