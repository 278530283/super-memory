// src/lib/services/morphemeService.ts
import { databases, Query } from 'appwrite';
import { COLLECTION_MORPHEMES, COLLECTION_WORD_MORPHEME_ASSOCIATIONS, DATABASE_ID } from '../../constants/appwrite';

class MorphemeService {
  // 获取一个单词的所有构成词素 (按顺序)
  async getMorphemesForWord(wordId: string): Promise<any[]> { // Use 'any' or define a type for the association+morpheme combo
    try {
      // 1. 获取关联记录
      const associationsResponse = await databases.listDocuments(
        DATABASE_ID,
        COLLECTION_WORD_MORPHEME_ASSOCIATIONS,
        [Query.equal('wordId', wordId), Query.orderAsc('orderIndex')]
      );

      const morphemeIds = associationsResponse.documents.map(assoc => assoc.morphemeId);

      if (morphemeIds.length === 0) {
        return [];
      }

      // 2. 获取词素详情
      const morphemesResponse = await databases.listDocuments(
        DATABASE_ID,
        COLLECTION_MORPHEMES,
        [Query.equal('$id', morphemeIds)]
      );

      // 3. 按照关联记录中的顺序Index排序
      const morphemeMap = new Map(morphemesResponse.documents.map(m => [m.$id, m]));
      const orderedMorphemes = associationsResponse.documents
        .map(assoc => morphemeMap.get(assoc.morphemeId))
        .filter(Boolean); // Remove any undefined if ID mismatch

      return orderedMorphemes as any[]; // Cast to appropriate type if defined
    } catch (error) {
      console.error("MorphemeService.getMorphemesForWord error:", error);
      throw error;
    }
  }

  // （示例）获取用户对某个词素的掌握进度
  // async getUserMorphemeProgress(userId: string, morphemeId: string): Promise<any | null> {
  //   // Implementation similar to userService or dailyLearningService
  //   // Would require COLLECTION_USER_MORPHEME_PROGRESS constant
  // }
}

export default new MorphemeService();