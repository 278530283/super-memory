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

  

  /**
   * 生成指定单词的随机错误选项
   * @param wordId 目标单词的 ID
   * @param optionType 选项类型: 'en' 表示英文拼写, 'ch' 表示中文翻译
   * @param count 所需错误选项的数量
   * @returns Promise<string[]> 包含错误选项的字符串数组
   */
  async generateRandomFalseOptions(wordId: string, optionType: 'en' | 'ch', count: number): Promise<string[]> {
    try {
      if (count <= 0) {
        return [];
      }

      // 2a. 查询除目标 wordId 外的单词 (限制数量以提高效率，例如 100 个)
      //     实际应用中可能需要更复杂的随机逻辑或分页
      const response = await tablesDB.listRows({
        databaseId: DATABASE_ID,
        tableId: COLLECTION_WORDS, // 使用单词表
        queries: [
          Query.notEqual('$id', wordId), // 排除目标单词
          Query.limit(Math.max(count * 3, 50)), // 获取比需要的多一些，以增加随机性
        ]
      });

      const allOtherWordsData = response.rows as unknown as Word[]; // 假设返回的就是 Word 类型

      if (allOtherWordsData.length === 0) {
        console.warn(`[UserWordService] No other words found to generate false options for wordId: ${wordId}`);
        return [];
      }

      // 2b. 随机打乱并选择前 count 个
      const shuffledWords = allOtherWordsData.sort(() => 0.5 - Math.random());
      const selectedWords = shuffledWords.slice(0, count);

      // 3. 根据 optionType 提取拼写或翻译
      const falseOptions: string[] = selectedWords.map(word => {
        if (optionType === 'en') {
          return word.spelling; // 英文拼写
        } else {
          return word.chinese_meaning; // 中文翻译
        }
      }).filter(option => option && option.trim() !== ''); // 过滤掉空值

      // 4. 如果过滤后数量不足，可能需要处理（这里简单返回已有的）
      if (falseOptions.length < count) {
         console.warn(`[UserWordService] Only generated ${falseOptions.length} false options out of requested ${count} for wordId: ${wordId}`);
      }

      // 5. 再次随机打乱结果并返回所需数量
      const finalShuffledOptions = falseOptions.sort(() => 0.5 - Math.random());
      return finalShuffledOptions.slice(0, count);

    } catch (error: any) {
      console.error(`[UserWordService] generateRandomFalseOptions error for wordId ${wordId}, type ${optionType}, count ${count}:`, error);
      // 根据你的错误处理策略，可以选择返回空数组或抛出错误
      // 这里选择返回空数组，让调用方决定如何处理
      return [];
      // 或者 throw error;
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