// src/types/User.ts
// Based on `user` and `user_preferences` tables from database.md and architecture.md

// This represents the data stored in the Appwrite 'user_preferences' collection
export interface UserPreferences {
  nickname: string;
  pronunciation_preference: number; // 1=英式, 2=美式
  role: number; // 1=学生, 2=家长
  english_level: number; // 1=零基础, 2=小学, 3=初中, 4=高中
  grade?: number | null; // 1-6年级, only if english_level=2
  default_learning_mode: number; // 1=轻松, 2=正常, 3=努力
}