// src/types/UserWordActionLog.ts

export interface UserWordActionLog {
  $id: string; // Appwrite Document ID
  user_id: string;
  word_id: string;
  session_id: string | null;
  phase: number; // 1=前置评测, 2=学习阶段, 3=当日评测, 4=快速复习, 5=专项训练
  action_type: number; // Specific activity (e.g., 1=听单词, 2=英译中, etc.)
  learning_method?: number | null; // For actionType=2
  is_correct?: boolean | null;
  response_time_ms?: number | null;
  study_duration_ms?: number | null;
  speed_used: number; // Percentage
}