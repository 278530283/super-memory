// src/lib/services/userService.ts
import { account } from '@/src/lib/appwrite';
import { UserPreferences } from '@/src/types/User';
import { AppwriteException, Models } from 'appwrite';

/**
 * 用户服务
 */
class UserService {
  async register(phone: string, password: string, name: string): Promise<Models.User<UserPreferences>> {
    // Using phone as email prefix, as per architecture.md example
    // Adjust if using phone verification directly
    const email = `${phone}@supermemory.com`;
    const userId = 'unique()'; // Appwrite generates unique ID
    try {
      // 1. 创建用户
      await account.create({userId:userId, email:email, password:password, name:name});

      // 2. 调用 login 方法完成会话创建和用户信息获取
      // 这样复用了 login 中的逻辑，包括清理旧会话、创建新会话、获取用户信息等
      return await this.login(phone, password); // 直接调用 login 方法

    } catch (error) {
      console.log("AuthService.register error:", error);
      throw error; // Re-throw for store to handle
    }
  }

  async login(phone: string, password: string): Promise<Models.User<UserPreferences>> {
    const email = `${phone}@supermemory.com`;
    console.log('Attempting to login with email:', email, 'and password:', password);
    try {
      console.log('Creating new session...');
      const session = await account.createEmailPasswordSession({email: email, password:password});
      console.log('Session created:', session);

      // 从 session 中提取用户信息，或者调用 getCurrentUser() 获取完整用户
      const user = await this.getUser(); // 或者通过其他方式获取完整用户信息
      if (!user) {
        throw new Error('User not found after login');
      }
      return user;
    } catch (error) {
      console.log("AuthService.login error:", error);
      throw error;
    }
  }

  async logout(): Promise<void> {
    try {
      await account.deleteSession({sessionId:'current'});
    } catch (error) {
      console.log("AuthService.logout error:", error);
      throw error;
    }
  }
  async getUser(): Promise<Models.User<UserPreferences> | null> {
    try {
      return await account.get();
    } catch (error) {
      console.log("UserService.getUser error",);
      if (error instanceof AppwriteException && error.code === 401) {
        console.log("UserService.getUser error, error code:", error.code, "message:", error.message);
        return null;
      }
      // 如果是其他类型的错误（网络问题、服务器错误等），则记录并重新抛出
      console.log("AuthService.getCurrentUser: An unexpected error occurred:", error);
      throw error; // 重新抛出，让调用方处理
      }
  }

  async updateName(newName: string): Promise<Models.User<UserPreferences>> {
    try {
      return await account.updateName({ name: newName });
    } catch (error) {
      console.log("UserService.updateUserName error:", error);
      throw error;
    }
  }

  async updatePreferences(updates: Partial<UserPreferences>): Promise<Models.User<UserPreferences>> {
    try {
      // Update preferences in Appwrite Account
      return await account.updatePrefs({prefs:updates});
    } catch (error) {
      console.log("UserService.updateUserPreferences error:", error);
      throw error;
    }
  }
}

export default new UserService();