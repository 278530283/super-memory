// src/components/features/today/TestTypes/SpellingTest.tsx
import actionLogService from '@/src/lib/services/actionLogService';
import useAuthStore from '@/src/lib/stores/useAuthStore';
import useDailyLearningStore from '@/src/lib/stores/useDailyLearningStore';
import { Word } from '@/src/types/Word';
import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

interface SpellingTestProps {
  word: Word;
  onAnswer: (result: { type: 'spell'; correct: boolean; userSpelling: string; wordId: string; responseTimeMs?: number }) => void;
}

const SpellingTest: React.FC<SpellingTestProps> = ({ word, onAnswer }) => {
  const [userInput, setUserInput] = useState('');
  const [showFeedback, setShowFeedback] = useState<{ correct: boolean; message: string } | null>(null);
  const [startTime] = useState<number>(Date.now());

  // Mock audio play button - integrate with expo-av later
  // const playAudio = () => {
  //   // Logic to play word pronunciation
  // };

  const handleSubmit = () => {
    if (!userInput.trim()) {
      Alert.alert('请输入单词拼写。');
      return;
    }
    if (showFeedback) return;

    const isCorrect = userInput.trim().toLowerCase() === word.spelling.toLowerCase();
    const responseTimeMs = Date.now() - startTime;

    const result = {
    type: 'spell' as const,
    correct: isCorrect,
    userSpelling: userInput.trim(),
    wordId: word.$id,
    responseTimeMs,
  };

  // --- NEW: Log the action ---
  const actionType = 1; // Example: Pre-test - Dynamic
  const phase = 1; // Example: Pre-test phase - Dynamic
  const activityType = 4; // Example: 拼写 (4)
  const sessionId = useDailyLearningStore.getState().session?.$id || null;
  const userId = useAuthStore.getState().user?.$id || 'unknown_user';
  const speedUsed = 100; // Spelling doesn't use speed

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
      message: isCorrect ? '✅ 正确！' : `❌ 不正确，正确拼写是: ${word.spelling}`,
    });

    setTimeout(() => {
      onAnswer(result);
      setUserInput('');
      setShowFeedback(null);
    }, 2000); // Slightly longer feedback for spelling
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.playButton} /* onPress={playAudio} */>
        <Text style={styles.playButtonText}>🔊 播放单词</Text>
      </TouchableOpacity>

      <Text style={styles.prompt}>请拼写出听到的单词</Text>

      {/* Feedback Message */}
      {showFeedback && (
        <View style={[styles.feedbackContainer, showFeedback.correct ? styles.correctFeedback : styles.incorrectFeedback]}>
          <Text style={styles.feedbackText}>{showFeedback.message}</Text>
        </View>
      )}

      <TextInput
        style={styles.input}
        placeholder="输入单词拼写"
        value={userInput}
        onChangeText={setUserInput}
        editable={!showFeedback} // Disable input after feedback
        autoCapitalize="none"
        autoCorrect={false}
      />

      <TouchableOpacity
        style={[styles.submitButton, (showFeedback) && styles.submitButtonDisabled]}
        onPress={handleSubmit}
        disabled={!!showFeedback}
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
  playButton: {
    backgroundColor: '#e0e0e0',
    padding: 15,
    borderRadius: 30,
    marginBottom: 30,
    minWidth: 150,
    alignItems: 'center',
  },
  playButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
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
  input: {
    height: 50,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 15,
    fontSize: 18,
    width: '80%',
    marginBottom: 20,
    textAlign: 'center',
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

export default SpellingTest;