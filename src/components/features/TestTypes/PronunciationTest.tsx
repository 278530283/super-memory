// src/components/features/today/TestTypes/PronunciationTest.tsx (完整更新)
import pronunciationService from '@/src/lib/services/pronunciationService'; // Import pronunciation service
import actionLogService from '@/src/lib/services/actionLogService';
import useAuthStore from '@/src/lib/stores/useAuthStore';
import useDailyLearningStore from '@/src/lib/stores/useDailyLearningStore';
import { Word } from '@/src/types/Word';
import { Audio } from 'expo-av';
import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface PronunciationTestProps {
  word: Word;
  onAnswer: (result: { type: 'pronounce'; passed: boolean; wordId: string; evaluationResult?: any }) => void;
  speed?: number;
}

const PronunciationTest: React.FC<PronunciationTestProps> = ({ word, onAnswer, speed = 70 }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showFeedback, setShowFeedback] = useState<{ passed: boolean; message: string } | null>(null);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [sound, setSound] = useState<Audio.Sound | null>(null); // For playing reference audio

  // Mock audio play button - integrate with expo-av later for reference audio
  const playReferenceAudio = async () => {
    if (isPlaying || isRecording) return;
    // Implement reference audio playback similar to ListenWord component
    Alert.alert('提示', '参考音频播放功能占位符。');
    // setIsPlaying(true);
    // ... (load and play word's audio using sound state)
    // setIsPlaying(false);
  };

  const startRecording = async () => {
    if (isRecording) return;
    try {
      // Request permissions if needed (usually handled by Expo)
      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(newRecording);
      setIsRecording(true);
    } catch (err) {
      console.error('Failed to start recording', err);
      Alert.alert('录音失败', '无法启动录音功能。');
    }
  };

  const stopRecording = async () => {
    if (!isRecording || !recording) return;
    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setIsRecording(false);
      setRecording(null);

      if (uri) {
        console.log('Recording URI:', uri);
        // Upload and evaluate the recording
        const userId = useAuthStore.getState().user?.$id;
        if (!userId) {
          throw new Error('User not found for pronunciation evaluation.');
        }

        // Show feedback that evaluation is in progress
        setShowFeedback({
          passed: false, // Placeholder
          message: '正在评估发音...',
        });

        try {
          const evaluationResult = await pronunciationService.evaluatePronunciation(uri, word.$id, userId, speed);

          const passed = evaluationResult.isPassed;
          setShowFeedback({
            passed,
            message: passed ? '✅ 发音很棒！' : '❌ 再试试看，注意重音和语调。',
          });

          // --- Log the action ---
          const actionType = 1; // Example: Pre-test
          const phase = 1; // Example: Pre-test phase
          const activityType = 5; // 跟读 (5)
          const sessionId = useDailyLearningStore.getState().session?.$id || null;
          const speedUsed = speed;

          actionLogService.logAction({
            userId,
            wordId: word.$id,
            sessionId,
            actionType,
            phase,
            activityType,
            isCorrect: passed, // Map passed to isCorrect
            responseTimeMs: null, // Not typically from recording stop
            speedUsed,
            // Could add specific evaluation metrics if stored
          });
          // --- End Log ---

          setTimeout(() => {
            onAnswer({ type: 'pronounce', passed, wordId: word.$id, evaluationResult });
            setShowFeedback(null);
          }, 2000);

        } catch (evalError: any) {
          console.error('Evaluation failed:', evalError);
          setShowFeedback({
            passed: false,
            message: '评估失败，请重试。',
          });
          setTimeout(() => setShowFeedback(null), 2000);
        }

      }
    } catch (err) {
      console.error('Failed to stop recording', err);
      Alert.alert('录音失败', '录音过程中出现错误。');
      setIsRecording(false);
      setRecording(null);
    }
  };

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [sound]);

  return (
    <View style={styles.container}>
      <Text style={styles.word}>{word.spelling}</Text>
      <Text style={styles.prompt}>请跟读单词</Text>

      {/* Feedback Message */}
      {showFeedback && (
        <View style={[styles.feedbackContainer, showFeedback.passed ? styles.correctFeedback : styles.incorrectFeedback]}>
          <Text style={styles.feedbackText}>{showFeedback.message}</Text>
        </View>
      )}

      <View style={styles.controlsRow}>
        <TouchableOpacity style={styles.controlButton} onPress={playReferenceAudio} disabled={isRecording}>
          <Text style={styles.controlButtonText}>{isPlaying ? '🔊 停止' : '🔊 播放'}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.recordButton, isRecording && styles.recordingActive]}
          onPressIn={startRecording}
          onPressOut={stopRecording}
          disabled={!!showFeedback} // Disable while feedback is shown
        >
          <Text style={styles.recordButtonText}>
            {isRecording ? '🛑 停止录音' : '🎤 按住录音'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Instructions */}
      <Text style={styles.instructions}>
        按住"按住录音"按钮，清晰地读出单词。松开按钮后，系统将评估您的发音。
      </Text>
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
    marginBottom: 10,
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
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 30,
  },
  controlButton: {
    backgroundColor: '#e0e0e0',
    padding: 15,
    borderRadius: 30,
    minWidth: 100,
    alignItems: 'center',
  },
  controlButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  recordButton: {
    backgroundColor: '#4A90E2',
    padding: 15,
    borderRadius: 30,
    minWidth: 150,
    alignItems: 'center',
  },
  recordingActive: {
    backgroundColor: '#ff4d4d',
  },
  recordButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  instructions: {
    fontSize: 14,
    textAlign: 'center',
    color: 'gray',
    marginTop: 20,
  },
});

export default PronunciationTest;