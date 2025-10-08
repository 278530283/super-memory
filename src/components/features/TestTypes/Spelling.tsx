// src/components/features/today/TestTypes/Spelling.tsx
import { TestTypeProps } from '@/src/types/Word';
import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Platform,
  StyleSheet,
  Text,
  TextInput,
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

// 主组件
const SpellingFC: React.FC<TestTypeProps> = ({ 
  word, 
  onAnswer, 
  testType = 'spelling'
}) => {
  const [userInput, setUserInput] = useState<string>(''); // 存储用户输入
  const [showFeedback, setShowFeedback] = useState<{ correct: boolean; message: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false); // 新增：提交状态
  const [startTime] = useState<number>(Date.now());
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const inputRef = useRef<TextInput>(null); // 用于聚焦输入框

  // 动画效果
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  // 正确的英文拼写
  const correctSpelling = word.spelling;
  console.log('Correct spelling:', correctSpelling);

  const handleInputChange = useCallback((text: string) => {
    setUserInput(text);
  }, []);

  const handleSubmit = useCallback(() => {
    if (!userInput.trim()) {
      Alert.alert('请输入英文拼写');
      return;
    }
    if (isSubmitting) return; // 防止重复提交

    // 设置提交状态
    setIsSubmitting(true);

    // 不区分大小写比较
    const isCorrect = userInput.trim().toLowerCase() === correctSpelling.toLowerCase();
    const responseTimeMs = Date.now() - startTime;
    const result = {
      type: testType, // 使用传入的 testType
      correct: isCorrect, // 是否正确
      userAnswer: userInput.trim(), // 用户的输入
      wordId: word.$id, // 传递 word 的 ID
      responseTimeMs, // 反应时间
    };

    setShowFeedback({
      correct: isCorrect,
      message: isCorrect ? '✅ 正确！' : `❌ 再试试`,
    });

    setTimeout(() => {
      onAnswer(result);
      // setUserInput(''); // 清空输入
      // setShowFeedback(null); // 清除反馈状态，边框颜色也会重置
      // setIsSubmitting(false); // 重置提交状态
      // // 可选：提交后重新聚焦输入框
      // if (inputRef.current) {
      //   inputRef.current.focus();
      // }
    }, 100); // 延迟 1.5 秒后继续
  }, [userInput, isSubmitting, startTime, word, onAnswer, testType, correctSpelling]);

  // 根据 showFeedback 状态确定输入框样式
  const getInputStyle = () => {
    if (!showFeedback) {
      return [styles.textInput, { borderColor: '#E0E0E0', backgroundColor: '#FFFFFF' }];
    }
    
    if (showFeedback.correct) {
      return [styles.textInput, { borderColor: '#28A745', backgroundColor: '#F8FFF8' }];
    } else {
      return [styles.textInput, { borderColor: '#DC3545', backgroundColor: '#FFF8F8' }];
    }
  };

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      {/* 中文意思区域 */}
      <View style={styles.wordPhoneticContainer}>
        <Text style={styles.wordText}>{word.meaning || ''}</Text>
        {/* 条件渲染音标 */}
        {(word.american_phonetic || word.british_phonetic) && (
          <Text style={styles.phoneticText}>
            {word.american_phonetic ? `美 /${word.american_phonetic}/` : `英 /${word.british_phonetic}/`}
          </Text>
        )}
      </View>
      {/* 例句区域 */}
      {/* {word.example_sentence && (
        <Text style={styles.exampleText}>
          {word.example_sentence?.toLowerCase().replace(word.spelling, '***') || '请根据中文含义，填写英文单词拼写'}
        </Text>
      )} */}
      {/* 拼写输入区域 */}
      <View style={styles.inputContainer}>
        <TextInput
          ref={inputRef}
          style={getInputStyle()} // 应用动态样式
          value={userInput}
          onChangeText={handleInputChange}
          placeholder="请输入英文拼写..."
          placeholderTextColor="#C5C5C7"
          autoCapitalize="none" // 关闭自动大写
          autoCorrect={false}   // 关闭自动更正
          editable={!isSubmitting} // 提交时禁用编辑
        />
      </View>
      {/* 提交按钮 */}
      <TouchableOpacity
        testID="submit-button"
        style={[
          styles.submitButton, 
          (!userInput.trim() || isSubmitting) && styles.submitButtonDisabled
        ]}
        onPress={handleSubmit}
        disabled={!userInput.trim() || isSubmitting}
        accessibilityLabel={isSubmitting ? "提交中..." : "提交答案"}
        accessibilityRole="button"
        accessibilityState={{ disabled: !userInput.trim() || isSubmitting }}
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
const Spelling: React.FC<TestTypeProps> = (props) => {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <SpellingFC {...props} />
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
  wordText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1A1A1A',
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
  inputContainer: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginBottom: 20,
  },
  textInput: {
    fontSize: 18,
    height: 50,
    borderWidth: 2,
    borderRadius: 8,
    paddingHorizontal: 15,
    letterSpacing: 2,
    ...Platform.select({
      ios: {
        shadowColor: '#d0bebeff',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 12,
      },
    }),
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
    justifyContent: 'center',
    minHeight: 50, // 确保按钮高度一致
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

export default Spelling;