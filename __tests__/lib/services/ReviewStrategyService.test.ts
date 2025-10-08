// src/__tests__/services/ReviewStrategyService.test.ts
import { tablesDB } from '@/src/lib/appwrite';
import ReviewStrategyService from '@/src/lib/services/ReviewStrategyService';
import { ReviewStrategy, STRATEGY_IDS } from '@/src/types/ReviewStrategy';
import { CreateUserWordProgress } from '@/src/types/UserWordProgress';

// 模拟 Appwrite 模块
jest.mock('@/src/lib/appwrite', () => ({
  tablesDB: {
    getRow: jest.fn(),
  },
}));

// 模拟常量
jest.mock('@/src/constants/appwrite', () => ({
  DATABASE_ID: 'test-database',
  COLLECTION_REVIEW_STRATEGY: 'test-review-strategy',
}));

describe('ReviewStrategyService Unit Tests', () => {
  // 模拟复习策略数据
  const createMockStrategy = (id: string, strategyId: number, intervalRule: string): ReviewStrategy => ({
    $id: id,
    id: strategyId,
    strategy_type: 1,
    strategy_name: 'Test Strategy',
    applicable_condition: 'test condition',
    interval_rule: intervalRule,
  });

  const mockDenseStrategy = createMockStrategy('strategy_dense', 1, '1h,3h,6h,1d,2d');
  const mockNormalStrategy = createMockStrategy('strategy_normal', 2, '3h,1d,2d,4d,7d');
  const mockSparseStrategy = createMockStrategy('strategy_sparse', 3, '1d,3d,7d,14d,30d');

  // 模拟用户单词进度数据
  const createMockProgress = (overrides?: Partial<CreateUserWordProgress>): CreateUserWordProgress => ({
    user_id: 'user123',
    word_id: 'word456',
    is_long_difficult: false,
    proficiency_level: 0,
    strategy_id: STRATEGY_IDS.NORMAL,
    start_date: null,
    last_review_date: null,
    reviewed_times: 0,
    next_review_date: null,
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    // 重置日期以确保测试一致性
    jest.useFakeTimers().setSystemTime(new Date('2024-01-01T00:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('getReviewStrategyById', () => {
    test('returns strategy when found', async () => {
      (tablesDB.getRow as jest.Mock).mockResolvedValue(mockDenseStrategy);

      const result = await ReviewStrategyService.getReviewStrategyById('strategy_dense');

      expect(result).toEqual(mockDenseStrategy);
      expect(tablesDB.getRow).toHaveBeenCalledWith({
        databaseId: 'test-database',
        tableId: 'test-review-strategy',
        rowId: 'strategy_dense',
      });
    });

    test('throws error when strategy not found', async () => {
      const error = new Error('Strategy not found');
      (tablesDB.getRow as jest.Mock).mockRejectedValue(error);

      await expect(ReviewStrategyService.getReviewStrategyById('non-existent')).rejects.toThrow('Strategy not found');
    });
  });

  describe('getReviewStrategyId', () => {
    test('returns DENSE strategy for L0 long difficult words', () => {
      const result = ReviewStrategyService.getReviewStrategyId(0, true);
      expect(result).toBe(STRATEGY_IDS.DENSE);
    });

    test('returns NORMAL strategy for L0 short words', () => {
      const result = ReviewStrategyService.getReviewStrategyId(0, false);
      expect(result).toBe(STRATEGY_IDS.NORMAL);
    });

    test('returns NORMAL strategy for L1 long difficult words', () => {
      const result = ReviewStrategyService.getReviewStrategyId(1, true);
      expect(result).toBe(STRATEGY_IDS.NORMAL);
    });

    test('returns NORMAL strategy for L2 long difficult words', () => {
      const result = ReviewStrategyService.getReviewStrategyId(2, true);
      expect(result).toBe(STRATEGY_IDS.NORMAL);
    });

    test('returns SPARSE strategy for L3 long difficult words', () => {
      const result = ReviewStrategyService.getReviewStrategyId(3, true);
      expect(result).toBe(STRATEGY_IDS.SPARSE);
    });

    test('returns NORMAL strategy for other combinations', () => {
      // L1 short words
      expect(ReviewStrategyService.getReviewStrategyId(1, false)).toBe(STRATEGY_IDS.NORMAL);
      // L2 short words
      expect(ReviewStrategyService.getReviewStrategyId(2, false)).toBe(STRATEGY_IDS.NORMAL);
      // L3 short words
      expect(ReviewStrategyService.getReviewStrategyId(3, false)).toBe(STRATEGY_IDS.NORMAL);
      // L4 long difficult words
      expect(ReviewStrategyService.getReviewStrategyId(4, true)).toBe(STRATEGY_IDS.NORMAL);
      // L4 short words
      expect(ReviewStrategyService.getReviewStrategyId(4, false)).toBe(STRATEGY_IDS.NORMAL);
    });
  });

  describe('calculateReviewProgress', () => {
    const reviewDate = '2024-01-01T10:00:00Z';

    test('returns null when already reviewed today', async () => {
      const progress = createMockProgress({
        last_review_date: reviewDate,
      });

      const result = await ReviewStrategyService.calculateReviewProgress(progress, 1, reviewDate);

      expect(result).toBeNull();
    });

    test('handles first review correctly', async () => {
      const progress = createMockProgress({
        start_date: null,
        last_review_date: null,
        proficiency_level: 0,
        is_long_difficult: true,
      });

      // 模拟策略查询
      (tablesDB.getRow as jest.Mock).mockResolvedValue(mockDenseStrategy);

      const result = await ReviewStrategyService.calculateReviewProgress(progress, 1, reviewDate);

      expect(result).not.toBeNull();
      expect(result!.strategy_id).toBe(STRATEGY_IDS.DENSE); // L0 + long difficult = DENSE
      expect(result!.start_date).toBe(reviewDate);
      expect(result!.last_review_date).toBe(reviewDate);
      expect(result!.reviewed_times).toBe(0);
      expect(result!.proficiency_level).toBe(1);
      expect(result!.next_review_date).toBeDefined();
    });

    test('handles strategy downgrade after 90 days', async () => {
      const oldStartDate = '2023-10-01T00:00:00Z'; // 92 days before reviewDate
      const progress = createMockProgress({
        start_date: oldStartDate,
        last_review_date: '2023-12-01T00:00:00Z',
        proficiency_level: 3,
        strategy_id: STRATEGY_IDS.DENSE,
        reviewed_times: 5,
        is_long_difficult: true,
      });

      (tablesDB.getRow as jest.Mock).mockResolvedValue(mockNormalStrategy);

      const result = await ReviewStrategyService.calculateReviewProgress(progress, 0, reviewDate);

      expect(result).not.toBeNull();
      expect(result!.strategy_id).toBe(STRATEGY_IDS.NORMAL); // DENSE -> NORMAL
      expect(result!.start_date).toBe(reviewDate); // Reset start date
      expect(result!.reviewed_times).toBe(0); // Reset reviewed times
    });

    test.only('resets progress when proficiency drops to 0', async () => {
      const progress = createMockProgress({
        start_date: '2023-12-01T00:00:00Z',
        last_review_date: '2023-12-15T00:00:00Z',
        proficiency_level: 2,
        strategy_id: STRATEGY_IDS.NORMAL,
        reviewed_times: 3,
      });

      (tablesDB.getRow as jest.Mock).mockResolvedValue(mockNormalStrategy);

      const result = await ReviewStrategyService.calculateReviewProgress(progress, 0, reviewDate);

      expect(result).not.toBeNull();
      expect(result!.start_date).toBe(reviewDate); // Reset start date
      expect(result!.reviewed_times).toBe(0); // Reset reviewed times
    });

    test('increments reviewed times for normal review', async () => {
      const progress = createMockProgress({
        start_date: '2023-12-20T00:00:00Z',
        last_review_date: '2023-12-25T00:00:00Z',
        proficiency_level: 2,
        strategy_id: STRATEGY_IDS.NORMAL,
        reviewed_times: 2,
      });

      (tablesDB.getRow as jest.Mock).mockResolvedValue(mockNormalStrategy);

      const result = await ReviewStrategyService.calculateReviewProgress(progress, 3, reviewDate);

      expect(result).not.toBeNull();
      expect(result!.reviewed_times).toBe(3); // Incremented
      expect(result!.proficiency_level).toBe(3); // Updated
    });
  });

  describe('calculateNextReviewDate', () => {
    const reviewDate = '2024-01-01T10:00:00Z';

    test('calculates next review date based on strategy intervals', async () => {
      (tablesDB.getRow as jest.Mock).mockResolvedValue(mockNormalStrategy);

      const result = await (ReviewStrategyService as any).calculateNextReviewDate(
        STRATEGY_IDS.NORMAL,
        reviewDate,
        0 // First review
      );

      // For normal strategy, first interval is 3h
      const expectedDate = new Date(reviewDate);
      expectedDate.setHours(expectedDate.getHours() + 3);
      
      expect(result).toBe(expectedDate.toISOString());
    });

    test('uses last interval when reviewed times exceed available intervals', async () => {
      (tablesDB.getRow as jest.Mock).mockResolvedValue(mockNormalStrategy);

      const result = await (ReviewStrategyService as any).calculateNextReviewDate(
        STRATEGY_IDS.NORMAL,
        reviewDate,
        10 // Exceeds available intervals
      );

      // For normal strategy, last interval is 7d (168h)
      const expectedDate = new Date(reviewDate);
      expectedDate.setHours(expectedDate.getHours() + 168);
      
      expect(result).toBe(expectedDate.toISOString());
    });

    test('returns default interval when strategy not found', async () => {
      (tablesDB.getRow as jest.Mock).mockRejectedValue(new Error('Not found'));

      const result = await (ReviewStrategyService as any).calculateNextReviewDate(
        'non-existent',
        reviewDate,
        0
      );

      // Default interval is 24h
      const expectedDate = new Date(reviewDate);
      expectedDate.setHours(expectedDate.getHours() + 24);
      
      expect(result).toBe(expectedDate.toISOString());
    });

    test('returns default interval when interval rule is invalid', async () => {
      const invalidStrategy = createMockStrategy('invalid', 99, '');
      (tablesDB.getRow as jest.Mock).mockResolvedValue(invalidStrategy);

      const result = await (ReviewStrategyService as any).calculateNextReviewDate(
        'invalid',
        reviewDate,
        0
      );

      const expectedDate = new Date(reviewDate);
      expectedDate.setHours(expectedDate.getHours() + 24);
      
      expect(result).toBe(expectedDate.toISOString());
    });
  });

  describe('parseIntervalRule', () => {
    test('parses valid interval rule correctly', () => {
      const result = (ReviewStrategyService as any).parseIntervalRule('1h,3h,1d,2d,4d');
      
      expect(result).toEqual([1, 3, 24, 48, 96]); // 1h, 3h, 24h, 48h, 96h
    });

    test('returns empty array for empty rule', () => {
      const result = (ReviewStrategyService as any).parseIntervalRule('');
      
      expect(result).toEqual([]);
    });

    test('filters out invalid time formats', () => {
      const result = (ReviewStrategyService as any).parseIntervalRule('1h,invalid,2d,3x,4d');
      
      expect(result).toEqual([1, 48, 96]); // Only valid intervals: 1h, 2d(48h), 4d(96h)
    });
  });

  describe('parseTimeToHours', () => {
    test('converts hours correctly', () => {
      const result = (ReviewStrategyService as any).parseTimeToHours('5h');
      expect(result).toBe(5);
    });

    test('converts days correctly', () => {
      const result = (ReviewStrategyService as any).parseTimeToHours('3d');
      expect(result).toBe(72); // 3 * 24
    });

    test('returns 0 for invalid format', () => {
      const result = (ReviewStrategyService as any).parseTimeToHours('invalid');
      expect(result).toBe(0);
    });

    test('returns 0 for unsupported unit', () => {
      const result = (ReviewStrategyService as any).parseTimeToHours('5w');
      expect(result).toBe(0);
    });
  });

  describe('getDefaultNextReviewDate', () => {
    test('returns date 24 hours later', () => {
      const reviewDate = '2024-01-01T10:00:00Z';
      
      const result = (ReviewStrategyService as any).getDefaultNextReviewDate(reviewDate);
      
      const expectedDate = new Date(reviewDate);
      expectedDate.setHours(expectedDate.getHours() + 24);
      
      expect(result).toBe(expectedDate.toISOString());
    });
  });
});