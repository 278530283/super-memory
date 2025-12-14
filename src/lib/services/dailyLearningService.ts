// src/lib/services/dailyLearningService.ts
import {
  COLLECTION_DAILY_LEARNING_SESSIONS,
  COLLECTION_USER_WORD_ACTION_LOG,
  DATABASE_ID
} from '@/src/constants/appwrite';
import { tablesDB } from '@/src/lib/appwrite';
import { DateUtils } from '@/src/lib/utils/DateUtils';
import { DailyLearningSession } from '@/src/types/DailyLearningSession';
import { LearningMode } from '@/src/types/LearningMode';
import { ID, Query } from 'appwrite';
import learningModeService from './learningModeService';
import userWordService from './userWordService';
import wordService from './wordService';

class DailyLearningService {
  /**
   * Fetches today's learning session for a user, if it exists.
   * @param userId 
   * @param sessionDate 
   * @returns 
   */
  async getTodaysSession(userId: string, sessionDate: string): Promise<DailyLearningSession | null> {
    try {
      // Query by user_id (string) and session_date (string)
      const response = await tablesDB.listRows({
        databaseId: DATABASE_ID,
        tableId: COLLECTION_DAILY_LEARNING_SESSIONS,
        queries: [Query.equal('user_id', userId), Query.equal('session_date', sessionDate)]
      });

      if (response.rows.length > 0) {
        const session = response.rows[0] as unknown as DailyLearningSession;
        
        // 反序列化 JSON 字符串为数组
        if (typeof session.pre_test_word_ids === 'string') {
          session.pre_test_word_ids = JSON.parse(session.pre_test_word_ids);
        }
        if (typeof session.post_test_word_ids === 'string') {
          session.post_test_word_ids = JSON.parse(session.post_test_word_ids);
        }
        
        return session;
      } else {
        return null;
      }
    } catch (error: any) {
      console.error("DailyLearningService.getTodaysSession error:", error);
      // Re-throw specific error for 404 if needed, or let store handle
      throw error;
    }
  }

  /**
   * Creates a new daily learning session for the user.
   * @param userId 
   * @param modeId 
   * @param initialWordIds 
   * @returns 
   */
  async createSession(
    userId: string,
    modeId: string,
    initialWordIds: { pre_test: string[]; post_test: string[] }
  ): Promise<DailyLearningSession> {
    try {
      const sessionData: any = {
        user_id: userId,
        session_date: DateUtils.getLocalDate(),
        mode_id: modeId,
        status: 0, // Start at '待开始'
        // 将数组序列化为 JSON 字符串
        pre_test_word_ids: JSON.stringify(initialWordIds.pre_test),
        post_test_word_ids: JSON.stringify(initialWordIds.post_test),
        // Progress fields will be initialized as null/undefined or empty strings
        pre_test_progress: "0/" + initialWordIds.pre_test.length,
        post_test_progress: "0/" + initialWordIds.post_test.length,
      };

      const newSession = await tablesDB.createRow({
        databaseId: DATABASE_ID,
        tableId: COLLECTION_DAILY_LEARNING_SESSIONS,
        rowId: ID.unique(),
        data: sessionData
      });
      // 反序列化 JSON 字符串为数组
      const result = newSession as unknown as DailyLearningSession;
      result.pre_test_word_ids = initialWordIds.pre_test;
      result.post_test_word_ids = initialWordIds.post_test;
      
      return result;
    } catch (error) {
      console.error("DailyLearningService.createSession error:", error);
      throw error;
    }
  }

  /**
   * Updates an existing daily learning session with partial data.
   * @param sessionId 
   * @param updates 
   * @returns 
   */
  async updateSession(sessionId: string, updates: Partial<DailyLearningSession>): Promise<DailyLearningSession> {
    try {
      // 创建更新数据的副本
      const updateData = {...updates};
      
      // 如果更新中包含数组字段，将其序列化为 JSON 字符串
      if (updateData.pre_test_word_ids) {
        updateData.pre_test_word_ids = JSON.stringify(updateData.pre_test_word_ids) as any;
      }
      if (updateData.post_test_word_ids) {
        updateData.post_test_word_ids = JSON.stringify(updateData.post_test_word_ids) as any;
      }

      // Appwrite handles arrays and partial updates directly
      const updatedSession = await tablesDB.updateRow({
        databaseId: DATABASE_ID,
        tableId: COLLECTION_DAILY_LEARNING_SESSIONS,
        rowId: sessionId,
        data: updateData
      });

      const result = updatedSession as unknown as DailyLearningSession;
      
      // 确保数组字段保持为数组
      // 直接反序列化 updatedSession 中的数组字段
      if (typeof result.pre_test_word_ids === 'string') {
        result.pre_test_word_ids = JSON.parse(result.pre_test_word_ids);
      }
      if (typeof result.post_test_word_ids === 'string') {
        result.post_test_word_ids = JSON.parse(result.post_test_word_ids);
      }
      
      return result;

    } catch (error) {
      console.error("DailyLearningService.updateSession error:", error);
      throw error;
    }
  }

  
  /**
   * Fetches a specific session by its ID.
   * @param sessionId 
   * @returns 
   */
  async getSessionById(sessionId: string): Promise<DailyLearningSession | null> {
    try {
      const response = await tablesDB.getRow({
        databaseId: DATABASE_ID,
        tableId: COLLECTION_DAILY_LEARNING_SESSIONS,
        rowId: sessionId
      });
      const session = response as unknown as DailyLearningSession;
      
      // 反序列化 JSON 字符串为数组
      if (typeof session.pre_test_word_ids === 'string') {
        session.pre_test_word_ids = JSON.parse(session.pre_test_word_ids);
      }
      if (typeof session.post_test_word_ids === 'string') {
        session.post_test_word_ids = JSON.parse(session.post_test_word_ids);
      }
      
      return session;
    } catch (error: any) {
      console.error("DailyLearningService.getSessionById error:", error);
      if (error.code === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Deletes a session by its ID.
   * @param sessionId 
   */
  async deleteSession(sessionId: string): Promise<void> {
    try {
      await tablesDB.deleteRow({
        databaseId: DATABASE_ID,
        tableId: COLLECTION_DAILY_LEARNING_SESSIONS,
        rowId: sessionId
      });
    } catch (error) {
      console.error("DailyLearningService.deleteSession error:", error);
      throw error;
    }
  }

  /**
   * Records a user's action on a word (e.g., answer correctness, time taken).
   * @param actionData 
   */
  async recordWordAction(actionData: any): Promise<void> {
    console.log("Recording word action (placeholder):", actionData);
    try {
      // Example implementation for recording action
      await tablesDB.createRow({databaseId:DATABASE_ID, tableId:COLLECTION_USER_WORD_ACTION_LOG, rowId:ID.unique(), data:actionData});
    } catch (error) {
      console.error("DailyLearningService.recordWordAction error:", error);
      throw error;
    }
  }

  /**
   * Generates the word lists for a new daily learning session.
   * This is a simplified version. A real implementation would be much more complex,
   * involving sophisticated algorithms based on spaced repetition, user history, etc.
   * @param userId The ID of the user.
   * @param modeId The ID of the selected learning mode.
   * @returns An object containing arrays of word IDs for pre-test, learning, and post-test.
   */
  async generateTodaysWordLists(userId: string, modeId: string, englishLevel: number): Promise<{ pre_test: string[]; post_test: string[] }> {
    try {
      // 1. Fetch User Preferences and Learning Mode Details
      const mode = await learningModeService.getLearningMode(modeId) as unknown as LearningMode;

      // 2. Fetch User's all reviewed Word IDs
      const reviewedWordIds = await userWordService.getReviewedWordIds(userId);

      console.log("User all reviewed word count:", reviewedWordIds.length);

      // 3. Fetch all Word IDs for Review
      const queryDate = DateUtils.getLocalDate();
      const wordIdsForReview = await userWordService.getWordIdsForReview(userId, queryDate);

      console.log("User need review word count:", wordIdsForReview.length);

      // 4. Get New Word IDs
      const newWordIds = await wordService.getNewWordIds(userId, reviewedWordIds, englishLevel, null, mode.word_count);
      console.log("User new word count:", newWordIds.length);

      // 5. Combine Word IDs
      const preTestWordIds = [...newWordIds, ...wordIdsForReview];
      const postTestWordIds = [...newWordIds];

      console.log("Generated Word Lists:", { preTestWordIds, postTestWordIds });
      return { pre_test: preTestWordIds, post_test: postTestWordIds };
    } catch (error) {
      console.error("DailyLearningService.generateTodaysWordLists error:", error);
      // Returning empty lists allows session creation to proceed, maybe with a warning
      return { pre_test: [], post_test: [] };
    }
  }

  /**
   * Generates incremental learning word lists for additional study sessions.
   * This method randomly selects words based on mode and difficulty level.
   * @param userId The ID of the user.
   * @param modeId The ID of the selected learning mode.
   * @param englishLevel The english level for word selection.
   * @param excludeWordIds 需要排除的单词ID列表（通常是当前会话中已存在的单词）
   * @returns An array of word IDs for incremental learning.
   */
  async generateIncrementalWordsList(
    userId: string, 
    modeId: string, 
    englishLevel: number,
    excludeWordIds: string[] = []
  ): Promise<string[]> {
    try {
      console.log(`[DailyLearningService] Generating incremental words list for user ${userId}`);
      // 1. Fetch Learning Mode Details to get word count
      const mode = await learningModeService.getLearningMode(modeId) as unknown as LearningMode;
      
      // 2. Fetch User's reviewed Word IDs to exclude them
      const reviewedWordIds = await userWordService.getReviewedWordIds(userId);
      
      // 3. 合并需要排除的所有单词ID（已复习的单词 + 当前会话中已存在的单词）
      const allExcludedWordIds = [...reviewedWordIds, ...excludeWordIds];
      
      console.log(`[DailyLearningService] Excluding ${allExcludedWordIds.length} words (${reviewedWordIds.length} reviewed + ${excludeWordIds.length} from current session)`);

      // 4. Get New Word IDs based on difficulty level,排除所有需要排除的单词
      const newWordIds = await wordService.getNewWordIds(
        userId, 
        allExcludedWordIds, // 传入所有需要排除的单词ID
        englishLevel, 
        null, 
        mode.word_count
      );
      
      console.log(`[DailyLearningService] Found ${newWordIds.length} new words after exclusion`);
      
      // 5. If we have enough words, return all of them
      if (newWordIds.length <= mode.word_count) {
        return newWordIds;
      }
      
      // 6. If we have more words than needed, randomly select the required amount
      const shuffled = [...newWordIds].sort(() => 0.5 - Math.random());
      return shuffled.slice(0, mode.word_count);
      
    } catch (error) {
      console.error("DailyLearningService.generateIncrementalWordsList error:", error);
      // Return empty array in case of error to allow operation to continue
      return [];
    }
  }

  /**
 * Adds incremental words to an existing session and updates progress
 * @param sessionId The ID of the existing session
 * @param userId The ID of the user
 * @param modeId The ID of the learning mode
 * @param englishLevel The english level for word selection
 * @returns The updated session
 */
async addIncrementalWordsToSession(
  sessionId: string,
  userId: string,
  modeId: string,
  englishLevel: number
): Promise<DailyLearningSession> {
  try {
    console.log("[DailyLearningService] addIncrementalWordsToSession, userId:", userId, ", modeId:", modeId, ", englishLevel:", englishLevel);
    // 1. Get current session
    const currentSession = await this.getSessionById(sessionId);
    if (!currentSession) {
      throw new Error('会话不存在');
    }

    // 2. Generate incremental words list, 排除当前会话中已存在的单词
    const incrementalWords = await this.generateIncrementalWordsList(
      userId,
      modeId,
      englishLevel,
      currentSession.pre_test_word_ids // 排除当前会话中所有已存在的单词
    );

    if (incrementalWords.length === 0) {
      throw new Error('暂时没有更多可学习的单词');
    }

    // 3. Merge word lists and update progress for both pre_test and post_test
    const currentPreTestWords = currentSession.pre_test_word_ids || [];
    const currentPostTestWords = currentSession.post_test_word_ids || [];
    
    const updatedPreTestWords = [...currentPreTestWords, ...incrementalWords];
    const updatedPostTestWords = [...currentPostTestWords, ...incrementalWords];
    
    // 更新 pre_test 进度
    const currentPreTestProgress = currentSession.pre_test_progress || '0/0';
    const [preTestCompleted, preTestTotal] = currentPreTestProgress.split('/').map(Number);
    const newPreTestTotal = preTestTotal + incrementalWords.length;
    const updatedPreTestProgress = `${preTestCompleted}/${newPreTestTotal}`;

    // 更新 post_test 进度
    const currentPostTestProgress = currentSession.post_test_progress || '0/0';
    const [postTestCompleted, postTestTotal] = currentPostTestProgress.split('/').map(Number);
    const newPostTestTotal = postTestTotal + incrementalWords.length;
    const updatedPostTestProgress = `${postTestCompleted}/${newPostTestTotal}`;

    // 4. Update session
    const updatedSession = await this.updateSession(sessionId, {
      pre_test_word_ids: updatedPreTestWords,
      post_test_word_ids: updatedPostTestWords,
      pre_test_progress: updatedPreTestProgress,
      post_test_progress: updatedPostTestProgress,
      status: 1, // Set to in progress
    });

    console.log(`[DailyLearningService] Added ${incrementalWords.length} incremental words to both pre_test and post_test`);
    console.log("Updated Pre-Test Word list:", updatedPreTestWords);
    console.log("Updated Post-Test Word list:", updatedPostTestWords);

    return updatedSession;

  } catch (error) {
    console.error("DailyLearningService.addIncrementalWordsToSession error:", error);
    throw error;
  }
}
}

export default new DailyLearningService();