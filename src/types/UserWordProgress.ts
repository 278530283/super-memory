// src/types/UserWordProgress.ts
// Based on `user_word_progress` table from database.md and architecture.md

export interface UserWordProgress {
  $id: string; // Appwrite Document ID
  user_id: string;
  word_id: string;
  current_level: number; // 0=L0, 1=L1, 2=L2, 3=L3, 4=L4
  current_speed: number; // Percentage (e.g., 50)
  last_learn_time?: string | null; // ISO String
  last_review_time?: string | null; // ISO String
  is_long_difficult: boolean; // 1=true, 0=false -> boolean
  // created_at and updated_at are usually handled by Appwrite
}

// Type for creating a new word process record (without Appwrite's $id)
export type CreateUserWordProgress = Omit<UserWordProgress, '$id'>;