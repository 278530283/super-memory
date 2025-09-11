// src/lib/services/userService.ts
import { account } from '@/src/lib/appwrite';
import { UserPreferences } from '@/src/types/User';

class UserService {
  async getUserPreferences(): Promise<UserPreferences | null> {
    try {
      const user = await account.get();
      const { prefs = {}, name } = user;
      
      const defaultPreferences: UserPreferences = {
        nickname: name,
        pronunciation_preference: 1,
        role: 1,
        english_level: 1,
        grade: null,
        default_learning_mode: 1
      };

      return {
        ...defaultPreferences,
        ...prefs,
        nickname: name // 确保 nickname 始终使用 user.name
      };
    } catch (error) {
      console.error("UserService.getUserPreferences error:", error);
      throw error;
    }
  }

  async updateUserPreferences(updates: Partial<UserPreferences>): Promise<UserPreferences> {
    try {
      // Get current preferences first
      const currentPrefs = await this.getUserPreferences() || {};
      
      // Merge with updates
      const newPrefs = { ...currentPrefs, ...updates };
      
      // Update preferences in Appwrite Account
      await account.updatePrefs({prefs:newPrefs});
      
      return newPrefs as UserPreferences;
    } catch (error) {
      console.error("UserService.updateUserPreferences error:", error);
      throw error;
    }
  }

  // Create initial preferences
  async createUserPreferences(initialData: UserPreferences): Promise<UserPreferences> {
    try {
      await account.updatePrefs({prefs:initialData});
      return initialData;
    } catch (error) {
      console.error("UserService.createUserPreferences error:", error);
      throw error;
    }
  }
}

export default new UserService();