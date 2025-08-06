// src/components/learning/PronunciationEvaluator.tsx
import React from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { useColorScheme } from 'react-native';

interface PronunciationEvaluatorProps {
  level: number; // 单词等级 (0-4)
  score?: number; // 总分 (0-100)
  segmentScores?: {
    clarity?: number; // 清晰度
    stress?: number;   // 重音
    // ... 其他分项
  };
  feedback?: string; // 文字反馈
  isEvaluating: boolean; // 是否正在评估
  onRetry: () => void; // 重试按钮回调
}

/**
 * 学习场景中的发音评估反馈组件
 * 根据单词等级和评估结果动态显示反馈内容和样式
 */
export function PronunciationEvaluator({
  level,
  score,
  segmentScores,
  feedback,
  isEvaluating,
  onRetry,
}: PronunciationEvaluatorProps) {
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';

  if (isEvaluating) {
    return (
      <View style={[styles.container, isDarkMode && styles.containerDark]}>
        <Text style={[styles.statusText, isDarkMode && styles.statusTextDark]}>评估中...</Text>
        {/* 可以添加一个简单的加载动画 */}
        <Animated.View
          style={[
            styles.loadingIndicator,
            {
              transform: [
                {
                  rotate: new Animated.Value(0).interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0deg', '360deg'],
                  }),
                },
              ],
            },
          ]}
        />
      </View>
    );
  }

  if (score === undefined) {
    return (
      <View style={[styles.container, isDarkMode && styles.containerDark]}>
        <Text style={[styles.statusText, isDarkMode && styles.statusTextDark]}>请先完成发音练习</Text>
      </View>
    );
  }

  // 根据等级和分数决定反馈内容和样式
  const getFeedbackMessage = () => {
    if (level === 0 || level === 1) {
      // L0/L1: 卡通气泡反馈
      if (score >= 80) return '真棒！';
      if (score >= 60) return '不错哦，再试一次？';
      return '再试一次～';
    }
    // L2-L4: 更详细的反馈
    if (score >= 90) return 'Perfect!';
    if (score >= 80) return '很好！';
    if (score >= 70) return '不错，继续努力！';
    return '需要多加练习哦。';
  };

  const message = feedback || getFeedbackMessage();
  const isHighScore = score >= 80;

  return (
    <View style={[styles.container, isDarkMode && styles.containerDark]}>
      <Text
        style={[
          styles.scoreText,
          isHighScore ? styles.highScore : styles.lowScore,
          isDarkMode && (isHighScore ? styles.highScoreDark : styles.lowScoreDark),
        ]}
      >
        {score.toFixed(0)}分
      </Text>
      <Text
        style={[
          styles.feedbackText,
          isHighScore ? styles.positiveFeedback : styles.negativeFeedback,
          isDarkMode &&
            (isHighScore ? styles.positiveFeedbackDark : styles.negativeFeedbackDark),
        ]}
      >
        {message}
      </Text>

      {/* L2 及以上显示分项评分 */}
      {level >= 2 && segmentScores && (
        <View style={styles.segmentsContainer}>
          {segmentScores.clarity !== undefined && (
            <View style={styles.segmentBar}>
              <Text style={[styles.segmentLabel, isDarkMode && styles.segmentLabelDark]}>
                清晰度
              </Text>
              <View style={styles.segmentTrack}>
                <View
                  style={[
                    styles.segmentFill,
                    { width: `${segmentScores.clarity}%` },
                    segmentScores.clarity > 80
                      ? styles.fillGreen
                      : segmentScores.clarity > 60
                      ? styles.fillYellow
                      : styles.fillRed,
                  ]}
                />
              </View>
              <Text style={[styles.segmentValue, isDarkMode && styles.segmentValueDark]}>
                {segmentScores.clarity.toFixed(0)}%
              </Text>
            </View>
          )}
          {segmentScores.stress !== undefined && (
            <View style={styles.segmentBar}>
              <Text style={[styles.segmentLabel, isDarkMode && styles.segmentLabelDark]}>
                重音
              </Text>
              <View style={styles.segmentTrack}>
                <View
                  style={[
                    styles.segmentFill,
                    { width: `${segmentScores.stress}%` },
                    segmentScores.stress > 80
                      ? styles.fillGreen
                      : segmentScores.stress > 60
                      ? styles.fillYellow
                      : styles.fillRed,
                  ]}
                />
              </View>
              <Text style={[styles.segmentValue, isDarkMode && styles.segmentValueDark]}>
                {segmentScores.stress.toFixed(0)}%
              </Text>
            </View>
          )}
        </View>
      )}

      <Text style={[styles.retryText, isDarkMode && styles.retryTextDark]} onPress={onRetry}>
        重试
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 15,
    margin: 10,
    borderRadius: 10,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
  },
  containerDark: {
    backgroundColor: '#2c2c2c',
  },
  statusText: {
    fontSize: 16,
    color: '#333',
  },
  statusTextDark: {
    color: '#ddd',
  },
  loadingIndicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#007AFF',
    borderStyle: 'dashed',
    marginTop: 10,
  },
  scoreText: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  highScore: {
    color: '#4CAF50', // 绿色
  },
  lowScore: {
    color: '#F44336', // 红色
  },
  highScoreDark: {
    color: '#66BB6A',
  },
  lowScoreDark: {
    color: '#EF5350',
  },
  feedbackText: {
    fontSize: 18,
    marginBottom: 10,
  },
  positiveFeedback: {
    color: '#388E3C',
  },
  negativeFeedback: {
    color: '#D32F2F',
  },
  positiveFeedbackDark: {
    color: '#81C784',
  },
  negativeFeedbackDark: {
    color: '#E57373',
  },
  segmentsContainer: {
    width: '100%',
    marginBottom: 10,
  },
  segmentBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  segmentLabel: {
    width: 60,
    fontSize: 14,
    color: '#333',
  },
  segmentLabelDark: {
    color: '#ddd',
  },
  segmentTrack: {
    flex: 1,
    height: 10,
    backgroundColor: '#e0e0e0',
    borderRadius: 5,
    overflow: 'hidden',
    marginHorizontal: 10,
  },
  segmentFill: {
    height: '100%',
    borderRadius: 5,
  },
  fillGreen: {
    backgroundColor: '#4CAF50',
  },
  fillYellow: {
    backgroundColor: '#FFEB3B',
  },
  fillRed: {
    backgroundColor: '#F44336',
  },
  segmentValue: {
    width: 40,
    fontSize: 14,
    color: '#333',
    textAlign: 'right',
  },
  segmentValueDark: {
    color: '#ddd',
  },
  retryText: {
    fontSize: 16,
    color: '#007AFF',
    textDecorationLine: 'underline',
    marginTop: 5,
  },
  retryTextDark: {
    color: '#4285F4',
  },
});
