// src/types/UserWordProgress.ts
// Based on `user_word_progress` table from database.md and architecture.md

export interface UserWordProgress {
  $id: string; // Appwrite Document ID
  user_id: string;
  word_id: string;
  is_long_difficult: boolean;
  proficiency_level: number; // 0=L0, 1=L1, 2=L2, 3=L3, 4=L4
  strategy_id?: string | null;
  start_date?: string | null; // ISO String
  last_review_date?: string | null; // ISO String
  reviewed_times?: number | null;
  next_review_date?: string | null; // ISO String
  review_config?: string; // 复习配置信息 (JSON格式)
}

// Type for creating a new word progress record (without Appwrite's $id)
export type CreateUserWordProgress = Omit<UserWordProgress, '$id'>;

// Type for updating an existing word progress record (all fields optional except ID)
export type UpdateUserWordProgress = Partial<Omit<UserWordProgress, '$id' | 'user_id' | 'word_id'>> & { $id: string };