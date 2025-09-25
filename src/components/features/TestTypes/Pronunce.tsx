// src/components/features/today/TestTypes/Pronunce.tsx
import speechRecognitionService from '@/src/lib/services/speechRecognitionService'; // 导入服务
import { TestTypeProps } from '@/src/types/Word';
import { Ionicons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import {
  Alert,
  Animated,
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

// 主组件
const Pronunce: React.FC<TestTypeProps> = ({ 
  word, 
  onAnswer, 
  testType = 'pronunce'
}) => {
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recognizedText, setRecognizedText] = useState<string>('');
  const [showFeedback, setShowFeedback] = useState<{ correct: boolean; message: string } | null>(null);
  const [startTime] = useState<number>(Date.now());
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const hasUserInteracted = useRef(false); // 防止组件挂载时自动朗读

  // 动画效果
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, []);

  // 正确的英文拼写
  const correctSpelling = word.spelling;
  console.log('Correct spelling:', correctSpelling);

  const handleStartRecording = useCallback(async () => {
    if (speechRecognitionService.isCurrentlyRecording()) {
        console.log('[Pronunce] Recording already in progress.');
        return; // 防止重复开始
    }
    try {
      if (!hasUserInteracted.current) {
        // 第一次交互时朗读单词
        console.log('[Pronunce] Speaking word:', word.spelling);
        Speech.speak(word.spelling, { language: 'en' }); // 指定语言为英语
        hasUserInteracted.current = true;
      }
      await speechRecognitionService.startRecording();
      setIsRecording(true);
      setRecognizedText(''); // 清空之前的识别结果
      setShowFeedback(null); // 清空反馈
      console.log('[Pronunce] Recording started.');
    } catch (error: any) {
      console.error('[Pronunce] Failed to start recording:', error);
      Alert.alert('录音失败', error.message || '无法开始录音，请检查权限。');
    }
  }, [word.spelling]);

  const handleStopRecording = useCallback(async () => {
    if (!speechRecognitionService.isCurrentlyRecording()) {
        console.log('[Pronunce] No recording in progress to stop.');
        return;
    }
    try {
      const audioUri = await speechRecognitionService.stopRecording();
      setIsRecording(false);
      console.log('[Pronunce] Recording stopped. Audio URI:', audioUri);

      // 调用识别服务
      const recognitionResult = await speechRecognitionService.recognizeSpeech(audioUri);
      setRecognizedText(recognitionResult.recognizedText || '');
      console.log('[Pronunce] Recognized text:', recognitionResult.recognizedText);
    } catch (error: any) {
      console.error('[Pronunce] Failed to stop recording or recognize speech:', error);
      setIsRecording(false);
      Alert.alert('识别失败', error.message || '语音识别过程中出现错误。');
    }
  }, []);

  const handleSubmit = useCallback(() => {
    if (!recognizedText.trim()) {
      Alert.alert('请先朗读并识别单词');
      return;
    }
    if (showFeedback) return; // 防止重复提交

    // 不区分大小写比较
    const isCorrect = recognizedText.trim().toLowerCase() === correctSpelling.toLowerCase();
    const responseTimeMs = Date.now() - startTime;
    const result = {
      type: testType, // 使用传入的 testType
      correct: isCorrect,
      wordId: word.$id, // 传递 word 的 ID
      responseTimeMs,
      // 可选：传递识别出的文本
      recognizedText: recognizedText.trim(),
    };

    setShowFeedback({
      correct: isCorrect,
      message: isCorrect ? '✅ 读音正确！' : `❌ 读音有误，正确拼写是: ${correctSpelling}`,
    });

    setTimeout(() => {
      onAnswer(result);
      setRecognizedText(''); // 清空识别结果
      setShowFeedback(null);
      // 可选：重置 hasUserInteracted.current 如果需要每次点击都朗读
      // hasUserInteracted.current = false;
    }, 1500); // 延迟 1.5 秒后继续
  }, [recognizedText, showFeedback, startTime, word, onAnswer, testType, correctSpelling]);

  // 组件卸载时停止录音和语音
  useEffect(() => {
    return () => {
      if (speechRecognitionService.isCurrentlyRecording()) {
        speechRecognitionService.stopRecording();
      }
      Speech.stop(); // 停止任何正在进行的朗读
    };
  }, []);

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      {/* 单词 + 音标区域 */}
      <View style={styles.wordPhoneticContainer}>
        <Text style={styles.wordText}>{word.spelling || 'property'}</Text>
        <Text style={styles.phoneticText}>
          美 {word.american_phonetic || '/prap rti/'}
        </Text>
      </View>

      {/* 例句区域 */}
      <Text style={styles.exampleText}>
        {word.example_sentence || 'Glitter is one of the properties of gold.'}
      </Text>

      {/* 语音识别区域 */}
      <View style={styles.recognitionContainer}>
        <Text style={styles.recognitionLabel}>请朗读单词</Text>
        <TouchableOpacity
          style={styles.recordButton}
          onPress={isRecording ? handleStopRecording : handleStartRecording}
          accessibilityLabel={isRecording ? "停止录音" : "开始录音"}
          accessibilityRole="button"
        >
          <Ionicons
            name={isRecording ? "mic" : "mic-outline"} // 录音时图标不同
            size={48}
            color={isRecording ? "#FF3B30" : "#4A90E2"} // 录音时红色
          />
        </TouchableOpacity>
        <Text style={styles.recognitionStatus}>
          {isRecording ? "录音中..." : recognizedText ? `识别结果: ${recognizedText}` : "等待识别..."}
        </Text>
      </View>

      {/* 提交按钮 */}
      <TouchableOpacity
        testID="submit-button"
        style={[styles.submitButton, (!recognizedText.trim() || showFeedback) && styles.submitButtonDisabled]}
        onPress={handleSubmit}
        disabled={!recognizedText.trim() || !!showFeedback}
        accessibilityLabel="提交答案"
        accessibilityRole="button"
        accessibilityState={{ disabled: !recognizedText.trim() || !!showFeedback }}
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
const PronunceWithErrorBoundary: React.FC<TestTypeProps> = (props) => {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <Pronunce {...props} />
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
  recognitionContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 20,
  },
  recognitionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 10,
  },
  recordButton: {
    marginVertical: 10,
    padding: 10,
  },
  recognitionStatus: {
    fontSize: 14,
    color: '#666666',
    marginTop: 10,
    textAlign: 'center',
  },
  // 选项网格样式已移除
  // optionsGrid: { ... },
  // optionCard: { ... },
  // ... (其他已移除的样式)

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

export default PronunceWithErrorBoundary;