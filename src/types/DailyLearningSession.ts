// src/types/DailyLearningSession.ts
// Based on `daily_learning_session` table from database.md and architecture.md

export interface DailyLearningSession {
  $id: string; // Appwrite Document ID
  user_id: string;
  session_date: string; // YYYY-MM-DD
  mode_id: number; // 1=轻松, 2=正常, 3=努力
  status: number; // 0=待开始, 1=前置评测中, 2=学习中, 3=当日评测中, 4=已完成
  pre_test_progress?: string | null; // e.g., "3/7"
  learning_progress?: string | null; // e.g., "5/10"
  post_test_progress?: string | null; // e.g., "2/7"
  pre_test_word_ids: string[]; // Deserialized from JSON array
  learning_word_ids: string[]; // Deserialized from JSON array
  post_test_word_ids: string[]; // Deserialized from JSON array
  // created_at and updated_at are usually handled by Appwrite
  // mode_details can be fetched and attached if needed
  mode_details?: {
    mode_name: string;
    word_count: number;
    phrase_count: number;
    sentence_count: number;
  };
}
