// src/lib/services/dailyLearningService.ts
import {
  COLLECTION_DAILY_LEARNING_SESSIONS,
  COLLECTION_USER_WORD_ACTION_LOG,
  COLLECTION_USER_WORD_PROGRESS,
  COLLECTION_WORDS,
  DATABASE_ID
} from '@/src/constants/appwrite';
import { tablesDB } from '@/src/lib/appwrite';
import { DailyLearningSession } from '@/src/types/DailyLearningSession';
import { LearningMode } from '@/src/types/LearningMode';
import { UserWordProgress } from '@/src/types/UserWordProgress';
import { ID, Query } from 'appwrite';
import learningModeService from './learningModeService';

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
        if (typeof session.learning_word_ids === 'string') {
          session.learning_word_ids = JSON.parse(session.learning_word_ids);
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
    modeId: number,
    initialWordIds: { pre_test: string[]; learning: string[]; post_test: string[] }
  ): Promise<DailyLearningSession> {
    try {
      const sessionData: any = {
        user_id: userId,
        session_date: new Date().toISOString().split('T')[0], // YYYY-MM-DD
        mode_id: modeId,
        status: 0, // Start at '待开始'
        // 将数组序列化为 JSON 字符串
        pre_test_word_ids: JSON.stringify(initialWordIds.pre_test),
        learning_word_ids: JSON.stringify(initialWordIds.learning),
        post_test_word_ids: JSON.stringify(initialWordIds.post_test),
        // Progress fields will be initialized as null/undefined or empty strings
        pre_test_progress: "0/" + initialWordIds.pre_test.length,
        learning_progress: "0/" + initialWordIds.learning.length,
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
      result.learning_word_ids = initialWordIds.learning;
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
      if (updateData.learning_word_ids) {
        updateData.learning_word_ids = JSON.stringify(updateData.learning_word_ids) as any;
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
      // 获取原始会话以保留未更新的数组字段
      const originalSession = await this.getSessionById(sessionId);
      const result = updatedSession as unknown as DailyLearningSession;
      
      // 确保数组字段保持为数组
      if (!updateData.pre_test_word_ids && originalSession) {
        result.pre_test_word_ids = originalSession.pre_test_word_ids;
      }
      if (!updateData.learning_word_ids && originalSession) {
        result.learning_word_ids = originalSession.learning_word_ids;
      }
      if (!updateData.post_test_word_ids && originalSession) {
        result.post_test_word_ids = originalSession.post_test_word_ids;
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
      if (typeof session.learning_word_ids === 'string') {
        session.learning_word_ids = JSON.parse(session.learning_word_ids);
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
  async generateTodaysWordLists(userId: string, modeId: number): Promise<{ pre_test: string[]; learning: string[]; post_test: string[] }> {
    try {
      // 1. Fetch User Preferences and Learning Mode Details
      // This would typically be passed in or fetched by the caller
      // const userPrefs = await userService.getUserPreferences(userId);
      const mode = await learningModeService.getLearningMode(modeId) as unknown as LearningMode;

      // 2. Fetch User's Word Progress
      // This fetches ALL progress, which might be inefficient for large vocabularies.
      // In practice, you'd use more specific queries or pagination.
      const progressResponse = await tablesDB.listRows({
        databaseId: DATABASE_ID,
        tableId: COLLECTION_USER_WORD_PROGRESS,
        queries: [Query.equal('user_id', userId)]
      });
      const userProgress: UserWordProgress[] = progressResponse.rows as unknown as UserWordProgress[];

      console.log("User Progress data:", userProgress); // Log a sample for debugging

      // 3. Logic to Select Words (Simplified Mock Logic)
      // --- Pre-test Words ---
      // Select words that need to be re-evaluated.
      // Example: Words at L1, L2, or L3 that haven't been tested recently.
      const preTestCandidates = userProgress.filter(p =>
        (p.current_level === 1 || p.current_level === 2 || p.current_level === 3) &&
        (!p.last_review_time || (new Date().getTime() - new Date(p.last_review_time).getTime()) > 24 * 60 * 60 * 1000) // e.g., not reviewed in last 24h
      );

      console.log("Pre-test candidates:", preTestCandidates); // Log candidates for debugging

      const preTestWordIds = preTestCandidates.map(p => p.word_id).slice(0, mode.word_count); // Limit by mode

      // --- Learning Words ---
      // Select a mix of new words and words for review/upgrade.
      // Example: New words (L0) + Words to upgrade (L1->L2, L2->L3)
      const newWordCandidatesResponse = await tablesDB.listRows({
        databaseId: DATABASE_ID,
        tableId: COLLECTION_WORDS,
        queries: [
          //Query.notContains('spelling', userProgress.map(p => p.wordId)), // Words NOT in user's progress (simplified)
          Query.limit(mode.word_count) // Simplified limit
        ]
      });
      const newWordIds = newWordCandidatesResponse.rows.map((w: any) => w.$id);

      const upgradeCandidates = userProgress.filter(p =>
        (p.current_level === 1 || p.current_level === 2) &&
        p.last_learn_time && (new Date().getTime() - new Date(p.last_learn_time).getTime()) < 7 * 24 * 60 * 60 * 1000 // e.g., learned recently
      );
      const upgradeWordIds = upgradeCandidates.map(p => p.word_id).slice(0, mode.word_count / 2); // Limit upgrades

      const learningWordIds = [...newWordIds, ...upgradeWordIds].slice(0, mode.word_count); // Combine and limit

      // --- Post-test Words ---
      // Test words that were just learned or reviewed in this session.
      // For a new session, this would initially be empty or based on previous session.
      // For simplicity, we'll test the words selected for learning in this session.
      const postTestWordIds = [...learningWordIds]; // Simplified: test what we just learned

      console.log("Generated Word Lists:", { preTestWordIds, learningWordIds, postTestWordIds });
      return { pre_test: preTestWordIds, learning: learningWordIds, post_test: postTestWordIds };
    } catch (error) {
      console.error("DailyLearningService.generateTodaysWordLists error:", error);
      // Depending on requirements, you might return empty lists or re-throw
      // Returning empty lists allows session creation to proceed, maybe with a warning
      return { pre_test: [], learning: [], post_test: [] };
    }
  }
}

export default new DailyLearningService();