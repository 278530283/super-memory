// src/lib/services/userWordProgressService.ts
import {
    COLLECTION_USER_WORD_PROGRESS,
    DATABASE_ID
} from '@/src/constants/appwrite';
import { tablesDB } from '@/src/lib/appwrite';
import { UserWordProgress } from '@/src/types/UserWordProgress';
import { ID, Query } from 'appwrite';
  
  class UserWordProgressService {
    // 根据用户ID及wordId查询历史等级列表
    async getHistoryLevels(userId: string, wordId: string): Promise<string[]> {
      try {
        // 获取该用户和单词的所有进度记录
        const response = await tablesDB.listRows({
          databaseId: DATABASE_ID,
          tableId: COLLECTION_USER_WORD_PROGRESS,
          queries: [
            Query.equal('user_id', userId),
            Query.equal('word_id', wordId),
            Query.orderDesc('last_review_time') // 按最近复习时间排序
          ]
        });
        
        // 将当前等级转换为L0, L1等格式并返回
        return response.rows.map(row => 
          `L${(row as unknown as UserWordProgress).current_level}`
        );
      } catch (error) {
        console.error("UserWordProgressService.getHistoryLevels error:", error);
        throw error;
      }
    }
  
    // 根据用户ID及wordId，日期查询userWordProgress
    async getUserWordProgressByDate(
      userId: string, 
      wordId: string, 
      date: string
    ): Promise<UserWordProgress | null> {
      try {
        // 查询指定日期的记录
        const response = await tablesDB.listRows({
          databaseId: DATABASE_ID,
          tableId: COLLECTION_USER_WORD_PROGRESS,
          queries: [
            Query.equal('user_id', userId),
            Query.equal('word_id', wordId),
            Query.greaterThanEqual('last_review_time', `${date}T00:00:00.000Z`),
            Query.lessThanEqual('last_review_time', `${date}T23:59:59.999Z`)
          ]
        });
  
        if (response.rows.length === 0) {
          return null;
        }
  
        return response.rows[0] as unknown as UserWordProgress;
      } catch (error: any) {
        if (error.code === 404) {
          return null;
        }
        console.error("UserWordProgressService.getUserWordProgressByDate error:", error);
        throw error;
      }
    }
  
    // 创建UserWordProgress
    async createUserWordProgress(data: Partial<Omit<UserWordProgress, '$id'>>): Promise<UserWordProgress> {
      try {
        const response = await tablesDB.createRow({
          databaseId: DATABASE_ID,
          tableId: COLLECTION_USER_WORD_PROGRESS,
          rowId: ID.unique(),
          data: data
        });
        
        return response as unknown as UserWordProgress;
      } catch (error) {
        console.error("UserWordProgressService.createUserWordProgress error:", error);
        throw error;
      }
    }
  
    // 更新UserWordProgress
    async updateUserWordProgress(
      progressId: string, 
      data: Partial<Omit<UserWordProgress, '$id' | 'user_id' | 'word_id'>>
    ): Promise<UserWordProgress> {
      try {
        const response = await tablesDB.updateRow({
          databaseId: DATABASE_ID,
          tableId: COLLECTION_USER_WORD_PROGRESS,
          rowId: progressId,
          data: {
            ...data,
            // 确保布尔值转换为数字（如果数据库需要）
            is_long_difficult: data.is_long_difficult !== undefined 
              ? (data.is_long_difficult ? 1 : 0) 
              : undefined
          }
        });
        
        return response as unknown as UserWordProgress;
      } catch (error) {
        console.error("UserWordProgressService.updateUserWordProgress error:", error);
        throw error;
      }
    }
  
    // 辅助方法：根据用户ID和单词ID获取进度记录
    async getProgressByUserAndWord(
      userId: string, 
      wordId: string
    ): Promise<UserWordProgress | null> {
      try {
        const response = await tablesDB.listRows({
          databaseId: DATABASE_ID,
          tableId: COLLECTION_USER_WORD_PROGRESS,
          queries: [
            Query.equal('user_id', userId),
            Query.equal('word_id', wordId)
          ]
        });
  
        if (response.rows.length === 0) {
          return null;
        }
  
        return response.rows[0] as unknown as UserWordProgress;
      } catch (error: any) {
        if (error.code === 404) {
          return null;
        }
        console.error("UserWordProgressService.getProgressByUserAndWord error:", error);
        throw error;
      }
    }
  }
  
  export default new UserWordProgressService();