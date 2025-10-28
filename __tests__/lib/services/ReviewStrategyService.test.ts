// src/__tests__/services/ReviewStrategyService.test.ts
import { tablesDB } from '@/src/lib/appwrite';
import ReviewStrategyService from '@/src/lib/services/ReviewStrategyService';
import { ReviewScheduleLog } from '@/src/types/ReviewScheduleLog';
import { ReviewStrategy, STRATEGY_IDS, STRATEGY_TYPES } from '@/src/types/ReviewStrategy';
import { CreateUserWordProgress } from '@/src/types/UserWordProgress';
import { createEmptyCard, fsrs, generatorParameters, Rating } from 'ts-fsrs';

// Mock Appwrite 模块
jest.mock('@/src/lib/appwrite', () => ({
  tablesDB: {
    getRow: jest.fn(),
    createRow: jest.fn(),
  },
}));

// Mock 常量
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
  const mockFSRSStrategy = createMockStrategy('strategy_fsrs', 4, '');

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

  // 创建真实的 FSRS 实例用于测试
  let fsrsInstance: any;

  beforeEach(() => {
    jest.clearAllMocks();
    // 重置日期以确保测试一致性
    jest.useFakeTimers().setSystemTime(new Date('2024-01-01T00:00:00Z'));
    
    // 创建真实的 FSRS 实例
    const params = generatorParameters({
      maximum_interval: 36500,
      enable_fuzz: true,
      enable_short_term: true
    });
    fsrsInstance = fsrs(params);
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
    test('returns FSRS strategy when strategy type is FSRS', () => {
      const result = ReviewStrategyService.getReviewStrategyId(STRATEGY_TYPES.FSRS, 0, false);
      expect(result).toBe(STRATEGY_IDS.FSRS_DEFAULT);
    });

    test('returns DENSE strategy for L0 long difficult words', () => {
      const result = ReviewStrategyService.getReviewStrategyId(STRATEGY_TYPES.TRADITIONAL, 0, true);
      expect(result).toBe(STRATEGY_IDS.DENSE);
    });

    test('returns NORMAL strategy for L0 short words', () => {
      const result = ReviewStrategyService.getReviewStrategyId(STRATEGY_TYPES.TRADITIONAL, 0, false);
      expect(result).toBe(STRATEGY_IDS.NORMAL);
    });

    test('returns NORMAL strategy for L1 long difficult words', () => {
      const result = ReviewStrategyService.getReviewStrategyId(STRATEGY_TYPES.TRADITIONAL, 1, true);
      expect(result).toBe(STRATEGY_IDS.NORMAL);
    });

    test('returns NORMAL strategy for L2 long difficult words', () => {
      const result = ReviewStrategyService.getReviewStrategyId(STRATEGY_TYPES.TRADITIONAL, 2, true);
      expect(result).toBe(STRATEGY_IDS.NORMAL);
    });

    test('returns SPARSE strategy for L3 long difficult words', () => {
      const result = ReviewStrategyService.getReviewStrategyId(STRATEGY_TYPES.TRADITIONAL, 3, true);
      expect(result).toBe(STRATEGY_IDS.SPARSE);
    });

    test('returns NORMAL strategy for other combinations', () => {
      expect(ReviewStrategyService.getReviewStrategyId(STRATEGY_TYPES.TRADITIONAL, 1, false)).toBe(STRATEGY_IDS.NORMAL);
      expect(ReviewStrategyService.getReviewStrategyId(STRATEGY_TYPES.TRADITIONAL, 2, false)).toBe(STRATEGY_IDS.NORMAL);
      expect(ReviewStrategyService.getReviewStrategyId(STRATEGY_TYPES.TRADITIONAL, 3, false)).toBe(STRATEGY_IDS.NORMAL);
      expect(ReviewStrategyService.getReviewStrategyId(STRATEGY_TYPES.TRADITIONAL, 4, true)).toBe(STRATEGY_IDS.NORMAL);
      expect(ReviewStrategyService.getReviewStrategyId(STRATEGY_TYPES.TRADITIONAL, 4, false)).toBe(STRATEGY_IDS.NORMAL);
    });
  });

  describe('calculateReviewProgress', () => {
    const reviewDate = '2024-01-01T10:00:00Z';
    const strategyType = STRATEGY_TYPES.TRADITIONAL;
    const spelling = 'test';

    test('returns null when already reviewed today', async () => {
      const progress = createMockProgress({
        last_review_date: reviewDate,
      });

      const result = await ReviewStrategyService.calculateReviewProgress(
        progress, 
        1, 
        reviewDate, 
        strategyType, 
        spelling
      );

      expect(result).toBeNull();
    });

    test('handles first review with traditional strategy correctly', async () => {
      const progress = createMockProgress({
        start_date: null,
        last_review_date: null,
        proficiency_level: 0,
        is_long_difficult: true,
      });

      // 模拟策略查询
      (tablesDB.getRow as jest.Mock).mockResolvedValue(mockDenseStrategy);
      (tablesDB.createRow as jest.Mock).mockResolvedValue({});

      const result = await ReviewStrategyService.calculateReviewProgress(
        progress, 
        1, 
        reviewDate, 
        strategyType, 
        spelling
      );

      expect(result).not.toBeNull();
      expect(result!.strategy_id).toBe(STRATEGY_IDS.DENSE);
      expect(result!.start_date).toBe(reviewDate);
      expect(result!.last_review_date).toBe(reviewDate);
      expect(result!.reviewed_times).toBe(0);
      expect(result!.proficiency_level).toBe(1);
      expect(result!.next_review_date).toBeDefined();
    });

    test('handles first review with FSRS strategy correctly', async () => {
      const progress = createMockProgress({
        start_date: null,
        last_review_date: null,
        proficiency_level: 0,
        is_long_difficult: false,
      });

      (tablesDB.getRow as jest.Mock).mockResolvedValue(mockFSRSStrategy);
      (tablesDB.createRow as jest.Mock).mockResolvedValue({});

      const result = await ReviewStrategyService.calculateReviewProgress(
        progress, 
        1, 
        reviewDate, 
        STRATEGY_TYPES.FSRS, 
        spelling
      );

      expect(result).not.toBeNull();
      expect(result!.strategy_id).toBe(STRATEGY_IDS.FSRS_DEFAULT);
      expect(result!.start_date).toBe(reviewDate);
      expect(result!.last_review_date).toBe(reviewDate);
      expect(result!.reviewed_times).toBe(0);
      expect(result!.proficiency_level).toBe(1);
      expect(result!.next_review_date).toBeDefined();
      expect(result!.review_config).toBeDefined();
    });

    test('handles strategy downgrade after 90 days with traditional strategy', async () => {
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
      (tablesDB.createRow as jest.Mock).mockResolvedValue({});

      const result = await ReviewStrategyService.calculateReviewProgress(
        progress, 
        0, 
        reviewDate, 
        strategyType, 
        spelling
      );

      expect(result).not.toBeNull();
      expect(result!.strategy_id).toBe(STRATEGY_IDS.NORMAL);
      expect(result!.start_date).toBe(reviewDate);
      expect(result!.reviewed_times).toBe(0);
    });

    test('resets progress when proficiency drops to 0 with traditional strategy', async () => {
      const progress = createMockProgress({
        start_date: '2023-12-01T00:00:00Z',
        last_review_date: '2023-12-15T00:00:00Z',
        proficiency_level: 2,
        strategy_id: STRATEGY_IDS.NORMAL,
        reviewed_times: 3,
      });

      (tablesDB.getRow as jest.Mock).mockResolvedValue(mockNormalStrategy);
      (tablesDB.createRow as jest.Mock).mockResolvedValue({});

      const result = await ReviewStrategyService.calculateReviewProgress(
        progress, 
        0, 
        reviewDate, 
        strategyType, 
        spelling
      );

      expect(result).not.toBeNull();
      expect(result!.start_date).toBe(reviewDate);
      expect(result!.reviewed_times).toBe(0);
    });

    test('increments reviewed times for normal review with traditional strategy', async () => {
      const progress = createMockProgress({
        start_date: '2023-12-20T00:00:00Z',
        last_review_date: '2023-12-25T00:00:00Z',
        proficiency_level: 2,
        strategy_id: STRATEGY_IDS.NORMAL,
        reviewed_times: 2,
      });

      (tablesDB.getRow as jest.Mock).mockResolvedValue(mockNormalStrategy);
      (tablesDB.createRow as jest.Mock).mockResolvedValue({});

      const result = await ReviewStrategyService.calculateReviewProgress(
        progress, 
        3, 
        reviewDate, 
        strategyType, 
        spelling
      );

      expect(result).not.toBeNull();
      expect(result!.reviewed_times).toBe(3);
      expect(result!.proficiency_level).toBe(3);
    });

    test('handles FSRS strategy with existing review config', async () => {
      const card = createEmptyCard();
      card.due = new Date('2023-12-26T00:00:00Z');
      
      const progress = createMockProgress({
        start_date: '2023-12-20T00:00:00Z',
        last_review_date: '2023-12-25T00:00:00Z',
        proficiency_level: 2,
        strategy_id: STRATEGY_IDS.FSRS_DEFAULT,
        reviewed_times: 2,
        review_config: ReviewStrategyService.serializeCardToJSON(card)
      });

      (tablesDB.createRow as jest.Mock).mockResolvedValue({});

      const result = await ReviewStrategyService.calculateReviewProgress(
        progress, 
        3, 
        reviewDate, 
        STRATEGY_TYPES.FSRS, 
        spelling
      );

      expect(result).not.toBeNull();
      expect(result!.reviewed_times).toBe(3);
      expect(result!.proficiency_level).toBe(3);
      expect(result!.review_config).toBeDefined();
    });
  });

  describe('calculateNextReviewDateTraditional', () => {
    const reviewDate = '2024-01-01T10:00:00Z';

    test('calculates next review date based on strategy intervals', async () => {
      (tablesDB.getRow as jest.Mock).mockResolvedValue(mockNormalStrategy);
      (tablesDB.createRow as jest.Mock).mockResolvedValue({});

      const progress = createMockProgress();
      
      const result = await ReviewStrategyService.calculateNextReviewDateTraditional(
        STRATEGY_IDS.NORMAL,
        reviewDate,
        0,
        progress
      );

      expect(result.nextReviewDate).toBeDefined();
      expect(result.reviewLog).toBeDefined();
      expect(result.reviewLog.user_id).toBe(progress.user_id);
      expect(result.reviewLog.word_id).toBe(progress.word_id);
    });

    test('uses default interval when strategy not found', async () => {
      (tablesDB.getRow as jest.Mock).mockRejectedValue(new Error('Not found'));
      (tablesDB.createRow as jest.Mock).mockResolvedValue({});

      const progress = createMockProgress();
      
      const result = await ReviewStrategyService.calculateNextReviewDateTraditional(
        'non-existent',
        reviewDate,
        0,
        progress
      );

      expect(result.nextReviewDate).toBeDefined();
      expect(result.reviewLog).toBeDefined();
    });

    test('uses default interval when interval rule is invalid', async () => {
      const invalidStrategy = createMockStrategy('invalid', 99, '');
      (tablesDB.getRow as jest.Mock).mockResolvedValue(invalidStrategy);
      (tablesDB.createRow as jest.Mock).mockResolvedValue({});

      const progress = createMockProgress();
      
      const result = await ReviewStrategyService.calculateNextReviewDateTraditional(
        'invalid',
        reviewDate,
        0,
        progress
      );

      expect(result.nextReviewDate).toBeDefined();
      expect(result.reviewLog).toBeDefined();
    });
  });

  describe('calculateNextReviewDateFSRS', () => {
    const reviewDate = '2024-01-01T10:00:00Z';

    test('calculates next review date with FSRS algorithm', async () => {
      (tablesDB.createRow as jest.Mock).mockResolvedValue({});

      const progress = createMockProgress();
      
      const result = await ReviewStrategyService.calculateNextReviewDateFSRS(
        reviewDate,
        progress,
        3,
        'test'
      );

      expect(result.nextReviewDate).toBeDefined();
      expect(result.fsrsCard).toBeDefined();
      expect(result.reviewLog).toBeDefined();
      expect(result.reviewLog.user_id).toBe(progress.user_id);
      expect(result.reviewLog.word_id).toBe(progress.word_id);
    });

    test('handles invalid review config gracefully', async () => {
      // 测试无效的复习配置
      const progress = createMockProgress({
        review_config: 'invalid-json'
      });
      
      (tablesDB.createRow as jest.Mock).mockResolvedValue({});

      const result = await ReviewStrategyService.calculateNextReviewDateFSRS(
        reviewDate,
        progress,
        3,
        'test'
      );

      expect(result.nextReviewDate).toBeDefined();
      expect(result.fsrsCard).toBeDefined();
      expect(result.reviewLog).toBeDefined();
      // 即使配置无效，也应该返回有效结果
    });
  });

  describe('getFSRSPreviewOptions', () => {
    test('returns preview options for FSRS strategy', () => {
      const progress = createMockProgress();
      const spelling = 'test';
      
      const result = ReviewStrategyService.getFSRSPreviewOptions(progress, '2024-01-01T10:00:00Z', spelling);
      
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(4); // 4种评分选项
      result.forEach(option => {
        expect(option.rating).toBeDefined();
        expect(option.name).toBeDefined();
        expect(option.nextReviewDate).toBeDefined();
        expect(option.scheduledDays).toBeDefined();
      });
    });

    test('handles invalid review config gracefully', () => {
      // 测试无效的复习配置
      const progress = createMockProgress({
        review_config: 'invalid-json'
      });
      const spelling = 'test';
      
      const result = ReviewStrategyService.getFSRSPreviewOptions(progress, '2024-01-01T10:00:00Z', spelling);
      
      // 即使配置无效，也应该返回4个选项（使用空卡片）
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(4);
    });
  });

  describe('parseIntervalRule', () => {
    test('parses valid interval rule correctly', () => {
      const result = ReviewStrategyService.parseIntervalRule('1h,3h,1d,2d,4d');
      
      expect(result).toEqual([1, 3, 24, 48, 96]);
    });

    test('returns empty array for empty rule', () => {
      const result = ReviewStrategyService.parseIntervalRule('');
      
      expect(result).toEqual([]);
    });

    test('filters out invalid time formats', () => {
      const result = ReviewStrategyService.parseIntervalRule('1h,invalid,2d,3x,4d');
      
      expect(result).toEqual([1, 48, 96]);
    });
  });

  describe('parseTimeToHours', () => {
    test('converts hours correctly', () => {
      const result = ReviewStrategyService.parseTimeToHours('5h');
      expect(result).toBe(5);
    });

    test('converts days correctly', () => {
      const result = ReviewStrategyService.parseTimeToHours('3d');
      expect(result).toBe(72);
    });

    test('returns 0 for invalid format', () => {
      const result = ReviewStrategyService.parseTimeToHours('invalid');
      expect(result).toBe(0);
    });

    test('returns 0 for unsupported unit', () => {
      const result = ReviewStrategyService.parseTimeToHours('5w');
      expect(result).toBe(0);
    });
  });

  describe('getDefaultNextReviewDate', () => {
    test('returns date 24 hours later', () => {
      const reviewDate = '2024-01-01T10:00:00Z';
      
      const result = ReviewStrategyService.getDefaultNextReviewDate(reviewDate);
      
      const expectedDate = new Date(reviewDate);
      expectedDate.setHours(expectedDate.getHours() + 24);
      
      expect(result).toBe(expectedDate.toISOString());
    });
  });

  describe('Card serialization/deserialization', () => {
    test('serializes card to JSON correctly', () => {
      const card = createEmptyCard();
      card.due = new Date('2024-01-02T10:00:00Z');
      
      const result = ReviewStrategyService.serializeCardToJSON(card);
      
      expect(typeof result).toBe('string');
      const parsed = JSON.parse(result);
      expect(parsed.due).toBe('2024-01-02T10:00:00.000Z');
    });

    test('restores card from JSON correctly', () => {
      const cardJSON = JSON.stringify({
        due: '2024-01-02T10:00:00.000Z',
        stability: 1.0,
        difficulty: 0.3,
        elapsed_days: 0,
        scheduled_days: 0,
        reps: 0,
        lapses: 0,
        state: 0,
        last_review: null
      });
      
      const result = ReviewStrategyService.restoreCardFromJSON(cardJSON);
      
      expect(result.due).toBeInstanceOf(Date);
      expect(result.due.toISOString()).toBe('2024-01-02T10:00:00.000Z');
    });

    test('returns empty card for invalid JSON', () => {
      const result = ReviewStrategyService.restoreCardFromJSON('invalid json');
      
      expect(result).toBeDefined();
      expect(result.due).toBeDefined();
    });
  });

  describe('Review log saving', () => {
    test('saves review log successfully', async () => {
      (tablesDB.createRow as jest.Mock).mockResolvedValue({});
      
      const reviewLog: ReviewScheduleLog = {
        id: '',
        user_id: 'user123',
        word_id: 'word456',
        review_time: '2024-01-01T10:00:00Z',
        schedule_days: 1,
        next_review_time: '2024-01-02T10:00:00Z',
        strategy_id: 1,
        review_config: '{}',
        review_log: '{}'
      };
      
      await ReviewStrategyService.saveReviewScheduleLog(reviewLog);
      
      expect(tablesDB.createRow).toHaveBeenCalledWith({
        databaseId: 'test-database',
        tableId: 'review_schedule_log',
        rowId: expect.any(String),
        data: reviewLog
      });
    });

    test('handles review log saving failure gracefully', async () => {
      (tablesDB.createRow as jest.Mock).mockRejectedValue(new Error('Database error'));
      
      const reviewLog: ReviewScheduleLog = {
        id: '',
        user_id: 'user123',
        word_id: 'word456',
        review_time: '2024-01-01T10:00:00Z',
        schedule_days: 1,
        next_review_time: '2024-01-02T10:00:00Z',
        strategy_id: 1
      };
      
      // 不应该抛出错误
      await expect(ReviewStrategyService.saveReviewScheduleLog(reviewLog)).resolves.toBeUndefined();
    });
  });

  describe('proficiencyLevelToFSRSRating', () => {
    test('converts proficiency levels to FSRS ratings correctly', () => {
      expect(ReviewStrategyService.proficiencyLevelToFSRSRating(0)).toBe(Rating.Again);
      expect(ReviewStrategyService.proficiencyLevelToFSRSRating(1)).toBe(Rating.Hard);
      expect(ReviewStrategyService.proficiencyLevelToFSRSRating(2)).toBe(Rating.Good);
      expect(ReviewStrategyService.proficiencyLevelToFSRSRating(3)).toBe(Rating.Easy);
      expect(ReviewStrategyService.proficiencyLevelToFSRSRating(4)).toBe(Rating.Easy);
      expect(ReviewStrategyService.proficiencyLevelToFSRSRating(5)).toBe(Rating.Good); // 默认情况
    });
  });

  // 添加真实的 FSRS 算法测试
  describe('Real FSRS Algorithm Tests', () => {
    test('FSRS algorithm produces consistent results', () => {
      const card = createEmptyCard();
      const now = new Date('2024-01-01T10:00:00Z');
      
      const schedulingCards = fsrsInstance.repeat(card, now);
      
      // 验证所有评分选项都有结果
      expect(schedulingCards[Rating.Again]).toBeDefined();
      expect(schedulingCards[Rating.Hard]).toBeDefined();
      expect(schedulingCards[Rating.Good]).toBeDefined();
      expect(schedulingCards[Rating.Easy]).toBeDefined();
      
      // 验证下次复习日期是未来的
      expect(schedulingCards[Rating.Again].card.due.getTime()).toBeGreaterThan(now.getTime());
      expect(schedulingCards[Rating.Hard].card.due.getTime()).toBeGreaterThan(now.getTime());
      expect(schedulingCards[Rating.Good].card.due.getTime()).toBeGreaterThan(now.getTime());
      expect(schedulingCards[Rating.Easy].card.due.getTime()).toBeGreaterThan(now.getTime());
    });

    test('FSRS with different initial difficulties produces cards with different difficulties', () => {
      const card1 = createEmptyCard(); // 默认难度
      const card2 = createEmptyCard();
      card2.difficulty = 0.7; // 高难度
      
      // 验证卡片确实有不同的难度值
      expect(card1.difficulty).not.toBe(card2.difficulty);
      expect(card2.difficulty).toBe(0.7);
    });
  });
});