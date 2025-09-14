// src/lib/services/learningModeService.ts
import { COLLECTION_LEARNING_MODES, DATABASE_ID } from '@/src/constants/appwrite';
import { tablesDB } from '@/src/lib/appwrite';
import { LearningMode } from '@/src/types/LearningMode';
import { Query } from 'appwrite';

class LearningModeService {
  /**
   * 根据模式ID获取学习模式详情
   * @param modeId 学习模式ID
   * @returns 
   */
  async getLearningMode(modeId: number): Promise<LearningMode | null> {
    try {
        // Assuming 'id' is a number field in the Appwrite collection
        const response = await tablesDB.listRows({
            databaseId:DATABASE_ID,
            tableId:COLLECTION_LEARNING_MODES,
            queries:[Query.equal('mode_id', modeId)]
    });
        if (response.rows.length > 0) {
            return response.rows[0] as unknown as LearningMode;
        }
        return null;
    } catch (error) {
        console.error("LearningModeService.getLearningMode error:", error);
        throw error; // Or return null and handle in calling code
    }
  }

  /**
   *  获取所有学习模式列表
   * @returns 
   */
  // Optionally, fetch all modes if needed for caching or selection
  async getAllLearningModes(): Promise<LearningMode[]> {
    try {
        const response = await tablesDB.listRows({databaseId:DATABASE_ID, tableId:COLLECTION_LEARNING_MODES});
        return response.rows as unknown as LearningMode[];
    } catch (error) {
        console.error("LearningModeService.getAllLearningModes error:", error);
        throw error;
    }
  }
}

export default new LearningModeService();