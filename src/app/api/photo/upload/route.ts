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
          uploaderLineId
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
