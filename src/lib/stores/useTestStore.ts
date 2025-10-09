// src/lib/stores/useTestStore.ts
import userWordService from '@/src/lib/services/userWordService';
import wordService from '@/src/lib/services/wordService';
import { preTestMachine } from '@/src/lib/statemachines/preTestMachine';
import useAuthStore from '@/src/lib/stores/useAuthStore';
import useDailyLearningStore from '@/src/lib/stores/useDailyLearningStore';
import { CreateUserWordProgress } from '@/src/types/UserWordProgress';
import { CreateUserWordTestHistory } from '@/src/types/UserWordTestHistory';
import { Word } from '@/src/types/Word';
import { Actor, createActor } from 'xstate';
import { create } from 'zustand';
import actionLogService from '../services/actionLogService';

// --- 类型定义 ---
type TestType = 'pre_test' | 'post_test';
type TestActivity = 'transEn' | 'transCh' | 'spelling' | 'pronunce' | 'listen';
type PreTestMachineStateValue = `flow${number}_${TestActivity}` | `L${number}`;
type PreTestActor = Actor<typeof preTestMachine>;

interface LastAnswerResult {
  correct: boolean;
  responseTimeMs?: number;
}

// --- 优化后的 Store 状态接口 ---
interface TestState {
  // --- 核心状态 ---
  wordIds: string[]; // 只存储单词ID，不存储完整的单词对象
  currentWord: Word | null; // 当前单词
  nextWord: Word | null; // 预加载的下一个单词
  currentActor: PreTestActor | null;
  currentActorSnapshot: any;
  currentWordIndex: number;
  isLoading: boolean;
  error: string | null;
  testType: TestType | null;
  
  // --- 新增状态 ---
  activityType: number | null;
  lastAnswerResult: LastAnswerResult | null;
  isTestFinished: boolean;
  
  // --- Actions ---
  initializeTest: (sessionId: string, testType: TestType) => Promise<void>;
  handleAnswer: (result: { correct: boolean; wordId: string; responseTimeMs?: number; speedUsed?: number }) => Promise<void>;
  loadNextWord: () => Promise<void>;
  loadCurrentWord: () => Promise<void>;
  setError: (error: string | null) => void;
  reset: () => void;
  createActorForCurrentWord: () => Promise<void>;
  setIsLoading: (isLoading: boolean) => void;
}

// --- Store 实现 ---
export const useTestStore = create<TestState>()((set, get) => ({
  // --- 初始状态 ---
  wordIds: [],
  currentWord: null,
  nextWord: null,
  currentActor: null,
  currentActorSnapshot: null,
  currentWordIndex: 0,
  isLoading: true,
  error: null,
  testType: null,
  activityType: null,
  lastAnswerResult: null,
  isTestFinished: false,

  // --- Actions ---
  initializeTest: async (sessionId, testType) => {
    console.log('[TestStore] Initializing test for session:', sessionId, 'type:', testType);
    set({ 
      isLoading: true, 
      error: null, 
      testType, 
      currentActor: null, 
      currentActorSnapshot: null, 
      activityType: null, 
      lastAnswerResult: null,
      currentWord: null,
      nextWord: null
    });
    
    try {
      const { session: fetchedSession } = useDailyLearningStore.getState();
      if (!fetchedSession || fetchedSession.$id !== sessionId) {
        throw new Error('Session not found or mismatch');
      }
      
      const { user } = useAuthStore.getState();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // 只获取单词ID列表
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
        set({ wordIds: [], isLoading: false });
        return;
      }

      console.log(`[TestStore] Found ${wordIds.length} words for test`);
      
      // 获取初始进度
      const progressField = testType === 'pre_test' ? 'pre_test_progress' : 'post_test_progress';
      const initialProgress = fetchedSession[progressField] || `0/${wordIds.length}`;
      const initialIndex = +(initialProgress.split('/')[0]);

      set({
        wordIds,
        currentWordIndex: initialIndex,
        error: null,
        activityType: null,
        lastAnswerResult: null,
        isTestFinished: false,
      });

      // 初始化会话进度
      const sessionStatus = testType === 'pre_test' ? 1 : 3;
      await useDailyLearningStore.getState().updateSessionProgress(sessionId, {
        status: sessionStatus,
        [progressField]: initialProgress,
      });

      console.log('[TestStore] Session progress initialized. initialIndex:', initialIndex);

      // 加载当前单词和预加载下一个单词
      if (initialIndex < wordIds.length) {
        console.log('[TestStore] Loading current word and preloading next word');
        await get().loadCurrentWord();
      } else {
        set({ isTestFinished: true, isLoading: false });
      }
      
    } catch (err: any) {
      console.error('[TestStore] Failed to initialize test:', err);
      set({ error: err instanceof Error ? err.message : '初始化测试失败', isLoading: false });
    }
  },

  // 新增：加载当前单词
  loadCurrentWord: async () => {
    const { wordIds, currentWordIndex, testType } = get();
    
    if (currentWordIndex >= wordIds.length) {
      set({ isTestFinished: true, isLoading: false });
      return;
    }

    set({ isLoading: true });
    
    try {
      const currentWordId = wordIds[currentWordIndex];
      console.log(`[TestStore] Loading current word: ${currentWordId}`);
      
      // 加载当前单词
      const currentWord = await wordService.getWordById(currentWordId);
      if (!currentWord) {
        throw new Error(`无法加载单词: ${currentWordId}`);
      }

      // 预加载下一个单词（如果存在）
      let nextWord = null;
      if (currentWordIndex + 1 < wordIds.length) {
        const nextWordId = wordIds[currentWordIndex + 1];
        console.log(`[TestStore] Preloading next word: ${nextWordId}`);
        try {
          nextWord = await wordService.getWordById(nextWordId);
        } catch (error) {
          console.warn(`[TestStore] Failed to preload next word ${nextWordId}:`, error);
          // 预加载失败不影响当前流程
        }
      }

      set({ 
        currentWord, 
        nextWord,
        isLoading: false 
      });

      // 为当前单词创建 actor
      await get().createActorForCurrentWord();
      
    } catch (err: any) {
      console.error('[TestStore] Failed to load current word:', err);
      set({ 
        error: `加载单词失败: ${err.message}`, 
        isLoading: false 
      });
    }
  },

  // 修改：处理答案
  handleAnswer: async (result) => {
    console.log('[TestStore] handleAnswer called with result:', result);
    const { session } = useDailyLearningStore.getState();
    const { user: appwriteUser } = useAuthStore.getState();
    const { currentActor, testType, activityType } = get();
    
    if (!currentActor || !appwriteUser || !session) {
      const errorMsg = '[TestStore] Missing data for handling answer (actor, user, or session)';
      console.error(errorMsg);
      set({ error: errorMsg });
      return;
    }

    // 记录操作日志
    try {
      const phase = testType === 'pre_test' ? 1 : 3;
      actionLogService.logAction({
        user_id: appwriteUser.$id,
        word_id: result.wordId,
        session_id: session.$id,
        phase: phase,
        action_type: activityType!,
        is_correct: result.correct,
        response_time_ms: result.responseTimeMs,
        speed_used: result.speedUsed,
      });
    } catch (e) {
      console.warn('[TestStore] Failed to log action:', e);
    }

    try {
      // 存储答题结果
      const answerDetail: LastAnswerResult = {
        correct: result.correct,
        responseTimeMs: result.responseTimeMs,
      };
      set({ lastAnswerResult: answerDetail });

      // 发送答案给状态机
      const answerPayload: 'success' | 'fail' = result.correct ? 'success' : 'fail';
      if (activityType !== 6) {
        currentActor.send({ type: 'ANSWER', answer: answerPayload });
        console.log(`[TestStore] ANSWER event sent for word ${result.wordId}.`);
      }
    } catch (err: any) {
      console.error('[TestStore] Failed to handle answer:', err);
      set({ error: `处理答题结果时发生错误: ${err.message}` });
    }
  },

  // 修改：加载下一个单词
  loadNextWord: async () => {
    console.log('[TestStore] loadNextWord called.');
    const { wordIds, currentWordIndex, nextWord } = get();
    const nextIndex = currentWordIndex + 1;

    if (nextIndex >= wordIds.length) {
      console.log('[TestStore] No more words, test completed.');
      set({ isTestFinished: true, currentWord: null, nextWord: null, isLoading: false });
      return;
    }

    console.log('[TestStore] Moving to word index', nextIndex);
    
    // 如果已经预加载了下一个单词，直接使用
    if (nextWord) {
      set({ 
        currentWordIndex: nextIndex,
        currentWord: nextWord,
        currentActor: null,
        currentActorSnapshot: null,
        activityType: null,
        lastAnswerResult: null,
        isLoading: true // 设置为 true，等待创建 actor
      });

      // 预加载再下一个单词
      const nextNextIndex = nextIndex + 1;
      let nextNextWord = null;
      if (nextNextIndex < wordIds.length) {
        const nextNextWordId = wordIds[nextNextIndex];
        console.log(`[TestStore] Preloading next next word: ${nextNextWordId}`);
        try {
          nextNextWord = await wordService.getWordById(nextNextWordId);
        } catch (error) {
          console.warn(`[TestStore] Failed to preload next next word ${nextNextWordId}:`, error);
        }
      }

      set({ nextWord: nextNextWord });

      // 为当前单词创建 actor
      await get().createActorForCurrentWord();
    } else {
      // 如果没有预加载，重新加载当前单词
      set({ 
        currentWordIndex: nextIndex,
        currentWord: null,
        nextWord: null,
        currentActor: null,
        currentActorSnapshot: null,
        activityType: null,
        lastAnswerResult: null,
        isLoading: true
      });
      
      await get().loadCurrentWord();
    }
  },

  setError: (error) => {
    console.log('[TestStore] setError called with:', error);
    set({ error });
  },

  reset: () => {
    console.log('[TestStore] Resetting store...');
    const { currentActor } = get();
    if (currentActor) {
      try {
        currentActor.stop();
        console.log('[TestStore] Current actor stopped.');
      } catch (e: any) {
        console.warn('[TestStore] Error stopping current actor:', e);
      }
    }
    set({
      wordIds: [],
      currentWord: null,
      nextWord: null,
      currentActor: null,
      currentActorSnapshot: null,
      currentWordIndex: 0,
      isLoading: true,
      error: null,
      testType: null,
      activityType: null,
      lastAnswerResult: null,
      isTestFinished: false,
    });
    console.log('[TestStore] Store reset completed.');
  },

  // 修改：为当前单词创建 actor
  createActorForCurrentWord: async () => {
    set({ isLoading: true, activityType: null, lastAnswerResult: null });
    
    const { session } = useDailyLearningStore.getState();
    const { user: appwriteUser } = useAuthStore.getState();
    const { currentWord, testType, wordIds, currentWordIndex } = get();
    
    console.log('[TestStore] createActorForCurrentWord called.', currentWordIndex, wordIds.length);
    
    if (!currentWord || !appwriteUser || !session) {
      console.error('[TestStore] Cannot create actor: Missing data (word, user, or session)');
      set({ isLoading: false, error: '无法创建测试：缺少单词、用户或会话数据' });
      return;
    }

    const userId = appwriteUser.$id;
    const wordId = currentWord.$id;
    const phase = testType === 'pre_test' ? 1 : 3;
    const testDate = new Date().toISOString().split('T')[0];

    try {
      // 停止旧的 actor
      const oldActor = get().currentActor;
      if (oldActor) {
        console.log('[TestStore] Stopping old actor before creating new one.');
        oldActor.stop();
      }

      // 获取历史等级
      console.log(`[TestStore] Fetching history levels for word ${wordId}`);
      const historyLevels = await userWordService.getHistoryLevels(userId, wordId);
      console.log(`[TestStore] History levels for ${currentWord.spelling}:`, historyLevels);

      // 创建新的 actor
      console.log(`[TestStore] Creating actor for word ${wordId}`);
      const newActor = createActor(preTestMachine, {
        input: {
          historyLevels: historyLevels
        },
      });

      // 设置订阅
      console.log(`[TestStore] Setting up subscription for actor of word ${wordId}`);
      const unsubscribe = newActor.subscribe((state) => {
        console.log(`[TestStore] Actor state changed for word ${wordId}: VALUE = '${state.value}' TYPEOF = ${typeof state.value}`);
        
        // --- 解析并更新当前活动类型 ---
        const stateValue: PreTestMachineStateValue = state.value as PreTestMachineStateValue;
        if (typeof stateValue === 'string' && stateValue.includes('_') && !stateValue.startsWith('L')) {
          // 例如，从 'flow1_transEn' 提取 'transEn'
          const parts = stateValue.split('_');
          if (parts.length >= 2) {
            const activityPart = parts[parts.length - 1];

            // 将 TestActivity 映射到数字
            const testActivityTypeMap: Record<string, number> = {
              'listen': 1, 'transEn': 2, 'transCh': 3, 'spelling': 4, 'pronunce': 5, 'learn': 6
            };
            // 验证是否为有效的 TestActivity
            if (testActivityTypeMap.hasOwnProperty(activityPart)) {
              const activityTypeNumber = testActivityTypeMap[activityPart];
              console.log(`[TestStore] Actor entered activity state: ${stateValue}, parsed activity: ${activityPart}`);
              set({ activityType: activityTypeNumber });
            } else {
              console.warn(`[TestStore] Parsed activity part '${activityPart}' is not a valid TestActivity for word ${wordId}.`);
              // 可以选择重置 activityType
              set({ activityType: null });
            }
          }
        }

        // --- 处理最终状态 L* ---
        if (typeof stateValue === 'string' && stateValue.startsWith('L')) {
          console.log(`[TestStore] Final state L* reached for word ${wordId}.`);
          let finalLevel: number | undefined =
            (state.output as { level?: number })?.level ??
            (state.context as { level?: number })?.level;
          if (finalLevel === undefined) {
            const levelMatch = stateValue.match(/^L(\d+)$/);
            if (levelMatch) {
              finalLevel = parseInt(levelMatch[1], 10);
            }
          }
          console.log('[TestStore] Final level extracted for word:', wordId, 'Level:', finalLevel);

          if (finalLevel !== undefined && !isNaN(finalLevel)) {
            (async () => {
              // --- 关键修改：在最终状态 L* 时，先保存 UserWordTestHistory ---
              const { currentWord, currentWordIndex, activityType, lastAnswerResult, wordIds } = get();

              if (!activityType) {
                console.error('[TestStore] Cannot save history in final state: activityType is not set.');
                set({ error: `保存单词 ${currentWord!.spelling} 的测试历史时出现问题：活动类型未知` });
                return; // 如果活动类型未知，则不继续保存
              }
              if (!lastAnswerResult) {
                console.error('[TestStore] Cannot save history in final state: lastAnswerResult is not set.');
                set({ error: `保存单词 ${currentWord!.spelling} 的测试历史时出现问题：答题结果未知` });
                return; // 如果答题结果未知，则不继续保存
              }

              const testData: CreateUserWordTestHistory = {
                user_id: userId,
                word_id: wordId,
                phase, // 1 for pre-test, 3 for post-test
                test_date: testDate,
                test_level: finalLevel, // 使用最终确定的等级
              };
              console.log('[TestStore] Saving test history in final state:', testData);
              try {
                await userWordService.upsertUserWordTestHistory(testData);
                console.log('[TestStore] Test history saved for word:', wordId);
              } catch (historyError: any) {
                console.error('[TestStore] Failed to save user word test history for word:', wordId, historyError);
                set({ error: `保存单词 ${currentWord!.spelling} 的测试历史时出现问题` });
                // 即使历史保存失败，也继续尝试保存进度
              }

              // --- 然后保存 UserWordProgress ---
              try {
                const isLongDifficult = currentWord!.spelling.length > 8 && currentWord!.syllable_count >= 3;
                const progressData: CreateUserWordProgress = {
                  user_id: userId,
                  word_id: wordId,
                  proficiency_level: finalLevel!,
                  is_long_difficult: isLongDifficult
                };
                console.log('[TestStore] Saving user word progress for word:', wordId);
                await userWordService.upsertUserWordProgress(progressData);
                console.log('[TestStore] User word progress saved for word:', wordId, 'to level:', finalLevel);

              } catch (progressError: any) {
                console.error('[TestStore] Failed to save user word progress for word:', wordId, progressError);
                set({ error: `保存单词 ${currentWord!.spelling} 进度时出现问题` });
              }
              
              // 更新 DailyLearningStore 的进度 - 使用 wordIds.length 而不是 wordList.length
              const progressField = testType === 'pre_test' ? 'pre_test_progress' : 'post_test_progress';
              await useDailyLearningStore.getState().updateSessionProgress(session.$id, {
                [progressField]: `${currentWordIndex + 1}/${wordIds.length}`,
              });
            })();
          } else {
            console.warn(`[TestStore] Could not determine final level for word ${wordId} from state '${stateValue}'`);
            set({ error: `无法确定单词 ${currentWord.spelling} 的最终掌握等级` });
          }
        }
        set({ currentActorSnapshot: state });
      });

      // 启动 actor
      newActor.start();
      console.log(`[TestStore] Actor for word ${wordId} started.`);

      // 发送 START 事件
      newActor.send({ type: 'START' });
      console.log(`[TestStore] START event sent for word ${wordId}.`);

      // 更新 store 状态
      set({
        currentActor: newActor,
        isLoading: false
      });

    } catch (err: any) {
      console.error(`[TestStore] Failed to create actor for word ${wordId}:`, err);
      set({ 
        error: `为单词 ${currentWord?.spelling || wordId} 创建测试时出错: ${err.message}`,
        isLoading: false 
      });
    }
  },

  setIsLoading: (isLoading) => set({ isLoading }),
}));

export default useTestStore;