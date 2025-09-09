// src/types/User.ts
// Based on `user` and `user_preferences` tables from database.md and architecture.md

// This represents the data stored in the Appwrite 'user_preferences' collection
export interface UserPreferences {
  $id: string; // Appwrite Document ID
  userId: string; // Link to Appwrite Account ID
  nickname: string;
  pronunciation_preference: number; // 1=英式, 2=美式
  role: number; // 1=学生, 2=家长
  english_level: number; // 1=零基础, 2=小学, 3=初中, 4=高中
  grade?: number | null; // 1-6年级, only if english_level=2
  default_learning_mode: number; // 1=轻松, 2=正常, 3=努力
  // created_at and updated_at are usually handled by Appwrite
  // Add other fields from the `user` table if stored in preferences
}

// This represents the data from Appwrite Account service (Models.User)
// import { Models } from 'appwrite'; // Import if needed directly
// We'll use a simplified version for now
export interface AppwriteUser {
  $id: string;
  name: string;
  phone: string; // Assuming phone is used as email prefix
  // email: string;
  // Add other relevant fields from Appwrite Account
}
