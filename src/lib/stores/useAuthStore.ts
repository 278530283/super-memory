// src/lib/stores/useAuthStore.ts
import { UserPreferences } from '@/src/types/User';
import { Models } from 'appwrite';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import authService from '../services/authService';
import userService from '../services/userService';

interface AuthState {
  user: Models.User<Models.Preferences> | null;
  userPreferences: UserPreferences | null;
  loading: boolean;
  error: string | null;
  login: (phone: string, password: string) => Promise<void>;
  register: (phone: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  fetchUserPreferences: () => Promise<void>;
  updateUserPreferences: (updates: Partial<UserPreferences>) => Promise<void>; // 新增方法
  clearError: () => void;
}

const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      userPreferences: null,
      loading: false,
      error: null,
      login: async (phone, password) => {
        set({ loading: true, error: null });
        try {
          const user = await authService.login(phone, password);
          set({ user, loading: false });
          await get().fetchUserPreferences();
        } catch (error: any) {
          set({ error: error.message || 'Login failed', loading: false });
          throw error;
        }
      },
      register: async (phone, password, name) => {
        set({ loading: true, error: null });
        try {
          const user = await authService.register(phone, password, name);
          set({ user, loading: false });
        } catch (error: any) {
          set({ error: error.message || 'Registration failed', loading: false });
          throw error;
        }
      },
      logout: async () => {
        set({ loading: true, error: null });
        try {
          await authService.logout();
          set({ user: null, userPreferences: null, loading: false });
        } catch (error: any) {
          set({ error: error.message || 'Logout failed', loading: false });
          set({ user: null, userPreferences: null });
        }
      },
      fetchUserPreferences: async () => {
        const { user } = get();
        if (!user) return;
        try {
          const preferences = await userService.getUserPreferences();
          set({ userPreferences: preferences });
        } catch (error: any) {
          console.error("Failed to fetch user preferences:", error);
        }
      },
      updateUserPreferences: async (updates) => {
        set({ loading: true, error: null });
        try {
          const updatedPreferences = await userService.updateUserPreferences(updates);
          set({ userPreferences: updatedPreferences, loading: false });
        } catch (error: any) {
          set({ error: error.message || 'Failed to update preferences', loading: false });
          throw error;
        }
      },
      clearError: () => set({ error: null }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ 
        user: state.user,
        userPreferences: state.userPreferences // 如果需要持久化偏好设置
      }),
    }
  )
);

export default useAuthStore;