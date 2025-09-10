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
            // After registration, you might want to create user preferences
            // This could be done via an Appwrite Function or directly here if simple
            // await userService.createUserPreferences(user.$id, { /* default prefs */ });
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
          set({ user: null, userPreferences: null }); // Clear state anyway
        }
      },
      fetchUserPreferences: async () => {
        const { user } = get();
        if (!user) return;
        try {
          const preferences = await userService.getUserPreferences(user.$id);
          set({ userPreferences: preferences });
        } catch (error: any) {
          console.error("Failed to fetch user preferences:", error);
          // Decide if this should set an error in the store or just log
        }
      },
      clearError: () => set({ error: null }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user }),
    }
  )
);

export default useAuthStore;