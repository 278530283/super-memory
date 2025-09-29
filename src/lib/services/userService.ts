// src/lib/services/userService.ts
import { account } from '@/src/lib/appwrite';
import { UserPreferences } from '@/src/types/User';

class UserService {
  async getUserPreferences(): Promise<UserPreferences | null> {
    try {
      const user = await account.get();
      const { prefs = {}, name, $id } = user;
      
      const defaultPreferences: UserPreferences = {
        userId: $id,
        nickname: name,
        pronunciation: 1,
        role: 1,
        englishLevel: 1,
        grade: null,
        learningMode: '1',
        enableSpelling: false
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
}

export default new UserService();