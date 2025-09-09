// src/lib/services/learningModeService.ts
import { COLLECTION_LEARNING_MODES, DATABASE_ID } from '@/src/constants/appwrite';
import { LearningMode } from '@/src/types/LearningMode';
import { databases, Query } from 'appwrite';

class LearningModeService {
  async getLearningMode(modeId: number): Promise<LearningMode | null> {
    try {
        // Assuming 'id' is a number field in the Appwrite collection
        const response = await databases.listDocuments(
            DATABASE_ID,
            COLLECTION_LEARNING_MODES,
            [Query.equal('id', modeId)]
        );
        if (response.documents.length > 0) {
            return response.documents[0] as unknown as LearningMode;
        }
        return null;
    } catch (error) {
        console.error("LearningModeService.getLearningMode error:", error);
        throw error; // Or return null and handle in calling code
    }
  }

  // Optionally, fetch all modes if needed for caching or selection
  // async getAllLearningModes(): Promise<LearningMode[]> {
  //   try {
  //       const response = await databases.listDocuments(DATABASE_ID, COLLECTION_LEARNING_MODES);
  //       return response.documents as unknown as LearningMode[];
  //   } catch (error) {
  //       console.error("LearningModeService.getAllLearningModes error:", error);
  //       throw error;
  //   }
  // }
}

export default new LearningModeService();