// src/lib/services/DataReportService.ts
import {
    COLLECTION_USER_WORD_PROGRESS,
    COLLECTION_USER_WORD_TEST_HISTORY,
    COLLECTION_WORDS,
    DATABASE_ID
} from '@/src/constants/appwrite';
import { tablesDB } from '@/src/lib/appwrite';
import { UserWordProgress } from '@/src/types/UserWordProgress';
import { UserWordTestHistory } from '@/src/types/UserWordTestHistory';
import { Query } from 'appwrite';

// 单词难度等级枚举 - 与数据库中的数值对应
export enum WordDifficultyLevel {
  EASY = 1,      // 简单
  NORMAL = 2,    // 正常  
  DIFFICULT = 3  // 困难
}

// 单词报告项接口
export interface WordReportItem {
  wordId: string;
  spelling: string;
  meaning: string;
  difficultyLevel: WordDifficultyLevel; // 单词等级：简单/正常/困难
  currentProficiency: number; // 当前熟练度等级 0-4
  isLongDifficult: boolean; // 是否为长期困难词
  startDate?: string; // 开始学习日期
  lastReviewDate?: string; // 最后复习日期
  reviewedTimes?: number; // 复习次数
  nextReviewDate?: string; // 下次复习日期
  testHistory: {
    testDate: string;
    testLevel: number;
    phase: number;
  }[]; // 全部评级历史
}

// 分页响应接口
export interface PaginatedWordReport {
  items: WordReportItem[];
  total: number;
  page: number;
  limit: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

class DataReportService {
  /**
   * 获取用户已学习的单词报告数据（分页）
   * @param userId 用户ID
   * @param page 页码，从1开始
   * @param limit 每页数量
   * @returns 分页的单词报告数据
   */
  async getUserWordReport(
    userId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<PaginatedWordReport> {
    try {
      // 计算偏移量
      const offset = (page - 1) * limit;

      // 1. 获取用户的所有单词进度记录（分页）
      const progressResponse = await tablesDB.listRows({
        databaseId: DATABASE_ID,
        tableId: COLLECTION_USER_WORD_PROGRESS,
        queries: [
          Query.equal('user_id', userId),
          Query.orderDesc('last_review_date'), // 按最后复习日期降序排列
          Query.offset(offset),
          Query.limit(limit)
        ]
      });

      const progressList = progressResponse.rows as unknown as UserWordProgress[];
      const total = progressResponse.total;

      // 2. 如果没有进度记录，返回空结果
      if (progressList.length === 0) {
        return {
          items: [],
          total: 0,
          page,
          limit,
          hasNextPage: false,
          hasPrevPage: page > 1
        };
      }

      // 3. 批量获取单词信息和测试历史
      const reportItems = await Promise.all(
        progressList.map(progress => this.buildWordReportItem(userId, progress))
      );

      // 4. 返回分页结果
      return {
        items: reportItems,
        total,
        page,
        limit,
        hasNextPage: (page * limit) < total,
        hasPrevPage: page > 1
      };
    } catch (error) {
      console.error('DataReportService.getUserWordReport error:', error);
      throw error;
    }
  }

  /**
   * 构建单个单词的报告项
   */
  private async buildWordReportItem(
    userId: string, 
    progress: UserWordProgress
  ): Promise<WordReportItem> {
    // 1. 获取单词基本信息
    const wordInfo = await this.getWordInfo(progress.word_id);
    
    // 2. 获取单词的测试历史
    const testHistory = await this.getWordTestHistory(userId, progress.word_id);

    // 3. 直接从 UserWordProgress 获取单词难度等级
    const difficultyLevel = this.getDifficultyLevelFromProgress(progress);

    return {
      wordId: progress.word_id,
      spelling: wordInfo.spelling,
      meaning: wordInfo.meaning,
      difficultyLevel,
      currentProficiency: progress.proficiency_level,
      isLongDifficult: progress.is_long_difficult,
      startDate: progress.start_date || undefined,
      lastReviewDate: progress.last_review_date || undefined,
      reviewedTimes: progress.reviewed_times || 0,
      nextReviewDate: progress.next_review_date || undefined,
      testHistory: testHistory.map(history => ({
        testDate: history.test_date,
        testLevel: history.test_level,
        phase: history.phase
      }))
    };
  }

  /**
   * 从 UserWordProgress 获取单词难度等级
   */
  private getDifficultyLevelFromProgress(progress: UserWordProgress): WordDifficultyLevel {
    // 如果 Word_difficulty 为 null 或 undefined，默认返回 NORMAL
    if (progress.Word_difficulty === null || progress.Word_difficulty === undefined) {
      return WordDifficultyLevel.NORMAL;
    }
    
    // 确保数值在有效范围内，否则返回默认值
    const difficulty = progress.Word_difficulty;
    if (difficulty >= WordDifficultyLevel.EASY && difficulty <= WordDifficultyLevel.DIFFICULT) {
      return difficulty as WordDifficultyLevel;
    }
    
    return WordDifficultyLevel.NORMAL;
  }

  /**
   * 获取单词基本信息
   */
  private async getWordInfo(wordId: string): Promise<{ spelling: string; meaning: string }> {
    try {
      const response = await tablesDB.getRow({
        databaseId: DATABASE_ID,
        tableId: COLLECTION_WORDS,
        rowId: wordId
      });

      // 假设单词表有 spelling 和 meaning 字段
      return {
        spelling: response.spelling as string,
        meaning: response.meaning as string
      };
    } catch (error) {
      console.error(`DataReportService.getWordInfo error for word ${wordId}:`, error);
      // 如果获取失败，返回默认值
      return {
        spelling: 'Unknown',
        meaning: '未知'
      };
    }
  }

  /**
   * 获取单词的测试历史
   */
  private async getWordTestHistory(
    userId: string, 
    wordId: string
  ): Promise<UserWordTestHistory[]> {
    try {
      const response = await tablesDB.listRows({
        databaseId: DATABASE_ID,
        tableId: COLLECTION_USER_WORD_TEST_HISTORY,
        queries: [
          Query.equal('user_id', userId),
          Query.equal('word_id', wordId),
          Query.orderDesc('test_date') // 按测试日期降序排列
        ]
      });

      return response.rows as unknown as UserWordTestHistory[];
    } catch (error) {
      console.error(`DataReportService.getWordTestHistory error for word ${wordId}:`, error);
      return [];
    }
  }

  /**
   * 根据难度等级筛选单词报告
   */
  async getUserWordReportByDifficulty(
    userId: string,
    difficultyLevel: WordDifficultyLevel,
    page: number = 1,
    limit: number = 20
  ): Promise<PaginatedWordReport> {
    try {
      // 直接查询指定难度等级的记录
      const progressResponse = await tablesDB.listRows({
        databaseId: DATABASE_ID,
        tableId: COLLECTION_USER_WORD_PROGRESS,
        queries: [
          Query.equal('user_id', userId),
          Query.equal('Word_difficulty', difficultyLevel),
          Query.orderDesc('last_review_date'),
          Query.offset((page - 1) * limit),
          Query.limit(limit)
        ]
      });

      const progressList = progressResponse.rows as unknown as UserWordProgress[];
      const total = progressResponse.total;

      // 构建报告项
      const reportItems = await Promise.all(
        progressList.map(progress => this.buildWordReportItem(userId, progress))
      );

      return {
        items: reportItems,
        total,
        page,
        limit,
        hasNextPage: (page * limit) < total,
        hasPrevPage: page > 1
      };
    } catch (error) {
      console.error('DataReportService.getUserWordReportByDifficulty error:', error);
      throw error;
    }
  }

  /**
   * 获取用户学习统计信息
   */
  async getUserLearningStats(userId: string): Promise<{
    totalLearned: number;
    easyCount: number;
    normalCount: number;
    difficultCount: number;
    longDifficultCount: number;
    averageProficiency: number;
  }> {
    try {
      const allProgressResponse = await tablesDB.listRows({
        databaseId: DATABASE_ID,
        tableId: COLLECTION_USER_WORD_PROGRESS,
        queries: [
          Query.equal('user_id', userId)
        ]
      });

      const allProgress = allProgressResponse.rows as unknown as UserWordProgress[];
      
      let easyCount = 0;
      let normalCount = 0;
      let difficultCount = 0;
      let longDifficultCount = 0;
      let totalProficiency = 0;

      allProgress.forEach(progress => {
        const difficulty = this.getDifficultyLevelFromProgress(progress);
        
        switch (difficulty) {
          case WordDifficultyLevel.EASY:
            easyCount++;
            break;
          case WordDifficultyLevel.NORMAL:
            normalCount++;
            break;
          case WordDifficultyLevel.DIFFICULT:
            difficultCount++;
            break;
        }

        if (progress.is_long_difficult) {
          longDifficultCount++;
        }

        totalProficiency += progress.proficiency_level;
      });

      return {
        totalLearned: allProgress.length,
        easyCount,
        normalCount,
        difficultCount,
        longDifficultCount,
        averageProficiency: allProgress.length > 0 ? totalProficiency / allProgress.length : 0
      };
    } catch (error) {
      console.error('DataReportService.getUserLearningStats error:', error);
      throw error;
    }
  }

  /**
   * 获取难度等级的名称（用于显示）
   */
  getDifficultyLevelName(level: WordDifficultyLevel): string {
    switch (level) {
      case WordDifficultyLevel.EASY:
        return '简单';
      case WordDifficultyLevel.NORMAL:
        return '正常';
      case WordDifficultyLevel.DIFFICULT:
        return '困难';
      default:
        return '未知';
    }
  }

  /**
   * 获取难度等级的描述（用于显示）
   */
  getDifficultyLevelDescription(level: WordDifficultyLevel): string {
    switch (level) {
      case WordDifficultyLevel.EASY:
        return '易学单词';
      case WordDifficultyLevel.NORMAL:
        return '正常难度单词';
      case WordDifficultyLevel.DIFFICULT:
        return '困难单词';
      default:
        return '未知难度';
    }
  }
}

export default new DataReportService();