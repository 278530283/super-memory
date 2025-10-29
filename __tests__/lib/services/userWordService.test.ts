// src/__tests__/services/userWordService.test.ts
import { COLLECTION_USER_WORD_PROGRESS, COLLECTION_USER_WORD_TEST_HISTORY, DATABASE_ID } from '@/src/constants/appwrite';
import { tablesDB } from '@/src/lib/appwrite';
import ReviewStrategyService from '@/src/lib/services/ReviewStrategyService';
import userWordService from '@/src/lib/services/userWordService';
import { STRATEGY_IDS } from '@/src/types/ReviewStrategy';
import { UserWordProgress } from '@/src/types/UserWordProgress';
import { UserWordTestHistory } from '@/src/types/UserWordTestHistory';
import { Query } from 'appwrite';

// Mock Appwrite tablesDB
jest.mock('@/src/lib/appwrite', () => ({
  tablesDB: {
    listRows: jest.fn(),
    getRow: jest.fn(),
    createRow: jest.fn(),
    updateRow: jest.fn(),
    deleteRow: jest.fn(),
  }
}));

// Mock ReviewStrategyService
jest.mock('@/src/lib/services/ReviewStrategyService', () => ({
  __esModule: true,
  default: {
    calculateReviewProgress: jest.fn(),
  }
}));

// Mock constants
jest.mock('@/src/constants/appwrite', () => ({
  COLLECTION_USER_WORD_PROGRESS: 'user_word_progress',
  COLLECTION_USER_WORD_TEST_HISTORY: 'user_word_test_history',
  DATABASE_ID: 'test_database_id'
}));

// Mock appwrite Query
jest.mock('appwrite', () => ({
  ...jest.requireActual('appwrite'),
  Query: {
    equal: jest.fn((attribute: string, value: any) => 
      JSON.stringify({ method: 'equal', attribute, values: [value] })
    ),
    lessThanEqual: jest.fn((attribute: string, value: any) => 
      JSON.stringify({ method: 'lessThanEqual', attribute, values: [value] })
    ),
    orderAsc: jest.fn((attribute: string) => 
      JSON.stringify({ method: 'orderAsc', attribute })
    ),
    orderDesc: jest.fn((attribute: string) => 
      JSON.stringify({ method: 'orderDesc', attribute })
    ),
    select: jest.fn((attributes: string[]) => 
      JSON.stringify({ method: 'select', values: attributes })
    ),
    limit: jest.fn((limit: number) => 
      JSON.stringify({ method: 'limit', values: [limit] })
    )
  },
  ID: {
    unique: jest.fn(() => 'mock-unique-id')
  }
}));

const mockedTablesDB = tablesDB as jest.Mocked<typeof tablesDB>;
const mockedReviewStrategyService = ReviewStrategyService as jest.Mocked<typeof ReviewStrategyService>;

describe('UserWordService Unit Tests', () => {
  const testUserId = '68c19de90027e9732ea0';
  const testWordId = '68c4f21fb9b3b6da7363';
  const testDate = '2023-10-05';

  // Mock data
  const mockUserWordProgress: UserWordProgress = {
    $id: 'progress123',
    user_id: testUserId,
    word_id: testWordId,
    is_long_difficult: false,
    proficiency_level: 1,
    strategy_id: STRATEGY_IDS.NORMAL,
    start_date: '2024-01-15T10:30:00Z',
    last_review_date: null,
    reviewed_times: 0,
    next_review_date: '2024-01-16T10:30:00Z',
    review_config: null
  };

  const mockUserWordTestHistory: UserWordTestHistory = {
    $id: 'history123',
    user_id: testUserId,
    word_id: testWordId,
    test_date: testDate,
    phase: 1,
    test_level: 2
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getHistoryLevels', () => {
    test('returns history levels for user and word with phase 1', async () => {
      const mockHistories = [
        { ...mockUserWordTestHistory, test_level: 2 },
        { ...mockUserWordTestHistory, test_level: 3, $id: 'history2' }
      ];

      mockedTablesDB.listRows.mockResolvedValueOnce({
        total: 2,
        rows: mockHistories
      } as any);

      const result = await userWordService.getHistoryLevels(testUserId, testWordId);
      
      expect(mockedTablesDB.listRows).toHaveBeenCalledWith({
        databaseId: DATABASE_ID,
        tableId: COLLECTION_USER_WORD_TEST_HISTORY,
        queries: [
          Query.equal('user_id', testUserId),
          Query.equal('word_id', testWordId),
          Query.equal('phase', 1),
          Query.orderAsc('test_date')
        ]
      });
      
      expect(result).toEqual([2, 3]);
    });

    test('returns empty array when no history found', async () => {
      mockedTablesDB.listRows.mockResolvedValueOnce({
        total: 0,
        rows: []
      } as any);

      const result = await userWordService.getHistoryLevels(testUserId, testWordId);
      
      expect(result).toEqual([]);
    });
  });

  describe('getUserWordTestHistory', () => {
    test('returns test history when exists', async () => {
      mockedTablesDB.listRows.mockResolvedValueOnce({
        total: 1,
        rows: [mockUserWordTestHistory]
      } as any);

      const result = await userWordService.getUserWordTestHistory(
        testUserId,
        testWordId,
        1, // phase
        testDate
      );
      
      expect(mockedTablesDB.listRows).toHaveBeenCalledWith({
        databaseId: DATABASE_ID,
        tableId: COLLECTION_USER_WORD_TEST_HISTORY,
        queries: [
          Query.equal('user_id', testUserId),
          Query.equal('word_id', testWordId),
          Query.equal('phase', 1),
          Query.equal('test_date', testDate)
        ]
      });
      
      expect(result).toEqual(mockUserWordTestHistory);
    });

    test('returns null when no history found', async () => {
      mockedTablesDB.listRows.mockResolvedValueOnce({
        total: 0,
        rows: []
      } as any);

      const result = await userWordService.getUserWordTestHistory(
        testUserId,
        testWordId,
        1,
        testDate
      );
      
      expect(result).toBeNull();
    });
  });

  describe('createUserWordTestHistory', () => {
    test('creates a new test history record', async () => {
      const newHistory = {
        user_id: testUserId,
        word_id: testWordId,
        test_date: testDate,
        phase: 1,
        test_level: 2,
      };

      mockedTablesDB.createRow.mockResolvedValueOnce(mockUserWordTestHistory as any);

      const result = await userWordService.createUserWordTestHistory(newHistory);
      
      expect(mockedTablesDB.createRow).toHaveBeenCalledWith({
        databaseId: DATABASE_ID,
        tableId: COLLECTION_USER_WORD_TEST_HISTORY,
        rowId: 'mock-unique-id',
        data: newHistory
      });
      
      expect(result).toEqual(mockUserWordTestHistory);
    });
  });

  describe('updateUserWordTestHistory', () => {
    test('updates an existing test history record', async () => {
      const updates = { test_level: 3 };
      const updatedHistory = { ...mockUserWordTestHistory, test_level: 3 };

      mockedTablesDB.updateRow.mockResolvedValueOnce(updatedHistory as any);

      const result = await userWordService.updateUserWordTestHistory('history123', updates);
      
      expect(mockedTablesDB.updateRow).toHaveBeenCalledWith({
        databaseId: DATABASE_ID,
        tableId: COLLECTION_USER_WORD_TEST_HISTORY,
        rowId: 'history123',
        data: updates
      });
      
      expect(result).toEqual(updatedHistory);
    });
  });

  describe('upsertUserWordTestHistory', () => {
    test('updates existing record when one exists', async () => {
      // Mock the getUserWordTestHistory call
      jest.spyOn(userWordService, 'getUserWordTestHistory').mockResolvedValueOnce(mockUserWordTestHistory);
      
      const updatedHistory = { ...mockUserWordTestHistory, test_level: 4 };
      mockedTablesDB.updateRow.mockResolvedValueOnce(updatedHistory as any);

      const updates = {
        user_id: testUserId,
        word_id: testWordId,
        test_date: testDate,
        phase: 1,
        test_level: 4,
      };

      const result = await userWordService.upsertUserWordTestHistory(updates);
      
      expect(userWordService.getUserWordTestHistory).toHaveBeenCalledWith(
        testUserId,
        testWordId,
        1,
        testDate
      );
      expect(result).toEqual(updatedHistory);
    });

    test('creates new record when none exists', async () => {
      // Mock the getUserWordTestHistory call to return null
      jest.spyOn(userWordService, 'getUserWordTestHistory').mockResolvedValueOnce(null);
      
      const newHistory = {
        user_id: testUserId,
        word_id: testWordId,
        test_date: testDate,
        phase: 1,
        test_level: 3,
      };

      const createdHistory = { $id: 'new-history-id', ...newHistory } as UserWordTestHistory;
      mockedTablesDB.createRow.mockResolvedValueOnce(createdHistory as any);

      const result = await userWordService.upsertUserWordTestHistory(newHistory);
      
      expect(userWordService.getUserWordTestHistory).toHaveBeenCalledWith(
        testUserId,
        testWordId,
        1,
        testDate
      );
      expect(result).toEqual(createdHistory);
    });
  });

  describe('getUserTestHistoryByDate', () => {
    test('returns test history for a specific date', async () => {
      const mockHistories = [
        mockUserWordTestHistory,
        { ...mockUserWordTestHistory, $id: 'history2', word_id: 'word2' }
      ];

      mockedTablesDB.listRows.mockResolvedValueOnce({
        total: 2,
        rows: mockHistories
      } as any);

      const result = await userWordService.getUserTestHistoryByDate(testUserId, testDate);
      
      expect(mockedTablesDB.listRows).toHaveBeenCalledWith({
        databaseId: DATABASE_ID,
        tableId: COLLECTION_USER_WORD_TEST_HISTORY,
        queries: [
          Query.equal('user_id', testUserId),
          Query.equal('test_date', testDate),
          Query.orderAsc('word_id')
        ]
      });
      
      expect(result).toEqual(mockHistories);
    });
  });

  describe('getUserTestHistoryByDateAndPhase', () => {
    test('returns test history for a specific date and phase', async () => {
      const mockHistories = [
        mockUserWordTestHistory,
        { ...mockUserWordTestHistory, $id: 'history2', word_id: 'word2' }
      ];

      mockedTablesDB.listRows.mockResolvedValueOnce({
        total: 2,
        rows: mockHistories
      } as any);

      const result = await userWordService.getUserTestHistoryByDateAndPhase(
        testUserId,
        testDate,
        1 // phase
      );
      
      expect(mockedTablesDB.listRows).toHaveBeenCalledWith({
        databaseId: DATABASE_ID,
        tableId: COLLECTION_USER_WORD_TEST_HISTORY,
        queries: [
          Query.equal('user_id', testUserId),
          Query.equal('test_date', testDate),
          Query.equal('phase', 1),
          Query.orderAsc('word_id')
        ]
      });
      
      expect(result).toEqual(mockHistories);
    });
  });

  describe('createUserWordProgress', () => {
    test('creates a new user word progress record', async () => {
      const newProgress: Partial<Omit<UserWordProgress, '$id'>> = {
        user_id: testUserId,
        word_id: testWordId,
        is_long_difficult: false,
        proficiency_level: 1,
        strategy_id: STRATEGY_IDS.NORMAL,
        start_date: '2024-01-15T10:30:00Z',
        last_review_date: null,
        reviewed_times: 0,
        next_review_date: '2024-01-16T10:30:00Z',
        review_config: null
      };

      mockedTablesDB.createRow.mockResolvedValueOnce(mockUserWordProgress as any);

      const result = await userWordService.createUserWordProgress(newProgress);
      
      expect(mockedTablesDB.createRow).toHaveBeenCalledWith({
        databaseId: DATABASE_ID,
        tableId: COLLECTION_USER_WORD_PROGRESS,
        rowId: 'mock-unique-id',
        data: newProgress
      });
      
      expect(result).toEqual(mockUserWordProgress);
    });
  });

  describe('updateUserWordProgress', () => {
    test('updates an existing user word progress record', async () => {
      const updates = {
        proficiency_level: 2,
        strategy_id: STRATEGY_IDS.NORMAL,
        reviewed_times: 1,
        last_review_date: '2024-01-16T10:30:00Z',
        next_review_date: '2024-01-17T10:30:00Z'
      };

      const updatedProgress = { ...mockUserWordProgress, ...updates };
      mockedTablesDB.updateRow.mockResolvedValueOnce(updatedProgress as any);

      const result = await userWordService.updateUserWordProgress('progress123', updates);
      
      expect(mockedTablesDB.updateRow).toHaveBeenCalledWith({
        databaseId: DATABASE_ID,
        tableId: COLLECTION_USER_WORD_PROGRESS,
        rowId: 'progress123',
        data: updates
      });
      
      expect(result).toEqual(updatedProgress);
    });
  });

  describe('getUserWordProgressByUserAndWord', () => {
    test('returns user word progress when exists', async () => {
      mockedTablesDB.listRows.mockResolvedValueOnce({
        total: 1,
        rows: [mockUserWordProgress]
      } as any);

      const result = await userWordService.getUserWordProgressByUserAndWord(testUserId, testWordId);
      
      expect(mockedTablesDB.listRows).toHaveBeenCalledWith({
        databaseId: DATABASE_ID,
        tableId: COLLECTION_USER_WORD_PROGRESS,
        queries: [
          Query.equal('user_id', testUserId),
          Query.equal('word_id', testWordId),
          Query.limit(1)
        ]
      });
      
      expect(result).toEqual(mockUserWordProgress);
    });

    test('returns null when no progress found', async () => {
      mockedTablesDB.listRows.mockResolvedValueOnce({
        total: 0,
        rows: []
      } as any);

      const result = await userWordService.getUserWordProgressByUserAndWord('non-existent-user', 'non-existent-word');
      
      expect(result).toBeNull();
    });
  });

  describe('upsertUserWordProgress', () => {
    const testStrategyType = 1;
    const testSpelling = 'test';
    const mockReviewDate = new Date().toISOString();

    beforeEach(() => {
      jest.clearAllMocks();
      // Mock the current date
      jest.spyOn(Date.prototype, 'toISOString').mockReturnValue(mockReviewDate);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    test('updates existing record when one exists with review strategy calculation', async () => {
      // Mock existing record
      const existingRecord: UserWordProgress = {
        ...mockUserWordProgress,
        proficiency_level: 1
      };

      // Mock review strategy calculation result
      const mockReviewData = {
        proficiency_level: 3,
        last_review_date: mockReviewDate,
        reviewed_times: 1,
        next_review_date: '2024-01-17T10:30:00Z',
        strategy_id: STRATEGY_IDS.NORMAL,
        review_config: '{"interval": 1}'
      };

      jest.spyOn(userWordService, 'getUserWordProgressByUserAndWord').mockResolvedValueOnce(existingRecord);
      mockedReviewStrategyService.calculateReviewProgress.mockResolvedValueOnce(mockReviewData as any);

      const updatedProgress = { 
        ...existingRecord, 
        ...mockReviewData
      };
      mockedTablesDB.updateRow.mockResolvedValueOnce(updatedProgress as any);

      const updates = {
        user_id: testUserId,
        word_id: testWordId,
        proficiency_level: 3,
        strategy_id: STRATEGY_IDS.NORMAL,
        is_long_difficult: false
      };

      const result = await userWordService.upsertUserWordProgress(
        updates, 
        testStrategyType, 
        testSpelling
      );
      
      expect(userWordService.getUserWordProgressByUserAndWord).toHaveBeenCalledWith(testUserId, testWordId);
      expect(mockedReviewStrategyService.calculateReviewProgress).toHaveBeenCalledWith(
        existingRecord,
        3, // proficiency_level
        mockReviewDate,
        testStrategyType,
        testSpelling
      );
      
      expect(mockedTablesDB.updateRow).toHaveBeenCalledWith({
        databaseId: DATABASE_ID,
        tableId: COLLECTION_USER_WORD_PROGRESS,
        rowId: existingRecord.$id,
        data: {
          ...updates,
          ...mockReviewData
        }
      });
      
      expect(result).toEqual(updatedProgress);
    });

    test('creates new record when none exists with review strategy calculation', async () => {
      // No existing record
      jest.spyOn(userWordService, 'getUserWordProgressByUserAndWord').mockResolvedValueOnce(null);

      // Mock review strategy calculation result
      const mockReviewData = {
        proficiency_level: 0,
        last_review_date: mockReviewDate,
        reviewed_times: 0,
        next_review_date: '2024-01-17T10:30:00Z',
        strategy_id: STRATEGY_IDS.NORMAL,
        review_config: '{"interval": 1}'
      };

      mockedReviewStrategyService.calculateReviewProgress.mockResolvedValueOnce(mockReviewData as any);

      const newProgressData = {
        user_id: testUserId,
        word_id: 'new-test-word-id',
        is_long_difficult: true,
        proficiency_level: 0,
        strategy_id: STRATEGY_IDS.NORMAL
      };

      const createdProgress = { 
        $id: 'new-progress-id', 
        ...newProgressData,
        ...mockReviewData 
      } as UserWordProgress;
      
      mockedTablesDB.createRow.mockResolvedValueOnce(createdProgress as any);

      const result = await userWordService.upsertUserWordProgress(
        newProgressData, 
        testStrategyType, 
        testSpelling
      );
      
      expect(userWordService.getUserWordProgressByUserAndWord).toHaveBeenCalledWith(testUserId, 'new-test-word-id');
      expect(mockedReviewStrategyService.calculateReviewProgress).toHaveBeenCalledWith(
        newProgressData,
        0, // proficiency_level
        mockReviewDate,
        testStrategyType,
        testSpelling
      );
      
      expect(mockedTablesDB.createRow).toHaveBeenCalledWith({
        databaseId: DATABASE_ID,
        tableId: COLLECTION_USER_WORD_PROGRESS,
        rowId: 'mock-unique-id',
        data: {
          ...newProgressData,
          ...mockReviewData
        }
      });
      
      expect(result).toEqual(createdProgress);
    });

    test('returns existing record when review strategy calculation returns null', async () => {
      // Mock existing record
      const existingRecord: UserWordProgress = {
        ...mockUserWordProgress,
        proficiency_level: 1
      };

      jest.spyOn(userWordService, 'getUserWordProgressByUserAndWord').mockResolvedValueOnce(existingRecord);

      // Review strategy returns null (no need to update)
      mockedReviewStrategyService.calculateReviewProgress.mockResolvedValueOnce(null);

      const updates = {
        user_id: testUserId,
        word_id: testWordId,
        proficiency_level: 2,
        strategy_id: STRATEGY_IDS.NORMAL,
        is_long_difficult: false
      };

      const result = await userWordService.upsertUserWordProgress(
        updates, 
        testStrategyType, 
        testSpelling
      );
      
      expect(mockedReviewStrategyService.calculateReviewProgress).toHaveBeenCalledWith(
        existingRecord,
        2, // proficiency_level
        mockReviewDate,
        testStrategyType,
        testSpelling
      );
      
      expect(mockedTablesDB.updateRow).not.toHaveBeenCalled();
      expect(result).toEqual(existingRecord);
    });
  });

  describe('getWordIdsForReview', () => {
    test('returns word IDs that need review', async () => {
      const mockResponse = {
        total: 2,
        rows: [
          { word_id: testWordId },
          { word_id: 'another-word-id' }
        ]
      };

      mockedTablesDB.listRows.mockResolvedValueOnce(mockResponse as any);

      const queryTime = '2024-01-20T10:30:00Z';
      const result = await userWordService.getWordIdsForReview(testUserId, queryTime, 10);
      
      expect(mockedTablesDB.listRows).toHaveBeenCalledWith({
        databaseId: DATABASE_ID,
        tableId: COLLECTION_USER_WORD_PROGRESS,
        queries: [
          Query.equal('user_id', testUserId),
          Query.lessThanEqual('next_review_date', queryTime),
          Query.orderAsc('next_review_date'),
          Query.select(['word_id']),
          Query.limit(10)
        ]
      });
      
      expect(result).toEqual([testWordId, 'another-word-id']);
    });
  });

  describe('getReviewedWordIds', () => {
    test('returns all reviewed word IDs for user', async () => {
      const mockResponse = {
        total: 3,
        rows: [
          { word_id: testWordId },
          { word_id: 'word2' },
          { word_id: 'word3' }
        ]
      };

      mockedTablesDB.listRows.mockResolvedValueOnce(mockResponse as any);

      const result = await userWordService.getReviewedWordIds(testUserId);
      
      expect(mockedTablesDB.listRows).toHaveBeenCalledWith({
        databaseId: DATABASE_ID,
        tableId: COLLECTION_USER_WORD_PROGRESS,
        queries: [
          Query.equal('user_id', testUserId),
          Query.select(['word_id'])
        ]
      });
      
      expect(result).toEqual([testWordId, 'word2', 'word3']);
    });
  });
});