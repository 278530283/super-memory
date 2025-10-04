// src/__tests__/services/dailyLearningService.test.ts
import dailyLearningService from '@/src/lib/services/dailyLearningService';
import learningModeService from '@/src/lib/services/learningModeService';
import userWordService from '@/src/lib/services/userWordService';
import wordService from '@/src/lib/services/wordService';
import { DailyLearningSession } from '@/src/types/DailyLearningSession';
import { LearningMode } from '@/src/types/LearningMode';

import { COLLECTION_DAILY_LEARNING_SESSIONS, COLLECTION_USER_WORD_ACTION_LOG, DATABASE_ID } from '@/src/constants/appwrite';
import { tablesDB } from '@/src/lib/appwrite';

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

describe('DailyLearningService Unit Tests', () => {
  const testUserId = '68c19de90027e9732ea0';
  const testModeId = "1";
  const testDate = '2024-01-18';
  const testDifficultyLevel = 2;

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
    $id: 'session123',
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
      mockedTablesDB.listRows.mockResolvedValueOnce({
        total: 1,
        rows: [mockDailyLearningSession]
      } as any);

      const result = await dailyLearningService.getTodaysSession(testUserId, testDate);
      
      // 修复：检查序列化后的查询
      expect(mockedTablesDB.listRows).toHaveBeenCalledWith({
        databaseId: DATABASE_ID,
        tableId: COLLECTION_DAILY_LEARNING_SESSIONS,
        queries: [
          JSON.stringify({
            method: 'equal',
            attribute: 'user_id',
            values: [testUserId]
          }),
          JSON.stringify({
            method: 'equal',
            attribute: 'session_date',
            values: [testDate]
          })
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
  });

  describe('createSession', () => {
    test('creates a new session with serialized word arrays', async () => {
      const initialWordIds = {
        pre_test: ['word1', 'word2'],
        learning: ['word3', 'word4', 'word5'],
        post_test: ['word3', 'word4', 'word5']
      };

      const serializedSession = {
        ...mockDailyLearningSession,
        pre_test_word_ids: JSON.stringify(initialWordIds.pre_test),
        learning_word_ids: JSON.stringify(initialWordIds.learning),
        post_test_word_ids: JSON.stringify(initialWordIds.post_test)
      };

      mockedTablesDB.createRow.mockResolvedValueOnce(serializedSession as any);

      const result = await dailyLearningService.createSession(
        testUserId,
        testModeId,
        initialWordIds
      );
      
      expect(mockedTablesDB.createRow).toHaveBeenCalledWith({
        databaseId: DATABASE_ID,
        tableId: COLLECTION_DAILY_LEARNING_SESSIONS,
        rowId: expect.any(String),
        data: {
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
        }
      });
      
      expect(result).toEqual({
        ...mockDailyLearningSession,
        pre_test_word_ids: initialWordIds.pre_test,
        learning_word_ids: initialWordIds.learning,
        post_test_word_ids: initialWordIds.post_test
      });
    });
  });

  describe('updateSession', () => {
    test('updates session with serialized arrays', async () => {
      const updates = {
        status: 1,
        pre_test_progress: '2/3'
      };

      const updatedSession = { ...mockDailyLearningSession, ...updates };
      mockedTablesDB.updateRow.mockResolvedValueOnce(updatedSession as any);
      mockedTablesDB.getRow.mockResolvedValueOnce(mockDailyLearningSession as any);

      const result = await dailyLearningService.updateSession('session123', updates);
      
      expect(mockedTablesDB.updateRow).toHaveBeenCalledWith({
        databaseId: DATABASE_ID,
        tableId: COLLECTION_DAILY_LEARNING_SESSIONS,
        rowId: 'session123',
        data: updates // No array serialization needed since we're not updating arrays
      });
      
      expect(result).toEqual(updatedSession);
    });

    test('updates session with array fields serialized', async () => {
      const updates = {
        status: 1,
        pre_test_word_ids: ['word1', 'word2', 'word3', 'word4']
      };

      const updatedSession = { ...mockDailyLearningSession, ...updates };
      mockedTablesDB.updateRow.mockResolvedValueOnce(updatedSession as any);
      mockedTablesDB.getRow.mockResolvedValueOnce(mockDailyLearningSession as any);

      const result = await dailyLearningService.updateSession('session123', updates);
      
      expect(mockedTablesDB.updateRow).toHaveBeenCalledWith({
        databaseId: DATABASE_ID,
        tableId: COLLECTION_DAILY_LEARNING_SESSIONS,
        rowId: 'session123',
        data: {
          status: 1,
          pre_test_word_ids: JSON.stringify(updates.pre_test_word_ids)
        }
      });
      
      expect(result).toEqual(updatedSession);
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

      const result = await dailyLearningService.getSessionById('session123');
      
      expect(mockedTablesDB.getRow).toHaveBeenCalledWith({
        databaseId: DATABASE_ID,
        tableId: COLLECTION_DAILY_LEARNING_SESSIONS,
        rowId: 'session123'
      });
      
      expect(result).toEqual(mockDailyLearningSession);
    });

    test('returns null when session not found', async () => {
      mockedTablesDB.getRow.mockRejectedValueOnce({ code: 404 });

      const result = await dailyLearningService.getSessionById('non-existent-session');
      
      expect(result).toBeNull();
    });
  });

  describe('deleteSession', () => {
    test('deletes session by ID', async () => {
      mockedTablesDB.deleteRow.mockResolvedValueOnce({} as any);

      await dailyLearningService.deleteSession('session123');
      
      expect(mockedTablesDB.deleteRow).toHaveBeenCalledWith({
        databaseId: DATABASE_ID,
        tableId: COLLECTION_DAILY_LEARNING_SESSIONS,
        rowId: 'session123'
      });
    });
  });

  describe('recordWordAction', () => {
    test('records word action successfully', async () => {
      const actionData = {
        userId: testUserId,
        wordId: 'test_word_id',
        sessionId: 'session123',
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
        rowId: expect.any(String),
        data: actionData
      });
    });
  });

  describe('generateTodaysWordLists', () => {
    test('generates word lists successfully', async () => {
      // Mock service responses
      mockedLearningModeService.getLearningMode.mockResolvedValueOnce(mockLearningMode);
      mockedUserWordService.getReviewedWordIds.mockResolvedValueOnce(['word1', 'word2', 'word3']);
      mockedUserWordService.getWordIdsForReview.mockResolvedValueOnce(['word4', 'word5']);
      mockedWordService.getNewWordIds.mockResolvedValueOnce(['word6', 'word7', 'word8']);

      const result = await dailyLearningService.generateTodaysWordLists(
        testUserId, 
        testModeId, 
        testDifficultyLevel
      );

      // Verify service calls
      expect(mockedLearningModeService.getLearningMode).toHaveBeenCalledWith(testModeId);
      expect(mockedUserWordService.getReviewedWordIds).toHaveBeenCalledWith(testUserId);
      
      // 修复：使用更灵活的日期检查
      expect(mockedUserWordService.getWordIdsForReview).toHaveBeenCalledWith(
        testUserId, 
        expect.any(String) // 接受任何日期字符串
      );
      
      expect(mockedWordService.getNewWordIds).toHaveBeenCalledWith(
        testUserId,
        ['word1', 'word2', 'word3'],
        testDifficultyLevel,
        'zk',
        mockLearningMode.word_count
      );

      // Verify result
      expect(result).toEqual({
        pre_test: ['word6', 'word7', 'word8', 'word4', 'word5'],
        learning: ['word6', 'word7', 'word8', 'word4', 'word5'],
        post_test: ['word6', 'word7', 'word8', 'word4', 'word5']
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
});