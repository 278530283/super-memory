// src/types/User.ts
// Based on `user` and `user_preferences` tables from database.md and architecture.md

export interface UserPreferences {
  userId: string;
  nickname: string;
  pronunciation: number; // 发音偏好 1=英式, 2=美式
  role: number; // 1=学生, 2=家长
  englishLevel: number; // 1=零基础, 2=小学, 3=初中, 4=高中
  grade?: number | null; // 1-6年级, only if english_level=2
  learningMode: string; // 1=轻松, 2=正常, 3=努力
  enableSpelling: boolean; // 是否启用拼写测试
}