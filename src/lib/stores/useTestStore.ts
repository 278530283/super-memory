// src/lib/stores/useTestStore.ts
import userWordService from '@/src/lib/services/userWordService';
import wordService from '@/src/lib/services/wordService';
import { preTestMachine } from '@/src/lib/statemachines/preTestMachine';
import useAuthStore from '@/src/lib/stores/useAuthStore';
import useDailyLearningStore from '@/src/lib/stores/useDailyLearningStore';
import { DailyLearningSession } from '@/src/types/DailyLearningSession';
import { UserPreferences } from '@/src/types/User';
import { CreateUserWordProgress } from '@/src/types/UserWordProgress';
import { CreateUserWordTestHistory } from '@/src/types/UserWordTestHistory';
import { Word } from '@/src/types/Word';
import { Actor, createActor } from 'xstate';
import { create } from 'zustand';

// --- 类型定义 ---
type TestType = 'pre_test' | 'post_test';

// 定义 preTestMachine 支持的测试活动类型 (根据状态机实际输出调整)
// 注意：这里的名称需要与从状态机状态值 (如 'flow1_transEn') 中解析出的活动名称匹配
// app/index.tsx 中使用了 transEn, transCh, spelling, pronunce, listen
type TestActivity = 'transEn' | 'transCh' | 'spelling' | 'pronunce' | 'listen';

// 定义 preTestMachine 的状态值类型 (根据您的规则调整)
type PreTestMachineStateValue =
  | `flow${number}_${TestActivity}` // 流程中的活动状态，例如 flow1_transEn, flow2_spelling
  | `L${number}`; // 最终确定等级的状态，例如 L0, L1, ..., L4

// 定义 PreTestActor 类型，只传入 TLogic
// 确保从 'xstate' 正确导入了 Actor 类型
type PreTestActor = Actor<typeof preTestMachine>; // ✅ 修复了 TypeScript 错误

interface TestState {
  // --- 状态 ---
  wordList: Word[];
  actors: Record<string, PreTestActor>;
  currentWordIndex: number;
  isLoading: boolean;
  error: string | null;
  session: DailyLearningSession | null;
  userPreferences: UserPreferences | null;
  appwriteUser: any | null; // Models.User<...> | null
  sessionId: string | null;
  testType: TestType | null;

  // --- Selectors (计算属性) ---
  // 注意：这里的类型是函数，因为它是一个 selector
  currentWord: () => Word | null;
  currentActor: () => PreTestActor | null;
  currentActorSnapshot: () => any; // XState State type
  currentTestActivity: () => TestActivity | null;
  totalWords: () => number;
  currentWordNumber: () => number;
  isTestCompleted: () => boolean;

  // --- Actions ---
  initializeTest: (sessionId: string, testType: TestType) => Promise<void>;
  handleAnswer: (result: { correct: boolean; wordId: string; responseTimeMs?: number }) => Promise<void>;
  nextWord: () => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

// --- Store 实现 ---
export const useTestStore = create<TestState>()((set, get) => ({
  // --- 初始状态 ---
  wordList: [],
  actors: {},
  currentWordIndex: 0,
  isLoading: true,
  error: null,
  session: null,
  userPreferences: null,
  appwriteUser: null,
  sessionId: null,
  testType: null,

  // --- Selectors (计算属性) ---
  currentWord: () => {
    const { wordList, currentWordIndex } = get();
    return wordList[currentWordIndex] || null;
  },
  currentActor: () => {
    const { currentWord, actors } = get();
    const wordObj = currentWord(); // 获取实际的 Word 对象
    return wordObj ? actors[wordObj.$id] || null : null;
  },
  currentActorSnapshot: () => {
    const { currentActor } = get();
    const actorObj = currentActor();
    return actorObj ? actorObj.getSnapshot() : null;
  },
  currentTestActivity: () => {
    const snapshot = get().currentActorSnapshot();
    if (!snapshot) return null;

    const stateValue: PreTestMachineStateValue = snapshot.value;
    // 检查是否是流程状态 'flowX_activityName'
    if (typeof stateValue === 'string') {
        const match = stateValue.match(/^flow\d+_(.+)$/);
        if (match) {
            const activityName = match[1] as TestActivity;
            // 确保 activityName 是预定义的有效 TestActivity
            if (['transEn', 'transCh', 'spelling', 'pronunce', 'listen'].includes(activityName)) {
                return activityName;
            } else {
                 console.warn(`[TestStore] Unrecognized test activity from state: ${activityName}`);
                 return null; // 返回 null 表示未知或结束状态
            }
        }
    }
    // 如果是 'L*' 状态，则表示测试结束，没有活动
    return null;
  },
  totalWords: () => get().wordList.length,
  currentWordNumber: () => get().currentWordIndex + 1,
  isTestCompleted: () => {
    const { currentWordIndex, wordList } = get();
    return wordList.length > 0 && currentWordIndex >= wordList.length;
  },

  // --- Actions ---
  initializeTest: async (sessionId, testType) => {
    console.log('[TestStore] Initializing test for session:', sessionId, 'type:', testType);
    set({ isLoading: true, error: null, sessionId, testType });
    try {
      // 1. 获取 session (从外部 store)
      const { session: fetchedSession } = useDailyLearningStore.getState();
      if (!fetchedSession || fetchedSession.$id !== sessionId) {
        throw new Error('Session not found or mismatch');
      }
      
      // 2. 获取用户信息 (从 useAuthStore)
      const { userPreferences: fetchedUserPreferences, user: fetchedAppwriteUser } = useAuthStore.getState();
      if (!fetchedUserPreferences || !fetchedAppwriteUser) {
         throw new Error('User not authenticated');
      }

      set({ 
        session: fetchedSession, 
        userPreferences: fetchedUserPreferences,
        appwriteUser: fetchedAppwriteUser
      });

      // 3. 获取单词 ID 列表
      let wordIds: string[] = [];
      switch (testType) {
        case 'pre_test':
          wordIds = fetchedSession.pre_test_word_ids || [];
          break;
        case 'post_test':
          wordIds = fetchedSession.post_test_word_ids || [];
          break;
        default:
          throw new Error(`不支持的测试类型: ${testType}`);
      }

      if (wordIds.length === 0) {
        console.warn('[TestStore] No words found for test.');
        set({ wordList: [], actors: {}, isLoading: false });
        return;
      }

      // 4. 获取单词详情
      console.log('[TestStore] Fetching words by spellings...');
      const fetchedWords = await wordService.getWordsByIds(wordIds);
      console.log(`[TestStore] Fetched ${fetchedWords.length} words.`);

      // 5. 为每个单词初始化 preTestMachine actor 实例
      const newActors: Record<string, PreTestActor> = {};
      const userId = fetchedAppwriteUser.$id;
      if (!userId) {
          throw new Error('User ID not available');
      }
      console.log('[TestStore] Creating actors for words with userId:', userId);
      for (const word of fetchedWords) {
        console.log(`[TestStore] Processing word: ${word.spelling} (${word.$id})`);
        const historyLevels = await userWordService.getHistoryLevels(userId, word.$id);
        console.log(`[TestStore] History levels for ${word.spelling}:`, historyLevels);

        const actor = createActor(preTestMachine, {
          input: {
            historyLevels: historyLevels, // 传入历史等级数组 (number[])
            // 可以根据需要添加 phase 等其他输入
          },
        });
        actor.start();
        console.log(`[TestStore] Actor for ${word.spelling} started.`);
        actor.send({ type: 'START' });
        console.log(`[TestStore] START event sent for ${word.spelling}.`);
        newActors[word.$id] = actor;
      }

      // 6. 更新 store 状态
      console.log('[TestStore] Updating store state with words and actors.');
      set({
        wordList: fetchedWords,
        actors: newActors,
        currentWordIndex: 0,
        isLoading: false,
        error: null,
      });

      // 7. 初始化进度 (调用外部 store 的方法)
      console.log('[TestStore] Initializing session progress...');
      const progressField = testType === 'pre_test' ? 'pre_test_progress' : 'post_test_progress';
      if (!fetchedSession[progressField] || fetchedSession[progressField]?.startsWith('0/')) {
        useDailyLearningStore.getState().updateSessionProgress(sessionId, {
          [progressField]: `0/${wordIds.length}`,
        });
        console.log('[TestStore] Session progress initialized.');
      } else {
        console.log('[TestStore] Session progress already initialized.');
      }

    } catch (err: any) {
      console.error('[TestStore] Failed to initialize test:', err);
      set({ error: err instanceof Error ? err.message : '初始化测试失败', isLoading: false });
    }
  },

  handleAnswer: async (result) => {
    console.log('[TestStore] handleAnswer called with result:', result);
    const { wordList, currentWordIndex, session, userPreferences, appwriteUser, actors, testType: currentTestType, sessionId } = get();
    const currentWord = wordList[currentWordIndex];
    const currentActor = currentWord ? actors[currentWord.$id] : null;

    if (!currentWord || !currentActor || !session || !userPreferences || !appwriteUser || !currentTestType || !sessionId) {
      const errorMsg = '[TestStore] Missing data for handling answer';
      console.error(errorMsg);
      set({ error: errorMsg });
      return;
    }

    const userId = appwriteUser.$id;
    if (!userId) {
        const errorMsg = '[TestStore] User ID not found';
        console.error(errorMsg);
        set({ error: errorMsg });
        return;
    }
    const wordId = currentWord.$id;
    const { correct, responseTimeMs } = result;
    const phase = currentTestType === 'pre_test' ? 1 : 3; // 假设 pre_test 对应 phase 1，post_test 对应 phase 2
    const testDate = new Date().toISOString().split('T')[0];

    try {
      // 1. 获取当前测试活动类型，用于保存历史记录
      const testActivity = get().currentTestActivity();
      console.log('[TestStore] Current test activity:', testActivity);

      if (!testActivity) {
         const warnMsg = '[TestStore] Could not determine current test activity for history record.';
         console.warn(warnMsg);
         // 可以选择 alert 用户或记录日志
         // set({ error: warnMsg }); // 可选：设置错误
      } else {
          // 2. 记录答题结果到 UserWordTestHistory
          // 注意：这里的 test_type 需要与数据库和 TestActivityTypeMap 对应
          // 我们需要一个从 TestActivity (状态机输出) 到 test_type (数字) 的映射
          const testActivityTypeMap: Record<TestActivity, number> = {
            listen: 1,      // 听单词
            transEn: 2,     // 英译中
            transCh: 3,     // 中译英 (如果使用)
            spelling: 4,    // 拼写
            pronunce: 5,    // 跟读 (注意 app/index.tsx 中拼写为 'pronunce')
          };

          // 确保 testActivity 在映射中
          const testTypeNumeric = testActivityTypeMap[testActivity];
          if (testTypeNumeric === undefined) {
              const errorMsg = `[TestStore] No test_type mapping found for activity: ${testActivity}`;
              console.error(errorMsg);
              set({ error: errorMsg });
              return; // 或 throw error
          }

          const testData: CreateUserWordTestHistory = {
            user_id: userId,
            word_id: wordId,
            phase: phase,
            test_date: testDate,
            test_level: 0, // 初始等级，后续可能由状态机更新或单独记录
          };
          console.log('[TestStore] Saving test history:', testData);
          await userWordService.createUserWordTestHistory(testData);
          console.log('[TestStore] Test history saved for word:', wordId, 'Activity:', testActivity);
      }

      // 3. 将答题结果发送给 preTestMachine actor
      // 根据 app/index.tsx，preTestMachine 期望 { type: 'ANSWER', answer: 'success' | 'fail' }
      const answerPayload: 'success' | 'fail' = result.correct ? 'success' : 'fail';
      console.log(`[TestStore] Sending ANSWER (${answerPayload}) for word ${wordId}`);
      // ✅ 修改点：发送事件后，立即调用 getSnapshot() 获取新状态
      currentActor.send({ type: 'ANSWER', answer: answerPayload });
    
      // ✅ 关键：获取并记录最新的状态快照
      const nextStateSnapshot = currentActor.getSnapshot();
      console.log('[TestStore] State after sending ANSWER:', nextStateSnapshot.value);

      // 4. 根据 preTestMachine 的返回状态决定下一步
      const nextStateValue: PreTestMachineStateValue = nextStateSnapshot.value as PreTestMachineStateValue;

      if (typeof nextStateValue === 'string' && nextStateValue.startsWith('flow')) {
        console.log('[TestStore] Continuing to next test activity for word:', wordId);
        // UI 会自动响应状态变化
      } else if (typeof nextStateValue === 'string' && nextStateValue.startsWith('L')) {
        console.log('[TestStore] Final state reached for word:', wordId, 'State:', nextStateValue);
        // --- 处理最终状态 ---
        // a. 从状态机快照中提取最终等级
        let finalLevel: number | undefined = 
        (nextStateSnapshot.output as { level?: number })?.level ?? 
        (nextStateSnapshot.context as { level?: number })?.level;

        console.log('[TestStore] Final level extracted:', finalLevel);

        // b. 保存最终等级到 UserWordProgress
        if (finalLevel !== undefined && !isNaN(finalLevel)) {
            try {
                const progressData: Partial<Omit<CreateUserWordProgress, '$id'>> = {
                  user_id: userId,
                  word_id: wordId,
                  current_level: finalLevel,
                  // ... 其他需要更新的字段
                };
                console.log('[TestStore] Saving user word progress:', progressData);
                await userWordService.createUserWordProgress(progressData);
                console.log('[TestStore] User word progress updated for word:', wordId, 'to level:', finalLevel);
            } catch (progressError: any) {
                 console.error('[TestStore] Failed to update user word progress:', progressError);
                 set({ error: `保存单词进度时出现问题: ${progressError.message}` });
            }
        } else {
            const warnMsg = `[TestStore] Could not determine final level from state '${nextStateValue}' for word ${wordId}`;
            console.warn(warnMsg);
            set({ error: '无法确定单词的最终掌握等级' });
        }
        // c. 注意：移动到下一个单词的逻辑由 TestScreen 组件处理

      } else {
        const warnMsg = `[TestStore] Unexpected state from preTestMachine: ${nextStateValue}`;
        console.warn(warnMsg);
        set({ error: `测试流程出现意外状态: ${nextStateValue}` });
      }

    } catch (err: any) {
      console.error('[TestStore] Failed to handle answer:', err);
      set({ error: `处理答题结果时发生错误: ${err.message}` });
    }
  },

  nextWord: () => {
    console.log('[TestStore] nextWord called.');
    set((state) => {
      const nextIndex = state.currentWordIndex + 1;
      if (nextIndex < state.wordList.length) {
        console.log(`[TestStore] Moving to word index ${nextIndex}.`);
        return { currentWordIndex: nextIndex };
      }
      console.log('[TestStore] No more words, test completed.');
      // isTestCompleted selector 会自动变为 true
      return {};
    });
  },

  setError: (error) => {
    console.log('[TestStore] setError called with:', error);
    set({ error });
  },
  reset: () => {
    console.log('[TestStore] Resetting store...');
    const { actors } = get();
    // 停止所有 actors
    Object.entries(actors).forEach(([wordId, actor]) => {
        if (actor && typeof actor.stop === 'function') {
            try {
                actor.stop();
                console.log(`[TestStore] Actor for word ${wordId} stopped.`);
            } catch (e: any) {
                console.warn(`[TestStore] Error stopping actor for word ${wordId}:`, e);
            }
        }
    });
    set({
      wordList: [],
      actors: {},
      currentWordIndex: 0,
      isLoading: true,
      error: null,
      session: null,
      userPreferences: null,
      appwriteUser: null,
      sessionId: null,
      testType: null,
    });
    console.log('[TestStore] Store reset completed.');
  },
}));
