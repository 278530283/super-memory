// src/lib/services/userService.ts
import { COLLECTION_USERS_PREFERENCES, DATABASE_ID } from '@/src/constants/appwrite';
import { UserPreferences } from '@/src/types/User';
import { ID, Query } from 'appwrite';
import { account } from '../appwrite';

class UserService {
  async getUserPreferences(userId: string): Promise<UserPreferences | null> {
    try {
      const accountResponse = account.get();
      console.log("Account fetched:", accountResponse);
      if ((await accountResponse).$id !== userId) {
        throw new Error('User ID mismatch');
      }
      const response = await account.getPrefs();
      console.log("User preferences fetched:", response);

      if (response.length > 0) {
        return response.documents[0] as unknown as UserPreferences;
      } else {
        console.warn(`User preferences not found for userId: ${userId}`);
        return null; // Or throw an error if preferred
      }
    } catch (error) {
      console.error("UserService.getUserPreferences error:", error);
      throw error; // Re-throw for store to handle
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
  // Assumes the user document in Appwrite Account already exists
  async createUserPreferences(userId: string, initialData: Omit<UserPreferences, '$id' | 'userId'>): Promise<UserPreferences> {
    try {
        const fullData: UserPreferences = {
            $id: ID.unique(), // Let Appwrite generate ID, or omit if using 'unique()'
            userId,
            ...initialData
        } as UserPreferences; // Type assertion might be needed depending on exact structure
        const newDoc = await databases.createDocument(
            DATABASE_ID,
            COLLECTION_USERS_PREFERENCES,
            ID.unique(), // Use ID.unique() or let Appwrite generate if preferred
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