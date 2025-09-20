// src/lib/services/UserWordService.ts
import {
  COLLECTION_USER_WORD_PROGRESS,
  COLLECTION_USER_WORD_TEST_HISTORY,
  DATABASE_ID
} from '@/src/constants/appwrite';
import { tablesDB } from '@/src/lib/appwrite';
import { UserWordProgress } from '@/src/types/UserWordProgress';
import { CreateUserWordTestHistory, UpdateUserWordTestHistory, UserWordTestHistory } from '@/src/types/UserWordTestHistory';
import { ID, Query } from 'appwrite';

class UserWordService {
  // 根据用户ID及wordId查询历史等级列表
  async getHistoryLevels(userId: string, wordId: string): Promise<number[]> {
    try {
      // 获取该用户和单词的所有进度记录
      const response = await tablesDB.listRows({
        databaseId: DATABASE_ID,
        tableId: COLLECTION_USER_WORD_TEST_HISTORY,
        queries: [
          Query.equal('user_id', userId),
          Query.equal('word_id', wordId),
          Query.orderAsc('test_date') // 按测评时间排序
        ]
      });
      
      // 将当前等级返回
      return response.rows.map(row => 
        (row as unknown as UserWordTestHistory).test_level
      );
    } catch (error) {
      console.error("UserWordService.getHistoryLevels error:", error);
      throw error;
    }
  }

  // 根据用户ID及wordId，日期查询userWordTestHistory
  async getUserWordTestHistory(
    userId: string, 
    wordId: string,
    phase: number,
    testDate: string
  ): Promise<UserWordTestHistory | null> {
    try {
      // 查询指定日期的记录
      const response = await tablesDB.listRows({
        databaseId: DATABASE_ID,
        tableId: COLLECTION_USER_WORD_TEST_HISTORY,
        queries: [
          Query.equal('user_id', userId),
          Query.equal('word_id', wordId),
          Query.equal('phase', phase),
          Query.equal('test_date', testDate)
        ]
      });

      if (response.rows.length === 0) {
        return null;
      }

      return response.rows[0] as unknown as UserWordTestHistory;
    } catch (error: any) {
      if (error.code === 404) {
        return null;
      }
      console.error("UserWordService.getUserWordTestHistory error:", error);
      throw error;
    }
  }

  // 创建UserWordTestHistory
  async createUserWordTestHistory(data: CreateUserWordTestHistory): Promise<UserWordTestHistory> {
    try {
      const response = await tablesDB.createRow({
        databaseId: DATABASE_ID,
        tableId: COLLECTION_USER_WORD_TEST_HISTORY,
        rowId: ID.unique(),
        data: data
      });
      
      return response as unknown as UserWordTestHistory;
    } catch (error) {
      console.error("UserWordService.createUserWordTestHistory error:", error);
      throw error;
    }
  }

  // 更新UserWordTestHistory
  async updateUserWordTestHistory(
    historyId: string, 
    data: UpdateUserWordTestHistory
  ): Promise<UserWordTestHistory> {
    try {
      const response = await tablesDB.updateRow({
        databaseId: DATABASE_ID,
        tableId: COLLECTION_USER_WORD_TEST_HISTORY,
        rowId: historyId,
        data: data
      });
      
      return response as unknown as UserWordTestHistory;
    } catch (error) {
      console.error("UserWordService.updateUserWordTestHistory error:", error);
      throw error;
    }
  }

  // 创建或更新UserWordTestHistory（根据唯一约束）
  async upsertUserWordTestHistory(data: CreateUserWordTestHistory): Promise<UserWordTestHistory> {
    try {
      // 首先尝试查找现有记录
      const existingRecord = await this.getUserWordTestHistory(
        data.user_id,
        data.word_id,
        data.phase,
        data.test_date
      );

      if (existingRecord) {
        // 如果记录已存在，则更新
        return await this.updateUserWordTestHistory(existingRecord.$id, {
          test_level: data.test_level
        });
      } else {
        // 如果记录不存在，则创建
        return await this.createUserWordTestHistory(data);
      }
    } catch (error) {
      console.error("UserWordService.upsertUserWordTestHistory error:", error);
      throw error;
    }
  }

  // 获取用户在某一天的所有测试历史记录
  async getUserTestHistoryByDate(
    userId: string,
    testDate: string
  ): Promise<UserWordTestHistory[]> {
    try {
      const response = await tablesDB.listRows({
        databaseId: DATABASE_ID,
        tableId: COLLECTION_USER_WORD_TEST_HISTORY,
        queries: [
          Query.equal('user_id', userId),
          Query.equal('test_date', testDate),
          Query.orderAsc('word_id')
        ]
      });

      return response.rows as unknown as UserWordTestHistory[];
    } catch (error) {
      console.error("UserWordService.getUserTestHistoryByDate error:", error);
      throw error;
    }
  }

  // 获取用户在某一天特定阶段的测试历史记录
  async getUserTestHistoryByDateAndPhase(
    userId: string,
    testDate: string,
    phase: number
  ): Promise<UserWordTestHistory[]> {
    try {
      const response = await tablesDB.listRows({
        databaseId: DATABASE_ID,
        tableId: COLLECTION_USER_WORD_TEST_HISTORY,
        queries: [
          Query.equal('user_id', userId),
          Query.equal('test_date', testDate),
          Query.equal('phase', phase),
          Query.orderAsc('word_id')
        ]
      });

      return response.rows as unknown as UserWordTestHistory[];
    } catch (error) {
      console.error("UserWordService.getUserTestHistoryByDateAndPhase error:", error);
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
      console.error("UserWordService.createUserWordProgress error:", error);
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
        data: data
      });
      
      return response as unknown as UserWordProgress;
    } catch (error) {
      console.error("UserWordService.updateUserWordProgress error:", error);
      throw error;
    }
  }
}

export default new UserWordService();