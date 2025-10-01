// src/lib/stores/useAuthStore.ts
import { UserPreferences } from '@/src/types/User';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Models } from 'appwrite';
import { create } from 'zustand';
import { persist, PersistStorage } from 'zustand/middleware';
import userService from '../services/userService';

// 创建符合 Zustand StateStorage 接口的存储适配器
const storage: PersistStorage<Partial<AuthState>> = {
  getItem: async (name: string) => {
    try {
      const value = await AsyncStorage.getItem(name);
      if (value === null) return null;
      // 解析存储的值
      return JSON.parse(value);
    } catch (error) {
      console.warn('AsyncStorage getItem error:', error);
      return null;
    }
  },
  setItem: async (name: string, value: any) => {
    try {
      // 序列化值
      const stringValue = JSON.stringify(value);
      await AsyncStorage.setItem(name, stringValue);
    } catch (error) {
      console.warn('AsyncStorage setItem error:', error);
    }
  },
  removeItem: async (name: string) => {
    try {
      await AsyncStorage.removeItem(name);
    } catch (error) {
      console.warn('AsyncStorage removeItem error:', error);
    }
  }
};

// 5分钟过期时间，单位毫秒
const USER_CACHE_TTL = 5 * 60 * 1000;

interface AuthState {
  user: Models.User<UserPreferences> | null;
  lastRefreshed: number | null; // 添加刷新时间戳
  loading: boolean;
  error: string | null;
  login: (phone: string, password: string) => Promise<void>;
  register: (phone: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  updateName: (newName: string) => Promise<void>;
  updatePreferences: (updates: Partial<UserPreferences>) => Promise<void>;
  clearError: () => void;
  // 新增：获取当前用户（带缓存检查）
  getCurrentUser: () => Promise<Models.User<UserPreferences> | null>;
  // 新增：强制刷新用户数据
  refreshUser: () => Promise<void>;
}

const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      lastRefreshed: null,
      loading: false,
      error: null,

      login: async (phone, password) => {
        set({ loading: true, error: null });
        try {
          const user = await userService.login(phone, password);
          set({ user, lastRefreshed: Date.now(), loading: false });
        } catch (error: any) {
          set({ error: error.message || 'Login failed', loading: false });
          throw error;
        }
      },

      register: async (phone, password, name) => {
        set({ loading: true, error: null });
        try {
          const user = await userService.register(phone, password, name);
          set({ user, lastRefreshed: Date.now(), loading: false });
        } catch (error: any) {
          set({ error: error.message || 'Registration failed', loading: false });
          throw error;
        }
      },

      logout: async () => {
        set({ loading: true, error: null });
        try {
          await userService.logout();
          set({ user: null, lastRefreshed: null, loading: false });
        } catch (error: any) {
          set({ error: error.message || 'Logout failed', loading: false });
          set({ user: null, lastRefreshed: null });
        }
      },

      updateName: async (newName) => {
        set({ loading: true, error: null });
        try {
          const updatedUser = await userService.updateName(newName);
          set({ user: updatedUser, lastRefreshed: Date.now(), loading: false });
        } catch (error: any) {
          set({ error: error.message || 'Failed to update user name', loading: false });
          throw error;
        }
      },

      updatePreferences: async (updates) => {
        set({ loading: true, error: null });
        try {
          const updatedUser = await userService.updatePreferences(updates);
          set({ user: updatedUser, lastRefreshed: Date.now(), loading: false });
        } catch (error: any) {
          set({ error: error.message || 'Failed to update preferences', loading: false });
          throw error;
        }
      },

      clearError: () => set({ error: null }),

      // 新增：获取当前用户（带缓存检查）
      getCurrentUser: async (): Promise<Models.User<UserPreferences> | null> => {
        const state = get();
        const now = Date.now();

        // 检查缓存是否过期
        const isCacheExpired = !state.lastRefreshed || (now - state.lastRefreshed) >= USER_CACHE_TTL;

        if (state.user && !isCacheExpired) {
          // 缓存未过期，直接返回
          return state.user;
        }

        // 缓存过期或没有用户，尝试刷新
        try {
          const freshUser = await userService.getUser();
          if (freshUser) {
            set({ user: freshUser, lastRefreshed: Date.now() });
            return freshUser;
          } else {
            // 用户已登出或无效
            set({ user: null, lastRefreshed: null });
            return null;
          }
        } catch (error) {
          console.error("Failed to refresh user:", error);
          // 返回缓存的用户（即使可能过时），避免破坏用户体验
          return state.user;
        }
      },

      // 新增：强制刷新用户数据
      refreshUser: async () => {
        set({ loading: true });
        try {
          const freshUser = await userService.getUser();
          set({ user: freshUser, lastRefreshed: Date.now(), loading: false });
        } catch (error: any) {
          console.error("Failed to refresh user:", error);
          set({ error: error.message || 'Failed to refresh user data', loading: false });
          // 注意：这里不设置 user 为 null，以免意外登出用户
        }
      },
    }),
    {
      name: 'auth-storage',
      storage: storage,
      partialize: (state) => ({
        // 持久化 user 和 lastRefreshed
        user: state.user,
        lastRefreshed: state.lastRefreshed,
      }),
    }
  )
);

export default useAuthStore;