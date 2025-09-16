// src/lib/services/wordService.ts
import { COLLECTION_WORDS, DATABASE_ID } from '@/src/constants/appwrite';
import { tablesDB } from '@/src/lib/appwrite';
import { Word } from '@/src/types/Word';
import { Query } from 'appwrite';

class WordService {
  async getWordById(wordId: string): Promise<Word | null> {
    try {
      const word = await tablesDB.getRow({databaseId:DATABASE_ID, tableId:COLLECTION_WORDS, rowId:wordId});
      return word as unknown as Word;
    } catch (error: any) {
      if (error.code === 404) {
        return null;
      }
      console.error("WordService.getWordById error:", error);
      throw error;
    }
  }

  async getWordsByIds(wordIds: string[]): Promise<Word[]> {
    if (wordIds.length === 0) return [];
    try {
      // Appwrite Query.equal with array checks if the field value is IN the array
      const response = await tablesDB.listRows({databaseId:DATABASE_ID, tableId:COLLECTION_WORDS, queries:[
        Query.equal('$id', wordIds)
      ]});
      return response.rows as unknown as Word[];
    } catch (error) {
      console.error("WordService.getWordsByIds error:", error);
      throw error;
    }
  }

  async getWordsBySpellings(spellingIds: string[]): Promise<Word[]> {
    if (spellingIds.length === 0) return [];
    try {
      // Appwrite Query.equal with array checks if the field value is IN the array
      const response = await tablesDB.listRows({databaseId:DATABASE_ID, tableId:COLLECTION_WORDS, queries:[
        Query.equal('spelling', spellingIds)
      ]});
      return response.rows as unknown as Word[];
    } catch (error) {
      console.error("WordService.getWordsByIds error:", error);
      throw error;
    }
  }

  // Example: Get words by difficulty level (if needed for learning list generation)
  // async getWordsByDifficulty(difficultyLevel: number, limit: number = 10): Promise<Word[]> {
  //   try {
  //     const response = await databases.listDocuments(DATABASE_ID, COLLECTION_WORDS, [
  //       Query.equal('difficulty_level', difficultyLevel),
  //       Query.limit(limit)
  //     ]);
  //     return response.documents as unknown as Word[];
  //   } catch (error) {
  //     console.error("WordService.getWordsByDifficulty error:", error);
  //     throw error;
  //   }
  // }
}

export default new WordService();