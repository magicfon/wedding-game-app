'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useLiff } from '@/hooks/useLiff'
import Layout from '@/components/Layout'
import UploadProgress, { useUploadProgress } from '@/components/UploadProgress'
import { directUploadToSupabase, formatFileSize, needsResumableUpload, getUploadMethodDescription } from '@/lib/supabase-direct-upload'
import { Camera, Upload, Heart, Lock, Globe, Image as ImageIcon, X, Info } from 'lucide-react'

interface Preview {
  file: File;
  preview: string;
  id: string;
  sequence: number;
}

export default function PhotoUploadPage() {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
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
  };
  
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    
    // 驗證檔案數量
    if (files.length > maxPhotoCount) {
      setError(`最多只能選擇 ${maxPhotoCount} 張照片`);
      return;
    }
    
    // 驗證每個檔案（移除大小限制）
    const validFiles = files.filter(file => {
      if (!file.type.startsWith('image/')) {
        return false;
      }
      
      // 不再檢查檔案大小限制
      return true;
    });
    
    if (validFiles.length !== files.length) {
      setError('部分檔案不符合要求，請檢查檔案格式');
      return;
    }
    
    setSelectedFiles(validFiles);
    setError(null);
    generatePreviews(validFiles);
  };
  
  const generatePreviews = (files: File[]) => {
    const newPreviews = files.map((file, index) => ({
      file,
      preview: URL.createObjectURL(file),
      id: `preview-${index}`,
      sequence: index + 1
    }));
    
    setSelectedFiles(files);
  };
  
  const handleRemoveFile = (index: number) => {
    const newFiles = selectedFiles.filter((_, i) => i !== index);
    setSelectedFiles(newFiles);
    
    // 如果沒有檔案了，清空預覽
    if (newFiles.length === 0) {
      setBlessingMessage('');
    }
  };
  
  const handleUpload = async () => {
    if (selectedFiles.length === 0 || !profile) return;
    
    try {
      startUpload();
      
      // 使用客戶端直接上傳
      const uploadPromises = selectedFiles.map(async (file, index) => {
        // 為每張照片生成帶序號的祝福語
        const processedBlessingMessage = blessingMessage
          ? `${blessingMessage} (${index + 1}/${selectedFiles.length})`
          : blessingMessage;
        
        // 直接上傳到 Supabase Storage
        const uploadResult = await directUploadToSupabase({
          file,
          userId: profile.userId,
          onProgress: (progress, status) => {
            // 對於多檔案上傳，計算平均進度
            const totalProgress = (index * 100 + progress) / selectedFiles.length;
            updateProgress(totalProgress);
          }
        });
        
        if (!uploadResult.success) {
          throw new Error(uploadResult.error || '上傳失敗');
        }
        
        // 發送元數據到後端 API
        const metadataFormData = new FormData();
        metadataFormData.append('fileName', uploadResult.data!.fileName);
        metadataFormData.append('fileUrl', uploadResult.data!.fileUrl);
        metadataFormData.append('fileSize', uploadResult.data!.fileSize.toString());
        metadataFormData.append('fileType', uploadResult.data!.fileType);
        metadataFormData.append('blessingMessage', processedBlessingMessage);
        metadataFormData.append('isPublic', isPublic.toString());
        metadataFormData.append('uploaderLineId', profile.userId);
        
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
      
      // 處理結果
      const successful = results.filter(r => r.status === 'fulfilled');
      const failed = results.filter(r => r.status === 'rejected');
      
      if (failed.length > 0) {
        throw new Error(`部分上傳失敗：${successful.length} 張成功，${failed.length} 張失敗`);
      }
      
      completeUpload();
      setUploadSuccess(true);
      
      // 清理表單
      setSelectedFiles([]);
      setBlessingMessage('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      // 2秒後跳轉到照片牆
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
    setSelectedFiles([]);
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
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
            
            {selectedFiles.length === 0 ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center cursor-pointer hover:border-pink-400 hover:bg-pink-50 transition-colors"
              >
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-lg text-black mb-2">點擊選擇照片</p>
                <p className="text-sm text-black">支援 JPG, PNG 格式，無檔案大小限制</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-lg font-medium text-black">
                    已選擇 {selectedFiles.length}/{maxPhotoCount} 張照片
                  </h4>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600"
                  >
                    添加更多照片
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
                  {selectedFiles.map((file, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={URL.createObjectURL(file)}
                        alt={`照片 ${index + 1}`}
                        className="w-full h-32 object-cover rounded-lg"
                      />
                      
                      {/* 序號標籤 */}
                      <div className="absolute top-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-sm">
                        {index + 1}/{selectedFiles.length}
                      </div>
                      
                      {/* 移除按鈕 */}
                      <button
                        onClick={() => handleRemoveFile(index)}
                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-4 h-4" />
                      </button>
                      
                      {/* 檔案資訊 */}
                      <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-75 text-white p-2 text-xs">
                        <p className="truncate">{file.name}</p>
                        <p>{formatFileSize(file.size)}</p>
                        {needsResumableUpload(file.size) && (
                          <p className="text-yellow-300">🔄 可恢復上傳</p>
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
            {blessingMessage && selectedFiles.length > 0 && (
              <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium text-gray-700 mb-2">祝福語預覽：</p>
                {Array.from({ length: selectedFiles.length }, (_, index) => (
                  <p key={index} className="text-sm text-gray-600">
                    "{blessingMessage} ({index + 1}/{selectedFiles.length})"
                  </p>
                ))}
              </div>
            )}
          </div>
          
          {/* 上傳按鈕 */}
          <div className="text-center">
            <button
              onClick={handleUpload}
              disabled={selectedFiles.length === 0 || isUploading}
              className={`px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-200 ${
                selectedFiles.length === 0 || isUploading
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
              💡 上傳的照片將會出現在照片牆和快門傳情中，讓所有賓客一起欣賞美好回憶！
            </p>
          </div>
        </div>
        
        {/* 上傳進度組件 */}
        <UploadProgress
          isUploading={isUploading}
          progress={progress}
          fileName={selectedFiles.length > 0 ? `${selectedFiles.length} 張照片` : undefined}
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
