// src/lib/services/authService.ts
import { Models } from 'appwrite';
import { account } from '../appwrite';

class AuthService {
  async register(phone: string, password: string, name: string): Promise<Models.User<Models.Preferences>> {
    // Using phone as email prefix, as per architecture.md example
    // Adjust if using phone verification directly
    const email = `${phone}@memoryapp.com`;
    const userId = 'unique()'; // Appwrite generates unique ID
    try {
      const user = await account.create(userId, email, password, name);
      // Optionally, create a session immediately after registration
      // await account.createEmailSession(email, password);
      return user;
    } catch (error) {
      console.error("AuthService.register error:", error);
      throw error; // Re-throw for store to handle
    }
  }

  async login(phone: string, password: string): Promise<Models.Session> {
    const email = `${phone}@memoryapp.com`;
    try {
      const session = await account.createEmailSession(email, password);
      return session;
    } catch (error) {
      console.error("AuthService.login error:", error);
      throw error;
    }
  }

  async logout(): Promise<void> {
    try {
      await account.deleteSession('current');
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