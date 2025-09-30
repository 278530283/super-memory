// src/lib/services/userService.ts
import { account } from '@/src/lib/appwrite';
import { AppwriteException, Models } from 'appwrite';

/**
 * 用户服务
 */
class UserService {
  async getUser(): Promise<Models.User<Models.Preferences> | null> {
    try {
      return await account.get();
    } catch (error) {
      console.error("UserService.getUser error:", error);
      if (error instanceof AppwriteException && error.code === 401) {
        return null;
    }
      throw error;
    }
  }

  async updatePreferences(updates: Partial<Models.Preferences>): Promise<Models.User<Models.Preferences>> {
    try {
      // Update preferences in Appwrite Account
      return await account.updatePrefs({prefs:updates});
    } catch (error) {
      console.error("UserService.updateUserPreferences error:", error);
      throw error;
    }
  }
}

export default new UserService();