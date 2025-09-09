// src/lib/services/userService.ts
import { ID, Query } from 'appwrite';
import { COLLECTION_USERS_PREFERENCES, DATABASE_ID } from '../../constants/appwrite';
import { UserPreferences } from '../../types/User';
import { databases } from '../appwrite';

class UserService {
  async getUserPreferences(userId: string): Promise<UserPreferences> {
    try {
      const response = await databases.listDocuments(
        DATABASE_ID,
        COLLECTION_USERS_PREFERENCES,
        [Query.equal('userId', userId)]
      );

      if (response.documents.length > 0) {
        return response.documents[0] as unknown as UserPreferences;
      } else {
        throw new Error('User preferences not found');
      }
    } catch (error) {
      console.error("UserService.getUserPreferences error:", error);
      throw error;
    }
  }

  async updateUserPreferences(userId: string, updates: Partial<UserPreferences>): Promise<UserPreferences> {
    try {
      const response = await databases.listDocuments(
        DATABASE_ID,
        COLLECTION_USERS_PREFERENCES,
        [Query.equal('userId', userId)]
      );

      if (response.documents.length > 0) {
        const docId = response.documents[0].$id;
        const updatedDoc = await databases.updateDocument(
          DATABASE_ID,
          COLLECTION_USERS_PREFERENCES,
          docId,
          updates
        );
        return updatedDoc as unknown as UserPreferences;
      } else {
        throw new Error('User preferences document not found for update');
      }
    } catch (error) {
      console.error("UserService.updateUserPreferences error:", error);
      throw error;
    }
  }

  // Create initial preferences if needed (e.g., after registration)
  async createUserPreferences(userId: string, initialData: Omit<UserPreferences, '$id' | 'userId'>): Promise<UserPreferences> {
    try {
        const fullData = { ...initialData, userId };
        const newDoc = await databases.createDocument(
            DATABASE_ID,
            COLLECTION_USERS_PREFERENCES,
            ID.unique(), // Let Appwrite generate ID
            fullData
        );
        return newDoc as unknown as UserPreferences;
    } catch (error) {
        console.error("UserService.createUserPreferences error:", error);
        throw error;
    }
  }
}

export default new UserService();