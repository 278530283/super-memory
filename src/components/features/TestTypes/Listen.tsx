// src/components/features/today/TestTypes/Listen.tsx
import { TestTypeProps, WordOption } from '@/src/types/Word';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Speech from 'expo-speech'; // 引入 expo-speech
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import {
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
  isCorrect: boolean;
  showFeedback: { correct: boolean; message: string } | null;
  onSelect: (optionKey: string) => void;
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
  const optionKey = `${option.partOfSpeech} ${option.chinese_meaning}`;
  const handlePress = useCallback(() => {
    onSelect(optionKey);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [onSelect, optionKey]);
  return (
    <TouchableOpacity
      testID={testID}
      style={[
        styles.optionCard,
        isSelected && !showFeedback && styles.selectedOptionCard,
        showFeedback && isCorrect && styles.correctOptionCard,
        showFeedback && !isCorrect && isSelected && styles.incorrectOptionCard,
      ]}
      onPress={handlePress}
      disabled={!!showFeedback}
      accessibilityLabel={`选项: ${option.partOfSpeech} ${option.chinese_meaning}`}
      accessibilityRole="button"
      accessibilityState={{ selected: isSelected }}
    >
      <Text style={styles.optionText}>
        <Text style={styles.partOfSpeechText}>{option.partOfSpeech}</Text>
        <Text style={styles.meaningText}> {option.chinese_meaning}</Text>
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
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState<{ correct: boolean; message: string } | null>(null);
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
  }, []);

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

  const correctOptionKey = word.chinese_meaning; // 正确选项标识
  console.log('Correct option key:', correctOptionKey);

  const handleSelect = useCallback((optionKey: string) => {
    if (showFeedback) return;
    console.log('Selected option:', optionKey);
    setSelectedOption(optionKey);
  }, [showFeedback]);

  const handleSubmit = useCallback(() => {
    if (!selectedOption) {
      Alert.alert('请选择一个选项');
      return;
    }
    if (showFeedback) return;
    const isCorrect = selectedOption === correctOptionKey;
    const responseTimeMs = Date.now() - startTime;
    const result = {
      type: testType, // 使用传入的 testType
      correct: isCorrect,
      selectedOption,
      wordId: word.$id,
      responseTimeMs,
      speedUsed:50
    };
    
    setShowFeedback({
      correct: isCorrect,
      message: isCorrect ? '✅ 正确！' : '错误！',
    });
    
    setTimeout(() => {
      onAnswer(result);
      setSelectedOption(null);
      setShowFeedback(null);
    }, 1500);
  }, [selectedOption, showFeedback, startTime, word, onAnswer, testType, correctOptionKey]);

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
        {word.options!.map((option, index) => {
          const optionKey = `${option.partOfSpeech} ${option.chinese_meaning}`;
          const isSelected = selectedOption === optionKey;
          const isCorrect = optionKey === correctOptionKey;
          return (
            <OptionCard
              key={option.id}
              option={word.options![index]}
              isSelected={isSelected}
              isCorrect={isCorrect}
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
        style={[styles.submitButton, (!selectedOption || showFeedback) && styles.submitButtonDisabled]}
        onPress={handleSubmit}
        disabled={!selectedOption || !!showFeedback}
        accessibilityLabel="提交答案"
        accessibilityRole="button"
        accessibilityState={{ disabled: !selectedOption || !!showFeedback }}
      >
        <Text style={styles.submitButtonText}>提交</Text>
      </TouchableOpacity>
      {/* 答题反馈 */}
      {showFeedback && (
        <View style={styles.feedbackContainer}>
          <Ionicons 
            name={showFeedback.correct ? "checkmark-circle" : "close-circle"} 
            size={32} 
            color={showFeedback.correct ? "#28A745" : "#DC3545"} 
          />
          <Text style={[
            styles.feedbackText,
            showFeedback.correct ? styles.correctFeedbackText : styles.incorrectFeedbackText,
          ]}>
            {showFeedback.message}
          </Text>
        </View>
      )}
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
    top: '50%',
    left: 0,
    right: 0,
    alignItems: 'center',
    transform: [{ translateY: -30 }],
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