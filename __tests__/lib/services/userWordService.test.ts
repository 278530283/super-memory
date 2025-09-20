// src/__tests__/services/userWordService.integration.test.ts
import { COLLECTION_USER_WORD_PROGRESS, COLLECTION_USER_WORD_TEST_HISTORY, DATABASE_ID } from '@/src/constants/appwrite';
import { tablesDB } from '@/src/lib/appwrite';
import userWordService from '@/src/lib/services/userWordService';
import { UserWordProgress } from '@/src/types/UserWordProgress';
import { TestPhase } from '@/src/types/UserWordTestHistory';

// 设置较长的超时时间，因为涉及真实的网络请求
jest.setTimeout(60000);

describe('UserWordService Integration Tests', () => {
  const testUserId = '68c19de90027e9732ea0';
  const testWordId = '68c4f21fb9b3b6da7363';
  const testDate = '2023-10-05';
  let testHistoryId: string = '68ce58ed002a93a1d704';
  let testProgressId: string = '68ce355b0013c3f7d6a8';

  // 清理测试数据
  afterAll(async () => {
    try {
      if (testHistoryId) {
        await tablesDB.deleteRow({
          databaseId: DATABASE_ID,
          tableId: COLLECTION_USER_WORD_TEST_HISTORY,
          rowId: testHistoryId,
        });
      }
      if (testProgressId) {
        await tablesDB.deleteRow({
          databaseId: DATABASE_ID,
          tableId: COLLECTION_USER_WORD_PROGRESS,
          rowId: testProgressId,
        });
      }
    } catch (error) {
      console.warn('Cleanup failed:', error);
    }
  });

  describe('createUserWordProgress', () => {
    test('creates a new user word progress record', async () => {
      const newProgress: Partial<Omit<UserWordProgress, '$id'>> = {
        user_id: testUserId,
        word_id: testWordId,
        current_level: 1,
        current_speed: 50,
        is_long_difficult: false,
      };

      const result = await userWordService.createUserWordProgress(newProgress);
      
      expect(result).toBeDefined();
      expect(result.user_id).toBe(testUserId);
      expect(result.word_id).toBe(testWordId);
      expect(result.current_level).toBe(1);
      expect(result.current_speed).toBe(50);
      expect(result.is_long_difficult).toBe(false);

      testProgressId = result.$id;
    });
  });

  describe('updateUserWordProgress', () => {
    test('updates an existing user word progress record', async () => {
      const updates = {
        current_level: 2,
        current_speed: 60,
        is_long_difficult: true,
      };

      const result = await userWordService.updateUserWordProgress(testProgressId, updates);
      
      expect(result).toBeDefined();
      expect(result.current_level).toBe(2);
      expect(result.current_speed).toBe(60);
      expect(result.is_long_difficult).toBe(true);
    });
  });

  describe('createUserWordTestHistory', () => {
    test('creates a new test history record', async () => {
      const newHistory: any = {
        user_id: testUserId,
        word_id: testWordId,
        test_date: testDate,
        phase: TestPhase.PRE_TEST,
        test_level: 2,
      };

      const result = await userWordService.createUserWordTestHistory(newHistory);
      
      expect(result).toBeDefined();
      expect(result.user_id).toBe(testUserId);
      expect(result.word_id).toBe(testWordId);
      expect(result.test_date).toBe(testDate);
      expect(result.phase).toBe(TestPhase.PRE_TEST);
      expect(result.test_level).toBe(2);

      testHistoryId = result.$id;
    });
  });

  describe('getUserWordTestHistory', () => {
    test('returns test history when exists', async () => {
      const result = await userWordService.getUserWordTestHistory(
        testUserId,
        testWordId,
        TestPhase.PRE_TEST,
        testDate
      );
      
      expect(result).not.toBeNull();
      expect(result?.$id).toBe(testHistoryId);
      expect(result?.user_id).toBe(testUserId);
      expect(result?.word_id).toBe(testWordId);
      expect(result?.test_date).toBe(testDate);
      expect(result?.phase).toBe(TestPhase.PRE_TEST);
      expect(result?.test_level).toBe(2);
    });

    test('returns null when no history found', async () => {
      const result = await userWordService.getUserWordTestHistory(
        testUserId,
        testWordId,
        TestPhase.POST_TEST,
        testDate
      );
      
      expect(result).toBeNull();
    });
  });

  describe('updateUserWordTestHistory', () => {
    test('updates an existing test history record', async () => {
      const updates = { test_level: 3 };

      const result = await userWordService.updateUserWordTestHistory(testHistoryId, updates);
      
      expect(result).toBeDefined();
      expect(result.test_level).toBe(3);
    });
  });

  describe('upsertUserWordTestHistory', () => {
    test('updates existing record when one exists', async () => {
      const updates = {
        user_id: testUserId,
        word_id: testWordId,
        test_date: testDate,
        phase: TestPhase.PRE_TEST,
        test_level: 4,
      };

      const result = await userWordService.upsertUserWordTestHistory(updates);
      
      expect(result).toBeDefined();
      expect(result.test_level).toBe(4);
    });

    test('creates new record when none exists for different phase', async () => {
      const newHistory: any = {
        user_id: testUserId,
        word_id: testWordId,
        test_date: testDate,
        phase: TestPhase.POST_TEST,
        test_level: 3,
      };

      const result = await userWordService.upsertUserWordTestHistory(newHistory);
      
      expect(result).toBeDefined();
      expect(result.phase).toBe(TestPhase.POST_TEST);
      expect(result.test_level).toBe(3);

      // 清理新创建的记录
      await tablesDB.deleteRow({
        databaseId: DATABASE_ID,
        tableId: COLLECTION_USER_WORD_TEST_HISTORY,
        rowId: result.$id,
      });
    });
  });

  describe('getHistoryLevels', () => {
    test('returns history levels for user and word', async () => {
      const result = await userWordService.getHistoryLevels(testUserId, testWordId);
      
      expect(Array.isArray(result)).toBe(true);
      // 应该包含我们创建的记录 (L4)
      expect(result).toContain('L4');
    });
  });

  describe('getUserTestHistoryByDate', () => {
    test('returns test history for a specific date', async () => {
      const result = await userWordService.getUserTestHistoryByDate(testUserId, testDate);
      
      expect(Array.isArray(result)).toBe(true);
      // 应该包含我们创建的记录
      expect(result.length).toBeGreaterThan(0);
      expect(result.some(history => history.$id === testHistoryId)).toBe(true);
    });
  });

  describe('getUserTestHistoryByDateAndPhase', () => {
    test('returns test history for a specific date and phase', async () => {
      const result = await userWordService.getUserTestHistoryByDateAndPhase(
        testUserId,
        testDate,
        TestPhase.PRE_TEST
      );
      
      expect(Array.isArray(result)).toBe(true);
      // 应该包含我们创建的记录
      expect(result.length).toBeGreaterThan(0);
      expect(result.some(history => history.phase === TestPhase.PRE_TEST)).toBe(true);
    });
  });
});