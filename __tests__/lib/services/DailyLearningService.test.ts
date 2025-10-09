// src/__tests__/services/dailyLearningService.test.ts
import dailyLearningService from '@/src/lib/services/dailyLearningService';
import learningModeService from '@/src/lib/services/learningModeService';
import userWordService from '@/src/lib/services/userWordService';
import wordService from '@/src/lib/services/wordService';
import { DailyLearningSession } from '@/src/types/DailyLearningSession';
import { LearningMode } from '@/src/types/LearningMode';

import { COLLECTION_DAILY_LEARNING_SESSIONS, COLLECTION_USER_WORD_ACTION_LOG, DATABASE_ID } from '@/src/constants/appwrite';
import { tablesDB } from '@/src/lib/appwrite';
import { ID, Query } from 'appwrite';

// Mock services
jest.mock('@/src/lib/services/learningModeService');
jest.mock('@/src/lib/services/userWordService');
jest.mock('@/src/lib/services/wordService');

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

// Mock Appwrite Query
jest.mock('appwrite', () => ({
  ...jest.requireActual('appwrite'),
  Query: {
    equal: jest.fn((attribute: string, value: string) => 
      JSON.stringify({ method: 'equal', attribute, values: [value] })
    )
  },
  ID: {
    unique: jest.fn(() => 'unique-row-id')
  }
}));

// Mock constants
jest.mock('@/src/constants/appwrite', () => ({
  COLLECTION_DAILY_LEARNING_SESSIONS: 'daily_learning_sessions',
  COLLECTION_USER_WORD_ACTION_LOG: 'user_word_action_log',
  DATABASE_ID: 'test_database_id'
}));

const mockedTablesDB = tablesDB as jest.Mocked<typeof tablesDB>;
const mockedLearningModeService = learningModeService as jest.Mocked<typeof learningModeService>;
const mockedUserWordService = userWordService as jest.Mocked<typeof userWordService>;
const mockedWordService = wordService as jest.Mocked<typeof wordService>;
const mockedQuery = Query as jest.Mocked<typeof Query>;
const mockedID = ID as jest.Mocked<typeof ID>;

describe('DailyLearningService Unit Tests', () => {
  const testUserId = '68c19de90027e9732ea0';
  const testModeId = "1";
  const testDate = '2024-01-18';
  const testDifficultyLevel = 2;
  const testSessionId = 'session123';

  // Mock data
  const mockLearningMode: LearningMode = {
    $id: '1',
    mode_name: '轻松模式',
    duration_range: '10-15分钟',
    word_count: 10,
    phrase_count: 5,
    sentence_count: 3
  };

  const mockDailyLearningSession: DailyLearningSession = {
    $id: testSessionId,
    user_id: testUserId,
    session_date: testDate,
    mode_id: testModeId,
    status: 0,
    pre_test_word_ids: ['word1', 'word2', 'word3'],
    learning_word_ids: ['word1', 'word2', 'word3', 'word4', 'word5'],
    post_test_word_ids: ['word1', 'word2', 'word3', 'word4', 'word5'],
    pre_test_progress: '0/3',
    learning_progress: '0/5',
    post_test_progress: '0/5'
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getTodaysSession', () => {
    test('returns today\'s session when exists', async () => {
      const serializedSession = {
        ...mockDailyLearningSession,
        pre_test_word_ids: JSON.stringify(mockDailyLearningSession.pre_test_word_ids),
        learning_word_ids: JSON.stringify(mockDailyLearningSession.learning_word_ids),
        post_test_word_ids: JSON.stringify(mockDailyLearningSession.post_test_word_ids)
      };

      mockedTablesDB.listRows.mockResolvedValueOnce({
        total: 1,
        rows: [serializedSession]
      } as any);

      const result = await dailyLearningService.getTodaysSession(testUserId, testDate);
      
      expect(mockedTablesDB.listRows).toHaveBeenCalledWith({
        databaseId: DATABASE_ID,
        tableId: COLLECTION_DAILY_LEARNING_SESSIONS,
        queries: [
          Query.equal('user_id', testUserId),
          Query.equal('session_date', testDate)
        ]
      });
      
      expect(result).toEqual(mockDailyLearningSession);
    });

    test('returns null when no session found', async () => {
      mockedTablesDB.listRows.mockResolvedValueOnce({
        total: 0,
        rows: []
      } as any);

      const result = await dailyLearningService.getTodaysSession(testUserId, testDate);
      
      expect(result).toBeNull();
    });

    test('handles string arrays that are already deserialized', async () => {
      const sessionWithArrays = { ...mockDailyLearningSession };
      
      mockedTablesDB.listRows.mockResolvedValueOnce({
        total: 1,
        rows: [sessionWithArrays]
      } as any);

      const result = await dailyLearningService.getTodaysSession(testUserId, testDate);
      
      expect(result).toEqual(sessionWithArrays);
    });
  });

  describe('createSession', () => {
    test('creates a new session with serialized word arrays', async () => {
      const initialWordIds = {
        pre_test: ['word1', 'word2'],
        learning: ['word3', 'word4', 'word5'],
        post_test: ['word3', 'word4', 'word5']
      };

      const expectedSessionData = {
        user_id: testUserId,
        session_date: expect.any(String),
        mode_id: testModeId,
        status: 0,
        pre_test_word_ids: JSON.stringify(initialWordIds.pre_test),
        learning_word_ids: JSON.stringify(initialWordIds.learning),
        post_test_word_ids: JSON.stringify(initialWordIds.post_test),
        pre_test_progress: `0/${initialWordIds.pre_test.length}`,
        learning_progress: `0/${initialWordIds.learning.length}`,
        post_test_progress: `0/${initialWordIds.post_test.length}`,
      };

      mockedTablesDB.createRow.mockResolvedValueOnce({
        ...expectedSessionData,
        $id: testSessionId
      } as any);

      const result = await dailyLearningService.createSession(
        testUserId,
        testModeId,
        initialWordIds
      );
      
      expect(mockedTablesDB.createRow).toHaveBeenCalledWith({
        databaseId: DATABASE_ID,
        tableId: COLLECTION_DAILY_LEARNING_SESSIONS,
        rowId: 'unique-row-id',
        data: expectedSessionData
      });
      
      expect(result).toEqual({
        ...expectedSessionData,
        $id: testSessionId,
        pre_test_word_ids: initialWordIds.pre_test,
        learning_word_ids: initialWordIds.learning,
        post_test_word_ids: initialWordIds.post_test
      });
    });
  });

  describe('updateSession', () => {
    test('updates session with non-array fields and deserializes response', async () => {
      const updates = {
        status: 1,
        pre_test_progress: '2/3'
      };

      // updatedSession 返回序列化的数据
      const serializedUpdatedSession = {
        ...mockDailyLearningSession,
        ...updates,
        pre_test_word_ids: JSON.stringify(mockDailyLearningSession.pre_test_word_ids),
        learning_word_ids: JSON.stringify(mockDailyLearningSession.learning_word_ids),
        post_test_word_ids: JSON.stringify(mockDailyLearningSession.post_test_word_ids)
      };

      mockedTablesDB.updateRow.mockResolvedValueOnce(serializedUpdatedSession as any);

      const result = await dailyLearningService.updateSession(testSessionId, updates);
      
      expect(mockedTablesDB.updateRow).toHaveBeenCalledWith({
        databaseId: DATABASE_ID,
        tableId: COLLECTION_DAILY_LEARNING_SESSIONS,
        rowId: testSessionId,
        data: updates
      });
      
      // 结果应该被正确反序列化
      expect(result.pre_test_word_ids).toEqual(mockDailyLearningSession.pre_test_word_ids);
      expect(result.learning_word_ids).toEqual(mockDailyLearningSession.learning_word_ids);
      expect(result.post_test_word_ids).toEqual(mockDailyLearningSession.post_test_word_ids);
      expect(result.status).toBe(1);
      expect(result.pre_test_progress).toBe('2/3');
    });

    test('updates session with array fields serialized and deserializes response', async () => {
      const newWordIds = ['word1', 'word2', 'word3', 'word4'];
      const updates = {
        status: 1,
        pre_test_word_ids: newWordIds
      };

      // updatedSession 返回序列化的数据
      const serializedUpdatedSession = {
        ...mockDailyLearningSession,
        ...updates,
        pre_test_word_ids: JSON.stringify(newWordIds),
        learning_word_ids: JSON.stringify(mockDailyLearningSession.learning_word_ids),
        post_test_word_ids: JSON.stringify(mockDailyLearningSession.post_test_word_ids)
      };

      mockedTablesDB.updateRow.mockResolvedValueOnce(serializedUpdatedSession as any);

      const result = await dailyLearningService.updateSession(testSessionId, updates);
      
      expect(mockedTablesDB.updateRow).toHaveBeenCalledWith({
        databaseId: DATABASE_ID,
        tableId: COLLECTION_DAILY_LEARNING_SESSIONS,
        rowId: testSessionId,
        data: {
          status: 1,
          pre_test_word_ids: JSON.stringify(newWordIds)
        }
      });
      
      // 结果应该被正确反序列化
      expect(result.pre_test_word_ids).toEqual(newWordIds);
      expect(result.learning_word_ids).toEqual(mockDailyLearningSession.learning_word_ids);
      expect(result.post_test_word_ids).toEqual(mockDailyLearningSession.post_test_word_ids);
    });

    test('handles update errors', async () => {
      const updates = { status: 1 };
      const testError = new Error('Update failed');
      mockedTablesDB.updateRow.mockRejectedValueOnce(testError);

      await expect(dailyLearningService.updateSession(testSessionId, updates))
        .rejects.toThrow('Update failed');
    });

    test('handles mixed array and non-array updates', async () => {
      const newWordIds = ['word1', 'word2', 'word3'];
      const updates = {
        status: 2,
        pre_test_word_ids: newWordIds,
        learning_progress: '3/5'
      };

      // updatedSession 返回序列化的数据
      const serializedUpdatedSession = {
        ...mockDailyLearningSession,
        ...updates,
        pre_test_word_ids: JSON.stringify(newWordIds),
        learning_word_ids: JSON.stringify(mockDailyLearningSession.learning_word_ids),
        post_test_word_ids: JSON.stringify(mockDailyLearningSession.post_test_word_ids)
      };

      mockedTablesDB.updateRow.mockResolvedValueOnce(serializedUpdatedSession as any);

      const result = await dailyLearningService.updateSession(testSessionId, updates);
      
      expect(mockedTablesDB.updateRow).toHaveBeenCalledWith({
        databaseId: DATABASE_ID,
        tableId: COLLECTION_DAILY_LEARNING_SESSIONS,
        rowId: testSessionId,
        data: {
          status: 2,
          pre_test_word_ids: JSON.stringify(newWordIds),
          learning_progress: '3/5'
        }
      });
      
      // 结果应该被正确反序列化
      expect(result.pre_test_word_ids).toEqual(newWordIds);
      expect(result.status).toBe(2);
      expect(result.learning_progress).toBe('3/5');
    });
  });

  describe('getSessionById', () => {
    test('returns session by ID with deserialized arrays', async () => {
      const serializedSession = {
        ...mockDailyLearningSession,
        pre_test_word_ids: JSON.stringify(mockDailyLearningSession.pre_test_word_ids),
        learning_word_ids: JSON.stringify(mockDailyLearningSession.learning_word_ids),
        post_test_word_ids: JSON.stringify(mockDailyLearningSession.post_test_word_ids)
      };

      mockedTablesDB.getRow.mockResolvedValueOnce(serializedSession as any);

      const result = await dailyLearningService.getSessionById(testSessionId);
      
      expect(mockedTablesDB.getRow).toHaveBeenCalledWith({
        databaseId: DATABASE_ID,
        tableId: COLLECTION_DAILY_LEARNING_SESSIONS,
        rowId: testSessionId
      });
      
      expect(result).toEqual(mockDailyLearningSession);
    });

    test('returns null when session not found', async () => {
      mockedTablesDB.getRow.mockRejectedValueOnce({ code: 404 });

      const result = await dailyLearningService.getSessionById('non-existent-session');
      
      expect(result).toBeNull();
    });

    test('propagates non-404 errors', async () => {
      const testError = new Error('Database error');
      mockedTablesDB.getRow.mockRejectedValueOnce(testError);

      await expect(dailyLearningService.getSessionById(testSessionId))
        .rejects.toThrow('Database error');
    });
  });

  describe('deleteSession', () => {
    test('deletes session by ID', async () => {
      mockedTablesDB.deleteRow.mockResolvedValueOnce({} as any);

      await dailyLearningService.deleteSession(testSessionId);
      
      expect(mockedTablesDB.deleteRow).toHaveBeenCalledWith({
        databaseId: DATABASE_ID,
        tableId: COLLECTION_DAILY_LEARNING_SESSIONS,
        rowId: testSessionId
      });
    });

    test('handles delete errors', async () => {
      const testError = new Error('Delete failed');
      mockedTablesDB.deleteRow.mockRejectedValueOnce(testError);

      await expect(dailyLearningService.deleteSession(testSessionId))
        .rejects.toThrow('Delete failed');
    });
  });

  describe('recordWordAction', () => {
    test('records word action successfully', async () => {
      const actionData = {
        userId: testUserId,
        wordId: 'test_word_id',
        sessionId: testSessionId,
        actionType: 'answer',
        isCorrect: true,
        timeTaken: 5000,
        timestamp: '2024-01-18T10:30:00Z'
      };

      mockedTablesDB.createRow.mockResolvedValueOnce({} as any);

      await dailyLearningService.recordWordAction(actionData);
      
      expect(mockedTablesDB.createRow).toHaveBeenCalledWith({
        databaseId: DATABASE_ID,
        tableId: COLLECTION_USER_WORD_ACTION_LOG,
        rowId: 'unique-row-id',
        data: actionData
      });
    });

    test('handles record word action errors', async () => {
      const actionData = {
        userId: testUserId,
        wordId: 'test_word_id',
        sessionId: testSessionId,
        actionType: 'answer',
        isCorrect: true,
        timeTaken: 5000
      };

      const testError = new Error('Record failed');
      mockedTablesDB.createRow.mockRejectedValueOnce(testError);

      await expect(dailyLearningService.recordWordAction(actionData))
        .rejects.toThrow('Record failed');
    });
  });

  describe('generateTodaysWordLists', () => {
    test('generates word lists successfully', async () => {
      const reviewedWordIds = ['word1', 'word2', 'word3'];
      const reviewWordIds = ['word4', 'word5'];
      const newWordIds = ['word6', 'word7', 'word8'];

      mockedLearningModeService.getLearningMode.mockResolvedValueOnce(mockLearningMode);
      mockedUserWordService.getReviewedWordIds.mockResolvedValueOnce(reviewedWordIds);
      mockedUserWordService.getWordIdsForReview.mockResolvedValueOnce(reviewWordIds);
      mockedWordService.getNewWordIds.mockResolvedValueOnce(newWordIds);

      const result = await dailyLearningService.generateTodaysWordLists(
        testUserId, 
        testModeId, 
        testDifficultyLevel
      );

      expect(mockedLearningModeService.getLearningMode).toHaveBeenCalledWith(testModeId);
      expect(mockedUserWordService.getReviewedWordIds).toHaveBeenCalledWith(testUserId);
      expect(mockedUserWordService.getWordIdsForReview).toHaveBeenCalledWith(
        testUserId, 
        expect.any(String)
      );
      expect(mockedWordService.getNewWordIds).toHaveBeenCalledWith(
        testUserId,
        reviewedWordIds,
        testDifficultyLevel,
        'zk',
        mockLearningMode.word_count
      );

      expect(result).toEqual({
        pre_test: [...newWordIds, ...reviewWordIds],
        learning: [...newWordIds, ...reviewWordIds],
        post_test: [...newWordIds, ...reviewWordIds]
      });
    });

    test('handles errors gracefully', async () => {
      mockedLearningModeService.getLearningMode.mockRejectedValueOnce(new Error('Service error'));

      const result = await dailyLearningService.generateTodaysWordLists(
        testUserId, 
        testModeId, 
        testDifficultyLevel
      );

      expect(result).toEqual({
        pre_test: [],
        learning: [],
        post_test: []
      });
    });

    test('handles empty data', async () => {
      mockedLearningModeService.getLearningMode.mockResolvedValueOnce(mockLearningMode);
      mockedUserWordService.getReviewedWordIds.mockResolvedValueOnce([]);
      mockedUserWordService.getWordIdsForReview.mockResolvedValueOnce([]);
      mockedWordService.getNewWordIds.mockResolvedValueOnce([]);

      const result = await dailyLearningService.generateTodaysWordLists(
        testUserId, 
        testModeId, 
        testDifficultyLevel
      );

      expect(result).toEqual({
        pre_test: [],
        learning: [],
        post_test: []
      });
    });
  });

  describe('generateIncrementalWordsList', () => {
    test('generates incremental words list successfully', async () => {
      const reviewedWordIds = ['word1', 'word2'];
      const newWordIds = ['word3', 'word4', 'word5', 'word6', 'word7', 'word8', 'word9', 'word10', 'word11', 'word12'];

      mockedLearningModeService.getLearningMode.mockResolvedValueOnce(mockLearningMode);
      mockedUserWordService.getReviewedWordIds.mockResolvedValueOnce(reviewedWordIds);
      mockedWordService.getNewWordIds.mockResolvedValueOnce(newWordIds);

      const result = await dailyLearningService.generateIncrementalWordsList(
        testUserId,
        testModeId,
        testDifficultyLevel
      );

      expect(mockedLearningModeService.getLearningMode).toHaveBeenCalledWith(testModeId);
      expect(mockedUserWordService.getReviewedWordIds).toHaveBeenCalledWith(testUserId);
      expect(mockedWordService.getNewWordIds).toHaveBeenCalledWith(
        testUserId,
        reviewedWordIds,
        testDifficultyLevel,
        'zk',
        mockLearningMode.word_count
      );

      // Should return exactly word_count words when more are available
      expect(result).toHaveLength(mockLearningMode.word_count);
    });

    test('returns all words when fewer than word_count available', async () => {
      const reviewedWordIds = ['word1', 'word2'];
      const newWordIds = ['word3', 'word4', 'word5']; // Only 3 words available

      mockedLearningModeService.getLearningMode.mockResolvedValueOnce(mockLearningMode);
      mockedUserWordService.getReviewedWordIds.mockResolvedValueOnce(reviewedWordIds);
      mockedWordService.getNewWordIds.mockResolvedValueOnce(newWordIds);

      const result = await dailyLearningService.generateIncrementalWordsList(
        testUserId,
        testModeId,
        testDifficultyLevel
      );

      expect(result).toEqual(newWordIds);
      expect(result).toHaveLength(3);
    });

    test('handles errors gracefully', async () => {
      mockedLearningModeService.getLearningMode.mockRejectedValueOnce(new Error('Service error'));

      const result = await dailyLearningService.generateIncrementalWordsList(
        testUserId,
        testModeId,
        testDifficultyLevel
      );

      expect(result).toEqual([]);
    });
  });

  describe('addIncrementalWordsToSession', () => {
    test.only('adds incremental words to session successfully', async () => {
      const incrementalWords = ['word4', 'word5', 'word6'];
      const currentSession = {
        ...mockDailyLearningSession,
        pre_test_word_ids: ['word1', 'word2', 'word3'],
        pre_test_progress: '1/3'
      };

      const updatedSession = {
        ...currentSession,
        pre_test_word_ids: ['word1', 'word2', 'word3', 'word4', 'word5', 'word6'],
        pre_test_progress: '1/6',
        status: 1
      };

      mockedLearningModeService.getLearningMode.mockResolvedValueOnce(mockLearningMode);
      mockedUserWordService.getReviewedWordIds.mockResolvedValueOnce([]);
      mockedWordService.getNewWordIds.mockResolvedValueOnce(incrementalWords);
      
      // 返回序列化的当前会话
      const serializedCurrentSession = {
        ...currentSession,
        pre_test_word_ids: JSON.stringify(currentSession.pre_test_word_ids),
        learning_word_ids: JSON.stringify(currentSession.learning_word_ids),
        post_test_word_ids: JSON.stringify(currentSession.post_test_word_ids)
      };
      mockedTablesDB.getRow.mockResolvedValueOnce(serializedCurrentSession as any);
      
      // 返回序列化的更新后会话
      const serializedUpdatedSession = {
        ...updatedSession,
        pre_test_word_ids: JSON.stringify(updatedSession.pre_test_word_ids),
        learning_word_ids: JSON.stringify(updatedSession.learning_word_ids),
        post_test_word_ids: JSON.stringify(updatedSession.post_test_word_ids)
      };
      mockedTablesDB.updateRow.mockResolvedValueOnce(serializedUpdatedSession as any);

      const result = await dailyLearningService.addIncrementalWordsToSession(
        testSessionId,
        testUserId,
        testModeId,
        testDifficultyLevel
      );

      expect(result).toEqual(updatedSession);
    });

    test('throws error when no incremental words available', async () => {
      mockedLearningModeService.getLearningMode.mockResolvedValueOnce(mockLearningMode);
      mockedUserWordService.getReviewedWordIds.mockResolvedValueOnce([]);
      mockedWordService.getNewWordIds.mockResolvedValueOnce([]);

      await expect(
        dailyLearningService.addIncrementalWordsToSession(
          testSessionId,
          testUserId,
          testModeId,
          testDifficultyLevel
        )
      ).rejects.toThrow('暂时没有更多可学习的单词');
    });

    test('throws error when session not found', async () => {
      const incrementalWords = ['word4', 'word5'];
      mockedLearningModeService.getLearningMode.mockResolvedValueOnce(mockLearningMode);
      mockedUserWordService.getReviewedWordIds.mockResolvedValueOnce([]);
      mockedWordService.getNewWordIds.mockResolvedValueOnce(incrementalWords);
      
      mockedTablesDB.getRow.mockRejectedValueOnce({ code: 404 });

      await expect(
        dailyLearningService.addIncrementalWordsToSession(
          testSessionId,
          testUserId,
          testModeId,
          testDifficultyLevel
        )
      ).rejects.toThrow('会话不存在');
    });
  });
});