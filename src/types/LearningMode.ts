// src/types/LearningMode.ts
// Based on `learning_mode` table from database.md and architecture.md

export interface LearningMode {
  $id: string; // Appwrite Document ID
  mode_id: number; // 1=轻松, 2=正常, 3=努力
  mode_name: string;
  duration_range: string; // e.g., "10-15分钟"
  word_count: number;
  phrase_count: number;
  sentence_count: number;
}
