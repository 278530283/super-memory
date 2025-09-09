// src/components/features/today/TestTypes/TranslateEnToZh.tsx
import actionLogService from '@/src/lib/services/actionLogService';
import useAuthStore from '@/src/lib/stores/useAuthStore';
import useDailyLearningStore from '@/src/lib/stores/useDailyLearningStore';
import { Word } from '@/src/types/Word';
import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';


interface TranslateEnToZhProps {
  word: Word;
  onAnswer: (result: { type: 'translate'; correct: boolean; selectedOption: string; wordId: string; responseTimeMs?: number }) => void;
}

const TranslateEnToZh: React.FC<TranslateEnToZhProps> = ({ word, onAnswer }) => {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState<{ correct: boolean; message: string } | null>(null);
  const [startTime] = useState<number>(Date.now()); // Track start time for response

  // Mock options - in reality, fetch based on word and history
  const generateOptions = (): string[] => {
    const incorrectOptions = ['错误选项 A', '错误选项 B', '错误选项 C', '错误选项 D', '错误选项 E'];
    const allOptions = [word.chinese_meaning, ...incorrectOptions];
    return allOptions.sort(() => Math.random() - 0.5); // Shuffle
  };

  const [options] = useState<string[]>(generateOptions());

  const handleSelect = (option: string) => {
    if (showFeedback) return; // Prevent selection after feedback
    setSelectedOption(option);
  };

  const handleSubmit = () => {
    if (!selectedOption) {
      Alert.alert('请选择一个选项。');
      return;
    }
    if (showFeedback) return; // Prevent multiple submits

    const isCorrect = selectedOption === word.chinese_meaning;
    const responseTimeMs = Date.now() - startTime;

    const result = {
    type: 'translate' as const,
    correct: isCorrect,
    selectedOption,
    wordId: word.$id,
    responseTimeMs,
  };

  // --- NEW: Log the action ---
  const actionType = 1; // Example: Pre-test (前置评测) - This should be dynamic
  const phase = 1; // Example: Pre-test phase - This should be dynamic
  const activityType = 2; // Example: 英译中 (2)
  const sessionId = useDailyLearningStore.getState().session?.$id || null;
  const userId = useAuthStore.getState().user?.$id || 'unknown_user';
  const speedUsed = 100; // Translate doesn't use speed, but log a default or derive if needed

  actionLogService.logAction({
    userId,
    wordId: word.$id,
    sessionId,
    actionType,
    phase,
    activityType,
    isCorrect,
    responseTimeMs,
    speedUsed,
  });

    setShowFeedback({
      correct: isCorrect,
      message: isCorrect ? '✅ 正确！' : '❌ 再试试',
    });

    setTimeout(() => {
      onAnswer(result);
      setSelectedOption(null);
      setShowFeedback(null);
    }, 1500); // 1.5 seconds delay as per requirements.md
  };

  return (
    <View style={styles.container}>
      <Text style={styles.word}>{word.spelling}</Text>
      <Text style={styles.prompt}>请选择正确的中文释义</Text>

      {/* Feedback Message */}
      {showFeedback && (
        <View style={[styles.feedbackContainer, showFeedback.correct ? styles.correctFeedback : styles.incorrectFeedback]}>
          <Text style={styles.feedbackText}>{showFeedback.message}</Text>
        </View>
      )}

      <View style={styles.optionsContainer}>
        {options.map((option, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.optionButton,
              selectedOption === option && !showFeedback && styles.selectedOptionButton,
              showFeedback && option === word.chinese_meaning && styles.correctOptionHighlight,
              showFeedback && selectedOption === option && !isCorrect && styles.incorrectOptionHighlight,
            ]}
            onPress={() => handleSelect(option)}
            disabled={!!showFeedback}
          >
            <Text style={[
              styles.optionText,
              selectedOption === option && !showFeedback && styles.selectedOptionText,
            ]}>
              {option}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        style={[styles.submitButton, (!selectedOption || showFeedback) && styles.submitButtonDisabled]}
        onPress={handleSubmit}
        disabled={!selectedOption || !!showFeedback}
      >
        <Text style={styles.submitButtonText}>提交</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    padding: 20,
  },
  word: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  prompt: {
    fontSize: 18,
    marginBottom: 20,
    textAlign: 'center',
    color: 'gray',
  },
  feedbackContainer: {
    padding: 10,
    borderRadius: 5,
    marginBottom: 15,
    minWidth: 100,
    alignItems: 'center',
  },
  correctFeedback: {
    backgroundColor: '#d4edda',
    borderColor: '#c3e6cb',
    borderWidth: 1,
  },
  incorrectFeedback: {
    backgroundColor: '#f8d7da',
    borderColor: '#f5c6cb',
    borderWidth: 1,
  },
  feedbackText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  optionsContainer: {
    width: '100%',
    marginBottom: 20,
  },
  optionButton: {
    backgroundColor: '#f0f0f0',
    padding: 15,
    marginVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  selectedOptionButton: {
    backgroundColor: '#4A90E2',
    borderColor: '#4A90E2',
  },
  correctOptionHighlight: {
    backgroundColor: '#d4edda',
    borderColor: '#28a745',
  },
  incorrectOptionHighlight: {
    backgroundColor: '#f8d7da',
    borderColor: '#dc3545',
  },
  optionText: {
    fontSize: 16,
    textAlign: 'center',
    color: '#333',
  },
  selectedOptionText: {
    color: 'white',
  },
  submitButton: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 5,
    width: '80%',
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: 'gray',
  },
  submitButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default TranslateEnToZh;