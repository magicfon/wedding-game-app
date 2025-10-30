import { describe, test, expect, mockBrowserEnvironment } from './test-utils'
import {
  getColumnCount,
  distributePhotosToColumns,
  getPhotoPosition,
  validatePhotoDistribution
} from '@/lib/photo-distribution'
import { PhotoWithUser } from '@/lib/photo-distribution'

// 添加 beforeEach 函數
const beforeEach = (fn: () => void) => {
  fn()
}

// 模擬照片數據
const mockPhotos: PhotoWithUser[] = Array.from({ length: 12 }, (_, i) => ({
  id: i + 1,
  user_id: `user${i + 1}`,
  image_url: `https://example.com/photo${i + 1}.jpg`,
  blessing_message: `Message ${i + 1}`,
  is_public: true,
  vote_count: i,
  created_at: new Date().toISOString(),
  uploader: {
    display_name: `User ${i + 1}`,
    avatar_url: `https://example.com/avatar${i + 1}.jpg`
  }
}))

describe('照片分配工具函數', () => {
  beforeEach(() => {
    mockBrowserEnvironment()
  })

  describe('getColumnCount', () => {
    test('應該為小螢幕返回 3 列', () => {
      expect(getColumnCount(500)).toBe(3)
    })

    test('應該為中等螢幕返回 4 列', () => {
      expect(getColumnCount(800)).toBe(4)
    })

    test('應該為大螢幕返回 4 列', () => {
      expect(getColumnCount(1200)).toBe(4)
    })

    test('應該為超大螢幕返回 5 列', () => {
      expect(getColumnCount(1400)).toBe(5)
    })
  })

  describe('distributePhotosToColumns', () => {
    test('應該將照片橫向分配到各列', () => {
      const columns = distributePhotosToColumns(mockPhotos, 3)
      
      // 檢查第一列：應該包含照片 1, 4, 7, 10
      expect(columns[0]).toEqual([
        mockPhotos[0], // photo 1
        mockPhotos[3], // photo 4
        mockPhotos[6], // photo 7
        mockPhotos[9]  // photo 10
      ])
      
      // 檢查第二列：應該包含照片 2, 5, 8, 11
      expect(columns[1]).toEqual([
        mockPhotos[1], // photo 2
        mockPhotos[4], // photo 5
        mockPhotos[7], // photo 8
        mockPhotos[10] // photo 11
      ])
      
      // 檢查第三列：應該包含照片 3, 6, 9, 12
      expect(columns[2]).toEqual([
        mockPhotos[2], // photo 3
        mockPhotos[5], // photo 6
        mockPhotos[8], // photo 9
        mockPhotos[11] // photo 12
      ])
    })

    test('應該處理空照片數組', () => {
      const columns = distributePhotosToColumns([], 3)
      expect(columns).toEqual([[], [], []])
    })

    test('應該處理單張照片', () => {
      const columns = distributePhotosToColumns([mockPhotos[0]], 3)
      expect(columns).toEqual([[mockPhotos[0]], [], []])
    })

    test('應該處理不同的列數', () => {
      const columns4 = distributePhotosToColumns(mockPhotos.slice(0, 8), 4)
      expect(columns4).toHaveLength(4)
      expect(columns4[0]).toEqual([mockPhotos[0], mockPhotos[4]]) // photos 1, 5
      expect(columns4[1]).toEqual([mockPhotos[1], mockPhotos[5]]) // photos 2, 6
      expect(columns4[2]).toEqual([mockPhotos[2], mockPhotos[6]]) // photos 3, 7
      expect(columns4[3]).toEqual([mockPhotos[3], mockPhotos[7]]) // photos 4, 8
    })

    test('應該處理無法整除的照片數量', () => {
      const columns = distributePhotosToColumns(mockPhotos.slice(0, 10), 3)
      expect(columns[0]).toHaveLength(4) // photos 1, 4, 7, 10
      expect(columns[1]).toHaveLength(3) // photos 2, 5, 8
      expect(columns[2]).toHaveLength(3) // photos 3, 6, 9
    })
  })

  describe('getPhotoPosition', () => {
    test('應該返回索引 0 處照片的正確位置', () => {
      const position = getPhotoPosition(0, 3)
      expect(position).toEqual({ row: 0, column: 0 })
    })

    test('應該返回索引 5 處照片的正確位置', () => {
      const position = getPhotoPosition(5, 3)
      expect(position).toEqual({ row: 1, column: 2 })
    })

    test('應該返回索引 10 處照片的正確位置', () => {
      const position = getPhotoPosition(10, 3)
      expect(position).toEqual({ row: 3, column: 1 })
    })

    test('應該處理不同的列數', () => {
      const position4Cols = getPhotoPosition(7, 4)
      expect(position4Cols).toEqual({ row: 1, column: 3 })
      
      const position5Cols = getPhotoPosition(12, 5)
      expect(position5Cols).toEqual({ row: 2, column: 2 })
    })
  })

  describe('validatePhotoDistribution', () => {
    test('應該驗證正確的分配', () => {
      const columns = distributePhotosToColumns(mockPhotos, 3)
      const validation = validatePhotoDistribution(mockPhotos, columns)
      
      expect(validation.isValid).toBe(true)
      expect(validation.errors).toHaveLength(0)
    })

    test('應該檢測不正確的總數', () => {
      const columns = distributePhotosToColumns(mockPhotos, 3)
      // 移除一張照片來模擬錯誤
      columns[0].pop()
      
      const validation = validatePhotoDistribution(mockPhotos, columns)
      
      expect(validation.isValid).toBe(false)
      expect(validation.errors).toContain(
        '照片總數不一致：原始 12，分配後 11'
      )
    })

    test('應該檢測不正確的照片位置', () => {
      const columns = distributePhotosToColumns(mockPhotos, 3)
      // 交換兩張照片來模擬錯誤
      const temp = columns[0][0]
      columns[0][0] = columns[1][0]
      columns[1][0] = temp
      
      const validation = validatePhotoDistribution(mockPhotos, columns)
      
      expect(validation.isValid).toBe(false)
      expect(validation.errors.length).toBeGreaterThan(0)
    })

    test('應該處理空數組', () => {
      const validation = validatePhotoDistribution([], [])
      
      expect(validation.isValid).toBe(true)
      expect(validation.errors).toHaveLength(0)
    })
  })

  describe('邊界情況', () => {
    test('應該處理零列', () => {
      const columns = distributePhotosToColumns(mockPhotos, 0)
      expect(columns).toEqual([])
    })

    test('應該處理負數列', () => {
      const columns = distributePhotosToColumns(mockPhotos, -1)
      expect(columns).toEqual([])
    })

    test('應該處理列數多於照片數量的情況', () => {
      const columns = distributePhotosToColumns(mockPhotos.slice(0, 2), 5)
      expect(columns).toHaveLength(5)
      expect(columns[0]).toEqual([mockPhotos[0]])
      expect(columns[1]).toEqual([mockPhotos[1]])
      expect(columns[2]).toEqual([])
      expect(columns[3]).toEqual([])
      expect(columns[4]).toEqual([])
    })
  })
})

describe('照片分配集成測試', () => {
  beforeEach(() => {
    mockBrowserEnvironment()
  })

  test('應該在載入更多照片時保持橫向順序', () => {
    // 模擬初始載入 6 張照片
    const initialPhotos = mockPhotos.slice(0, 6)
    const initialColumns = distributePhotosToColumns(initialPhotos, 3)
    
    // 模擬載入更多 6 張照片
    const morePhotos = mockPhotos.slice(0, 12)
    const finalColumns = distributePhotosToColumns(morePhotos, 3)
    
    // 檢查初始照片的位置是否保持不變
    expect(finalColumns[0][0]).toEqual(initialColumns[0][0]) // photo 1
    expect(finalColumns[0][1]).toEqual(initialColumns[0][1]) // photo 4
    expect(finalColumns[1][0]).toEqual(initialColumns[1][0]) // photo 2
    expect(finalColumns[1][1]).toEqual(initialColumns[1][1]) // photo 5
    expect(finalColumns[2][0]).toEqual(initialColumns[2][0]) // photo 3
    expect(finalColumns[2][1]).toEqual(initialColumns[2][1]) // photo 6
    
    // 檢查新照片是否正確添加
    expect(finalColumns[0][2]).toEqual(mockPhotos[6]) // photo 7
    expect(finalColumns[0][3]).toEqual(mockPhotos[9]) // photo 10
    expect(finalColumns[1][2]).toEqual(mockPhotos[7]) // photo 8
    expect(finalColumns[1][3]).toEqual(mockPhotos[10]) // photo 11
    expect(finalColumns[2][2]).toEqual(mockPhotos[8]) // photo 9
    expect(finalColumns[2][3]).toEqual(mockPhotos[11]) // photo 12
  })

  test('應該處理響應式列數變化', () => {
    const photos = mockPhotos.slice(0, 8)
    
    // 3 列佈局
    const columns3 = distributePhotosToColumns(photos, 3)
    expect(columns3).toEqual([
      [photos[0], photos[3], photos[6]], // photos 1, 4, 7
      [photos[1], photos[4], photos[7]], // photos 2, 5, 8
      [photos[2], photos[5]]            // photos 3, 6
    ])
    
    // 4 列佈局
    const columns4 = distributePhotosToColumns(photos, 4)
    expect(columns4).toEqual([
      [photos[0], photos[4]], // photos 1, 5
      [photos[1], photos[5]], // photos 2, 6
      [photos[2], photos[6]], // photos 3, 7
      [photos[3], photos[7]]  // photos 4, 8
    ])
    
    // 5 列佈局
    const columns5 = distributePhotosToColumns(photos, 5)
    expect(columns5).toEqual([
      [photos[0], photos[5]], // photos 1, 6
      [photos[1], photos[6]], // photos 2, 7
      [photos[2], photos[7]], // photos 3, 8
      [photos[3]],           // photo 4
      [photos[4]]            // photo 5
    ])
  })
})