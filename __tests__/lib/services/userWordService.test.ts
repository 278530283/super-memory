// src/__tests__/services/userWordService.test.ts
import { COLLECTION_USER_WORD_PROGRESS, COLLECTION_USER_WORD_TEST_HISTORY, DATABASE_ID } from '@/src/constants/appwrite';
import { tablesDB } from '@/src/lib/appwrite';
import userWordService from '@/src/lib/services/userWordService';
import { UserWordProgress } from '@/src/types/UserWordProgress';
import { TestPhase, UserWordTestHistory } from '@/src/types/UserWordTestHistory';

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

// Mock constants
jest.mock('@/src/constants/appwrite', () => ({
  COLLECTION_USER_WORD_PROGRESS: 'user_word_progress',
  COLLECTION_USER_WORD_TEST_HISTORY: 'user_word_test_history',
  DATABASE_ID: 'test_database_id'
}));

const mockedTablesDB = tablesDB as jest.Mocked<typeof tablesDB>;

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
    strategy_id: 2,
    start_date: '2024-01-15T10:30:00Z',
    last_review_date: null,
    reviewed_times: 0,
    next_review_date: '2024-01-16T10:30:00Z'
  };

  const mockUserWordTestHistory: UserWordTestHistory = {
    $id: 'history123',
    user_id: testUserId,
    word_id: testWordId,
    test_date: testDate,
    phase: TestPhase.PRE_TEST,
    test_level: 2
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createUserWordProgress', () => {
    test('creates a new user word progress record', async () => {
      const newProgress: Partial<Omit<UserWordProgress, '$id'>> = {
        user_id: testUserId,
        word_id: testWordId,
        is_long_difficult: false,
        proficiency_level: 1,
        strategy_id: 2,
        start_date: '2024-01-15T10:30:00Z',
        last_review_date: null,
        reviewed_times: 0,
        next_review_date: '2024-01-16T10:30:00Z'
      };

      mockedTablesDB.createRow.mockResolvedValueOnce(mockUserWordProgress as any);

      const result = await userWordService.createUserWordProgress(newProgress);
      
      expect(mockedTablesDB.createRow).toHaveBeenCalledWith({
        databaseId: DATABASE_ID,
        tableId: COLLECTION_USER_WORD_PROGRESS,
        rowId: expect.any(String),
        data: newProgress
      });
      
      expect(result).toEqual(mockUserWordProgress);
    });
  });

  describe('updateUserWordProgress', () => {
    test('updates an existing user word progress record', async () => {
      const updates = {
        proficiency_level: 2,
        strategy_id: 1,
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
      
      // 修复：检查序列化后的查询
      expect(mockedTablesDB.listRows).toHaveBeenCalledWith({
        databaseId: DATABASE_ID,
        tableId: COLLECTION_USER_WORD_PROGRESS,
        queries: [
          JSON.stringify({
            method: 'equal',
            attribute: 'user_id',
            values: [testUserId]
          }),
          JSON.stringify({
            method: 'equal',
            attribute: 'word_id',
            values: [testWordId]
          }),
          JSON.stringify({
            method: 'limit',
            values: [1]
          })
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
    test('updates existing record when one exists', async () => {
      mockedTablesDB.listRows.mockResolvedValueOnce({
        total: 1,
        rows: [mockUserWordProgress]
      } as any);

      const updatedProgress = { ...mockUserWordProgress, proficiency_level: 3, reviewed_times: 2 };
      mockedTablesDB.updateRow.mockResolvedValueOnce(updatedProgress as any);

      const updates = {
        user_id: testUserId,
        word_id: testWordId,
        proficiency_level: 3,
        strategy_id: 2,
        reviewed_times: 2,
        last_review_date: '2024-01-17T10:30:00Z'
      };

      const result = await userWordService.upsertUserWordProgress(updates);
      
      expect(mockedTablesDB.updateRow).toHaveBeenCalledWith({
        databaseId: DATABASE_ID,
        tableId: COLLECTION_USER_WORD_PROGRESS,
        rowId: mockUserWordProgress.$id,
        data: updates
      });
      
      expect(result).toEqual(updatedProgress);
    });

    test('creates new record when none exists', async () => {
      mockedTablesDB.listRows.mockResolvedValueOnce({
        total: 0,
        rows: []
      } as any);

      const newProgress = {
        user_id: testUserId,
        word_id: 'new-test-word-id',
        is_long_difficult: true,
        proficiency_level: 0,
        strategy_id: 1,
        start_date: '2024-01-18T10:30:00Z',
        reviewed_times: 0,
        next_review_date: '2024-01-19T10:30:00Z'
      };

      const createdProgress = { $id: 'new-progress-id', ...newProgress } as UserWordProgress;
      mockedTablesDB.createRow.mockResolvedValueOnce(createdProgress as any);

      const result = await userWordService.upsertUserWordProgress(newProgress);
      
      expect(mockedTablesDB.createRow).toHaveBeenCalledWith({
        databaseId: DATABASE_ID,
        tableId: COLLECTION_USER_WORD_PROGRESS,
        rowId: expect.any(String),
        data: newProgress
      });
      
      expect(result).toEqual(createdProgress);
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
      
      // 修复：检查序列化后的查询
      expect(mockedTablesDB.listRows).toHaveBeenCalledWith({
        databaseId: DATABASE_ID,
        tableId: COLLECTION_USER_WORD_PROGRESS,
        queries: [
          JSON.stringify({
            method: 'equal',
            attribute: 'user_id',
            values: [testUserId]
          }),
          JSON.stringify({
            method: 'lessThanEqual',
            attribute: 'next_review_date',
            values: [queryTime]
          }),
          JSON.stringify({
            method: 'orderAsc',
            attribute: 'next_review_date'
          }),
          JSON.stringify({
            method: 'select',
            values: ['word_id']
          }),
          JSON.stringify({
            method: 'limit',
            values: [10]
          })
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
      
      // 修复：检查序列化后的查询
      expect(mockedTablesDB.listRows).toHaveBeenCalledWith({
        databaseId: DATABASE_ID,
        tableId: COLLECTION_USER_WORD_PROGRESS,
        queries: [
          JSON.stringify({
            method: 'equal',
            attribute: 'user_id',
            values: [testUserId]
          }),
          JSON.stringify({
            method: 'select',
            values: ['word_id']
          })
        ]
      });
      
      expect(result).toEqual([testWordId, 'word2', 'word3']);
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

      mockedTablesDB.createRow.mockResolvedValueOnce(mockUserWordTestHistory as any);

      const result = await userWordService.createUserWordTestHistory(newHistory);
      
      expect(mockedTablesDB.createRow).toHaveBeenCalledWith({
        databaseId: DATABASE_ID,
        tableId: COLLECTION_USER_WORD_TEST_HISTORY,
        rowId: expect.any(String),
        data: newHistory
      });
      
      expect(result).toEqual(mockUserWordTestHistory);
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
      TestPhase.PRE_TEST,
      testDate
    );
    
    // 修复：根据实际实现调整查询条件
    expect(mockedTablesDB.listRows).toHaveBeenCalledWith({
      databaseId: DATABASE_ID,
      tableId: COLLECTION_USER_WORD_TEST_HISTORY,
      queries: [
        JSON.stringify({
          method: 'equal',
          attribute: 'user_id',
          values: [testUserId]
        }),
        JSON.stringify({
          method: 'equal',
          attribute: 'word_id',
          values: [testWordId]
        }),
        JSON.stringify({
          method: 'equal',
          attribute: 'phase',
          values: [TestPhase.PRE_TEST]
        }),
        JSON.stringify({
          method: 'equal',
          attribute: 'test_date',
          values: [testDate]
        })
        // 注意：实际的实现可能没有 limit(1)，或者有其他排序条件
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
        TestPhase.POST_TEST,
        testDate
      );
      
      expect(result).toBeNull();
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
      mockedTablesDB.listRows.mockResolvedValueOnce({
        total: 1,
        rows: [mockUserWordTestHistory]
      } as any);

      const updatedHistory = { ...mockUserWordTestHistory, test_level: 4 };
      mockedTablesDB.updateRow.mockResolvedValueOnce(updatedHistory as any);

      const updates = {
        user_id: testUserId,
        word_id: testWordId,
        test_date: testDate,
        phase: TestPhase.PRE_TEST,
        test_level: 4,
      };

      const result = await userWordService.upsertUserWordTestHistory(updates);
      
      expect(result).toEqual(updatedHistory);
    });

    test('creates new record when none exists', async () => {
      mockedTablesDB.listRows.mockResolvedValueOnce({
        total: 0,
        rows: []
      } as any);

      const newHistory: any = {
        user_id: testUserId,
        word_id: testWordId,
        test_date: testDate,
        phase: TestPhase.POST_TEST,
        test_level: 3,
      };

      const createdHistory = { $id: 'new-history-id', ...newHistory } as UserWordTestHistory;
      mockedTablesDB.createRow.mockResolvedValueOnce(createdHistory as any);

      const result = await userWordService.upsertUserWordTestHistory(newHistory);
      
      expect(result).toEqual(createdHistory);
    });
  });

  describe('getHistoryLevels', () => {
  test('returns history levels for user and word', async () => {
    const mockHistories = [
      { ...mockUserWordTestHistory, test_level: 2 },
      { ...mockUserWordTestHistory, test_level: 3, $id: 'history2' }
    ];

    mockedTablesDB.listRows.mockResolvedValueOnce({
      total: 2,
      rows: mockHistories
    } as any);

    const result = await userWordService.getHistoryLevels(testUserId, testWordId);
    
    // 修复：根据实际实现调整查询条件
    expect(mockedTablesDB.listRows).toHaveBeenCalledWith({
      databaseId: DATABASE_ID,
      tableId: COLLECTION_USER_WORD_TEST_HISTORY,
      queries: [
        JSON.stringify({
          method: 'equal',
          attribute: 'user_id',
          values: [testUserId]
        }),
        JSON.stringify({
          method: 'equal',
          attribute: 'word_id',
          values: [testWordId]
        }),
        JSON.stringify({
          method: 'equal',
          attribute: 'phase',
          values: [TestPhase.PRE_TEST]
        }),
        JSON.stringify({
          method: 'orderAsc',
          attribute: 'test_date'
        })
      ]
    });
    
    expect(result).toEqual([2, 3]);
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
    
    // 修复：根据实际实现调整查询条件
    expect(mockedTablesDB.listRows).toHaveBeenCalledWith({
      databaseId: DATABASE_ID,
      tableId: COLLECTION_USER_WORD_TEST_HISTORY,
      queries: [
        JSON.stringify({
          method: 'equal',
          attribute: 'user_id',
          values: [testUserId]
        }),
        JSON.stringify({
          method: 'equal',
          attribute: 'test_date',
          values: [testDate]
        }),
        JSON.stringify({
          method: 'orderAsc',
          attribute: 'word_id'
        })
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
        TestPhase.PRE_TEST
      );
      
      // 修复：根据实际实现调整查询条件
      expect(mockedTablesDB.listRows).toHaveBeenCalledWith({
        databaseId: DATABASE_ID,
        tableId: COLLECTION_USER_WORD_TEST_HISTORY,
        queries: [
          JSON.stringify({
            method: 'equal',
            attribute: 'user_id',
            values: [testUserId]
          }),
          JSON.stringify({
            method: 'equal',
            attribute: 'test_date',
            values: [testDate]
          }),
          JSON.stringify({
            method: 'equal',
            attribute: 'phase',
            values: [TestPhase.PRE_TEST]
          }),
          JSON.stringify({
            method: 'orderAsc',
            attribute: 'word_id'
          })
        ]
      });
      
      expect(result).toEqual(mockHistories);
    });
    });
});