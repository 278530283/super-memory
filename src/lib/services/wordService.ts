// src/lib/services/wordService.ts
import { databases, Query } from 'appwrite';
import { COLLECTION_WORDS, DATABASE_ID } from '../../constants/appwrite';
import { Word } from '../../types/Word';

class WordService {
  // 获取单个单词详情
  async getWordById(wordId: string): Promise<Word | null> {
    try {
      const word = await databases.getDocument(DATABASE_ID, COLLECTION_WORDS, wordId);
      return word as unknown as Word;
    } catch (error: any) {
      if (error.code === 404) {
        return null;
      }
      console.error("WordService.getWordById error:", error);
      throw error;
    }
  }

  // 根据ID列表批量获取单词
  async getWordsByIds(wordIds: string[]): Promise<Word[]> {
    if (wordIds.length === 0) return [];
    try {
      const response = await databases.listDocuments(DATABASE_ID, COLLECTION_WORDS, [
        Query.equal('$id', wordIds)
      ]);
      return response.documents as unknown as Word[];
    } catch (error) {
      console.error("WordService.getWordsByIds error:", error);
      throw error;
    }
  }

  // （示例）根据难度和等级筛选单词（用于生成学习列表）
  // async getWordsByCriteria(difficultyLevel: number, limit: number): Promise<Word[]> {
  //   try {
  //     const response = await databases.listDocuments(DATABASE_ID, COLLECTION_WORDS, [
  //       Query.equal('difficulty_level', difficultyLevel),
  //       Query.limit(limit)
  //     ]);
  //     return response.documents as unknown as Word[];
  //   } catch (error) {
  //     console.error("WordService.getWordsByCriteria error:", error);
  //     throw error;
  //   }
  // }
}

export default new WordService();