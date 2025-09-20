// src/types/UserWordTestHistory.ts
// Based on `user_word_test_history` table from database.md and architecture.md

export interface UserWordTestHistory {
  $id: string; // Appwrite Document ID
  user_id: string;
  word_id: string;
  test_date: string; // ISO String (YYYY-MM-DD format)
  phase: number; // 1=Pre-test, 3=Post-test
  test_level: number; // 0-4
  // Appwrite automatically adds $createdAt and $updatedAt
}

// Enum for test phases to improve code readability
export enum TestPhase {
  PRE_TEST = 1, // 前置评测
  POST_TEST = 3 // 当日评测
}

// Type for creating a new test history record (without Appwrite's $id)
export type CreateUserWordTestHistory = Omit<UserWordTestHistory, '$id'>;

// Type for updating an existing test history record
export type UpdateUserWordTestHistory = Partial<Omit<UserWordTestHistory, '$id' | 'user_id' | 'word_id' | 'test_date' | 'phase'>>;