// src/app/(tabs)/today/[sessionId]/test/[type]/index.tsx
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
// 导入测试组件 (根据实际组件和 TestActivity 调整)
import Pronunce from '@/src/components/features/TestTypes/Pronunce';
import Spelling from '@/src/components/features/TestTypes/Spelling';
import TransCh from '@/src/components/features/TestTypes/TransCh';
import TransEn from '@/src/components/features/TestTypes/TransEn';
// 导入服务和存储
import Listen from '@/src/components/features/TestTypes/Listen';
import useAuthStore from '@/src/lib/stores/useAuthStore';
import useDailyLearningStore from '@/src/lib/stores/useDailyLearningStore';
import { useTestStore } from '@/src/lib/stores/useTestStore';
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

export default function TestScreen() {
  const router = useRouter();
  const { sessionId, type } = useLocalSearchParams<{
    sessionId: string;
    type: TestType;
  }>();

  // --- 从 Hooks 获取原始状态 ---
  const { user } = useAuthStore();

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
    isTestFinished,
    error: storeError,
    // 获取 Actions
    initializeTest,
    handleAnswer: storeHandleAnswer,
    setError: setStoreError,
    reset: resetStore
  } = useTestStore();

  // 使用 useState 来存储当前活动类型
  const [currentTestActivityType, setCurrentTestActivityType] = useState<TestActivity | null>(null);

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


  useEffect(() => {
    const stateValue = currentActorSnapshot?.value;
    console.log('[TestScreen] currentTestActivity effect triggered. stateValue:', stateValue);
    // 检查 value 是否存在且以 "flow" 开头
    if (typeof stateValue === 'string' && stateValue.startsWith('flow')) {
        const match = stateValue.match(/^flow\d+_(.+)$/);
        if (match) {
            const activityName = match[1] as TestActivity;
            // 确保 activityName 在预定义的列表中
            if (['transEn', 'transCh', 'spelling', 'pronunce', 'listen'].includes(activityName)) {
                console.log('[TestScreen] Setting activity:', activityName);
                setCurrentTestActivityType(activityName);
                return; // 成功设置后返回
            } else {
                 console.warn(`[TestScreen] Unrecognized test activity from state: ${activityName}`);
            }
        } else {
             console.warn(`[TestScreen] Could not match activity from state: ${stateValue}`);
        }
    }
    // 因此，当 stateValue 不以 "flow" 开头时，currentTestActivityType 保持不变
  }, [currentActorSnapshot?.value]); // 依赖 currentActorSnapshot.value

  const CurrentTestComponent = useMemo<React.ComponentType<any> | null>(() => {
    console.log('[TestScreen] CurrentTestComponent computed. currentTestActivityType:', currentTestActivityType);
    return currentTestActivityType ? testComponentMap[currentTestActivityType] : null;
  }, [currentTestActivityType]);

  // --- Effects ---
  useEffect(() => {
    console.log('[TestScreen] useEffect triggered. sessionId:', sessionId, 'type:', type);
    if (!user) {
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
  }, [sessionId, type, initializeTest, resetStore, user, router]);

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
          const sessionStatus = type === 'pre_test' ? 2 : 4;
          const progressField = type === 'pre_test' ? 'pre_test_progress' : 'post_test_progress';
          updateSessionProgress(sessionId, {
            status: sessionStatus,
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
      // 调用 store 的 handleAnswer action (发送事件给 actor)
      await storeHandleAnswer({
        correct: result.correct,
        wordId: result.wordId,
        responseTimeMs: result.responseTimeMs
      });
      console.log('[TestScreen] useTestStore.handleAnswer completed.');

    } catch (err) {
       console.error('[TestScreen] Error in handleAnswer:', err);
       Alert.alert('错误', '处理答题结果时发生错误');
    }

  }, [storeHandleAnswer, currentWordObj, setStoreError]);


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
  if (storeIsLoading) {
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

  if (wordList.length === 0 || !session || !currentWordObj || !CurrentTestComponent || isTestFinished) {
    console.log('[TestScreen] Render check - wordList.length:', wordList.length, 'session:', !!session, 'currentWordObj:', !!currentWordObj, 'CurrentTestComponent:', !!CurrentTestComponent);
    if (!storeIsLoading && !isTestFinished) {
        console.log('[TestScreen] Render check - sessionId:', sessionId, 'type:', type, 'isLoading:', storeIsLoading);
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
 
  console.timeLog('[TestScreen] Render Main Content ...');
  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <View style={styles.progressContainer}>
          <Text style={styles.progressText}>
            单词 {currentWordNum}/{totalWordsCount}
          </Text>
        </View>
        {/* {<TouchableOpacity
          onPress={handlePause}
          accessibilityLabel="暂停测试"
          accessibilityHint="暂停当前测试并返回首页"
        >
          <Ionicons name="pause" size={24} color="#4A90E2" />
        </TouchableOpacity>} */}
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
