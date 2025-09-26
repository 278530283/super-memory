// src/lib/services/actionLogService.ts
import { COLLECTION_USER_WORD_ACTION_LOG, DATABASE_ID } from '@/src/constants/appwrite';
import { tablesDB } from '@/src/lib/appwrite';
import { UserWordActionLog } from '@/src/types/UserWordActionLog';
import { ID } from 'appwrite';

class ActionLogService {
  /**
   * Record a user action in the action log.
   * @param actionLog 
   */
  async logAction(actionLog: Omit<UserWordActionLog, '$id'>): Promise<void> {
    console.log("Logging action for word:", actionLog.word_id, "Action Type:", actionLog.action_type);
    // check response time no more than 1 hour
    // if so, set it to 1 hour
    if (actionLog.response_time_ms && actionLog.response_time_ms > 3600000) {
      actionLog.response_time_ms = 3600000;
    }
    if(actionLog.study_duration_ms && actionLog.study_duration_ms > 3600000){
      actionLog.study_duration_ms = 3600000;
    }

    try {
      await tablesDB.createRow({
        databaseId:DATABASE_ID,
        tableId:COLLECTION_USER_WORD_ACTION_LOG,
        rowId:ID.unique(),
        data:actionLog
    });
      console.log("Action logged successfully for word:", actionLog.word_id, "Action Type:", actionLog.action_type);
    } catch (error) {
      console.error("ActionLogService.logAction error:", error);
    }
  }
}

export default new ActionLogService();