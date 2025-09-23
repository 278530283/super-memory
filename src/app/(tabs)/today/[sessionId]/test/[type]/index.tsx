// src/app/(tabs)/today/[sessionId]/test/[type]/index.tsx
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
// 导入测试组件 (根据实际组件和 TestActivity 调整)
import Listen from '@/src/components/features/TestTypes/Listen';
import Pronunce from '@/src/components/features/TestTypes/Pronunce';
import Spelling from '@/src/components/features/TestTypes/Spelling';
import TransCh from '@/src/components/features/TestTypes/TransCh';
import TransEn from '@/src/components/features/TestTypes/TransEn';
// 导入服务和存储
import userWordService from '@/src/lib/services/userWordService';
import useAuthStore from '@/src/lib/stores/useAuthStore';
import useDailyLearningStore from '@/src/lib/stores/useDailyLearningStore';
import { useTestStore } from '@/src/lib/stores/useTestStore';
import { CreateUserWordTestHistory } from '@/src/types/UserWordTestHistory';
import { Word } from '@/src/types/Word';

// --- 类型定义 ---
type TestType = 'pre_test' | 'post_test';
type TestActivity = 'transEn' | 'transCh' | 'spelling' | 'pronunce' | 'listen'; // 与 store 保持一致

// 测试类型到组件名称的映射
const testComponentMap: Record<TestActivity, React.ComponentType<any>> = {
  listen: Listen,
  transEn: TransEn,
  transCh: TransCh,
  spelling: Spelling,
  pronunce: Pronunce,
};

// 测试活动类型到数据库 test_type 数字的映射
const testActivityTypeMap: Record<TestActivity, number> = {
  listen: 1,
  transEn: 2,
  transCh: 3,
  spelling: 4,
  pronunce: 5,
};

export default function TestScreen() {
  const router = useRouter();
  const { sessionId, type } = useLocalSearchParams<{
    sessionId: string;
    type: TestType;
  }>();

  // --- 从 Hooks 获取原始状态 ---
  const { userPreferences: authUserPreferences, user: authAppwriteUser } = useAuthStore();

  const {
    session,
    loading: sessionLoading,
    error: sessionError,
    updateSessionProgress
  } = useDailyLearningStore();

  // 从 useTestStore 获取所有原始状态
  const {
    wordList,
    currentWordIndex,
    currentActorSnapshot,
    isLoading: storeIsLoading,
    error: storeError,
    session: testStoreSession,
    userPreferences: testStoreUserPreferences,
    appwriteUser: testStoreAppwriteUser,
    testType: testStoreTestType,
    // 获取 Actions
    initializeTest,
    handleAnswer: storeHandleAnswer,
    nextWord,
    setError: setStoreError,
    reset: resetStore,
  } = useTestStore();

  // --- 使用 useMemo 计算派生值 ---
  const currentWordObj = useMemo<Word | null>(() => {
    return wordList[currentWordIndex] || null;
  }, [wordList, currentWordIndex]);

  const totalWordsCount = useMemo<number>(() => {
    return wordList.length;
  }, [wordList]);

  const currentWordNum = useMemo<number>(() => {
    return currentWordIndex + 1;
  }, [currentWordIndex]);

  const isTestFinished = useMemo<boolean>(() => {
    console.log('[TestScreen] isTestFinished computed. wordList.length:', wordList.length, 'currentWordIndex:', currentWordIndex);
    return wordList.length > 0 && currentWordIndex >= wordList.length;
  }, [wordList.length, currentWordIndex]);

  const currentTestActivityType = useMemo<TestActivity | null>(() => {
    if (!currentActorSnapshot) return null;

    const stateValue = currentActorSnapshot.value;
    if (typeof stateValue === 'string') {
        const match = stateValue.match(/^flow\d+_(.+)$/);
        if (match) {
            const activityName = match[1] as TestActivity;
            // 确保 activityName 在预定义的列表中
            if (['transEn', 'transCh', 'spelling', 'pronunce', 'listen'].includes(activityName)) {
                return activityName;
            } else {
                 console.warn(`[TestScreen] Unrecognized test activity from state: ${activityName}`);
            }
        }
    }
    return null;
  }, [currentActorSnapshot]);

  const CurrentTestComponent = useMemo<React.ComponentType<any> | null>(() => {
    return currentTestActivityType ? testComponentMap[currentTestActivityType] : null;
  }, [currentTestActivityType]);

  // --- Effects ---
  useEffect(() => {
    console.log('[TestScreen] useEffect triggered. sessionId:', sessionId, 'type:', type);
    if (!authUserPreferences || !authAppwriteUser) {
        console.log('[TestScreen] User not authenticated, redirecting...');
        Alert.alert('未登录', '请先登录以开始测试。', [
            { text: '确定', onPress: () => router.replace('/login') }
        ]);
        return;
    }

    if (sessionId && type) {
      console.log('[TestScreen] Calling initializeTest...');
      initializeTest(sessionId, type);
    }
    return () => {
      console.log('[TestScreen] Component unmounting, calling resetStore...');
      resetStore();
    };
  }, [sessionId, type, initializeTest, resetStore, authUserPreferences, authAppwriteUser, router]);

  useEffect(() => {
    if (isTestFinished && wordList.length > 0) {
      console.log('[TestScreen] Test completed detected.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        '完成',
        `${type === 'pre_test' ? '前置评测' : '当日评测'}已完成！`,
        [
          {
            text: '查看结果',
            onPress: () => router.back(),
          },
          {
            text: '返回首页',
            onPress: () => router.back(),
          },
        ]
      );
      if (sessionId) {
          const progressField = type === 'pre_test' ? 'pre_test_progress' : 'post_test_progress';
          updateSessionProgress(sessionId, {
            [progressField]: `${totalWordsCount}/${totalWordsCount}`
          });
      }
    }
  }, [isTestFinished, wordList.length, type, router, sessionId, totalWordsCount, updateSessionProgress]);

  // --- Handlers ---
  const handleAnswer = useCallback(async (result: {
    type: string;
    correct: boolean;
    wordId: string;
    responseTimeMs?: number;
    selectedOption?: string;
  }) => {
    console.log('[TestScreen] handleAnswer called with result:', result);

    if (!currentWordObj) {
        console.error('[TestScreen] No current word when handling answer.');
        setStoreError('处理答案时找不到当前单词');
        return;
    }

    try {
      // 1. 保存测试历史记录 (在 TestScreen 中处理，因为它需要解析当前活动类型)
      const userId = authAppwriteUser?.$id;
      const sessionPhase = type === 'pre_test' ? 1 : 3;
      const testDate = new Date().toISOString().split('T')[0];

      if (userId && currentTestActivityType) {
          const testTypeNumeric = testActivityTypeMap[currentTestActivityType];
          if (testTypeNumeric !== undefined) {
              const testData: CreateUserWordTestHistory = {
                user_id: userId,
                word_id: currentWordObj.$id,
                test_date: testDate,
                phase: sessionPhase,
                test_level: 0,
              };
              console.log('[TestScreen] Saving test history before sending to actor:', testData);
              await userWordService.upsertUserWordTestHistory(testData);
              console.log('[TestScreen] Test history saved for word:', currentWordObj.$id, 'Activity:', currentTestActivityType);
          } else {
              console.warn(`[TestScreen] No test_type mapping for activity: ${currentTestActivityType}`);
          }
      } else {
          console.warn('[TestScreen] Could not save test history: missing userId or currentTestActivityType');
      }

      // 2. 调用 store 的 handleAnswer action (发送事件给 actor)
      await storeHandleAnswer({
        correct: result.correct,
        wordId: result.wordId,
        responseTimeMs: result.responseTimeMs
      });
      console.log('[TestScreen] useTestStore.handleAnswer completed.');

      // 3. 逻辑处理：由 useTestStore 内部的 subscribe 和 nextWord 处理
      //    - subscribe 会监听 L* 状态并保存最终进度
      //    - nextWord 会更新 currentWordIndex 并创建新 actor
      //    - isTestFinished 会变为 true 并触发完成效果

    } catch (err) {
       console.error('[TestScreen] Error in handleAnswer:', err);
       Alert.alert('错误', '处理答题结果时发生错误');
    }

  }, [storeHandleAnswer, currentWordObj, currentTestActivityType, authAppwriteUser, setStoreError, type]);


  const handlePause = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      '暂停测试',
      '您确定要暂停测试吗？您的进度将会保存。',
      [
        {
          text: '取消',
          style: 'cancel',
        },
        {
          text: '确定',
          onPress: () => router.back(),
        },
      ]
    );
  }, [router]);

  // --- Rendering ---
  if (sessionLoading || storeIsLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4A90E2" />
        <Text style={styles.loadingText}>加载评测内容...</Text>
      </View>
    );
  }

  if (sessionError || storeError) {
    return (
      <View style={styles.center}>
        <Ionicons name="alert-circle" size={48} color="#FF3B30" />
        <Text style={styles.errorText}>
          加载失败: {sessionError || storeError}
        </Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => {
            if (sessionId && type) {
                initializeTest(sessionId, type);
            }
            setStoreError(null);
          }}
        >
          <Text style={styles.retryButtonText}>重试</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (wordList.length === 0 || !session || !currentWordObj || !CurrentTestComponent) {
    console.log('[TestScreen] Render check - wordList.length:', wordList.length, 'session:', !!session, 'currentWordObj:', !!currentWordObj, 'CurrentTestComponent:', !!CurrentTestComponent);
    if (!storeIsLoading) {
        return (
          <View style={styles.center}>
            <Ionicons name="document-text" size={48} color="#C5C5C7" />
            <Text style={styles.emptyText}>未找到评测内容</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => router.back()}
            >
              <Text style={styles.retryButtonText}>返回</Text>
            </TouchableOpacity>
          </View>
        );
    }
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <View style={styles.progressContainer}>
          <Text style={styles.progressText}>
            单词 {currentWordNum}/{totalWordsCount}
          </Text>
        </View>
        {<TouchableOpacity
          onPress={handlePause}
          accessibilityLabel="暂停测试"
          accessibilityHint="暂停当前测试并返回首页"
        >
          <Ionicons name="pause" size={24} color="#4A90E2" />
        </TouchableOpacity>}
      </View>
      <View style={styles.testArea}>
        <CurrentTestComponent
          word={currentWordObj}
          onAnswer={handleAnswer}
          testType={currentTestActivityType}
        />
      </View>
    </View>
  );
}

// ... styles 部分保持不变 ...
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F8F9FA',
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  progressContainer: {
    alignItems: 'flex-start',
  },
  progressText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  testProgressText: {
    fontSize: 14,
    color: '#666666',
    marginTop: 4,
  },
  testArea: {
    flex: 1,
    padding: 16,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666666',
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: '#FF3B30',
    textAlign: 'center',
  },
  errorSubText: {
    marginTop: 8,
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666666',
  },
  retryButton: {
    marginTop: 20,
    backgroundColor: '#4A90E2',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
