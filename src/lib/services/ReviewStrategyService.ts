// src/lib/services/ReviewStrategyService.ts
import { COLLECTION_REVIEW_STRATEGY, DATABASE_ID } from '@/src/constants/appwrite';
import { tablesDB } from '@/src/lib/appwrite';
import { ReviewStrategy, STRATEGY_IDS } from '@/src/types/ReviewStrategy';
import { CreateUserWordProgress } from '@/src/types/UserWordProgress';

class ReviewStrategyService {
  
  /**
   * 根据策略ID获取复习策略
   * @param strategyId 策略ID
   * @returns Promise<ReviewStrategy | null>
   */
  async getReviewStrategyById(strategyId: string): Promise<ReviewStrategy | null> {
    try {
      const response = await tablesDB.getRow({
        databaseId: DATABASE_ID,
        tableId: COLLECTION_REVIEW_STRATEGY,
        rowId: strategyId,
      });

      return response as unknown as ReviewStrategy;
    } catch (error) {
      console.error("ReviewStrategyService.getReviewStrategyById error:", error);
      throw error;
    }
  }

  /**
   * 根据掌握等级和是否长难词返回复习策略ID
   * @param proficiencyLevel 掌握等级 (0-4)
   * @param isLongDifficult 是否长难词
   * @returns 策略ID
   */
  getReviewStrategyId(proficiencyLevel: number, isLongDifficult: boolean): string {
    // 1. 对于初始评估为L0级别的，且属于长难单词的，采用密集策略
    if (proficiencyLevel === 0 && isLongDifficult) {
      return STRATEGY_IDS.DENSE; // 1
    }
    
    // 2. 对于初始评估为L0级别的短单词，或者对于初始评估为L1L2级别的，且属于长难单词的，采用正常策略
    if ((proficiencyLevel === 0 && !isLongDifficult) || 
        ((proficiencyLevel === 1 || proficiencyLevel === 2) && isLongDifficult)) {
      return STRATEGY_IDS.NORMAL; // 2
    }
    
    // 3. 对于初始评估为L3级别的且属于长难单词的，采用稀疏策略
    if (proficiencyLevel === 3 && isLongDifficult) {
      return STRATEGY_IDS.SPARSE; // 3
    }
    
    // 默认情况：其他组合使用正常策略
    return STRATEGY_IDS.NORMAL; // 2
  }

  /**
   * 计算复习后的单词进度
   * @param userWordProgress 用户单词进度
   * @param proficiencyLevel 新的掌握等级
   * @param reviewDate 复习日期 (ISO字符串)
   * @returns 更新后的用户单词进度 或 null(无需更新)
   */
  async calculateReviewProgress(
    userWordProgress: CreateUserWordProgress,
    proficiencyLevel: number,
    reviewDate: string
  ): Promise<CreateUserWordProgress | null> {
    
    console.log("[ReviewStrategyService] calculateReviewProgress:", userWordProgress, proficiencyLevel, reviewDate);
    // 1. 若last_review_date和reviewDate是同一天(年月日相同即可)，表示已经复习过了，返回null
    if (userWordProgress.last_review_date && userWordProgress.last_review_date.slice(0, 10) === reviewDate.slice(0, 10)) {
      console.log("[ReviewStrategyService] Already reviewed today, no need to update.");
      return null;
    }

    const updatedProgress = { ...userWordProgress };
    
    if(userWordProgress.start_date == null){
      // 首次复习
      console.log("[ReviewStrategyService] First review:", userWordProgress);
      const strategyId = this.getReviewStrategyId(userWordProgress.proficiency_level!, userWordProgress.is_long_difficult!);
      updatedProgress.strategy_id = strategyId;
      updatedProgress.start_date = reviewDate;
      updatedProgress.last_review_date = reviewDate;
      updatedProgress.reviewed_times = 0;
      
      // 计算下次复习日期
      updatedProgress.next_review_date = await this.calculateNextReviewDate(
        updatedProgress.strategy_id!,
        reviewDate,
        0
      );
    }
    else {
      const dayCount = Math.floor((new Date(reviewDate).getTime() - new Date(userWordProgress.start_date!).getTime()) / (1000 * 60 * 60 * 24));
      if (proficiencyLevel === 0 && userWordProgress.proficiency_level === 3 && dayCount >= 90) {
        // 策略降级
        console.log("[ReviewStrategyService] Strategy downgrade:", userWordProgress);
        if (updatedProgress.strategy_id === STRATEGY_IDS.DENSE) {
          updatedProgress.strategy_id = STRATEGY_IDS.NORMAL; // 密集 -> 正常
        } else if (updatedProgress.strategy_id === STRATEGY_IDS.NORMAL) {
          updatedProgress.strategy_id = STRATEGY_IDS.SPARSE; // 正常 -> 稀疏
        }
      }
      if(proficiencyLevel === 0){
        // 重置学习进度
        updatedProgress.start_date = reviewDate;
        updatedProgress.reviewed_times = 0;
      }
      else{
        // 3. 正常复习流程
        updatedProgress.reviewed_times! += 1;
      }
      // 4. 获取策略配置
      updatedProgress.last_review_date = reviewDate;
      // 根据策略和复习次数计算下次复习日期
      updatedProgress.next_review_date = await this.calculateNextReviewDate(
          updatedProgress.strategy_id!,
          reviewDate,
          updatedProgress.reviewed_times!
        );
    }
    
    // 更新掌握等级
    updatedProgress.proficiency_level = proficiencyLevel;

    console.log("[ReviewStrategyService] Updated user word progress:", updatedProgress);
    
    return updatedProgress;
  }

  /**
   * 根据策略和复习次数动态计算下次复习日期
   * @param strategyId 策略ID
   * @param reviewDate 当前复习日期
   * @param reviewedTimes 已复习次数
   * @returns 下次复习日期 (ISO字符串)
   */
  private async calculateNextReviewDate(
    strategyId: string, 
    reviewDate: string, 
    reviewedTimes: number
  ): Promise<string> {
    try {
      // 获取策略配置
      const strategy = await this.getReviewStrategyById(strategyId);
      if (!strategy) {
        console.warn(`[ReviewStrategyService] Strategy ${strategyId} not found, using default interval`);
        return this.getDefaultNextReviewDate(reviewDate);
      }

      // 解析interval_rule
      const intervals = this.parseIntervalRule(strategy.interval_rule);
      if (intervals.length === 0) {
        console.warn(`[ReviewStrategyService] Invalid interval rule for strategy ${strategyId}: ${strategy.interval_rule}`);
        return this.getDefaultNextReviewDate(reviewDate);
      }

      // 根据复习次数选择间隔（超过配置次数使用最后一个间隔）
      const intervalIndex = Math.min(reviewedTimes, intervals.length - 1);
      const interval = intervals[intervalIndex];

      // 计算下次复习日期
      const currentDate = new Date(reviewDate);
      const nextReviewDate = new Date(currentDate.getTime() + interval * 60 * 60 * 1000);
      
      console.log(`[ReviewStrategyService] Next review for strategy ${strategyId}, times ${reviewedTimes}: ${interval}h from ${reviewDate}`);
      
      return nextReviewDate.toISOString();

    } catch (error) {
      console.error("ReviewStrategyService.calculateNextReviewDate error:", error);
      return this.getDefaultNextReviewDate(reviewDate);
    }
  }

  /**
   * 解析interval_rule字符串为小时数组
   * @param intervalRule 间隔规则字符串，如 "1h,3h,1d,2d,4d"
   * @returns 小时数数组
   */
  private parseIntervalRule(intervalRule: string): number[] {
    if (!intervalRule?.trim()) {
      return [];
    }

    const intervals: number[] = [];
    const parts = intervalRule.split(',').map(part => part.trim());

    for (const part of parts) {
      const value = this.parseTimeToHours(part);
      if (value > 0) {
        intervals.push(value);
      }
    }

    return intervals;
  }

  /**
   * 将时间字符串转换为小时数
   * @param timeStr 时间字符串，如 "1h", "3h", "1d", "2d"
   * @returns 小时数
   */
  private parseTimeToHours(timeStr: string): number {
    const match = timeStr.match(/^(\d+)([hd])$/);
    if (!match) {
      console.warn(`[ReviewStrategyService] Invalid time format: ${timeStr}`);
      return 0;
    }

    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
      case 'h': // 小时
        return value;
      case 'd': // 天
        return value * 24;
      default:
        return 0;
    }
  }

  /**
   * 获取默认的下次复习日期（24小时后）
   * @param reviewDate 当前复习日期
   * @returns 默认下次复习日期
   */
  private getDefaultNextReviewDate(reviewDate: string): string {
    const currentDate = new Date(reviewDate);
    const nextReviewDate = new Date(currentDate.getTime() + 24 * 60 * 60 * 1000);
    return nextReviewDate.toISOString();
  }
}

export default new ReviewStrategyService();