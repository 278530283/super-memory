// src/lib/stores/useDailyLearningStore.ts
import dailyLearningService from '@/src/lib/services/dailyLearningService';
import { DailyLearningSession } from '@/src/types/DailyLearningSession';
import { create } from 'zustand';

interface DailyLearningState {
  session: DailyLearningSession | null;
  loading: boolean;
  error: string | null;
  getSession: (userId: string, sessionDate: string) => Promise<void>;
  createSession: (
    userId: string,
    modeId: string,
    initialWordIds: { pre_test: string[]; post_test: string[] }
  ) => Promise<void>;
  updateSessionProgress: (sessionId: string, updates: Partial<DailyLearningSession>) => Promise<void>;
  recordWordAction: (actionData: any) => Promise<void>;
  clearError: () => void;
  addIncrementalWords: (
    sessionId: string,
    userId: string,
    modeId: string,
    difficultyLevel: number
  ) => Promise<void>;
}

const useDailyLearningStore = create<DailyLearningState>((set) => ({
  session: null,
  loading: false,
  error: null,
  getSession: async (userId, sessionDate) => {
    set({ loading: true, error: null });
    try {
      const session = await dailyLearningService.getTodaysSession(userId, sessionDate);
      console.log("getSession Session:", session);
      set({ session, loading: false });
    } catch (error: any) {
      // Specific handling for 404 (session not found) vs other errors
      if (error.code === 404 || (error.message && error.message.includes('not found'))) {
        set({ session: null, loading: false }); // Session doesn't exist yet
      } else {
        set({ error: error.message || 'Failed to get session', loading: false });
      }
    }
  },
  createSession: async (userId, modeId, initialWordIds) => { // Add initialWordIds parameter
    set({ loading: true, error: null });
    try {
      // Pass the initialWordIds object directly to the service
      const session = await dailyLearningService.createSession(userId, modeId, initialWordIds);
      set({ session, loading: false });
    } catch (error: any) {
      set({ error: error.message || 'Failed to create session', loading: false });
    }
  },
  updateSessionProgress: async (sessionId, updates) => {
    set({ error: null });
    try {
      const updatedSession = await dailyLearningService.updateSession(sessionId, updates);
      set({ session: updatedSession});
    } catch (error: any) {
      set({ error: error.message || 'Failed to update session' });
    }
  },
  recordWordAction: async (actionData) => {
    try {
      await dailyLearningService.recordWordAction(actionData);
    } catch (error: any) {
      console.error("Failed to record word action in store:", error);
      // Optionally set an error in the store if UI feedback is needed
      // set({ error: error.message || 'Failed to record action' });
    }
  },
  clearError: () => set({ error: null }),
  addIncrementalWords: async (sessionId, userId, modeId, difficultyLevel) => {
    set({ error: null });
    try {
      const updatedSession = await dailyLearningService.addIncrementalWordsToSession(
        sessionId,
        userId,
        modeId,
        difficultyLevel
      );
      console.log("Updated session:", updatedSession);
      set({ session: updatedSession });
    } catch (error: any) {
      set({ error: error.message || 'Failed to add incremental words' });
      throw error; // 重新抛出错误以便在组件中处理
    }
  },
}));

export default useDailyLearningStore;