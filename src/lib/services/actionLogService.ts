// src/lib/services/actionLogService.ts
import { COLLECTION_USER_WORD_ACTION_LOG, DATABASE_ID } from '@/src/constants/appwrite';
import { tablesDB } from '@/src/lib/appwrite';
import { ID } from 'appwrite';

// Define the type for the log entry based on the database schema
interface UserWordActionLogEntry {
  userId: string;
  wordId: string;
  sessionId: string | null;
  actionType: number; // 1=前置评测, 2=学习阶段, 3=当日评测, 4=快速复习, 5=专项训练
  phase: number | null; // 1=前置评测, 2=学习阶段, 3=当日评测
  activityType: number; // Specific activity (e.g., 1=听单词, 2=英译中, etc.)
  learningMethod?: number | null; // For actionType=2
  isCorrect?: boolean | null;
  responseTimeMs?: number | null;
  studyDurationMs?: number | null;
  speedUsed: number; // Percentage
  // createdAt is handled by Appwrite
}

class ActionLogService {
  async logAction(logEntry: Omit<UserWordActionLogEntry, '$id' | 'createdAt'>): Promise<void> {
    try {
      await tablesDB.createRow({
        databaseId:DATABASE_ID,
        tableId:COLLECTION_USER_WORD_ACTION_LOG,
        rowId:ID.unique(),
        data:logEntry
    });
      console.log("Action logged successfully for word:", logEntry.wordId);
    } catch (error) {
      console.error("ActionLogService.logAction error:", error);
      // Depending on requirements, you might want to re-throw the error
      // or handle it silently (e.g., if logging is non-critical)
      // For now, we'll log it and continue
    }
  }
}

export default new ActionLogService();