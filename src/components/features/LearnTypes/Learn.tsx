// src/components/features/today/TestTypes/Learn.tsx
import { TestTypeProps } from '@/src/types/Word';
import { Ionicons } from '@expo/vector-icons';
import { AudioModule } from 'expo-audio';
import * as Speech from 'expo-speech';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import {
  ActivityIndicator,
  Alert,
  Animated,
  ScrollView,
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
const LearnFC: React.FC<TestTypeProps> = ({ 
  word, 
  onAnswer, 
  testType = 'learn'
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [startTime] = useState<number>(Date.now());
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // 发音相关状态
  const [isPlaying, setIsPlaying] = useState(false);
  const [playCount, setPlayCount] = useState(0);
  const [hasRecordingPermission, setHasRecordingPermission] = useState<boolean | null>(null);
  const playIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // 新增状态：释义切换和例句显示
  const [showEnglishDefinition, setShowEnglishDefinition] = useState(false);
  const [showMoreExamples, setShowMoreExamples] = useState(false);

  // 检查录音权限
  useEffect(() => {
    const checkPermission = async () => {
      const status = await AudioModule.requestRecordingPermissionsAsync();
      const permission = status.granted;
      setHasRecordingPermission(permission);
      
      if (!permission) {
        Alert.alert(
          '权限不足',
          '需要录音权限才能正常使用听力测试功能，请在设置中开启权限。',
          [{ text: '知道了' }]
        );
      }
    };

    checkPermission();
  }, []);

  // 动画效果
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  // 播放单词发音
  const playWordSound = useCallback(async () => {
    if (hasRecordingPermission !== true) return;

    try {
      setIsPlaying(true);
      await Speech.speak(word.spelling || '', {
        language: 'en-US',
        rate: 0.9,
        onDone: () => {
          setIsPlaying(false);
          setPlayCount(prev => prev + 1);
        },
        onError: (error) => {
          console.error('播放失败:', error);
          setIsPlaying(false);
          setPlayCount(prev => prev + 1);
        }
      });
    } catch (error) {
      console.error('播放失败:', error);
      setIsPlaying(false);
      setPlayCount(prev => prev + 1);
    }
  }, [word.spelling, hasRecordingPermission]);

  // 手动播放单词发音
  const handlePlaySound = useCallback(() => {
    playWordSound();
  }, [playWordSound]);

  // 自动播放单词3次
  useEffect(() => {
    if (hasRecordingPermission && playCount < 3) {
      playWordSound();
      playIntervalRef.current = setTimeout(() => {
        if (playCount < 2) {
          playWordSound();
        }
      }, 1500);
    }

    return () => {
      if (playIntervalRef.current) {
        clearTimeout(playIntervalRef.current);
      }
    };
  }, [playCount, playWordSound, hasRecordingPermission]);

  // 处理下一题
  const handleNext = useCallback(() => {
    console.log('handleNext');
    if (isSubmitting) return;

    setIsSubmitting(true);

    const responseTimeMs = Date.now() - startTime;
    const result = {
      type: testType,
      correct: true, // 默认成功
      userAnswer: 'learn_completed', // 固定答案
      wordId: word.$id,
      responseTimeMs,
      speedUsed: 50
    };

    // 延迟提交以显示加载状态
    setTimeout(() => {
      onAnswer(result);
    }, 300);
  }, [isSubmitting, startTime, word, onAnswer, testType]);

  // 切换释义显示
  const toggleDefinition = useCallback(() => {
    setShowEnglishDefinition(prev => !prev);
  }, []);

  // 切换更多例句
  const toggleMoreExamples = useCallback(() => {
    setShowMoreExamples(prev => !prev);
  }, []);

  // 获取例句数据
  const getExampleSentences = () => {
    const mainExample = {
      english: word.example_sentence || 'The father did everything to ensure his son had a happy upbringing.',
      chinese: '父亲竭尽全力确保儿子能在一个快乐的环境中成长。'
    };

    const additionalExamples = [
      {
        english: 'Her strict upbringing made her a very disciplined person.',
        chinese: '她严格的教养使她成为一个非常有纪律的人。'
      },
      {
        english: 'The values from his upbringing guided him throughout his life.',
        chinese: '他从成长环境中获得的价值观指引了他的一生。'
      }
    ];

    return showMoreExamples ? [mainExample, ...additionalExamples] : [mainExample];
  };

  const exampleSentences = getExampleSentences();

  // 权限未获取时显示的提示
  if (hasRecordingPermission === false) {
    return (
      <View style={styles.permissionDeniedContainer}>
        <Ionicons name="mic-off" size={48} color="#FF9500" />
        <Text style={styles.permissionDeniedText}>录音权限未开启</Text>
        <Text style={styles.permissionDeniedSubText}>请在设置中开启录音权限以使用听力测试功能</Text>
      </View>
    );
  }

  // 权限正在获取中显示加载状态
  if (hasRecordingPermission === null) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A90E2" />
        <Text style={styles.loadingText}>正在获取权限...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* 固定底部的下一题按钮 */}
      <View style={styles.footer}>
        <TouchableOpacity
          testID="next-button"
          style={[styles.nextButton, isSubmitting && styles.nextButtonDisabled]}
          onPress={handleNext}
          disabled={isSubmitting}
        accessibilityLabel="提交答案"
        accessibilityRole="button"
        accessibilityState={{ disabled: isSubmitting }}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.nextButtonText}>下一题</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* 可滚动的单词内容区域 */}
      <Animated.View style={[styles.contentContainer, { opacity: fadeAnim }]}>
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={true}
        >
          {/* 顶部单词信息区域 */}
          <View style={styles.wordHeader}>
            <View style={styles.wordMain}>
              <Text style={styles.wordText}>{word.spelling || 'upbringing'}</Text>
              <TouchableOpacity 
                style={styles.soundButton}
                onPress={handlePlaySound}
                disabled={isPlaying}
              >
                <Ionicons 
                  name={isPlaying ? "volume-medium" : "volume-medium-outline"} 
                  size={24} 
                  color="#4A90E2" 
                />
              </TouchableOpacity>
            </View>
            
            {/* 音标区域 */}
            <View style={styles.phoneticContainer}>
              <Text style={styles.phoneticText}>
                {word.american_phonetic ? `美 /${word.american_phonetic}/` : 
                 word.british_phonetic ? `英 /${word.british_phonetic}/` : ''}
              </Text>
            </View>
          </View>

          {/* 释义区域 */}
          <View style={styles.meaningContainer}>
            <View style={styles.meaningHeader}>
              <Text style={styles.meaningTitle}>释义</Text>
              <TouchableOpacity 
                style={styles.definitionToggle}
                onPress={toggleDefinition}
              >
                <Text style={styles.definitionToggleText}>
                  {showEnglishDefinition ? '英文释义' : '中文释义'}
                </Text>
                <Ionicons 
                  name="swap-vertical" 
                  size={14} 
                  color="#4A90E2" 
                  style={styles.toggleIcon}
                />
              </TouchableOpacity>
            </View>
            
            <View style={styles.meaningContent}>
              {showEnglishDefinition ? (
                // 英文释义 - 直接从word.definitions获取
                <View style={styles.definitionContent}>
                  {word.definitions && word.definitions.length > 0 ? (
                    word.definitions.map((definition, index) => (
                      <View key={index} style={styles.meaningItem}>
                        {definition.partOfSpeech ? (
                          <>
                            <Text style={styles.englishPartOfSpeech}>{definition.partOfSpeech}</Text>
                            <Text style={styles.englishMeaningText}>
                              {definition.meanings.join('; ')}
                            </Text>
                          </>
                        ) : (
                          <Text style={styles.englishMeaningText}>
                            {definition.meanings.join('; ')}
                          </Text>
                        )}
                      </View>
                    ))
                  ) : (
                    <Text style={styles.englishMeaningText}>
                      The way in which a child is cared for and taught how to behave by their parents or guardians.
                    </Text>
                  )}
                </View>
              ) : (
                // 中文释义 - 直接从word.chinese_meanings获取
                <View style={styles.chineseDefinitionContent}>
                  {word.chinese_meanings && word.chinese_meanings.length > 0 ? (
                    word.chinese_meanings.map((meaning, index) => (
                      <View key={index} style={styles.meaningItem}>
                        {meaning.partOfSpeech ? (
                          <>
                            <Text style={styles.chinesePartOfSpeech}>{meaning.partOfSpeech}</Text>
                            <Text style={styles.chineseMeaningText}>
                              {meaning.meanings.join('; ')}
                            </Text>
                          </>
                        ) : (
                          <Text style={styles.chineseMeaningText}>
                            {meaning.meanings.join('; ')}
                          </Text>
                        )}
                      </View>
                    ))
                  ) : (
                    <Text style={styles.chineseMeaningText}>
                      {word.chinese_meaning || '教养；养育'}
                    </Text>
                  )}
                </View>
              )}
            </View>
          </View>

          {/* 例句区域 */}
          <View style={styles.exampleContainer}>
            <View style={styles.exampleHeader}>
              <Text style={styles.exampleTitle}>例句</Text>
              <TouchableOpacity 
                style={styles.moreExamplesButton}
                onPress={toggleMoreExamples}
              >
                <Text style={styles.moreExamplesText}>
                  {showMoreExamples ? '收起' : '更多'}
                </Text>
                <Ionicons 
                  name={showMoreExamples ? "chevron-up" : "chevron-down"} 
                  size={14} 
                  color="#4A90E2" 
                />
              </TouchableOpacity>
            </View>
            
            <View style={styles.examplesList}>
              {exampleSentences.map((example, index) => (
                <View key={index} style={styles.exampleItem}>
                  <Text style={styles.exampleEnglish}>{example.english}</Text>
                  <Text style={styles.exampleChinese}>{example.chinese}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* 学习提示区域 */}
          {/* <View style={styles.learningTip}>
            <Ionicons name="school-outline" size={20} color="#4A90E2" />
            <Text style={styles.learningTipText}>请仔细学习单词的发音和释义</Text>
          </View> */}
        </ScrollView>
      </Animated.View>
    </View>
  );
};

// 使用错误边界包装组件
const Learn: React.FC<TestTypeProps> = (props) => {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <LearnFC {...props} />
    </ErrorBoundary>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  contentContainer: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 20, // 为底部按钮留出空间
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
  // 单词头部区域
  wordHeader: {
    paddingVertical: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  wordMain: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  wordText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginRight: 12,
  },
  soundButton: {
    padding: 4,
  },
  phoneticContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  phoneticText: {
    fontSize: 16,
    color: '#666666',
    marginRight: 8,
  },
  // 释义区域
  meaningContainer: {
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  meaningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  meaningTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  definitionToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#F5F5F5',
    borderRadius: 6,
  },
  definitionToggleText: {
    fontSize: 12,
    color: '#4A90E2',
    marginRight: 4,
  },
  toggleIcon: {
    marginLeft: 2,
  },
  meaningContent: {
    // 高度自适应内容
  },
  definitionContent: {
    // 英文释义容器
    gap: 8,
  },
  chineseDefinitionContent: {
    // 中文释义容器
    gap: 8,
  },
  meaningItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
  },
  chinesePartOfSpeech: {
    fontSize: 15,
    color: '#FF6B35', // 橙色显示中文词性
    fontWeight: '600',
    marginRight: 8,
    minWidth: 30,
  },
  chineseMeaningText: {
    fontSize: 15,
    color: '#1A1A1A',
    lineHeight: 20,
    flex: 1,
    flexWrap: 'wrap',
  },
  englishPartOfSpeech: {
    fontSize: 15,
    color: '#4A90E2', // 蓝色显示英文词性
    fontWeight: '600',
    marginRight: 8,
    minWidth: 30,
    fontStyle: 'italic',
  },
  englishMeaningText: {
    fontSize: 15,
    color: '#1A1A1A',
    lineHeight: 20,
    flex: 1,
    flexWrap: 'wrap',
    fontStyle: 'italic',
  },
  // 例句区域
  exampleContainer: {
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  exampleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  exampleTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  moreExamplesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  moreExamplesText: {
    fontSize: 12,
    color: '#4A90E2',
    marginRight: 4,
  },
  examplesList: {
    gap: 12,
  },
  exampleItem: {
    gap: 6,
  },
  exampleEnglish: {
    fontSize: 14,
    color: '#333333',
    lineHeight: 20,
    fontStyle: 'italic',
  },
  exampleChinese: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 18,
  },
  // 学习提示区域
  learningTip: {
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    paddingVertical: 40,
  },
  learningTipText: {
    fontSize: 16,
    color: '#666666',
    marginLeft: 8,
  },
  // 底部按钮 - 固定在底部
  footer: {
  position: 'absolute',
  bottom: 0,
  left: 0,
  right: 0,
  backgroundColor: 'transparent', // 完全透明
  paddingHorizontal: 16,
  paddingVertical: 12,
  borderTopWidth: 0, // 去掉顶部边框
  // 移除所有阴影效果
  shadowColor: 'transparent',
  shadowOpacity: 0,
  shadowRadius: 0,
  shadowOffset: { width: 0, height: 0 },
  elevation: 0, // Android 移除阴影
  zIndex: 1000,
  },
  nextButton: {
    backgroundColor: '#4A90E2',
    borderRadius: 25,
    paddingVertical: 16,
    alignItems: 'center',
    // 移除按钮的阴影效果，确保完全实心
    shadowColor: 'transparent',
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0, // Android 移除阴影
    minHeight: 50,
  },
  nextButtonDisabled: {
    backgroundColor: '#C5C5C7',
    // 禁用状态也移除阴影
    shadowColor: 'transparent',
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0,
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  // 权限相关样式
  permissionDeniedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFFFFF',
  },
  permissionDeniedText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
    color: '#1A1A1A',
  },
  permissionDeniedSubText: {
    fontSize: 14,
    color: '#666666',
    marginTop: 8,
    textAlign: 'center',
    marginBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666666',
  },
});

export default Learn;