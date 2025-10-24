import sharp from 'sharp'
import { createSupabaseAdmin } from './supabase-server'

export interface ImageProcessingOptions {
  width?: number
  quality?: number
  format?: 'jpeg' | 'webp' | 'png'
}

export class ImageProcessor {
  private supabase = createSupabaseAdmin()
  
  /**
   * 生成縮圖
   * @param originalBuffer 原始圖片緩衝區
   * @param fileName 原始文件名
   * @param options 處理選項
   * @returns 縮圖文件名和緩衝區
   */
  async generateThumbnail(
    originalBuffer: Buffer,
    fileName: string,
    options: ImageProcessingOptions = {}
  ): Promise<{ fileName: string; buffer: Buffer; width: number; height: number }> {
    const {
      width = 150,
      quality = 85,
      format = 'jpeg'
    } = options
    
    try {
      // 處理圖片
      const result = await sharp(originalBuffer)
        .resize(width, null, { 
          withoutEnlargement: true,
          fit: 'inside'
        })
        .jpeg({ quality })
        .toBuffer({ resolveWithObject: true })
      
      // 生成縮圖文件名
      const fileExt = fileName.split('.').pop()
      const nameWithoutExt = fileName.replace(`.${fileExt}`, '')
      const thumbnailFileName = `${nameWithoutExt}_thumb.${format}`
      
      return {
        fileName: thumbnailFileName,
        buffer: result.data,
        width: result.info.width,
        height: result.info.height
      }
    } catch (error) {
      console.error('縮圖生成失敗:', error)
      throw new Error(`縮圖生成失敗: ${error instanceof Error ? error.message : '未知錯誤'}`)
    }
  }
  
  /**
   * 上傳縮圖到 Supabase Storage
   * @param thumbnailBuffer 縮圖緩衝區
   * @param thumbnailFileName 縮圖文件名
   * @returns 公開 URL
   */
  async uploadThumbnail(
    thumbnailBuffer: Buffer,
    thumbnailFileName: string
  ): Promise<string> {
    try {
      const { data, error } = await this.supabase.storage
        .from('wedding-photos')
        .upload(`thumbnails/${thumbnailFileName}`, thumbnailBuffer, {
          cacheControl: '3600',
          upsert: false
        })
      
      if (error) {
        throw new Error(`縮圖上傳失敗: ${error.message}`)
      }
      
      // 獲取公開 URL
      const { data: urlData } = this.supabase.storage
        .from('wedding-photos')
        .getPublicUrl(`thumbnails/${thumbnailFileName}`)
      
      return urlData.publicUrl
    } catch (error) {
      console.error('縮圖上傳失敗:', error)
      throw new Error(`縮圖上傳失敗: ${error instanceof Error ? error.message : '未知錯誤'}`)
    }
  }
  
  /**
   * 從 URL 下載圖片並轉換為 Buffer
   * @param imageUrl 圖片 URL
   * @returns 圖片 Buffer
   */
  async downloadImage(imageUrl: string): Promise<Buffer> {
    try {
      const response = await fetch(imageUrl)
      if (!response.ok) {
        throw new Error(`HTTP 錯誤: ${response.status} ${response.statusText}`)
      }
      
      const arrayBuffer = await response.arrayBuffer()
      return Buffer.from(arrayBuffer)
    } catch (error) {
      console.error('圖片下載失敗:', error)
      throw new Error(`圖片下載失敗: ${error instanceof Error ? error.message : '未知錯誤'}`)
    }
  }
  
  /**
   * 處理單張照片的縮圖生成和上傳
   * @param imageUrl 原始圖片 URL
   * @param fileName 原始文件名
   * @param options 處理選項
   * @returns 縮圖信息
   */
  async processPhotoThumbnail(
    imageUrl: string,
    fileName: string,
    options: ImageProcessingOptions = {}
  ): Promise<{
    thumbnailUrl: string
    thumbnailFileName: string
    thumbnailWidth: number
    thumbnailHeight: number
  }> {
    // 下載原始圖片
    const originalBuffer = await this.downloadImage(imageUrl)
    
    // 生成縮圖
    const thumbnailData = await this.generateThumbnail(originalBuffer, fileName, options)
    
    // 上傳縮圖
    const thumbnailUrl = await this.uploadThumbnail(
      thumbnailData.buffer,
      thumbnailData.fileName
    )
    
    return {
      thumbnailUrl,
      thumbnailFileName: thumbnailData.fileName,
      thumbnailWidth: thumbnailData.width,
      thumbnailHeight: thumbnailData.height
    }
  }
}

// 導出單例實例
export const imageProcessor = new ImageProcessor()