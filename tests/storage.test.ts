import { describe, it, expect, beforeEach } from 'vitest'
import { 
  calculateStorageUsage, 
  checkStorageLimit, 
  formatBytes,
  getStorageUsagePercentage,
  getStorageStatus 
} from '@/services/storage/storage-usage.service'

// Mock Firebase
const mockDb = {
  collection: vi.fn(),
  doc: vi.fn(),
  getDocs: vi.fn(),
  getDoc: vi.fn(),
  runTransaction: vi.fn(),
}

vi.mock('@/config/firebase', () => ({
  db: mockDb,
}))

describe('Storage Usage Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('formatBytes', () => {
    it('should format bytes correctly', () => {
      expect(formatBytes(0)).toBe('0 B')
      expect(formatBytes(1024)).toBe('1 KB')
      expect(formatBytes(1024 * 1024)).toBe('1 MB')
      expect(formatBytes(1024 * 1024 * 1024)).toBe('1 GB')
    })
  })

  describe('getStorageUsagePercentage', () => {
    it('should calculate percentage correctly', () => {
      expect(getStorageUsagePercentage(25, 100)).toBe(25)
      expect(getStorageUsagePercentage(50, 200)).toBe(25)
      expect(getStorageUsagePercentage(100, 100)).toBe(100)
      expect(getStorageUsagePercentage(150, 100)).toBe(100) // Cap at 100
      expect(getStorageUsagePercentage(50, Infinity)).toBe(0) // Unlimited storage
    })
  })

  describe('getStorageStatus', () => {
    it('should return correct status based on usage', () => {
      expect(getStorageStatus(10, 100)).toBe('normal') // 10%
      expect(getStorageStatus(80, 100)).toBe('warning') // 80%
      expect(getStorageStatus(90, 100)).toBe('critical') // 90%
      expect(getStorageStatus(100, 100)).toBe('full') // 100%
      expect(getStorageStatus(50, Infinity)).toBe('normal') // Unlimited
    })
  })

  describe('calculateStorageUsage', () => {
    it('should calculate total storage usage from user uploads', async () => {
      const mockSnapshot = {
        forEach: vi.fn((callback) => {
          callback({ data: () => ({ size: 1024 }) }) // 1KB
          callback({ data: () => ({ size: 2048 }) }) // 2KB
          callback({ data: () => ({ size: 0 }) })    // 0B (should be ignored)
        })
      }
      
      mockDb.collection.mockReturnValue('uploads_collection')
      mockDb.getDocs.mockResolvedValue(mockSnapshot)

      const result = await calculateStorageUsage('user123')
      
      expect(result.totalBytes).toBe(3072) // 1KB + 2KB
      expect(result.assetCount).toBe(2)   // Only count files with size > 0
      expect(result.lastCalculated).toBeDefined()
    })
  })

  describe('checkStorageLimit', () => {
    it('should check if user can upload within limits', async () => {
      const mockUserDoc = {
        exists: true,
        data: () => ({
          subscription: 'free',
          storageUsage: { totalBytes: 30 * 1024 * 1024 } // 30MB used
        })
      }
      
      mockDb.doc.mockReturnValue('user_doc')
      mockDb.getDoc.mockResolvedValue(mockUserDoc)

      // Mock the constants import
      const mockTierLimits = {
        free: { storageBytes: 50 * 1024 * 1024 }, // 50MB limit
        pro: { storageBytes: 1024 * 1024 * 1024 }  // 1GB limit
      }
      
      vi.doMock('@/config/constants', () => ({
        TIER_LIMITS: mockTierLimits
      }))

      // Test free user with 10MB file (should succeed)
      const result1 = await checkStorageLimit('user123', 10 * 1024 * 1024)
      expect(result1.canUpload).toBe(true)
      expect(result1.remaining).toBe(20 * 1024 * 1024) // 20MB remaining

      // Test free user with 25MB file (should fail)
      const result2 = await checkStorageLimit('user123', 25 * 1024 * 1024)
      expect(result2.canUpload).toBe(false)
      expect(result2.remaining).toBe(20 * 1024 * 1024) // Still 20MB remaining
    })
  })
})
