// src/lib/services/UserWordService.ts
import {
  COLLECTION_USER_WORD_PROGRESS,
  COLLECTION_USER_WORD_TEST_HISTORY,
  DATABASE_ID
} from '@/src/constants/appwrite';
import { tablesDB } from '@/src/lib/appwrite';
import { CreateUserWordProgress, UserWordProgress } from '@/src/types/UserWordProgress';
import { CreateUserWordTestHistory, UpdateUserWordTestHistory, UserWordTestHistory } from '@/src/types/UserWordTestHistory';
import { ID, Query } from 'appwrite';
import ReviewStrategyService from './ReviewStrategyService';

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
          Query.equal('phase', 1), // 仅查询 phase 1 的记录
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

  /**
   * 根据 user_id 和 word_id 获取 UserWordProgress 记录
   * @param userId 用户 ID
   * @param wordId 单词 ID
   * @returns Promise<UserWordProgress | null>
   */
  async getUserWordProgressByUserAndWord(userId: string, wordId: string): Promise<UserWordProgress | null> {
    try {
      const response = await tablesDB.listRows({
        databaseId: DATABASE_ID,
        tableId: COLLECTION_USER_WORD_PROGRESS,
        queries: [
          Query.equal('user_id', userId),
          Query.equal('word_id', wordId),
          Query.limit(1) // 只需要一条记录
        ]
      });

      if (response.rows.length === 0) {
        return null;
      }
      return response.rows[0] as unknown as UserWordProgress;
    } catch (error: any) {
      // 如果是 404 错误，也视为未找到
      if (error.code === 404) {
        return null;
      }
      console.error("UserWordService.getUserWordProgressByUserAndWord error:", error);
      throw error;
    }
  }

  /**
   * 创建或更新 UserWordProgress (upsert)
   * 如果存在 user_id 和 word_id 相同的记录，则更新；否则创建新记录。
   * @param data 要创建或更新的数据 (不包含 $id)
   * @returns Promise<UserWordProgress>
   */
  async upsertUserWordProgress(data: CreateUserWordProgress, strategyType: number, spelling: string): Promise<UserWordProgress> { // 注意：这里假设 CreateUserWordProgress 不包含 $id
    try {
      console.log("[UserWordService] Upserting user word progress...", data);
      // 1. 尝试查找现有记录 (基于 user_id 和 word_id)
      const existingRecord = await this.getUserWordProgressByUserAndWord(data.user_id!, data.word_id!);
      const reviewDate = new Date().toISOString();

      if (existingRecord) {
        const dataWithReviewInfo = await ReviewStrategyService.calculateReviewProgress(existingRecord, data.proficiency_level!, reviewDate, strategyType, spelling);
        if (dataWithReviewInfo == null) {
          console.log("[UserWordService] No need to update review info.");
          return existingRecord;
        }
        // 2a. 如果记录已存在，则更新 (排除 user_id 和 word_id，因为它们通常是不变的主键部分)
        const updateData = { ...data,...dataWithReviewInfo };

        console.log(`[UserWordService] Updating existing progress for user ${data.user_id}, word ${data.word_id}`);
        return await this.updateUserWordProgress(existingRecord.$id, updateData);
      } else {
        // 2b. 如果记录不存在，则创建
        console.log(`[UserWordService] Creating new progress for user ${data.user_id}, word ${data.word_id}`);
        const dataWithReviewInfo = await ReviewStrategyService.calculateReviewProgress(data, data.proficiency_level!, reviewDate, strategyType, spelling);
        console.log("[UserWordService] data with review info:", dataWithReviewInfo);
        const insertData = { ...data,...dataWithReviewInfo };
        console.log("[UserWordService] insert data:", insertData);
        return await this.createUserWordProgress(insertData);
      }
    } catch (error) {
      console.error("UserWordService.upsertUserWordProgress error:", error);
      throw error;
    }
  }

  /**
   * 根据用户ID和查询时间，获取需要复习的单词ID
   * 查询条件：next_review_date <= queryTime 的记录
   * @param userId 用户ID
   * @param queryTime 查询时间（ISO字符串）
   * @param limit 限制返回数量，默认100
   * @returns Promise<string[]> 单词ID数组
   */
  async getWordIdsForReview(
    userId: string, 
    queryTime: string, 
    limit: number = 100
  ): Promise<string[]> {
    try {
      const response = await tablesDB.listRows({
        databaseId: DATABASE_ID,
        tableId: COLLECTION_USER_WORD_PROGRESS,
        queries: [
          Query.equal('user_id', userId),
          Query.lessThanEqual('next_review_date', queryTime),
          Query.orderAsc('next_review_date'), // 按下次复习时间升序排序（最早的需要先复习）
          Query.select(['word_id']), // 只选择 word_id 字段，提高查询性能
          Query.limit(limit)
        ]
      });

      // 提取并返回 word_id 数组
      return response.rows.map(row => row.word_id as string);
    } catch (error) {
      console.error("UserWordService.getUserWordProgressForReview error:", error);
      throw error;
    }
  }

  /**
   * 查询用户所有复习过的单词，只返回单词ID (word_id)
   * @param userId 用户ID
   * @returns Promise<string[]> 单词ID数组
   */
  async getReviewedWordIds(userId: string): Promise<string[]> {
    try {
      const response = await tablesDB.listRows({
        databaseId: DATABASE_ID,
        tableId: COLLECTION_USER_WORD_PROGRESS,
        queries: [
          Query.equal('user_id', userId),
          Query.select(['word_id']) // 只选择 word_id 字段，提高查询性能
        ]
      });

      // 提取并返回 word_id 数组
      return response.rows.map(row => row.word_id as string);
    } catch (error) {
      console.error("UserWordService.getUserReviewedWordIds error:", error);
      throw error;
    }
  }
  
}

export default new UserWordService();