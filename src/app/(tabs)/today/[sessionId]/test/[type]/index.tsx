// src/app/(tabs)/today/[sessionId]/test/[type]/index.tsx
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
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
import Learn from '@/src/components/features/LearnTypes/Learn';
import Listen from '@/src/components/features/TestTypes/Listen';
import useAuthStore from '@/src/lib/stores/useAuthStore';
import useDailyLearningStore from '@/src/lib/stores/useDailyLearningStore';
import { useTestStore } from '@/src/lib/stores/useTestStore';
import { ACTION_TYPES } from '@/src/types/actionTypes';

// --- 类型定义 ---
type TestType = 'pre_test' | 'post_test';
type TestActivity = 'transEn' | 'transCh' | 'spelling' | 'pronunce' | 'listen' | 'learn'; // 与 store 保持一致

// 测试类型到组件名称的映射
const testComponentMap: Record<TestActivity, React.ComponentType<any>> = {
  listen: Listen,
  transEn: TransEn,
  transCh: TransCh,
  spelling: Spelling,
  pronunce: Pronunce,
  learn: Learn,
};

export default function TestScreen() {
  const router = useRouter();
  const { sessionId, type } = useLocalSearchParams<{
    sessionId: string;
    type: TestType;
  }>();

  // 下拉刷新状态
  const [refreshing, setRefreshing] = useState(false);

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
    wordIds, // 改为获取 wordIds
    currentWord, // 直接获取当前单词
    currentWordIndex,
    currentActorSnapshot,
    isLoading: storeIsLoading,
    isTestFinished,
    error: storeError,
    // 获取 Actions
    initializeTest,
    handleAnswer: storeHandleAnswer,
    loadNextWord, // 改为 loadNextWord
    setError: setStoreError,
    reset: resetStore,
    skipCurrentWord,
    setActivityType,
  } = useTestStore();

  // 使用 useState 来存储当前活动类型
  const [currentTestActivityType, setCurrentTestActivityType] = useState<TestActivity | null>(null);

  // --- 使用 useMemo 计算派生值 ---
  const totalWordsCount = useMemo<number>(() => {
    return wordIds.length;
  }, [wordIds]);

  const currentWordNum = useMemo<number>(() => {
    return currentWordIndex + 1;
  }, [currentWordIndex]);

  // --- 下拉刷新处理函数 ---
  const onRefresh = useCallback(async () => {
    if (!sessionId || !type) return;
    
    setRefreshing(true);
    try {
      console.log('[TestScreen] 下拉刷新，重新初始化测试...');
      await initializeTest(sessionId, type);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('[TestScreen] 下拉刷新失败:', error);
      Alert.alert('刷新失败', '请稍后重试');
    } finally {
      setRefreshing(false);
    }
  }, [sessionId, type, initializeTest]);

  useEffect(() => {
    console.log('[TestScreen] currentActorSnapshot effect triggered.');
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
    // 检查 value 是否存在且以 "L" 开头
    if (typeof stateValue === 'string' && stateValue.startsWith('L')) {
        console.log('[TestScreen] Final state ', stateValue);
        setCurrentTestActivityType('learn');
        setActivityType(ACTION_TYPES.LEARN);
        return; // 确保设置后返回
    }
  }, [currentActorSnapshot?.value, setActivityType]); // 依赖 currentActorSnapshot.value

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
    if (isTestFinished && wordIds.length > 0) {
      console.log('[TestScreen] Test completed detected.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        '完成',
        `太棒了！${type === 'pre_test' ? '学习' : '复习'}已完成！`,
        [
          {
            text: '返回',
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
  }, [isTestFinished, wordIds.length, type, router, sessionId, totalWordsCount, updateSessionProgress]);

  // --- Handlers ---
  const handleAnswer = useCallback(async (result: {
    type: string;
    correct: boolean;
    wordId: string;
    responseTimeMs?: number;
    selectedOption?: string;
  }) => {
    console.log('[TestScreen] handleAnswer called with result:', result);

    if (!currentWord) {
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

    if(result.type === 'learn'){
      setTimeout(() => { 
        loadNextWord(); // 改为 loadNextWord
      }, 0);
    }

  }, [storeHandleAnswer, currentWord, setStoreError, loadNextWord]); // 依赖改为 loadNextWord

  // 新增：处理跳过单词
  const handleSkip = useCallback(async () => {
    console.log('[TestScreen] handleSkip called');
    
    if (!currentWord) {
      console.error('[TestScreen] No current word to skip');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    Alert.alert(
      '跳过单词',
      `确定要跳过该单词吗？`,
      [
        {
          text: '取消',
          style: 'cancel',
        },
        {
          text: '确定跳过',
          style: 'destructive',
          onPress: async () => {
            try {
              await skipCurrentWord();
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
              console.log('[TestScreen] Word skipped successfully');
            } catch (error) {
              console.error('[TestScreen] Failed to skip word:', error);
              Alert.alert('错误', '跳过单词失败，请重试');
            }
          },
        },
      ]
    );
  }, [currentWord, skipCurrentWord]);

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

  // 修改渲染条件检查
  if (wordIds.length === 0 || !session || !currentWord || !CurrentTestComponent || isTestFinished) {
    console.log('[TestScreen] Render check - wordIds.length:', wordIds.length, 'session:', !!session, 'currentWord:', !!currentWord, 'CurrentTestComponent:', !!CurrentTestComponent);
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
 
  console.log('[TestScreen] Render Main Content ...', CurrentTestComponent);
  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <View style={styles.progressContainer}>
          <Text style={styles.progressText}>
          <Text style={styles.currentNumber}>{currentWordNum}</Text>
          <Text style={styles.totalNumber}>/{totalWordsCount}</Text>
          </Text>
        </View>
        {/* {<TouchableOpacity
          onPress={handlePause}
          accessibilityLabel="暂停测试"
          accessibilityHint="暂停当前测试并返回首页"
        >
          <Ionicons name="pause" size={24} color="#4A90E2" />
        </TouchableOpacity>} */}

        {<TouchableOpacity
          style={styles.skipButton}
          onPress={handleSkip}
          accessibilityLabel="跳过"
          accessibilityHint="跳过当前单词"
        >
          <Text style={styles.skipButtonText}>跳过</Text>
        </TouchableOpacity>}
      </View>
      
      {/* 使用 ScrollView 包裹测试区域以支持下拉刷新 */}
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#4A90E2']} // Android
            tintColor="#4A90E2" // iOS
            title="下拉刷新..."
            titleColor="#666666"
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.testArea}>
          <CurrentTestComponent
            word={currentWord} // 直接使用 currentWord
            onAnswer={handleAnswer}
            testType={currentTestActivityType}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12, // 从 16 减小到 12
    paddingTop: 8, // 添加顶部内边距，让高度更低
    paddingBottom: 8, // 添加底部内边距，让高度更低
    backgroundColor: '#F8F9FA',
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
    minHeight: 44, // 设置最小高度
  },
  progressContainer: {
    alignItems: 'flex-start',
    marginLeft: 16,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  currentNumber: {
    color: '#10B981', // 绿色
    fontSize: 18,
  },
  totalNumber: {
    color: '#1A1A1A', // 保持原来的黑色
  },
  skipButton: {
    marginRight: 16,
  },
  testProgressText: {
    fontSize: 12,
    color: '#666666',
    marginTop: 2,
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
  skipButtonText: {
    color: '#4A90E2',
    fontSize: 16,
    fontWeight: '600',
  },
});