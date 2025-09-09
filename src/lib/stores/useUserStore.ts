// src/lib/stores/useUserStore.ts
import { userService } from '@/src/services';
import { UserPreferences } from '@/src/types/User';
import { create } from 'zustand';

interface UserState {
  preferences: UserPreferences | null;
  loading: boolean;
  error: string | null;
  fetchPreferences: (userId: string) => Promise<void>;
  updatePreferences: (userId: string, updates: Partial<UserPreferences>) => Promise<void>;
  clearError: () => void;
}

const useUserStore = create<UserState>((set) => ({
  preferences: null,
  loading: false,
  error: null,
  fetchPreferences: async (userId) => {
    set({ loading: true, error: null });
    try {
      const preferences = await userService.getUserPreferences(userId);
      set({ preferences, loading: false });
    } catch (error: any) {
      set({ error: error.message || 'Failed to fetch preferences', loading: false });
    }
  },
  updatePreferences: async (userId, updates) => {
    set({ loading: true, error: null });
    try {
      const updatedPreferences = await userService.updateUserPreferences(userId, updates);
      set({ preferences: updatedPreferences, loading: false });
    } catch (error: any) {
      set({ error: error.message || 'Failed to update preferences', loading: false });
    }
  },
  clearError: () => set({ error: null }),
}));

export default useUserStore;