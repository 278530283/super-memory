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

// 导入测试组件
import ListenWord from '@/src/components/features/TestTypes/ListenWord';
import TranslateEnToZh from '@/src/components/features/TestTypes/TranslateEnToZh';
// 导入其他测试组件
// import SpellingTest from '@/src/components/features/TestTypes/SpellingTest';
// import PronunciationTest from '@/src/components/features/TestTypes/PronunciationTest';

// 导入服务和存储
import wordService from '@/src/lib/services/wordService';
import useDailyLearningStore from '@/src/lib/stores/useDailyLearningStore';
import { Word } from '@/src/types/Word';

// 错误边界组件
const ErrorFallback = ({ error, resetErrorBoundary }: any) => (
  <View style={styles.center}>
    <Ionicons name="warning" size={48} color="#FF9500" />
    <Text style={styles.errorText}>加载测试时出错</Text>
    <Text style={styles.errorSubText}>{error.message}</Text>
    <TouchableOpacity style={styles.retryButton} onPress={resetErrorBoundary}>
      <Text style={styles.retryButtonText}>重试</Text>
    </TouchableOpacity>
  </View>
);

// 测试类型定义
type TestType = 'pre_test' | 'post_test';
type TestActivity = 'listen' | 'translate' | 'spell' | 'pronounce';

// 测试序列配置 - 可以根据单词属性动态调整
const getTestSequence = (word: Word): TestActivity[] => {
  // 这里可以根据单词的难度、历史表现等动态生成测试序列
  // 目前使用固定序列：先翻译，再拼写
  return ['translate', 'spell'];
};

// 测试类型到组件名称的映射
const testComponentMap: Record<TestActivity, React.ComponentType<any>> = {
  listen: ListenWord,
  translate: TranslateEnToZh,
  spell: TranslateEnToZh, // 暂时用翻译组件代替
  pronounce: TranslateEnToZh, // 暂时用翻译组件代替
};

// 测试类型到活动类型的映射
const testActivityTypeMap: Record<TestActivity, number> = {
  listen: 1, // 听单词
  translate: 2, // 英译中
  spell: 4, // 拼写
  pronounce: 5, // 跟读
};

export default function TestScreen() {
  const router = useRouter();
  const { sessionId, type } = useLocalSearchParams<{ 
    sessionId: string; 
    type: TestType 
  }>();
  
  const { 
    session, 
    loading: sessionLoading, 
    error: sessionError,
    updateSessionProgress 
  } = useDailyLearningStore();

  // 状态管理
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [currentTestIndex, setCurrentTestIndex] = useState(0);
  const [wordList, setWordList] = useState<Word[]>([]);
  const [testSequences, setTestSequences] = useState<TestActivity[][]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, any[]>>({});

  // 获取当前单词
  const currentWord = useMemo(() => {
    return wordList[currentWordIndex] || null;
  }, [wordList, currentWordIndex]);

  // 获取当前测试序列
  const currentTestSequence = useMemo(() => {
    return testSequences[currentWordIndex] || [];
  }, [testSequences, currentWordIndex]);

  // 获取当前测试类型
  const currentTestType = useMemo(() => {
    return currentTestSequence[currentTestIndex] || null;
  }, [currentTestSequence, currentTestIndex]);

  // 获取当前测试组件
  const CurrentTestComponent = useMemo(() => {
    return currentTestType ? testComponentMap[currentTestType] : null;
  }, [currentTestType]);

  // 获取单词列表和测试序列
  const fetchWordsAndTestSequences = useCallback(async () => {
    try {
      if (!sessionId || !type || !session || session.$id !== sessionId) {
        setIsLoading(false);
        return;
      }

      let wordIds: string[] = [];

      switch (type) {
        case 'pre_test':
          wordIds = session.pre_test_word_ids || [];
          break;
        case 'post_test':
          wordIds = session.post_test_word_ids || [];
          break;
        default:
          setError(`不支持的测试类型: ${type}`);
          setIsLoading(false);
          return;
      }

      if (wordIds.length === 0) {
        Alert.alert('提示', '没有找到需要评测的单词。', [
          {
            text: '确定',
            onPress: () => router.back(),
          },
        ]);
        return;
      }

      // 获取单词详情
      const fetchedWords = await wordService.getWordsBySpellings(wordIds);
      setWordList(fetchedWords);
      
      // 为每个单词生成测试序列
      const sequences = fetchedWords.map(word => getTestSequence(word));
      setTestSequences(sequences);
      
      // 初始化进度
      const progressField = type === 'pre_test' ? 'pre_test_progress' : 'post_test_progress';
      if (!session[progressField] || session[progressField]?.startsWith('0/')) {
        updateSessionProgress(sessionId, { 
          [progressField]: `0/${wordIds.length}` 
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取单词列表失败');
      console.error('获取单词列表失败:', err);
    } finally {
      setIsLoading(false);
    }
  }, [sessionId, type, session, updateSessionProgress, router]);

  // 加载单词列表和测试序列
  useEffect(() => {
    fetchWordsAndTestSequences();
  }, []);

  // 处理答题结果
  const handleAnswer = useCallback((result: { 
    type: string; 
    correct: boolean; 
    wordId: string;
    responseTimeMs?: number;
    selectedOption?: string;
  }) => {
    try {
      // 1. 记录答题结果
      const updatedResults = { ...testResults };
      if (!updatedResults[currentWord.$id]) {
        updatedResults[currentWord.$id] = [];
      }
      updatedResults[currentWord.$id].push(result);
      setTestResults(updatedResults);
      
      // 2. 记录答题行为（这里可以添加日志记录逻辑）
      // 例如: recordWordAction({ ... })
      
      // 3. 决定下一步：继续当前单词的下一个测试，还是移动到下一个单词
      const nextTestIndex = currentTestIndex + 1;
      
      if (nextTestIndex < currentTestSequence.length) {
        // 继续当前单词的下一个测试
        setCurrentTestIndex(nextTestIndex);
      } else {
        // 当前单词的所有测试已完成
        const nextWordIndex = currentWordIndex + 1;
        const totalWords = wordList.length;
        const progressField = type === 'pre_test' ? 'pre_test_progress' : 'post_test_progress';
        
        // 更新会话进度
        updateSessionProgress(sessionId!, { 
          [progressField]: `${nextWordIndex}/${totalWords}` 
        });
        
        if (nextWordIndex < totalWords) {
          // 移动到下一个单词，重置测试索引
          setCurrentWordIndex(nextWordIndex);
          setCurrentTestIndex(0);
        } else {
          // 所有单词的所有测试都已完成
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          
          Alert.alert(
            '完成', 
            `${type === 'pre_test' ? '前置评测' : '当日评测'}已完成！`,
            [
              {
                text: '查看结果',
                onPress: () => {
                  // 导航到结果页面，传递测试结果
                  router.push({
                    pathname: `/(tabs)/today/${sessionId}/results`,
                    params: { 
                      type,
                      results: JSON.stringify(testResults) 
                    }
                  });
                },
              },
              {
                text: '返回首页',
                onPress: () => router.back(),
              },
            ]
          );
        }
      }
    } catch (err) {
      console.error('处理答题结果失败:', err);
      Alert.alert('错误', '处理答题结果时发生错误');
    }
  }, [
    wordList, 
    currentWordIndex, 
    currentTestIndex, 
    currentTestSequence, 
    type, 
    sessionId, 
    updateSessionProgress, 
    router, 
    testResults,
    currentWord
  ]);

  // 处理暂停按钮点击
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

  // 显示加载状态
  if (sessionLoading || isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4A90E2" />
        <Text style={styles.loadingText}>加载评测内容...</Text>
      </View>
    );
  }

  // 显示错误状态
  if (sessionError || error) {
    return (
      <View style={styles.center}>
        <Ionicons name="alert-circle" size={48} color="#FF3B30" />
        <Text style={styles.errorText}>
          加载失败: {sessionError || error}
        </Text>
        <TouchableOpacity 
          style={styles.retryButton} 
          onPress={fetchWordsAndTestSequences}
        >
          <Text style={styles.retryButtonText}>重试</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // 无数据状态
  if (wordList.length === 0 || !session || !currentWord || !CurrentTestComponent) {
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

  const totalWords = wordList.length;
  const currentWordNumber = currentWordIndex + 1;
  const totalTests = currentTestSequence.length;
  const currentTestNumber = currentTestIndex + 1;

  return (
    <View style={styles.container}>
      {/* 顶部进度条 */}
      <View style={styles.topBar}>
        <View style={styles.progressContainer}>
          <Text style={styles.progressText}>
            单词 {currentWordNumber}/{totalWords}
          </Text>
          <Text style={styles.testProgressText}>
            测试 {currentTestNumber}/{totalTests}
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
        <CurrentTestComponent 
          word={currentWord} 
          onAnswer={handleAnswer}
          testType={currentTestType}
        />
      </View>
    </View>
  );
}

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