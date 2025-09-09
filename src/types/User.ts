// src/types/User.ts
// Based on `user` and `user_preferences` tables/collections
export interface UserPreferences {
    // This ID will be the document ID from Appwrite
    userId: string; // Link to Appwrite Account ID
    nickname: string;
    pronunciation_preference: number; // 1=英式, 2=美式
    role: number; // 1=学生, 2=家长
    english_level: number; // 1=零基础, 2=小学, 3=初中, 4=高中
    grade?: number | null; // 1-6年级, only if english_level=2
    default_learning_mode: number; // 1=轻松, 2=正常, 3=努力
    // Add other preference fields as needed
    // created_at and updated_at are usually handled by Appwrite
  }
  
  // Appwrite Models.User<Preferences> will be used for the Account part