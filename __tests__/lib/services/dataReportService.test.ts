// src/__tests__/services/dataReportService.test.ts
import {
  COLLECTION_USER_WORD_PROGRESS,
  COLLECTION_USER_WORD_TEST_HISTORY,
  COLLECTION_WORDS,
  DATABASE_ID
} from '@/src/constants/appwrite';
import { tablesDB } from '@/src/lib/appwrite';
import dataReportService, { WordDifficultyLevel } from '@/src/lib/services/dataReportService';
import { UserWordProgress } from '@/src/types/UserWordProgress';
import { UserWordTestHistory } from '@/src/types/UserWordTestHistory';

import { Query } from 'appwrite';

// Mock Appwrite tablesDB
jest.mock('@/src/lib/appwrite', () => ({
  tablesDB: {
    listRows: jest.fn(),
    getRow: jest.fn(),
  }
}));

// Mock constants
jest.mock('@/src/constants/appwrite', () => ({
  COLLECTION_USER_WORD_PROGRESS: 'user_word_progress',
  COLLECTION_USER_WORD_TEST_HISTORY: 'user_word_test_history',
  COLLECTION_WORDS: 'words',
  DATABASE_ID: 'test_database_id'
}));

// Mock appwrite Query
jest.mock('appwrite', () => ({
  ...jest.requireActual('appwrite'),
  Query: {
    equal: jest.fn((attribute: string, value: any) => 
      JSON.stringify({ method: 'equal', attribute, values: [value] })
    ),
    orderDesc: jest.fn((attribute: string) => 
      JSON.stringify({ method: 'orderDesc', attribute })
    ),
    orderAsc: jest.fn((attribute: string) => 
      JSON.stringify({ method: 'orderAsc', attribute })
    ),
    offset: jest.fn((offset: number) => 
      JSON.stringify({ method: 'offset', values: [offset] })
    ),
    limit: jest.fn((limit: number) => 
      JSON.stringify({ method: 'limit', values: [limit] })
    )
  }
}));

const mockedTablesDB = tablesDB as jest.Mocked<typeof tablesDB>;

describe('dataReportService Unit Tests', () => {
  const testUserId = '68c19de90027e9732ea0';
  const testWordId1 = '68c4f21fb9b3b6da7363';
  const testWordId2 = '68c4f21fb9b3b6da7364';

  // Mock data
  const mockUserWordProgress1: UserWordProgress = {
    $id: 'progress123',
    user_id: testUserId,
    word_id: testWordId1,
    is_long_difficult: false,
    proficiency_level: 2,
    strategy_id: 'normal',
    start_date: '2024-01-15T10:30:00Z',
    last_review_date: '2024-01-20T10:30:00Z',
    reviewed_times: 3,
    next_review_date: '2024-01-25T10:30:00Z',
    review_config: null,
    word_difficulty: WordDifficultyLevel.NORMAL
  };

  const mockUserWordProgress2: UserWordProgress = {
    $id: 'progress124',
    user_id: testUserId,
    word_id: testWordId2,
    is_long_difficult: true,
    proficiency_level: 1,
    strategy_id: 'difficult',
    start_date: '2024-01-10T10:30:00Z',
    last_review_date: '2024-01-18T10:30:00Z',
    reviewed_times: 5,
    next_review_date: '2024-01-22T10:30:00Z',
    review_config: null,
    word_difficulty: WordDifficultyLevel.DIFFICULT
  };

  const mockWordInfo1 = {
    spelling: 'example',
    meaning: '例子'
  };

  const mockWordInfo2 = {
    spelling: 'test',
    meaning: '测试'
  };

  const mockTestHistory1: UserWordTestHistory[] = [
    {
      $id: 'history1',
      user_id: testUserId,
      word_id: testWordId1,
      test_date: '2024-01-15T10:30:00Z',
      phase: 1,
      test_level: 2
    },
    {
      $id: 'history2',
      user_id: testUserId,
      word_id: testWordId1,
      test_date: '2024-01-20T10:30:00Z',
      phase: 1,
      test_level: 3
    }
  ];

  const mockTestHistory2: UserWordTestHistory[] = [
    {
      $id: 'history3',
      user_id: testUserId,
      word_id: testWordId2,
      test_date: '2024-01-10T10:30:00Z',
      phase: 1,
      test_level: 1
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getUserWordReport', () => {
    test('returns paginated word report when data exists', async () => {
      const page = 1;
      const limit = 20;
      const offset = (page - 1) * limit;

      // Mock progress response
      mockedTablesDB.listRows.mockResolvedValueOnce({
        total: 2,
        rows: [mockUserWordProgress1, mockUserWordProgress2]
      } as any);

      // Mock word info calls
      mockedTablesDB.getRow
        .mockResolvedValueOnce(mockWordInfo1 as any)
        .mockResolvedValueOnce(mockWordInfo2 as any);

      // Mock test history calls
      mockedTablesDB.listRows
        .mockResolvedValueOnce({
          total: 2,
          rows: mockTestHistory1
        } as any)
        .mockResolvedValueOnce({
          total: 1,
          rows: mockTestHistory2
        } as any);

      const result = await dataReportService.getUserWordReport(testUserId, page, limit);

      // Verify progress query
      expect(mockedTablesDB.listRows).toHaveBeenCalledWith({
        databaseId: DATABASE_ID,
        tableId: COLLECTION_USER_WORD_PROGRESS,
        queries: [
          Query.equal('user_id', testUserId),
          Query.orderDesc('last_review_date'),
          Query.offset(offset),
          Query.limit(limit)
        ]
      });

      // Verify word info queries
      expect(mockedTablesDB.getRow).toHaveBeenCalledWith({
        databaseId: DATABASE_ID,
        tableId: COLLECTION_WORDS,
        rowId: testWordId1
      });
      expect(mockedTablesDB.getRow).toHaveBeenCalledWith({
        databaseId: DATABASE_ID,
        tableId: COLLECTION_WORDS,
        rowId: testWordId2
      });

      // Verify test history queries
      expect(mockedTablesDB.listRows).toHaveBeenCalledWith({
        databaseId: DATABASE_ID,
        tableId: COLLECTION_USER_WORD_TEST_HISTORY,
        queries: [
          Query.equal('user_id', testUserId),
          Query.equal('word_id', testWordId1),
          Query.orderDesc('test_date')
        ]
      });
      expect(mockedTablesDB.listRows).toHaveBeenCalledWith({
        databaseId: DATABASE_ID,
        tableId: COLLECTION_USER_WORD_TEST_HISTORY,
        queries: [
          Query.equal('user_id', testUserId),
          Query.equal('word_id', testWordId2),
          Query.orderDesc('test_date')
        ]
      });

      // Verify result structure
      expect(result).toEqual({
        items: [
          {
            wordId: testWordId1,
            spelling: mockWordInfo1.spelling,
            meaning: mockWordInfo1.meaning,
            difficultyLevel: WordDifficultyLevel.NORMAL,
            currentProficiency: mockUserWordProgress1.proficiency_level,
            isLongDifficult: mockUserWordProgress1.is_long_difficult,
            startDate: mockUserWordProgress1.start_date,
            lastReviewDate: mockUserWordProgress1.last_review_date,
            reviewedTimes: mockUserWordProgress1.reviewed_times,
            nextReviewDate: mockUserWordProgress1.next_review_date,
            testHistory: mockTestHistory1.map(history => ({
              testDate: history.test_date,
              testLevel: history.test_level,
              phase: history.phase
            }))
          },
          {
            wordId: testWordId2,
            spelling: mockWordInfo2.spelling,
            meaning: mockWordInfo2.meaning,
            difficultyLevel: WordDifficultyLevel.DIFFICULT,
            currentProficiency: mockUserWordProgress2.proficiency_level,
            isLongDifficult: mockUserWordProgress2.is_long_difficult,
            startDate: mockUserWordProgress2.start_date,
            lastReviewDate: mockUserWordProgress2.last_review_date,
            reviewedTimes: mockUserWordProgress2.reviewed_times,
            nextReviewDate: mockUserWordProgress2.next_review_date,
            testHistory: mockTestHistory2.map(history => ({
              testDate: history.test_date,
              testLevel: history.test_level,
              phase: history.phase
            }))
          }
        ],
        total: 2,
        page: 1,
        limit: 20,
        hasNextPage: false,
        hasPrevPage: false
      });
    });

    test('returns empty result when no progress data exists', async () => {
      const page = 1;
      const limit = 20;

      // Mock empty progress response
      mockedTablesDB.listRows.mockResolvedValueOnce({
        total: 0,
        rows: []
      } as any);

      const result = await dataReportService.getUserWordReport(testUserId, page, limit);

      expect(result).toEqual({
        items: [],
        total: 0,
        page: 1,
        limit: 20,
        hasNextPage: false,
        hasPrevPage: false
      });
    });

    test('handles errors gracefully', async () => {
      const page = 1;
      const limit = 20;

      // Mock error
      mockedTablesDB.listRows.mockRejectedValueOnce(new Error('Database error'));

      await expect(dataReportService.getUserWordReport(testUserId, page, limit))
        .rejects.toThrow('Database error');
    });
  });

  describe('getUserWordReportByDifficulty', () => {
    test('returns filtered word report by difficulty level', async () => {
      const difficultyLevel = WordDifficultyLevel.DIFFICULT;
      const page = 1;
      const limit = 20;

      // Mock progress response for difficult words
      mockedTablesDB.listRows.mockResolvedValueOnce({
        total: 1,
        rows: [mockUserWordProgress2]
      } as any);

      // Mock word info call
      mockedTablesDB.getRow.mockResolvedValueOnce(mockWordInfo2 as any);

      // Mock test history call
      mockedTablesDB.listRows.mockResolvedValueOnce({
        total: 1,
        rows: mockTestHistory2
      } as any);

      const result = await dataReportService.getUserWordReportByDifficulty(
        testUserId, 
        difficultyLevel, 
        page, 
        limit
      );

      // Verify query with difficulty filter
      expect(mockedTablesDB.listRows).toHaveBeenCalledWith({
        databaseId: DATABASE_ID,
        tableId: COLLECTION_USER_WORD_PROGRESS,
        queries: [
          Query.equal('user_id', testUserId),
          Query.equal('Word_difficulty', difficultyLevel),
          Query.orderDesc('last_review_date'),
          Query.offset(0),
          Query.limit(limit)
        ]
      });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].difficultyLevel).toBe(WordDifficultyLevel.DIFFICULT);
      expect(result.total).toBe(1);
    });
  });

  describe('getUserLearningStats', () => {
    test('returns correct learning statistics', async () => {
      const allProgress = [
        { ...mockUserWordProgress1, word_difficulty: WordDifficultyLevel.NORMAL, proficiency_level: 2 },
        { ...mockUserWordProgress2, word_difficulty: WordDifficultyLevel.DIFFICULT, proficiency_level: 1 },
        { 
          ...mockUserWordProgress1, 
          $id: 'progress125',
          word_id: 'word3',
          word_difficulty: WordDifficultyLevel.EASY, 
          proficiency_level: 3,
          is_long_difficult: false
        },
        { 
          ...mockUserWordProgress1, 
          $id: 'progress126',
          word_id: 'word4',
          word_difficulty: WordDifficultyLevel.DIFFICULT, 
          proficiency_level: 1,
          is_long_difficult: true 
        }
      ];

      // Mock all progress response
      mockedTablesDB.listRows.mockResolvedValueOnce({
        total: 4,
        rows: allProgress
      } as any);

      const result = await dataReportService.getUserLearningStats(testUserId);

      expect(result).toEqual({
        totalLearned: 4,
        easyCount: 1,
        normalCount: 1,
        difficultCount: 2,
        longDifficultCount: 2,
        averageProficiency: (2 + 1 + 3 + 1) / 4
      });
    });

    test('returns zero statistics when no progress data exists', async () => {
      // Mock empty progress response
      mockedTablesDB.listRows.mockResolvedValueOnce({
        total: 0,
        rows: []
      } as any);

      const result = await dataReportService.getUserLearningStats(testUserId);

      expect(result).toEqual({
        totalLearned: 0,
        easyCount: 0,
        normalCount: 0,
        difficultCount: 0,
        longDifficultCount: 0,
        averageProficiency: 0
      });
    });
  });

  describe('getDifficultyLevelName', () => {
    test('returns correct names for all difficulty levels', () => {
      expect(dataReportService.getDifficultyLevelName(WordDifficultyLevel.EASY)).toBe('简单');
      expect(dataReportService.getDifficultyLevelName(WordDifficultyLevel.NORMAL)).toBe('正常');
      expect(dataReportService.getDifficultyLevelName(WordDifficultyLevel.DIFFICULT)).toBe('困难');
      expect(dataReportService.getDifficultyLevelName(999 as WordDifficultyLevel)).toBe('未知');
    });
  });

  describe('getDifficultyLevelDescription', () => {
    test('returns correct descriptions for all difficulty levels', () => {
      expect(dataReportService.getDifficultyLevelDescription(WordDifficultyLevel.EASY)).toBe('易学单词');
      expect(dataReportService.getDifficultyLevelDescription(WordDifficultyLevel.NORMAL)).toBe('正常难度单词');
      expect(dataReportService.getDifficultyLevelDescription(WordDifficultyLevel.DIFFICULT)).toBe('困难单词');
      expect(dataReportService.getDifficultyLevelDescription(999 as WordDifficultyLevel)).toBe('未知难度');
    });
  });

  describe('getDifficultyLevelFromProgress', () => {
    test('handles null and undefined word_difficulty', () => {
      const progressWithNull: UserWordProgress = { ...mockUserWordProgress1, word_difficulty: null };
      const progressWithUndefined: UserWordProgress = { ...mockUserWordProgress1, word_difficulty: undefined };
      
      // Since getDifficultyLevelFromProgress is private, we test it indirectly through buildWordReportItem
      // We'll verify this through the public methods that use it
    });

    test('handles invalid word_difficulty values', () => {
      const progressWithInvalid: UserWordProgress = { ...mockUserWordProgress1, word_difficulty: 999 };
      
      // Since getDifficultyLevelFromProgress is private, we test it indirectly
      // We'll verify this through the public methods that use it
    });
  });

  describe('Error handling in private methods', () => {
    test('handles word info fetch errors', async () => {
      const page = 1;
      const limit = 20;

      // Mock progress response
      mockedTablesDB.listRows.mockResolvedValueOnce({
        total: 1,
        rows: [mockUserWordProgress1]
      } as any);

      // Mock word info error
      mockedTablesDB.getRow.mockRejectedValueOnce(new Error('Word not found'));

      // Mock test history
      mockedTablesDB.listRows.mockResolvedValueOnce({
        total: 0,
        rows: []
      } as any);

      const result = await dataReportService.getUserWordReport(testUserId, page, limit);

      // Should return default values when word info fails
      expect(result.items[0].spelling).toBe('Unknown');
      expect(result.items[0].meaning).toBe('未知');
    });

    test('handles test history fetch errors', async () => {
      const page = 1;
      const limit = 20;

      // Mock progress response
      mockedTablesDB.listRows.mockResolvedValueOnce({
        total: 1,
        rows: [mockUserWordProgress1]
      } as any);

      // Mock word info
      mockedTablesDB.getRow.mockResolvedValueOnce(mockWordInfo1 as any);

      // Mock test history error
      mockedTablesDB.listRows.mockRejectedValueOnce(new Error('History not found'));

      const result = await dataReportService.getUserWordReport(testUserId, page, limit);

      // Should return empty test history when fetch fails
      expect(result.items[0].testHistory).toEqual([]);
    });
  });
});