import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase-server'

// 系統設定管理類別（不使用資料庫）
class SystemSettingsManager {
  private static instance: SystemSettingsManager;
  private settings: Map<string, any> = new Map();

  private constructor() {
    this.loadDefaultSettings();
  }

  static getInstance(): SystemSettingsManager {
    if (!SystemSettingsManager.instance) {
      SystemSettingsManager.instance = new SystemSettingsManager();
    }
    return SystemSettingsManager.instance;
  }

  private loadDefaultSettings() {
    // 從環境變數載入設定
    this.settings.set('maxPhotoUploadCount',
      parseInt(process.env.MAX_PHOTO_UPLOAD_COUNT || '3', 10)
    );

    // 移除檔案大小限制，因為現在使用直接上傳
    this.settings.set('allowedFileTypes', ['image/jpeg', 'image/png', 'image/gif', 'image/webp']);
  }

  getSetting(key: string): any {
    return this.settings.get(key);
  }

  updateSetting(key: string, value: any): void {
    this.settings.set(key, value);

    // 可以選擇性地持久化到環境變數或檔案
    if (typeof window !== 'undefined') {
      localStorage.setItem(`setting_${key}`, JSON.stringify(value));
    }
  }

  getAllSettings(): Record<string, any> {
    const settings: Record<string, any> = {};
    this.settings.forEach((value, key) => {
      settings[key] = value;
    });
    return settings;
  }
}

// 獲取最大照片上傳數量
async function getMaxPhotoUploadCount(): Promise<number> {
  const settingsManager = SystemSettingsManager.getInstance();
  const maxCount = settingsManager.getSetting('maxPhotoUploadCount');

  // 如果沒有設定，返回預設值 3
  if (maxCount === null || maxCount === undefined) {
    return 3;
  }

  // 確保不超過最大限制 10
  if (maxCount > 10) {
    return 10;
  }

  return maxCount;
}

// 處理直接上傳的元數據
async function processDirectUploadMetadata({
  fileName,
  fileUrl,
  fileSize,
  fileType,
  blessingMessage,
  isPublic,
  uploaderLineId,
  mediaType = 'image',
  thumbnailUrl
}: {
  fileName: string
  fileUrl: string
  fileSize: number
  fileType: string
  blessingMessage: string
  isPublic: boolean
  uploaderLineId: string
  mediaType?: 'image' | 'video'
  thumbnailUrl?: string
}) {
  const supabaseAdmin = createSupabaseAdmin()

  // 驗證檔案類型
  const allowedImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
  const allowedVideoTypes = ['video/mp4', 'video/webm']

  if (mediaType === 'video') {
    if (!allowedVideoTypes.includes(fileType)) {
      throw new Error(`不支援的影片類型: ${fileType}`)
    }
  } else {
    if (!allowedImageTypes.includes(fileType)) {
      throw new Error(`不支援的圖片類型: ${fileType}`)
    }
  }

  // 縮圖 URL 處理
  let thumbnailSmallUrl = null
  let thumbnailMediumUrl = null
  let thumbnailLargeUrl = null

  if (mediaType === 'video' && thumbnailUrl) {
    // 影片：使用上傳的縮圖作為基礎
    // 假設 thumbnailUrl 已經是 Vercel Blob 或 Supabase Storage 的公開 URL
    // 這裡我們直接使用它, 或者如果支援 Vercel Image Opt, 可以加上參數
    // 但通常影片縮圖已經是 jpg, 可以直接用
    thumbnailSmallUrl = thumbnailUrl
    thumbnailMediumUrl = thumbnailUrl
    thumbnailLargeUrl = thumbnailUrl
  } else if (mediaType === 'image') {
    // 圖片：使用原圖 URL
    // 這裡我們假設使用 Vercel Image Optimization (如果部署在 Vercel)
    // 或者 Supabase 的 Image Transformation
    const baseUrl = fileUrl
    // 簡單起見，直接存儲原圖 URL，前端負責添加寬高參數
    thumbnailSmallUrl = baseUrl
    thumbnailMediumUrl = baseUrl
    thumbnailLargeUrl = baseUrl
  }

  // 儲存到資料庫
  const { data, error } = await supabaseAdmin
    .from('photos')
    .insert({
      image_url: fileUrl,
      user_id: uploaderLineId,
      blessing_message: blessingMessage,
      is_public: isPublic,
      file_size: fileSize,
      media_type: mediaType,
      thumbnail_small_url: thumbnailSmallUrl,
      thumbnail_medium_url: thumbnailMediumUrl,
      thumbnail_large_url: thumbnailLargeUrl,
      thumbnail_generated_at: new Date().toISOString()
    })
    .select()
    .single()

  if (error) throw error

  return data
}

// 處理單張照片上傳 (傳統方式)
async function uploadSinglePhoto({
  file,
  blessingMessage,
  isPublic,
  uploaderLineId
}: {
  file: File
  blessingMessage: string
  isPublic: boolean
  uploaderLineId: string
}) {
  const supabaseAdmin = createSupabaseAdmin()

  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
  const filePath = `${uploaderLineId}/${fileName}`;

  const { error: uploadError } = await supabaseAdmin
    .storage
    .from('photos')
    .upload(filePath, file, {
      contentType: file.type
    });

  if (uploadError) throw uploadError;

  const { data: { publicUrl } } = supabaseAdmin
    .storage
    .from('photos')
    .getPublicUrl(filePath);

  // 2. Metadata
  return processDirectUploadMetadata({
    fileName: file.name,
    fileUrl: publicUrl,
    fileSize: file.size,
    fileType: file.type,
    blessingMessage,
    isPublic,
    uploaderLineId,
    mediaType: file.type.startsWith('video/') ? 'video' : 'image'
  });
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createSupabaseAdmin();
    const formData = await request.formData();

    // 檢查是否為客戶端直接上傳的元數據
    const fileName = formData.get('fileName') as string;
    const fileUrl = formData.get('fileUrl') as string;
    const fileSize = formData.get('fileSize') as string;
    const fileType = formData.get('fileType') as string;

    if (fileName && fileUrl && fileSize && fileType) {
      // 處理客戶端直接上傳的元數據
      const blessingMessage = formData.get('blessingMessage') as string || '';
      const isPublic = formData.get('isPublic') === 'true';
      const uploaderLineId = formData.get('uploaderLineId') as string;
      const mediaType = (formData.get('mediaType') as 'image' | 'video') || 'image';
      const thumbnailUrl = formData.get('thumbnailUrl') as string;

      if (!uploaderLineId) {
        return NextResponse.json({
          error: '用戶身份驗證失敗'
        }, { status: 401 });
      }

      try {
        const photoData = await processDirectUploadMetadata({
          fileName,
          fileUrl,
          fileSize: parseInt(fileSize, 10),
          fileType,
          blessingMessage,
          isPublic,
          uploaderLineId,
          mediaType,
          thumbnailUrl
        });

        return NextResponse.json({
          success: true,
          message: '照片上傳成功',
          data: photoData
        });
      } catch (error) {
        console.error('❌ 元數據處理錯誤:', error);
        return NextResponse.json({
          error: error instanceof Error ? error.message : '照片資訊儲存失敗'
        }, { status: 500 });
      }
    } else {
      // 向後相容：處理傳統的檔案上傳（管理員使用）
      const files = formData.getAll('files') as File[];
      const blessingMessage = formData.get('blessingMessage') as string;
      const isPublic = formData.get('isPublic') === 'true';
      const uploaderLineId = formData.get('uploaderLineId') as string;

      if (files.length === 0) {
        return NextResponse.json({
          error: '未選擇檔案'
        }, { status: 400 });
      }

      if (!uploaderLineId) {
        return NextResponse.json({
          error: '用戶身份驗證失敗'
        }, { status: 401 });
      }

      // 檢查最大上傳數量
      const maxCount = await getMaxPhotoUploadCount();
      if (files.length > maxCount) {
        return NextResponse.json({
          error: `最多只能上傳 ${maxCount} 張照片`
        }, { status: 400 });
      }

      // 並行處理多張照片上傳
      const uploadPromises = files.map(async (file, index) => {
        // 為每張照片生成帶序號的祝福語
        const processedBlessingMessage = blessingMessage
          ? `${blessingMessage} (${index + 1}/${files.length})`
          : blessingMessage;

        return uploadSinglePhoto({
          file,
          blessingMessage: processedBlessingMessage,
          isPublic,
          uploaderLineId
        });
      });

      const results = await Promise.allSettled(uploadPromises);

      // 處理結果
      const successful = results.filter(r => r.status === 'fulfilled');
      const failed = results.filter(r => r.status === 'rejected');

      if (failed.length > 0) {
        return NextResponse.json({
          success: false,
          message: `部分上傳失敗：${successful.length} 張成功，${failed.length} 張失敗`,
          data: {
            uploadedPhotos: successful.map(r => r.value),
            failedFiles: failed.map(r => r.reason)
          }
        }, { status: 207 }); // Multi-Status
      }

      return NextResponse.json({
        success: true,
        message: `成功上傳 ${files.length} 張照片`,
        data: {
          uploadedPhotos: successful.map(r => r.value),
          totalCount: files.length
        }
      });
    }

  } catch (error) {
    console.error('❌ 照片上傳錯誤:', error);
    return NextResponse.json({
      error: '照片上傳失敗',
      details: error instanceof Error ? error.message : '未知錯誤'
    }, { status: 500 });
  }
}

// 系統設定讀取 API
export async function GET() {
  try {
    const settingsManager = SystemSettingsManager.getInstance();
    const settings = settingsManager.getAllSettings();

    return NextResponse.json({
      success: true,
      data: settings
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '未知錯誤'
    }, { status: 500 });
  }
}

// 系統設定更新 API
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const settingsManager = SystemSettingsManager.getInstance();

    // 驗證設定值
    if (body.maxPhotoUploadCount !== undefined) {
      const count = parseInt(body.maxPhotoUploadCount, 10);
      if (isNaN(count) || count < 1 || count > 10) {
        return NextResponse.json({
          success: false,
          error: '最大照片上傳數量必須是 1-10 之間的整數'
        }, { status: 400 });
      }

      settingsManager.updateSetting('maxPhotoUploadCount', count);
    }

    return NextResponse.json({
      success: true,
      message: '設定更新成功',
      data: body
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '未知錯誤'
    }, { status: 500 });
  }
}
