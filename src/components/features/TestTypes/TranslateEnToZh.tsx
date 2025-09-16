// src/components/features/today/TestTypes/TranslateEnToZh.tsx
import actionLogService from '@/src/lib/services/actionLogService';
import useAuthStore from '@/src/lib/stores/useAuthStore';
import useDailyLearningStore from '@/src/lib/stores/useDailyLearningStore';
import { Word } from '@/src/types/Word';
import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// 扩展 Word 类型，支持音标和例句
interface WordWithExtraInfo extends Word {
  american_phonetic?: string;
  example_sentence?: string;
}

interface TranslateEnToZhProps {
  word: WordWithExtraInfo;
  onAnswer: (result: { 
    type: 'translate'; 
    correct: boolean; 
    selectedOption: string; 
    wordId: string; 
    responseTimeMs?: number 
  }) => void;
}

const TranslateEnToZh: React.FC<TranslateEnToZhProps> = ({ word, onAnswer }) => {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState<{ correct: boolean; message: string } | null>(null);
  const [startTime] = useState<number>(Date.now());

  // 6个选项（1正确+5错误），确保两列3行排列
  const generateOptions = (): { partOfSpeech: string; meaning: string }[] => {
    return [
      { partOfSpeech: 'n.', meaning: '特性；财产；房产' }, // 正确选项
      { partOfSpeech: 'n.', meaning: '贫困，贫穷；贫乏' },
      { partOfSpeech: 'adv.', meaning: '正确地，适当地' },
      { partOfSpeech: 'n.', meaning: '嗜好，习性；倾向' },
      { partOfSpeech: 'adj.', meaning: '珍贵的；稀有的' }, // 新增错误选项
      { partOfSpeech: 'v.', meaning: '积累；储存' } // 新增错误选项
    ].sort(() => Math.random() - 0.5); // 随机打乱
  };

  const [options] = useState<ReturnType<typeof generateOptions>>(generateOptions());
  const correctOptionKey = 'n. 特性；财产；房产'; // 正确选项标识

  const handleSelect = (optionKey: string) => {
    if (showFeedback) return;
    setSelectedOption(optionKey);
  };

  const handleSubmit = () => {
    if (!selectedOption) {
      Alert.alert('请选择一个选项');
      return;
    }
    if (showFeedback) return;

    const isCorrect = selectedOption === correctOptionKey;
    const responseTimeMs = Date.now() - startTime;
    const result = {
      type: 'translate' as const,
      correct: isCorrect,
      selectedOption,
      wordId: word.$id,
      responseTimeMs,
    };

    // 日志记录（保留原逻辑）
    const sessionId = useDailyLearningStore.getState().session?.$id || null;
    const userId = useAuthStore.getState().user?.$id || 'unknown_user';
    actionLogService.logAction({
      userId,
      wordId: word.$id,
      sessionId,
      actionType: 1,
      phase: 1,
      activityType: 2,
      isCorrect,
      responseTimeMs,
      speedUsed: 100,
    });

    setShowFeedback({
      correct: isCorrect,
      message: isCorrect ? '✅ 正确！' : '❌ 再试试',
    });

    setTimeout(() => {
      onAnswer(result);
      setSelectedOption(null);
      setShowFeedback(null);
    }, 1500);
  };

  return (
    <View style={styles.container}>
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

      {/* 选项区域（核心修复：强制两列排列） */}
      <View style={styles.optionsGrid}>
        {options.map((option, index) => {
          const optionKey = `${option.partOfSpeech} ${option.meaning}`;
          const isSelected = selectedOption === optionKey;
          const isCorrect = optionKey === correctOptionKey;
          return (
            <TouchableOpacity
              key={index}
              style={[
                styles.optionCard,
                isSelected && !showFeedback && styles.selectedOptionCard,
                showFeedback && isCorrect && styles.correctOptionCard,
                showFeedback && !isCorrect && isSelected && styles.incorrectOptionCard,
              ]}
              onPress={() => handleSelect(optionKey)}
              disabled={!!showFeedback}
            >
              <Text style={styles.optionText}>
                <Text style={styles.partOfSpeechText}>{option.partOfSpeech}</Text>
                <Text style={styles.meaningText}>{option.meaning}</Text>
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* 提交按钮 */}
      <TouchableOpacity
        style={[styles.submitButton, (!selectedOption || showFeedback) && styles.submitButtonDisabled]}
        onPress={handleSubmit}
        disabled={!selectedOption || !!showFeedback}
      >
        <Text style={styles.submitButtonText}>提交</Text>
      </TouchableOpacity>

      {/* 答题反馈 */}
      {showFeedback && (
        <Text style={[
          styles.feedbackText,
          showFeedback.correct ? styles.correctFeedbackText : styles.incorrectFeedbackText,
        ]}>
          {showFeedback.message}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16, // 缩小水平内边距，避免挤压选项
    paddingVertical: 20,
    position: 'relative',
  },

  // 单词+音标容器
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

  // 例句样式
  exampleText: {
    fontSize: 14,
    color: '#666666',
    fontStyle: 'italic',
    marginBottom: 20,
    lineHeight: 20,
    width: '100%', // 确保例句不超出容器
    textAlign: 'left',
  },

  // 选项网格（核心修复：精确控制两列布局）
  optionsGrid: {
    flexDirection: 'row',       // 横向排列
    flexWrap: 'wrap',          // 自动换行
    justifyContent: 'space-between', // 左右对齐，消除中间空隙
    marginBottom: 80,          // 给底部按钮留足空间
    rowGap: 12,                // 仅设置垂直间距（避免水平间距挤压宽度）
  },
  optionCard: {
    width: '48%',              // 两列各占48%，总宽度96%（留4%间隙）
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,               // 减少内边距，避免内容拥挤
    boxSizing: 'border-box',   // 关键：确保border/padding不增加总宽度
    overflow: 'hidden',        // 防止内容溢出导致布局错乱
  },
  // 选中状态样式
  selectedOptionCard: {
    borderColor: '#4A90E2',
    backgroundColor: '#F0F8FF',
  },
  // 正确答案高亮
  correctOptionCard: {
    borderColor: '#28A745',
    backgroundColor: '#F8FFF8',
  },
  // 错误答案（用户选中）高亮
  incorrectOptionCard: {
    borderColor: '#DC3545',
    backgroundColor: '#FFF8F8',
  },
  // 选项文本样式（适配内容长度）
  optionText: {
    fontSize: 13,              // 进一步缩小字体，确保一行显示
    lineHeight: 18,            // 减小行高，压缩卡片高度
    textAlign: 'left',
  },
  partOfSpeechText: {
    color: '#4A90E2',
    fontWeight: '500',
    marginRight: 4,
  },
  meaningText: {
    color: '#333333',
    flexShrink: 1,             // 允许文本收缩，避免溢出
  },

  // 提交按钮
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

  // 答题反馈
  feedbackText: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    transform: [{ translateY: -50 }],
    zIndex: 10,
  },
  correctFeedbackText: {
    color: '#28A745',
  },
  incorrectFeedbackText: {
    color: '#DC3545',
  },
});

export default TranslateEnToZh;