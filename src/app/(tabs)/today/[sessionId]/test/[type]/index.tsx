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
import ListenWord from '@/src/components/features/TestTypes/ListenWord';
import TranslateEnToZh from '@/src/components/features/TestTypes/TranslateEnToZh';
// 导入其他测试组件 (如果需要)
// import SpellingTest from '@/src/components/features/TestTypes/SpellingTest';
// import PronunciationTest from '@/src/components/features/TestTypes/PronunciationTest';
// 导入服务和存储
import useAuthStore from '@/src/lib/stores/useAuthStore';
import useDailyLearningStore from '@/src/lib/stores/useDailyLearningStore';
import { useTestStore } from '@/src/lib/stores/useTestStore';

// --- 类型定义 ---
type TestType = 'pre_test' | 'post_test';
// 与 useTestStore 中的 TestActivity 保持一致
// 注意：这里的名称需要与从状态机状态值 (如 'flow1_transEn') 中解析出的活动名称匹配
// 根据之前的讨论和 app/index.tsx，使用 transEn, transCh, spelling, pronunce, listen
type TestActivity = 'transEn' | 'transCh' | 'spelling' | 'pronunce' | 'listen';

// 测试类型到组件名称的映射 (根据实际组件和 TestActivity 调整)
const testComponentMap: Record<TestActivity, React.ComponentType<any>> = {
  listen: ListenWord,
  transEn: TranslateEnToZh, // 英译中
  transCh: TranslateEnToZh, // 中译英 (如果使用)
  spelling: TranslateEnToZh, // 拼写 (暂时用翻译组件代替)
  pronunce: TranslateEnToZh, // 跟读 (暂时用翻译组件代替)
  // 添加其他活动到组件的映射
};

export default function TestScreen() {
  const router = useRouter();
  const { sessionId, type } = useLocalSearchParams<{
    sessionId: string;
    type: TestType; // 使用定义的类型
  }>();

  // --- 在组件顶层无条件调用所有 Hooks ---
  // --- 从 useAuthStore 获取用户信息 ---
  const { userPreferences: authUserPreferences, user: authAppwriteUser } = useAuthStore();

  // --- 从 useDailyLearningStore 获取会话状态 ---
  // ✅ 关键：在组件顶层无条件调用
  const {
    session,
    loading: sessionLoading,
    error: sessionError,
    updateSessionProgress
  } = useDailyLearningStore();

  // --- 从 Zustand store 获取状态和 actions ---
  const {
    // 状态 (注意：selectors 是函数)
    wordList,
    currentWord, // 这是一个函数，需要调用
    currentTestActivity, // 这是一个函数，需要调用
    isLoading: storeIsLoading,
    error: storeError,
    totalWords, // 这是一个函数，需要调用
    currentWordNumber, // 这是一个函数，需要调用
    isTestCompleted, // 这是一个函数，需要调用
    // Actions
    initializeTest,
    handleAnswer: storeHandleAnswer,
    nextWord,
    setError: setStoreError,
    reset: resetStore,
  } = useTestStore();


  // 获取当前单词对象
  const currentWordObj = useMemo(() => currentWord(), [currentWord]);
  
  // 获取当前测试活动类型
  const currentTestActivityType = useMemo(() => currentTestActivity(), [currentTestActivity]);
  
  // 获取当前测试组件
  const CurrentTestComponent = useMemo(() => {
    return currentTestActivityType ? testComponentMap[currentTestActivityType] : null;
  }, [currentTestActivityType]); // testComponentMap 是常量，不需要加入依赖

  // 获取总单词数
  const totalWordsCount = useMemo(() => totalWords(), [totalWords]);
  
  // 获取当前单词编号
  const currentWordNum = useMemo(() => currentWordNumber(), [currentWordNumber]);
  
  // 获取测试是否完成
  const isTestFinished = useMemo(() => isTestCompleted(), [isTestCompleted]);

  // --- 初始化测试 (在组件挂载或参数变化时) ---
  useEffect(() => {
    console.log('[TestScreen] useEffect triggered. sessionId:', sessionId, 'type:', type);
    // 检查用户是否已认证
    if (!authUserPreferences || !authAppwriteUser) {
        console.log('[TestScreen] User not authenticated, redirecting...');
        // 可以在这里导航到登录页面，或者依赖父级路由守卫
        Alert.alert('未登录', '请先登录以开始测试。', [
            { text: '确定', onPress: () => router.replace('/login') } // 或其他登录路径
        ]);
        return;
    }

    if (sessionId && type) {
      console.log('[TestScreen] Calling initializeTest...');
      initializeTest(sessionId, type);
    }
    // 清理函数：组件卸载时重置 store
    return () => {
      console.log('[TestScreen] Component unmounting, calling resetStore...');
      resetStore();
    };
  }, [sessionId, type, initializeTest, resetStore, authUserPreferences, authAppwriteUser, router]); // 添加用户依赖

  // --- 监听测试完成状态 ---
  useEffect(() => {
    if (isTestFinished && wordList.length > 0) {
      console.log('[TestScreen] Test completed detected.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        '完成',
        `${type === 'pre_test' ? '前置评测' : '当日评测'}已完成！`,
        [
          {
            text: '查看结果', // 可以导航到结果页
            onPress: () => router.back(), // 简化处理
          },
          {
            text: '返回首页',
            onPress: () => router.back(),
          },
        ]
      );
      // 更新最终进度 (如果需要)
      if (sessionId) {
          const progressField = type === 'pre_test' ? 'pre_test_progress' : 'post_test_progress';
          updateSessionProgress(sessionId, {
            [progressField]: `${totalWordsCount}/${totalWordsCount}`
          });
      }
    }
  }, [isTestFinished, wordList.length, type, router, sessionId, totalWordsCount, updateSessionProgress]);

  // --- 处理答题结果 ---
  const handleAnswer = useCallback(async (result: {
    type: string; // 组件传递的，通常可以忽略
    correct: boolean;
    wordId: string;
    responseTimeMs?: number;
    selectedOption?: string; // 组件传递的，通常可以忽略
  }) => {
    console.log('[TestScreen] handleAnswer called with result:', result);

    // 1. 调用 store 的 handleAnswer action (发送事件、保存历史)
    const wordForThisAnswer = currentWordObj; // 使用 useMemo 计算出的值
    if (!wordForThisAnswer) {
        console.error('[TestScreen] No current word when handling answer.');
        setStoreError('处理答案时找不到当前单词');
        return;
    }

    await storeHandleAnswer({
      correct: result.correct,
      wordId: result.wordId,
      responseTimeMs: result.responseTimeMs
    });

    // 2. 检查状态机是否已到达最终状态 ('L*')
    //    需要获取 handleAnswer 执行后的最新快照
    const latestSnapshot = useTestStore.getState().currentActorSnapshot(); // 调用 selector 函数
    const nextStateValue = latestSnapshot?.value;
    console.log('[TestScreen] Checking next state after ANSWER:', nextStateValue);

    if (typeof nextStateValue === 'string' && nextStateValue.startsWith('L')) {
         // 状态机已结束当前单词的测试
         console.log('[TestScreen] Final state detected, processing completion...');

         // 3. (可选) 从快照中提取最终等级并再次保存进度 (Store 已尝试，这里再确认)
         //    这部分逻辑已在 useTestStore.ts 的 handleAnswer 中处理。
         let finalLevel: number | undefined =
           latestSnapshot.context?.level ?? latestSnapshot.output?.level;
         console.log('[TestScreen] Final level confirmed:', finalLevel);

         // 4. 移动到下一个单词或结束测试
         const { currentWordIndex: currentIndexAfterAnswer, wordList: wordListAfterAnswer } = useTestStore.getState();
         if (currentIndexAfterAnswer + 1 < wordListAfterAnswer.length) {
             console.log('[TestScreen] Moving to next word...');
             nextWord(); // 调用 store 的 nextWord action
         } else {
             // 所有单词都已完成，isTestCompleted 会变为 true，由上面的 useEffect 处理
             console.log('[TestScreen] All words completed.');
         }
    }
    // 如果是 'flowX_*' 状态，则 UI 会自动更新以显示下一个测试，无需额外操作
  }, [storeHandleAnswer, nextWord, currentWordObj, setStoreError]); // 依赖 currentWordObj 很重要

  // --- 处理暂停按钮点击 ---
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

  // --- 显示加载状态 (结合外部 store 和内部 store 的 loading) ---
  // ✅ 现在 sessionLoading 是直接从 useDailyLearningStore 获取的
  if (sessionLoading || storeIsLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4A90E2" />
        <Text style={styles.loadingText}>加载评测内容...</Text>
      </View>
    );
  }

  // --- 显示错误状态 (结合 store 和外部 store 的错误) ---
  // ✅ 现在 sessionError 是直接从 useDailyLearningStore 获取的
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

  // --- 无数据状态 ---
  if (wordList.length === 0 || !session || !currentWordObj || !CurrentTestComponent) {
    // 如果 store 加载完成但没有单词，可能是正常情况（如单词列表为空）
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
    // 否则，仍在加载中，上面的 loading 状态会处理
    return null;
  }

  return (
    <View style={styles.container}>
      {/* 顶部进度条 */}
      <View style={styles.topBar}>
        <View style={styles.progressContainer}>
          <Text style={styles.progressText}>
            单词 {currentWordNum}/{totalWordsCount}
          </Text>
        </View>
        <TouchableOpacity
          onPress={handlePause}
          accessibilityLabel="暂停测试"
          accessibilityHint="暂停当前测试并返回首页"
        >
          <Ionicons name="pause" size={24} color="#4A90E2" />
        </TouchableOpacity>
      </View>
      {/* 测试区域 */}
      <View style={styles.testArea}>
        {/* 传递从状态机解析出的 currentTestActivity */}
        <CurrentTestComponent
          word={currentWordObj} // 传递当前单词对象
          onAnswer={handleAnswer}
          testType={currentTestActivityType} // 传递当前活动类型
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