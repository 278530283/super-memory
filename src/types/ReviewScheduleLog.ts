// src/types/ReviewScheduleLog.ts
// Based on `review_schedule_log` table from database.md

export interface ReviewScheduleLog {
  id: string; // 调度记录唯一标识
  user_id: string; // 关联用户ID
  word_id: string; // 关联单词ID
  review_time: string; // 本次复习时间
  schedule_days: number; // 计划天数
  next_review_time: string; // 下一次复习时间
  strategy_id: number; // 使用的复习策略
  review_config?: string; // 复习配置信息 (JSON格式)
  review_log?: string; // 复习日志 (JSON格式)
}