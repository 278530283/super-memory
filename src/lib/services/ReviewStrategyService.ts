// src/lib/services/ReviewStrategyService.ts
import { COLLECTION_REVIEW_STRATEGY, DATABASE_ID } from '@/src/constants/appwrite';
import { tablesDB } from '@/src/lib/appwrite';
import { ReviewScheduleLog } from '@/src/types/ReviewScheduleLog';
import { ReviewStrategy, STRATEGY_IDS, STRATEGY_TYPES } from '@/src/types/ReviewStrategy';
import { CreateUserWordProgress } from '@/src/types/UserWordProgress';
import { ID } from 'appwrite';
import {
  Card,
  createEmptyCard,
  fsrs,
  FSRS,
  generatorParameters,
  Rating,
  RecordLog,
  RecordLogItem
} from 'ts-fsrs';

class ReviewStrategyService {
  private fsrsInstance: FSRS;
  
  constructor() {
    const params = generatorParameters({
      maximum_interval: 36500,
      enable_fuzz: true,
      enable_short_term: true
    });
    this.fsrsInstance = fsrs(params);
  }

  /**
   * 根据策略ID获取复习策略
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
   */
  getReviewStrategyId(strategyType: number, proficiencyLevel: number, isLongDifficult: boolean): string {
    if(strategyType === STRATEGY_TYPES.FSRS){
      return STRATEGY_IDS.FSRS_DEFAULT;
    }
    
    if (proficiencyLevel === 0 && isLongDifficult) {
      return STRATEGY_IDS.DENSE;
    }
    
    if ((proficiencyLevel === 0 && !isLongDifficult) || 
        ((proficiencyLevel === 1 || proficiencyLevel === 2) && isLongDifficult)) {
      return STRATEGY_IDS.NORMAL;
    }
    
    if (proficiencyLevel === 3 && isLongDifficult) {
      return STRATEGY_IDS.SPARSE;
    }
    
    return STRATEGY_IDS.NORMAL;
  }

  /**
   * 将掌握等级转换为FSRS评分
   */
  proficiencyLevelToFSRSRating(proficiencyLevel: number): Rating {
    const ratingMap: Record<number, Rating> = {
      0: Rating.Again,
      1: Rating.Hard,
      2: Rating.Good,
      3: Rating.Easy,
      4: Rating.Easy
    };
    
    return ratingMap[proficiencyLevel] || Rating.Good;
  }

  /**
   * 从JSON字符串恢复Card对象
   */
  restoreCardFromJSON(cardJSON: string): Card {
    try {
      const cardData = JSON.parse(cardJSON);
      return {
        ...cardData,
        due: new Date(cardData.due),
        last_review: cardData.last_review ? new Date(cardData.last_review) : undefined
      };
    } catch (error) {
      console.warn("[ReviewStrategyService] Failed to restore card from JSON, using empty card:", error);
      return createEmptyCard();
    }
  }

  /**
   * 序列化Card对象为JSON字符串
   */
  serializeCardToJSON(card: Card): string {
    return JSON.stringify({
      ...card,
      due: card.due.toISOString(),
      last_review: card.last_review ? card.last_review.toISOString() : null
    });
  }

  /**
   * 保存复习日志到数据库
   */
  async saveReviewScheduleLog(log: ReviewScheduleLog): Promise<void> {
    try {
      await tablesDB.createRow({
        databaseId: DATABASE_ID,
        tableId: 'review_schedule_log',
        rowId: ID.unique(),
        data: log
      });
      
      console.log("[ReviewStrategyService] Review log saved:", log);
    } catch (error) {
      console.error("ReviewStrategyService.saveReviewScheduleLog error:", error);
      // 不抛出错误，避免影响主流程
    }
  }

  /**
   * 计算复习后的单词进度
   */
  async calculateReviewProgress(
  userWordProgress: CreateUserWordProgress,
  proficiencyLevel: number,
  reviewDate: string,
  strategyType: number,
  spelling: string
): Promise<CreateUserWordProgress | null> {
  
  console.log("[ReviewStrategyService] calculateReviewProgress:", userWordProgress, proficiencyLevel, reviewDate);
  
  // 检查是否已经复习过
  if (userWordProgress.last_review_date && 
      userWordProgress.last_review_date.slice(0, 10) === reviewDate.slice(0, 10)) {
    console.log("[ReviewStrategyService] Already reviewed today, no need to update.");
    return null;
  }

  const updatedProgress = { ...userWordProgress };
  let reviewLog: ReviewScheduleLog | undefined;

  const isFirstReview = userWordProgress.strategy_id == null || userWordProgress.start_date == null;
  
  if (isFirstReview) {
    // 首次复习
    console.log("[ReviewStrategyService] First review:", userWordProgress);
    const strategyId = this.getReviewStrategyId(
      strategyType, 
      userWordProgress.proficiency_level!, 
      userWordProgress.is_long_difficult!
    );
    
    updatedProgress.strategy_id = strategyId;
    updatedProgress.start_date = reviewDate;
    updatedProgress.last_review_date = reviewDate;
    updatedProgress.reviewed_times = 0;
    
    // 计算下次复习日期
    const nextReviewResult = await this.calculateNextReviewDate(
      updatedProgress.strategy_id!,
      reviewDate,
      0,
      updatedProgress,
      proficiencyLevel,
      spelling
    );
    
    updatedProgress.next_review_date = nextReviewResult.nextReviewDate;
    
    // 保存卡片状态和日志（无论FSRS还是传统策略）
    if (strategyId === STRATEGY_IDS.FSRS_DEFAULT) {
      updatedProgress.review_config = nextReviewResult.fsrsCard;
    }
    reviewLog = nextReviewResult.reviewLog; // 传统策略也会返回reviewLog
  } else {
    // 非首次复习
    if (userWordProgress.strategy_id !== STRATEGY_IDS.FSRS_DEFAULT) {
      // 传统策略的逻辑
      const dayCount = Math.floor(
        (new Date(reviewDate).getTime() - new Date(userWordProgress.start_date!).getTime()) / 
        (1000 * 60 * 60 * 24)
      );
      
      if (proficiencyLevel === 0 && userWordProgress.proficiency_level === 3 && dayCount >= 90) {
        // 策略降级
        console.log("[ReviewStrategyService] Strategy downgrade:", userWordProgress);
        if (updatedProgress.strategy_id === STRATEGY_IDS.DENSE) {
          updatedProgress.strategy_id = STRATEGY_IDS.NORMAL;
        } else if (updatedProgress.strategy_id === STRATEGY_IDS.NORMAL) {
          updatedProgress.strategy_id = STRATEGY_IDS.SPARSE;
        }
      }
      
      if (proficiencyLevel === 0) {
        // 重置学习进度
        updatedProgress.start_date = reviewDate;
        updatedProgress.reviewed_times = -1;
      }
    }
    
    // 更新复习次数和日期
    updatedProgress.reviewed_times! += 1;
    updatedProgress.last_review_date = reviewDate;
    
    // 计算下次复习日期
    const nextReviewResult = await this.calculateNextReviewDate(
      updatedProgress.strategy_id!,
      reviewDate,
      updatedProgress.reviewed_times!,
      updatedProgress,
      proficiencyLevel,
      spelling
    );
    
    updatedProgress.next_review_date = nextReviewResult.nextReviewDate;
    
    // 保存卡片状态和日志（无论FSRS还是传统策略）
    if (updatedProgress.strategy_id === STRATEGY_IDS.FSRS_DEFAULT) {
      updatedProgress.review_config = nextReviewResult.fsrsCard;
    }
    reviewLog = nextReviewResult.reviewLog; // 传统策略也会返回reviewLog
  }
  
  // 更新掌握等级
  updatedProgress.proficiency_level = proficiencyLevel;

  // 自动保存复习日志（无论传统策略还是FSRS策略）
  if (reviewLog) {
    await this.saveReviewScheduleLog(reviewLog);
  }

  console.log("[ReviewStrategyService] Updated user word progress:", updatedProgress);
  
  return updatedProgress;
}

  /**
   * 根据策略计算下次复习日期
   */
  async calculateNextReviewDate(
  strategyId: string, 
  reviewDate: string, 
  reviewedTimes: number,
  userWordProgress: CreateUserWordProgress,
  proficiencyLevel: number,
  spelling: string
): Promise<{ nextReviewDate: string; fsrsCard?: string; reviewLog: ReviewScheduleLog }> {
  
  if (strategyId === STRATEGY_IDS.FSRS_DEFAULT) {
    // FSRS策略
    const result = await this.calculateNextReviewDateFSRS(reviewDate, userWordProgress, proficiencyLevel, spelling);
    return {
      nextReviewDate: result.nextReviewDate,
      fsrsCard: result.fsrsCard,
      reviewLog: result.reviewLog
    };
  } else {
    // 传统策略
    const result = await this.calculateNextReviewDateTraditional(strategyId, reviewDate, reviewedTimes, userWordProgress);
    return {
      nextReviewDate: result.nextReviewDate,
      reviewLog: result.reviewLog
    };
  }
}

  /**
   * 使用传统算法计算下次复习日期
   */
  async calculateNextReviewDateTraditional(
  strategyId: string, 
  reviewDate: string, 
  reviewedTimes: number,
  userWordProgress: CreateUserWordProgress
): Promise<{ nextReviewDate: string; reviewLog: ReviewScheduleLog }> {
  try {
    const strategy = await this.getReviewStrategyById(strategyId);
    if (!strategy) {
      console.warn(`[ReviewStrategyService] Strategy ${strategyId} not found, using default interval`);
      const defaultDate = this.getDefaultNextReviewDate(reviewDate);
      return {
        nextReviewDate: defaultDate,
        reviewLog: this.createTraditionalReviewLog(userWordProgress, reviewDate, defaultDate, strategyId, 1)
      };
    }

    const intervals = this.parseIntervalRule(strategy.interval_rule);
    if (intervals.length === 0) {
      console.warn(`[ReviewStrategyService] Invalid interval rule for strategy ${strategyId}: ${strategy.interval_rule}`);
      const defaultDate = this.getDefaultNextReviewDate(reviewDate);
      return {
        nextReviewDate: defaultDate,
        reviewLog: this.createTraditionalReviewLog(userWordProgress, reviewDate, defaultDate, strategyId, 1)
      };
    }

    const intervalIndex = Math.min(reviewedTimes, intervals.length - 1);
    const interval = intervals[intervalIndex];

    const currentDate = new Date(reviewDate);
    const nextReviewDate = new Date(currentDate.getTime() + interval * 60 * 60 * 1000);
    
    console.log(`[ReviewStrategyService] Next review for strategy ${strategyId}, times ${reviewedTimes}: ${interval}h from ${reviewDate}`);
    
    // 计算调度天数（小时转换为天）
    const scheduleDays = Math.ceil(interval / 24);
    
    return {
      nextReviewDate: nextReviewDate.toISOString(),
      reviewLog: this.createTraditionalReviewLog(userWordProgress, reviewDate, nextReviewDate.toISOString(), strategyId, scheduleDays)
    };
  } catch (error) {
    console.error("ReviewStrategyService.calculateNextReviewDateTraditional error:", error);
    const defaultDate = this.getDefaultNextReviewDate(reviewDate);
    return {
      nextReviewDate: defaultDate,
      reviewLog: this.createTraditionalReviewLog(userWordProgress, reviewDate, defaultDate, strategyId, 1)
    };
  }
}

/**
 * 创建传统策略的复习日志
 */
private createTraditionalReviewLog(
  userWordProgress: CreateUserWordProgress,
  reviewDate: string,
  nextReviewDate: string,
  strategyId: string,
  scheduleDays: number
): ReviewScheduleLog {
  return {
    id: '', // 将在保存时生成
    user_id: userWordProgress.user_id,
    word_id: userWordProgress.word_id,
    review_time: reviewDate,
    schedule_days: scheduleDays,
    next_review_time: nextReviewDate,
    strategy_id: parseInt(strategyId),
    // 传统策略没有FSRS相关字段，可以留空或存储其他信息
    review_log: JSON.stringify({
      strategy_type: 'TRADITIONAL',
      reviewed_times: userWordProgress.reviewed_times,
      proficiency_level: userWordProgress.proficiency_level,
      interval_hours: scheduleDays * 24
    })
  };
}

  /**
   * 使用FSRS算法计算下次复习日期
   */
  async calculateNextReviewDateFSRS(
    reviewDate: string,
    userWordProgress: CreateUserWordProgress,
    proficiencyLevel: number,
    spelling: string
  ): Promise<{ nextReviewDate: string; fsrsCard: string; reviewLog: ReviewScheduleLog }> {
    try {
      const rating = this.proficiencyLevelToFSRSRating(proficiencyLevel);
      const now = new Date(reviewDate);

      // 获取或创建FSRS卡片
      let card: Card;
      if (userWordProgress.review_config) {
        card = this.restoreCardFromJSON(userWordProgress.review_config);
      } else {
        // 首次创建卡片
        card = createEmptyCard();
      }

      // 使用FSRS算法计算下次复习
      const schedulingCards: RecordLog = this.fsrsInstance.repeat(card, now);
      
      // 使用类型断言解决TypeScript索引问题
      const scheduledCard: RecordLogItem = (schedulingCards as any)[rating];

      // 计算调度天数
      const scheduleDays = Math.ceil(
        (scheduledCard.card.due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      // 生成复习日志
      const reviewLog: ReviewScheduleLog = {
        id: '', // 将在保存时生成
        user_id: userWordProgress.user_id,
        word_id: userWordProgress.word_id,
        review_time: reviewDate,
        schedule_days: scheduleDays,
        next_review_time: scheduledCard.card.due.toISOString(),
        strategy_id: parseInt(STRATEGY_IDS.FSRS_DEFAULT),
        review_config: this.serializeCardToJSON(scheduledCard.card),
        review_log: JSON.stringify(scheduledCard.log)
      };

      return {
        nextReviewDate: scheduledCard.card.due.toISOString(),
        fsrsCard: this.serializeCardToJSON(scheduledCard.card),
        reviewLog
      };

    } catch (error) {
      console.error("ReviewStrategyService.calculateNextReviewDateFSRS error:", error);
      
      // FSRS计算失败时使用默认间隔
      const defaultDate = this.getDefaultNextReviewDate(reviewDate);
      const emptyCard = createEmptyCard();
      
      return {
        nextReviewDate: defaultDate,
        fsrsCard: this.serializeCardToJSON(emptyCard),
        reviewLog: {
          id: '',
          user_id: userWordProgress.user_id,
          word_id: userWordProgress.word_id,
          review_time: reviewDate,
          schedule_days: 1,
          next_review_time: defaultDate,
          strategy_id: parseInt(STRATEGY_IDS.FSRS_DEFAULT),
          review_config: this.serializeCardToJSON(emptyCard),
          review_log: JSON.stringify({ 
            error: 'FSRS calculation failed', 
            error_message: error instanceof Error ? error.message : String(error),
            fallback: true
          })
        }
      };
    }
  }

  /**
   * 获取所有FSRS评分选项（用于显示预测）
   */
    getFSRSPreviewOptions(
    userWordProgress: CreateUserWordProgress, 
    reviewDate: string = new Date().toISOString(),
    spelling: string
  ): {
    rating: Rating;
    name: string;
    nextReviewDate: string;
    scheduledDays: number;
  }[] {
    try {
      const now = new Date(reviewDate);

      // 获取或创建FSRS卡片
      let card: Card;
      if (userWordProgress.review_config) {
        card = this.restoreCardFromJSON(userWordProgress.review_config);
      } else {
        // 首次创建卡片时，根据单词长度设置初始难度
        card = createEmptyCard();
      }

      // 获取所有评分选项
      const schedulingCards: RecordLog = this.fsrsInstance.repeat(card, now);
      const options = [];

      // 遍历所有评分选项
      const ratings = [Rating.Again, Rating.Hard, Rating.Good, Rating.Easy] as const;
      
      for (const rating of ratings) {
        const scheduledCard = (schedulingCards as any)[rating];
        const scheduledDays = Math.ceil(
          (scheduledCard.card.due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );

        options.push({
          rating,
          name: Rating[rating],
          nextReviewDate: scheduledCard.card.due.toISOString(),
          scheduledDays
        });
      }

      return options;
    } catch (error) {
      console.error("ReviewStrategyService.getFSRSPreviewOptions error:", error);
      return [];
    }
  }

  /**
   * 解析interval_rule字符串为小时数组
   */
  parseIntervalRule(intervalRule: string): number[] {
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
   */
  parseTimeToHours(timeStr: string): number {
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
   */
  getDefaultNextReviewDate(reviewDate: string): string {
    const currentDate = new Date(reviewDate);
    const nextReviewDate = new Date(currentDate.getTime() + 24 * 60 * 60 * 1000);
    return nextReviewDate.toISOString();
  }
}

export default new ReviewStrategyService();