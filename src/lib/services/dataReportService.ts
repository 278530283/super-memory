import wordService from '@/src/lib/services/wordService';
// src/lib/services/dataReportService.ts
import {
  COLLECTION_USER_WORD_PROGRESS,
  COLLECTION_USER_WORD_TEST_HISTORY,
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
  reviewTimeAgo?: string; //
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

// 本周成就接口
export interface WeeklyAchievements {
  learningDays: number; // 本周学习天数
  learnedWords: number; // 本周学习单词数
}

class dataReportService {
   /**
   * 获取复习时间间隔描述（相对于当前时间）
   * @param dateString 日期字符串，格式为 "2025/11/23"
   * @returns 时间间隔描述，如 "今天", "昨天", "3天前", "1周前", "11/23"
   */
  getReviewTimeAgo(dateString?: string): string {
    if (!dateString) return '未评级';
    
    const reviewDate = this.parseReviewDate(dateString);
    if (!reviewDate) return '日期错误';
    
    try {
      const now = new Date();
      
      // 重置时间为0，只比较日期部分
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const reviewDay = new Date(reviewDate.getFullYear(), reviewDate.getMonth(), reviewDate.getDate());
      
      const diffTime = today.getTime() - reviewDay.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) {
        return '今天';
      } else if (diffDays === 1) {
        return '昨天';
      } else if (diffDays <= 7) {
        return `${diffDays}天前`;
      } else if (diffDays <= 30) {
        const weeks = Math.floor(diffDays / 7);
        return `${weeks}周前`;
      } else {
        // 超过一个月显示具体日期（月/日）
        return `${reviewDate.getMonth() + 1}/${reviewDate.getDate()}`;
      }
    } catch (error) {
      console.error('时间计算错误:', error);
      return '日期错误';
    }
  }

  /**
   * 解析 "2025/11/23" 格式的日期
   * @param dateString 日期字符串
   * @returns Date对象或null
   */
  private parseReviewDate(dateString: string): Date | null {
    if (!dateString) return null;
    
    try {
      // 处理 "2025/11/23" 格式
      const [year, month, day] = dateString.split('/').map(Number);
      if (year && month && day) {
        // 月份从0开始，所以减1
        return new Date(year, month - 1, day);
      }
    } catch (error) {
      console.error('日期解析错误:', error);
    }
    return null;
  }

  /**
   * 获取用户本周成就数据
   * @param userId 用户ID
   * @returns 本周成就数据
   */
  async getWeeklyAchievements(userId: string): Promise<WeeklyAchievements> {
    try {
      // 获取本周的日期范围（周一到周日）
      const { startOfWeek, endOfWeek } = this.getCurrentWeekRange();
      
      // 合并查询：一次性获取本周的学习记录，然后计算学习天数和单词数
      const { learningDays, learnedWords } = await this.getWeeklyLearningStats(userId, startOfWeek, endOfWeek);

      return {
        learningDays,
        learnedWords,
      };
    } catch (error) {
      console.error('dataReportService.getWeeklyAchievements error:', error);
      // 返回默认值，避免界面显示错误
      return {
        learningDays: 0,
        learnedWords: 0,
      };
    }
  }

  /**
   * 获取本周的日期范围（周一到周日）
   */
  private getCurrentWeekRange(): { startOfWeek: string; endOfWeek: string } {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = 周日, 1 = 周一, ..., 6 = 周六

    console.log('getCurrentWeekRange:', dayOfWeek);
    
    // 计算本周周一的日期
    const monday = new Date(now);
    console.log('getCurrentWeekRange:', monday);
    monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    monday.setHours(0, 0, 0, 0); // 将时间设为当天零点，确保日期准确性
    
    // 计算本周周日的日期
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    
    return {
      startOfWeek: monday.toLocaleDateString(),
      endOfWeek: sunday.toLocaleDateString()
    };
  }

  /**
   * 获取本周学习统计数据（合并查询）
   */
  private async getWeeklyLearningStats(
    userId: string, 
    startOfWeek: string, 
    endOfWeek: string
  ): Promise<{ learningDays: number; learnedWords: number }> {
    try {
      console.log('getWeeklyLearningStats:', userId, startOfWeek, endOfWeek);
      // 查询本周内的测试记录，一次性获取所有需要的数据
      const response = await tablesDB.listRows({
        databaseId: DATABASE_ID,
        tableId: COLLECTION_USER_WORD_TEST_HISTORY,
        queries: [
          Query.equal('user_id', userId),
          Query.greaterThanEqual('test_date', startOfWeek),
          Query.lessThanEqual('test_date', endOfWeek),
          Query.select(['test_date', 'word_id']), // 只选择需要的字段
          Query.orderAsc('test_date'),
          Query.limit(10000)
        ]
      });

      // 提取不重复的日期和单词ID
      const uniqueDates = new Set<string>();
      const uniqueWordIds = new Set<string>();

      console.log('getWeeklyLearningStats length:', response.rows.length);
      response.rows.forEach((row: any) => {
        const testDate = row.test_date as string;
        const wordId = row.word_id as string;
        
        if (testDate) uniqueDates.add(testDate);
        if (wordId) uniqueWordIds.add(wordId);
      });

      console.log('getWeeklyLearningStats:', uniqueDates.size, uniqueWordIds.size);

      return {
        learningDays: uniqueDates.size,
        learnedWords: uniqueWordIds.size
      };
    } catch (error) {
      console.error('dataReportService.getWeeklyLearningStats error:', error);
      return {
        learningDays: 0,
        learnedWords: 0
      };
    }
  }

  /**
   * 获取用户已学习的单词报告数据（分页）
   * @param userId 用户ID
   * @param page 页码，从1开始
   * @param limit 每页数量
   * @returns 分页的单词报告数据
   */
  async getUserWordReport(
    userId: string,
    difficultyLevel: WordDifficultyLevel | 'all',
    page: number = 1,
    limit: number = 20
  ): Promise<PaginatedWordReport> {
    try {
      // 计算偏移量
      const offset = (page - 1) * limit;

      const queries = [
        Query.equal('user_id', userId),
        Query.orderDesc('last_review_date'), // 按最后复习日期降序排列
        Query.offset(offset),
        Query.limit(limit)
      ];
      if(difficultyLevel !== 'all'){
          if(difficultyLevel === WordDifficultyLevel.NORMAL){
          // 若难度为中等时，需要包括未知数据
          queries.push(Query.or([
            Query.equal('word_difficulty', difficultyLevel),
            Query.isNull('word_difficulty')
          ]));
        }
        else{
          queries.push(Query.equal('word_difficulty', difficultyLevel));
        }
      }

      // 1. 获取用户的所有单词进度记录（分页）
      const progressResponse = await tablesDB.listRows({
        databaseId: DATABASE_ID,
        tableId: COLLECTION_USER_WORD_PROGRESS,
        queries: queries
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

      const wordIds = progressList.map(progress => progress.word_id);
      const wordInfoList = await wordService.getWordsByIds(wordIds, false, false);

      // 3. 使用 progressList 构造报告项，并通过索引直接获取单词信息
      const reportItems = progressList.map((progress, index) => {
        const wordInfo = wordInfoList[index];

        return {
          wordId: progress.word_id,
          spelling: wordInfo?.spelling || '',
          meaning: wordInfo?.meaning || '',
          difficultyLevel: this.getDifficultyLevelFromProgress(progress),
          currentProficiency: progress.proficiency_level,
          isLongDifficult: progress.is_long_difficult,
          startDate: progress.start_date || undefined,
          lastReviewDate: progress.last_review_date || undefined,
          reviewTimeAgo: progress.last_review_date ? this.getReviewTimeAgo(progress.last_review_date) : undefined,
          reviewedTimes: progress.reviewed_times || 0,
          nextReviewDate: progress.next_review_date || undefined,
          testHistory: []
        };
      });

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
      console.error('dataReportService.getUserWordReport error:', error);
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
    const wordInfo = await wordService.getWordById(progress.word_id, false, false);
    
    // 2. 获取单词的测试历史
    const testHistory = await this.getWordTestHistory(userId, progress.word_id);

    // 3. 直接从 UserWordProgress 获取单词难度等级
    const difficultyLevel = this.getDifficultyLevelFromProgress(progress);

    return {
      wordId: progress.word_id,
      spelling: wordInfo?.spelling || '',
      meaning: wordInfo?.meaning || '',
      difficultyLevel,
      currentProficiency: progress.proficiency_level,
      isLongDifficult: progress.is_long_difficult,
      startDate: progress.start_date || undefined,
      lastReviewDate: progress.last_review_date || undefined,
      reviewTimeAgo: progress.last_review_date ? this.getReviewTimeAgo(progress.last_review_date) : undefined,
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
    // 如果 word_difficulty 为 null 或 undefined，默认返回 NORMAL
    if (progress.word_difficulty === null || progress.word_difficulty === undefined) {
      return WordDifficultyLevel.NORMAL;
    }
    
    // 确保数值在有效范围内，否则返回默认值
    const difficulty = progress.word_difficulty;
    if (difficulty >= WordDifficultyLevel.EASY && difficulty <= WordDifficultyLevel.DIFFICULT) {
      return difficulty as WordDifficultyLevel;
    }
    
    return WordDifficultyLevel.NORMAL;
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
          Query.equal('phase', 1),
          Query.orderAsc('test_date') // 按测试日期降序排列
        ]
      });

      return response.rows as unknown as UserWordTestHistory[];
    } catch (error) {
      console.error(`dataReportService.getWordTestHistory error for word ${wordId}:`, error);
      return [];
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
      console.error('dataReportService.getUserLearningStats error:', error);
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
        return '中等';
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

  /**
 * 获取单词的详细历史数据
 */
  async getWordHistoryDetails(
    userId: string, 
    wordId: string
  ): Promise<{
    wordInfo: WordReportItem;
    history: {
      date: string;
      proficiency: number;
      testLevel: number;
      phase: number;
    }[];
  }> {
    try {

      const userWordProgress = await this.getUserWordProgress(userId, wordId);
      if (!userWordProgress) {
        throw new Error('用户没有该单词的进度信息');
      }
      // 获取单词基本信息
      const wordInfo = await this.buildWordReportItem(
        userId, 
        userWordProgress
      );

      // 获取测试历史并按日期排序
      const testHistory = await this.getWordTestHistory(userId, wordId);
      const sortedHistory = testHistory
        .map(history => ({
          date: history.test_date,
          proficiency: history.test_level, // 或者根据你的数据结构调整
          testLevel: history.test_level,
          phase: history.phase
        }));

      return {
        wordInfo,
        history: sortedHistory
      };
    } catch (error) {
      console.error('dataReportService.getWordHistoryDetails error:', error);
      throw error;
    }
  }

  /**
   * 获取单词的详细历史数据
   */
  async getUserWordProgress(userId: string, wordId: string): Promise<UserWordProgress | null> {
    try {
      const progressResponse = await tablesDB.listRows({
        databaseId: DATABASE_ID,
        tableId: COLLECTION_USER_WORD_PROGRESS,
        queries: [
          Query.equal('user_id', userId),
          Query.equal('word_id', wordId)
        ]
      });

      const progressList = progressResponse.rows as unknown as UserWordProgress[];
      return progressList.length > 0 ? progressList[0] : null;
    }
    catch (error) {
      console.error('dataReportService.getUserWordProgress error:', error);
      throw error;
    }
  }
}

export default new dataReportService();