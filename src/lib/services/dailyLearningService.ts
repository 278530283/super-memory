// src/lib/services/dailyLearningService.ts
import { databases, ID, Query } from 'appwrite';
import {
  COLLECTION_DAILY_LEARNING_SESSIONS,
  COLLECTION_LEARNING_MODES,
  DATABASE_ID,
} from '../../constants/appwrite';
import { DailyLearningSession } from '../../types/DailyLearningSession';

class DailyLearningService {
  async getTodaysSession(userId: string, sessionDate: string): Promise<DailyLearningSession | null> {
    try {
      // Query by user_id (string) and session_date (string)
      const response = await databases.listDocuments(
        DATABASE_ID,
        COLLECTION_DAILY_LEARNING_SESSIONS,
        [Query.equal('user_id', userId), Query.equal('session_date', sessionDate)]
      );

      if (response.documents.length > 0) {
        return response.documents[0] as unknown as DailyLearningSession;
      } else {
        return null;
      }
    } catch (error: any) {
      console.error("DailyLearningService.getTodaysSession error:", error);
      // Re-throw specific error for 404 if needed, or let store handle
      throw error;
    }
  }

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
        // Appwrite handles arrays directly
        pre_test_word_ids: initialWordIds.pre_test,
        learning_word_ids: initialWordIds.learning,
        post_test_word_ids: initialWordIds.post_test,
        // Progress fields will be initialized as null/undefined or empty strings
        // pre_test_progress: null,
        // learning_progress: null,
        // post_test_progress: null,
      };

      const newSession = await databases.createDocument(
        DATABASE_ID,
        COLLECTION_DAILY_LEARNING_SESSIONS,
        ID.unique(),
        sessionData
      );
      return newSession as unknown as DailyLearningSession;
    } catch (error) {
      console.error("DailyLearningService.createSession error:", error);
      throw error;
    }
  }

  async updateSession(sessionId: string, updates: Partial<DailyLearningSession>): Promise<DailyLearningSession> {
    try {
      // Appwrite handles arrays and partial updates directly
      const updatedSession = await databases.updateDocument(
        DATABASE_ID,
        COLLECTION_DAILY_LEARNING_SESSIONS,
        sessionId,
        updates
      );
      return updatedSession as unknown as DailyLearningSession;
    } catch (error) {
      console.error("DailyLearningService.updateSession error:", error);
      throw error;
    }
  }

  async recordWordAction(actionData: any): Promise<void> {
    console.log("Recording word action (placeholder):", actionData);
    try {
        // Example implementation for recording action
        // const collectionId = COLLECTION_USER_WORD_ACTION_LOG;
        // await databases.createDocument(DATABASE_ID, collectionId, ID.unique(), actionData);
    } catch (error) {
        console.error("DailyLearningService.recordWordAction error:", error);
        throw error;
    }
  }

  async getLearningMode(modeId: number): Promise<any | null> {
    try {
        const response = await databases.listDocuments(
            DATABASE_ID,
            COLLECTION_LEARNING_MODES,
            [Query.equal('id', modeId)] // Assuming 'id' is a number field in Appwrite
        );
        if (response.documents.length > 0) {
            return response.documents[0];
        }
        return null;
    } catch (error) {
        console.error("DailyLearningService.getLearningMode error:", error);
        return null;
    }
  }
}

export default new DailyLearningService();