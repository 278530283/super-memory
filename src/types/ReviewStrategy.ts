// src/types/ReviewStrategy.ts
// Based on `review_strategy` table from database.md and architecture.md

export interface ReviewStrategy {
  $id: string; // Appwrite Document ID (对应MySQL中的id字段)
  strategy_type: number; // 策略类型 (1=传统手动策略, 2=FSRS算法策略)
  strategy_name: string; // 策略名称（密集/正常/稀疏/FSRS）
  applicable_condition: string; // 适用条件（如"长难词+L0"）
  interval_rule: string; // 复习间隔规则（如"1h,3h,1d"）— 仅对传统策略有效
}

// 策略类型常量
export const STRATEGY_TYPES = {
  TRADITIONAL: 1, // 传统手动策略
  FSRS: 2, // FSRS算法策略
} as const;

// 策略类型值类型
export type StrategyType = typeof STRATEGY_TYPES[keyof typeof STRATEGY_TYPES];

// 常用策略ID常量（根据实际业务定义）
export const STRATEGY_IDS = {
  DENSE: "strategy_dense", // 密集策略
  NORMAL: "strategy_normal",    // 正常策略
  SPARSE: "strategy_sparse",    // 稀疏策略
  FSRS_DEFAULT: "strategy_fsrs", // FSRS默认策略
} as const;

// 策略ID值类型
export type StrategyId = typeof STRATEGY_IDS[keyof typeof STRATEGY_IDS];

// 创建复习策略的类型（不包含Appwrite的$id）
export type CreateReviewStrategy = Omit<ReviewStrategy, '$id'>;

// 更新复习策略的类型（所有字段可选，除了ID）
export type UpdateReviewStrategy = Partial<Omit<ReviewStrategy, '$id' | 'id'>> & { 
  $id: string;
};