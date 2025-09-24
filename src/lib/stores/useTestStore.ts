// src/lib/stores/useTestStore.ts
import userWordService from '@/src/lib/services/userWordService';
import wordService from '@/src/lib/services/wordService';
import { preTestMachine } from '@/src/lib/statemachines/preTestMachine';
import useAuthStore from '@/src/lib/stores/useAuthStore';
import useDailyLearningStore from '@/src/lib/stores/useDailyLearningStore';
import { CreateUserWordProgress } from '@/src/types/UserWordProgress';
import { CreateUserWordTestHistory } from '@/src/types/UserWordTestHistory'; // 导入类型
import { Word } from '@/src/types/Word';
import { Actor, createActor } from 'xstate';
import { create } from 'zustand';
import actionLogService from '../services/actionLogService';

// --- 类型定义 (与 preTestMachine 和 app/index.tsx 保持一致) ---
type TestType = 'pre_test' | 'post_test';
type TestActivity = 'transEn' | 'transCh' | 'spelling' | 'pronunce' | 'listen'; // 根据实际状态机调整
// 定义 preTestMachine 的状态值类型
type PreTestMachineStateValue =
  | `flow${number}_${TestActivity}` // 流程中的活动状态
  | `L${number}`; // 最终确定等级的状态
// 定义 XState Actor 类型
type PreTestActor = Actor<typeof preTestMachine>;

// 添加一个内部状态来存储最近一次答题的详情和当前活动类型
interface LastAnswerResult {
  correct: boolean;
  responseTimeMs?: number;
}

// --- Store 状态接口 (只包含原始状态) ---
interface TestState {
  // --- 原始状态 ---
  wordList: Word[];
  currentActor: PreTestActor | null;
  currentActorSnapshot: any; // XState State type
  currentWordIndex: number;
  isLoading: boolean;
  error: string | null;
  testType: TestType | null;
  // --- 新增状态 ---
  activityType: number | null; // 存储当前 XState Actor 的活动类型
  lastAnswerResult: LastAnswerResult | null; // 存储上一次答题的详情
  // --- Actions (修改状态的方法) ---
  initializeTest: (sessionId: string, testType: TestType) => Promise<void>;
  handleAnswer: (result: { correct: boolean; wordId: string; responseTimeMs?: number; speedUsed?: number }) => Promise<void>;
  nextWord: () => void;
  setError: (error: string | null) => void;
  reset: () => void;
  // 内部 helper，不暴露给外部组件
  createActorForCurrentWord: () => Promise<void>;
}

// --- Store 实现 ---
export const useTestStore = create<TestState>()((set, get) => ({
  // --- 初始原始状态 ---
  wordList: [],
  currentActor: null,
  currentActorSnapshot: null,
  currentWordIndex: 0,
  isLoading: true,
  error: null,
  testType: null,
  // --- 新增初始状态 ---
  activityType: null,
  lastAnswerResult: null,

  // --- Actions ---
  initializeTest: async (sessionId, testType) => {
    console.log('[TestStore] Initializing test for session:', sessionId, 'type:', testType);
    set({ isLoading: true, error: null, testType, currentActor: null, currentActorSnapshot: null, activityType: null, lastAnswerResult: null });
    try {
      const { session: fetchedSession } = useDailyLearningStore.getState();
      if (!fetchedSession || fetchedSession.$id !== sessionId) {
        throw new Error('Session not found or mismatch');
      }
      const { userPreferences: fetchedUserPreferences, user: fetchedAppwriteUser } = useAuthStore.getState();
      if (!fetchedUserPreferences || !fetchedAppwriteUser) {
         throw new Error('User not authenticated');
      }
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
        set({ wordList: [], isLoading: false });
        return;
      }
      console.log(`[TestStore] Found ${wordIds.length} words for test, fetching details...`, wordIds);
      console.log('[TestStore] Fetching words by ids...');
      const fetchedWords = await wordService.getWordsByIds(wordIds); // 确保使用正确的方法
      console.log(`[TestStore] Fetched ${fetchedWords.length} words.`);
      set({
        wordList: fetchedWords,
        currentWordIndex: 0,
        error: null,
        activityType: null,
        lastAnswerResult: null,
      });
      // 初始化进度
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
      // 为第一个单词创建 actor
      const { currentWordIndex: firstIndex } = get();
      if (firstIndex < fetchedWords.length) {
          await get().createActorForCurrentWord();
      }
    } catch (err: any) {
      console.error('[TestStore] Failed to initialize test:', err);
      set({ error: err instanceof Error ? err.message : '初始化测试失败', isLoading: false });
    }
  },

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

    try{
      const phase = testType === 'pre_test' ? 1 : 3; // 根据 testType 确定 phase
      actionLogService.logAction({
            user_id:appwriteUser.$id,
            word_id: result.wordId,
            session_id:session.$id,
            phase: phase,
            action_type: activityType!, // 英译中活动类型
            is_correct:result.correct,
            response_time_ms:result.responseTimeMs,
            speed_used:result.speedUsed,
          });
    }catch(e){
      console.warn('[TestStore] Failed to log action:', e);
    }

    try {
      // --- 关键修改：在发送 ANSWER 之前，将答题详情存入 store ---
      const answerDetail: LastAnswerResult = {
          correct: result.correct,
          responseTimeMs: result.responseTimeMs,
      };
      set({ lastAnswerResult: answerDetail });

      // 2. 将答题结果发送给 preTestMachine actor
      const answerPayload: 'success' | 'fail' = result.correct ? 'success' : 'fail';
      const currentWord = get().wordList[get().currentWordIndex];
      console.log(`[TestStore] Sending ANSWER (${answerPayload}) for word ${currentWord.$id}`);
      currentActor.send({ type: 'ANSWER', answer: answerPayload });
      console.log(`[TestStore] ANSWER event sent for word ${currentWord.$id}.`);
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
        return { currentWordIndex: nextIndex, activityType: null, lastAnswerResult: null }; // 移动到下一词时重置活动和答题结果
      }
      console.log('[TestStore] No more words, test completed.');
      return {};
    });
    // 在状态更新后，触发创建下一个单词的 actor
    setTimeout(async () => {
        const { currentWordIndex, wordList } = get();
        if (currentWordIndex < wordList.length) {
            await get().createActorForCurrentWord();
        }
    }, 0);
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
      wordList: [],
      currentActor: null,
      currentActorSnapshot: null,
      currentWordIndex: 0,
      isLoading: true,
      error: null,
      testType: null,
      // --- 重置新增状态 ---
      activityType: null,
      lastAnswerResult: null,
    });
    console.log('[TestStore] Store reset completed.');
  },

  // --- 内部 Helper: 为当前单词创建并启动 actor ---
  createActorForCurrentWord: async () => {
    // 这确保了在创建新 actor 期间，UI 不会显示旧的快照内容
    set({ isLoading: true, currentActorSnapshot: null, activityType: null, lastAnswerResult: null }); // 重置活动和答题详情
    const { session } = useDailyLearningStore.getState();
    const { user: appwriteUser } = useAuthStore.getState();
    const { wordList, currentWordIndex, testType } = get();
    const currentWord = wordList[currentWordIndex];
    if (!currentWord || !appwriteUser || !session) {
        console.error('[TestStore] Cannot create actor: Missing data (word, user, or session)');
        return;
    }
    const userId = appwriteUser.$id;
    const wordId = currentWord.$id;
    const phase = testType === 'pre_test' ? 1 : 3; // 根据 testType 确定 phase
    const testDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    try {
        // 1. 停止并清理旧的 actor (如果存在)
        const oldActor = get().currentActor;
        if (oldActor) {
            console.log('[TestStore] Stopping old actor before creating new one.');
            oldActor.stop();
        }

        // 2. 获取历史等级
        console.log(`[TestStore] Fetching history levels for word ${wordId}`);
        const historyLevels = await userWordService.getHistoryLevels(userId, wordId);
        console.log(`[TestStore] History levels for ${currentWord.spelling}:`, historyLevels);

        // 3. 创建新的 actor
        console.log(`[TestStore] Creating actor for word ${wordId}`);
        const newActor = createActor(preTestMachine, {
          input: {
            historyLevels: historyLevels
          },
        });

        // 4. 设置订阅
        console.log(`[TestStore] Setting up subscription for actor of word ${wordId}`);
        const unsubscribe = newActor.subscribe((state) => {
            console.log(`[TestStore] Actor state changed for word ${wordId}: VALUE = '${state.value}' TYPEOF = ${typeof state.value}`);
            set({ currentActorSnapshot: state });

            // --- 解析并更新当前活动类型 ---
            const stateValue: PreTestMachineStateValue = state.value as PreTestMachineStateValue;
            if (typeof stateValue === 'string' && stateValue.includes('_') && !stateValue.startsWith('L')) {
                // 例如，从 'flow1_transEn' 提取 'transEn'
                const parts = stateValue.split('_');
                if (parts.length >= 2) {
                    const activityPart = parts[parts.length - 1];
      
                    // 将 TestActivity 映射到数字
                    const testActivityTypeMap: Record<string, number> = {
                        'listen': 1, 'transEn': 2, 'transCh': 3, 'spelling': 4, 'pronunce': 5,
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
                        const { activityType, lastAnswerResult } = get();
                        if (!activityType) {
                            console.error('[TestStore] Cannot save history in final state: activityType is not set.');
                            set({ error: `保存单词 ${currentWord.spelling} 的测试历史时出现问题：活动类型未知` });
                            return; // 如果活动类型未知，则不继续保存
                        }
                        if (!lastAnswerResult) {
                            console.error('[TestStore] Cannot save history in final state: lastAnswerResult is not set.');
                            set({ error: `保存单词 ${currentWord.spelling} 的测试历史时出现问题：答题结果未知` });
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
                            set({ error: `保存单词 ${currentWord.spelling} 的测试历史时出现问题` });
                            // 即使历史保存失败，也继续尝试保存进度
                        }

                        // --- 然后保存 UserWordProgress ---
                        try {
                            const progressData: Partial<Omit<CreateUserWordProgress, '$id'>> = {
                              user_id: userId,
                              word_id: wordId,
                              current_level: finalLevel!,
                              current_speed: 50,
                            };
                            console.log('[TestStore] Saving user word progress for word:', wordId);
                            await userWordService.upsertUserWordProgress(progressData);
                            console.log('[TestStore] User word progress saved for word:', wordId, 'to level:', finalLevel);

                            // --- 最后，调用 nextWord ---
                            console.log('[TestStore] Calling nextWord after saving history and progress for word:', wordId);
                            // 使用 setTimeout 确保状态更新后再调用 nextWord
                            setTimeout(() => {
                              get().nextWord(); // 调用 store 的 nextWord action
                            }, 0);
                        } catch (progressError: any) {
                             console.error('[TestStore] Failed to save user word progress for word:', wordId, progressError);
                             set({ error: `保存单词 ${currentWord.spelling} 进度时出现问题` });
                        }
                    })();
                } else {
                    console.warn(`[TestStore] Could not determine final level for word ${wordId} from state '${stateValue}'`);
                    set({ error: `无法确定单词 ${currentWord.spelling} 的最终掌握等级` });
                }
            }
        });

        // 5. 启动 actor
        newActor.start();
        console.log(`[TestStore] Actor for word ${wordId} started.`);

        // 6. 发送 START 事件
        newActor.send({ type: 'START' });
        console.log(`[TestStore] START event sent for word ${wordId}.`);

        // 7. 更新 store 状态
        set({
            currentActor: newActor,
        });
    } catch (err: any) {
        console.error(`[TestStore] Failed to create actor for word ${wordId}:`, err);
        set({ error: `为单词 ${currentWord?.spelling || wordId} 创建测试时出错: ${err.message}` });
    }

    // 确保加载状态被设置为 false
    set({isLoading: false});
  },

}));