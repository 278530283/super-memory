// src/lib/services/authService.ts
import { account } from '@/src/lib/appwrite';
import { Models } from 'appwrite';

class AuthService {
  async register(phone: string, password: string, name: string): Promise<Models.User<Models.Preferences>> {
    // Using phone as email prefix, as per architecture.md example
    // Adjust if using phone verification directly
    const email = `${phone}@memoryapp.com`;
    const userId = 'unique()'; // Appwrite generates unique ID
    try {
      const user = await account.create({userId:userId, email:email, password:password, name:name});
      // Optionally, create a session immediately after registration
      // await account.createEmailSession(email, password);
      return user;
    } catch (error) {
      console.error("AuthService.register error:", error);
      throw error; // Re-throw for store to handle
    }
  }

  async login(phone: string, password: string): Promise<Models.User<Models.Preferences>> {
    const email = `${phone}@supermemory.com`;
    try {
      // 检查当前是否有活跃会话
      const currentSession = await account.getSession('current');
    
      // 如果有活跃会话，先删除
      if (currentSession) {
        await account.deleteSession({sessionId:'current'});
      }
      const session = await account.createEmailPasswordSession({email: email, password:password});
      
      // 从 session 中提取用户信息，或者调用 getCurrentUser() 获取完整用户
      const user = await this.getCurrentUser(); // 或者通过其他方式获取完整用户信息
      
      if (!user) {
        throw new Error('User not found after login');
      }
      
      return user;
    } catch (error) {
      console.error("AuthService.login error:", error);
      throw error;
    }
  }

  async logout(): Promise<void> {
    try {
      await account.deleteSession({sessionId:'current'});
    } catch (error) {
      console.error("AuthService.logout error:", error);
      throw error;
    }
  }

  async getCurrentUser(): Promise<Models.User<Models.Preferences> | null> {
    try {
      return await account.get();
    } catch (error: any) {
      // If not found or unauthorized, return null
      if (error.code === 401) {
        return null;
      }
      console.error("AuthService.getCurrentUser error:", error);
      throw error;
    }
  }
}

export default new AuthService();