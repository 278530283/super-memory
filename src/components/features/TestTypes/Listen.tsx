// src/components/features/today/TestTypes/Listen.tsx
import { TestTypeProps, WordOption } from '@/src/types/Word';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Speech from 'expo-speech'; // 引入 expo-speech
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

// 错误回退组件
const ErrorFallback = ({ error, resetErrorBoundary }: any) => (
  <View style={styles.errorContainer}>
    <Ionicons name="warning" size={48} color="#FF9500" />
    <Text style={styles.errorText}>组件加载失败</Text>
    <Text style={styles.errorSubText}>{error.message}</Text>
    <TouchableOpacity style={styles.retryButton} onPress={resetErrorBoundary}>
      <Text style={styles.retryButtonText}>重试</Text>
    </TouchableOpacity>
  </View>
);

// 选项卡片组件
interface OptionCardProps {
  option: WordOption;
  isSelected: boolean;
  isCorrect: boolean; // 现在 isCorrect 表示选项是否对应正确单词的 ID
  showFeedback: { correct: boolean; message: string } | null;
  onSelect: (optionId: string) => void; // onSelect 回调现在接收选项的 ID
  testID?: string;
}

const OptionCard: React.FC<OptionCardProps> = React.memo(({
  option,
  isSelected,
  isCorrect,
  showFeedback,
  onSelect,
  testID
}) => {
  // const optionKey = `${option.partOfSpeech} ${option.meaning}`; // 旧方式
  const optionId = option.id; // 使用选项的 id 作为唯一标识

  const handlePress = useCallback(() => {
    onSelect(optionId); // 传递选项 ID
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [onSelect, optionId]);

  return (
    <TouchableOpacity
      testID={testID}
      style={[
        styles.optionCard,
        isSelected && !showFeedback && styles.selectedOptionCard,
        showFeedback && isCorrect && isSelected && styles.correctOptionCard, // 根据 isCorrect 和 isSelected 显示状态
        showFeedback && !isCorrect && isSelected && styles.incorrectOptionCard,
      ]}
      onPress={handlePress}
      disabled={!!showFeedback}
      accessibilityLabel={`选项: ${option.partOfSpeech} ${option.meaning}`}
      accessibilityRole="button"
      accessibilityState={{ selected: isSelected }}
    >
      <Text style={styles.optionText}>
        {/* <Text style={styles.partOfSpeechText}>{option.partOfSpeech}</Text> */}
        <Text style={styles.meaningText}> {option.meaning}</Text>
      </Text>
    </TouchableOpacity>
  );
});

OptionCard.displayName = 'OptionCard';

// 主组件
const Listen: React.FC<TestTypeProps> = ({ 
  word, 
  onAnswer, 
  testType = 'listen'
}) => {
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null); // 存储选中的选项 ID
  const [showFeedback, setShowFeedback] = useState<{ correct: boolean; message: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false); // 新增：提交状态
  const [startTime] = useState<number>(Date.now());
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // 新增状态：控制播放和播放计数
  const [isPlaying, setIsPlaying] = useState(false);
  const [playCount, setPlayCount] = useState(0);
  const playIntervalRef = useRef<NodeJS.Timeout | null>(null); // 存储播放间隔定时器

  // 动画效果
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  // 播放单词发音函数 (简化版)
  const playWordSound = useCallback(async () => {
    try {
      setIsPlaying(true);
      await Speech.speak(word.spelling || 'property', {
        language: 'en-US',
        rate: 0.9,
        onDone: () => {
          setIsPlaying(false);
          // 在播放完成时增加计数
          setPlayCount(prev => prev + 1);
        },
        onError: (error) => {
          console.error('播放失败:', error);
          setIsPlaying(false);
          setPlayCount(prev => prev + 1); // 出错也增加计数，避免卡死
        }
      });
    } catch (error) {
      console.error('播放失败:', error);
      setIsPlaying(false);
      setPlayCount(prev => prev + 1); // 出错也增加计数，避免卡死
    }
  }, [word.spelling]);

  // 自动播放单词3次
  useEffect(() => {
    // 如果组件已挂载且播放次数小于3次，则启动播放
    if (playCount < 3) {
      playWordSound(); // 启动第一次播放
      // 设置下一次播放的间隔（1500ms）
      playIntervalRef.current = setTimeout(() => {
        if (playCount < 2) { // 确保只播放3次
          playWordSound(); // 启动下一次播放
        }
      }, 1500);
    }

    // 清理函数：组件卸载时清除定时器
    return () => {
      if (playIntervalRef.current) {
        clearTimeout(playIntervalRef.current);
      }
    };
  }, [playCount, playWordSound]); // 依赖 playCount 和 playWordSound

  // 正确答案的单词 ID
  const correctWordId = word.$id;
  console.log('Correct word ID:', correctWordId);

  const handleSelect = useCallback((optionId: string) => {
    if (showFeedback) return;
    console.log('Selected option ID:', optionId);
    setSelectedOptionId(optionId);
  }, [showFeedback]);

  const handleSubmit = useCallback(() => {
    if (!selectedOptionId) {
      Alert.alert('请选择一个选项');
      return;
    }
    if (showFeedback || isSubmitting) return;

    setIsSubmitting(true); // 开始提交

    // 判断选中的选项是否对应正确单词的 ID
    const isCorrect = selectedOptionId === correctWordId;

    const responseTimeMs = Date.now() - startTime;
    const result = {
      type: testType, // 使用传入的 testType
      correct: isCorrect,
      userAnswer: selectedOptionId, // 保存选中的选项 ID
      wordId: word.$id, // 保存当前测试的单词 ID
      responseTimeMs,
      speedUsed: 50 // 或者根据实际播放速度调整
    };

    setShowFeedback({
      correct: isCorrect,
      message: isCorrect ? '✅ 正确！' : '❌ 错误！',
    });

    setTimeout(() => {
      onAnswer(result);
      // setIsSubmitting(false); // 提交完成
      // setSelectedOptionId(null); // 可选：提交后清除选择
      // setShowFeedback(null);  // 可选：提交后清除反馈
    }, 100);
  }, [selectedOptionId, showFeedback, isSubmitting, startTime, word, onAnswer, testType, correctWordId]);

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      {/* 单词 + 音标区域 - 修改为播放指示器 */}
      <View style={styles.wordPhoneticContainer}>
        {/* 显示播放状态指示器 */}
        <View style={styles.wordTextContainer}>
          <Text style={styles.wordText}>{'*****'}</Text>
        </View>
      </View>
      {/* 例句区域 */}
      <Text style={styles.exampleText}>
        {'请听音频，选择正确的中文释义。'}
      </Text>
      {/* 选项区域 */}
      <View style={styles.optionsGrid}>
        {word.options?.map((option, index) => {
          // const optionKey = `${option.partOfSpeech} ${option.meaning}`; // 旧方式
          const optionId = option.id; // 使用选项 ID
          const isSelected = selectedOptionId === optionId;
          // 判断选项是否正确：选项的 wordId 是否等于当前单词的 $id
          const isCorrect = option.id === correctWordId;

          return (
            <OptionCard
              key={optionId} // 使用 optionId 作为 key
              option={option}
              isSelected={isSelected}
              isCorrect={isCorrect} // 传递 isCorrect 状态
              showFeedback={showFeedback}
              onSelect={handleSelect}
              testID={`option-${index}`}
            />
          );
        })}
      </View>
      {/* 提交按钮 */}
      <TouchableOpacity
        testID="submit-button"
        style={[styles.submitButton, (!selectedOptionId || showFeedback || isSubmitting) && styles.submitButtonDisabled]}
        onPress={handleSubmit}
        disabled={!selectedOptionId || !!showFeedback || isSubmitting}
        accessibilityLabel="提交答案"
        accessibilityRole="button"
        accessibilityState={{ disabled: !selectedOptionId || !!showFeedback || isSubmitting }}
      >
        {isSubmitting ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Text style={styles.submitButtonText}>提交</Text>
        )}
      </TouchableOpacity>
      {/* 答题反馈 */}
      {/* {showFeedback && (
        <View style={styles.feedbackContainer}>
          <Text style={[
            styles.feedbackText,
            showFeedback.correct ? styles.correctFeedbackText : styles.incorrectFeedbackText,
          ]}>
            {showFeedback.message}
          </Text>
        </View>
      )} */}
    </Animated.View>
  );
};

// 使用错误边界包装组件
const ListenWithErrorBoundary: React.FC<TestTypeProps> = (props) => {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <Listen {...props} />
    </ErrorBoundary>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 20,
    position: 'relative',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFFFFF',
  },
  errorText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
    color: '#1A1A1A',
  },
  errorSubText: {
    fontSize: 14,
    color: '#666666',
    marginTop: 8,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 20,
    backgroundColor: '#4A90E2',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  wordPhoneticContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  wordTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  wordText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginRight: 10, // 给播放指示器留点空间
  },
  playingIndicator: {
    fontSize: 20, // 调整指示器大小
    color: '#4A90E2', // 使用主题色
  },
  phoneticText: {
    fontSize: 16,
    color: '#666666',
    marginTop: 5,
  },
  exampleText: {
    fontSize: 14,
    color: '#666666',
    fontStyle: 'italic',
    marginBottom: 20,
    lineHeight: 20,
    width: '100%',
    textAlign: 'left',
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 80,
    rowGap: 12,
  },
  optionCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  selectedOptionCard: {
    borderColor: '#4A90E2',
    backgroundColor: '#F0F8FF',
  },
  correctOptionCard: {
    borderColor: '#28A745',
    backgroundColor: '#F8FFF8',
  },
  incorrectOptionCard: {
    borderColor: '#DC3545',
    backgroundColor: '#FFF8F8',
  },
  optionText: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'left',
  },
  partOfSpeechText: {
    color: '#4A90E2',
    fontWeight: '500',
    marginRight: 4,
  },
  meaningText: {
    color: '#333333',
    flexShrink: 1,
  },
  submitButton: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    backgroundColor: '#4A90E2',
    borderRadius: 24,
    paddingVertical: 14,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#C5C5C7',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  feedbackContainer: {
    position: 'absolute',
    top: '70%',
    left: 0,
    right: 0,
    alignItems: 'center',
    transform: [{ translateY: -20 }],
    zIndex: 10,
  },
  feedbackText: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 8,
  },
  correctFeedbackText: {
    color: '#28A745',
  },
  incorrectFeedbackText: {
    color: '#DC3545',
  },
});

export default ListenWithErrorBoundary;