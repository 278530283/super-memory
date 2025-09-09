// src/components/features/today/TestTypes/ListenWord.tsx
import { APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID, STORAGE_BUCKET_WORD_ASSETS } from '@/src/constants/appwrite'; // Import constants
import actionLogService from '@/src/lib/services/actionLogService';
import useAuthStore from '@/src/lib/stores/useAuthStore'; // To get pronunciation preference
import useDailyLearningStore from '@/src/lib/stores/useDailyLearningStore';
import { Word } from '@/src/types/Word';
import { Audio } from 'expo-av'; // Import Audio
import React, { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface ListenWordProps {
  word: Word;
  onAnswer: (result: { type: 'listen'; correct: boolean; selectedOption?: string; wordId: string; responseTimeMs?: number }) => void;
  speed?: number; // Speed can be passed, but often derived from user pref
}

const ListenWord: React.FC<ListenWordProps> = ({ word, onAnswer, speed }) => {
  const [sound, setSound] = useState<Audio.Sound | null>(null); // State to hold the sound object
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState<{ correct: boolean; message: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Determine audio file ID based on user preference
  const userPref = useAuthStore.getState().userPreferences?.pronunciation_preference;
  const audioFileId = userPref === 1 ? word.british_audio : word.american_audio;

  const playAudio = async () => {
    if (isPlaying || !audioFileId) {
      if (!audioFileId) {
        Alert.alert('音频不可用', '该单词没有对应的音频文件。');
      }
      return;
    }

    if (sound) {
        // If sound is already loaded, just play it
        try {
            setIsPlaying(true);
            await sound.playAsync();
            // Listen for finish to update state
            sound.setOnPlaybackStatusUpdate((status) => {
                if (status.isLoaded && status.didJustFinish) {
                    setIsPlaying(false);
                    sound.unloadAsync(); // Clean up
                    setSound(null);
                }
            });
        } catch (error) {
            console.error('Error playing existing sound:', error);
            setIsPlaying(false);
            setSound(null);
        }
        return;
    }
    setIsLoading(true);
    try {
      // Construct URL from Appwrite Storage
      // Ensure APPWRITE_ENDPOINT does not end with /v1 if your setup is different
      const audioUrl = `${APPWRITE_ENDPOINT}/storage/buckets/${STORAGE_BUCKET_WORD_ASSETS}/files/${audioFileId}/view?project=${APPWRITE_PROJECT_ID}`;

      console.log("Loading audio from URL:", audioUrl); // Debug log

      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: audioUrl },
        { shouldPlay: true } // Start playing immediately
        // Add options for speed control if expo-av supports it directly or via workarounds
        // , { rate: speed ? speed / 100 : 1.0 } // Note: rate might not work as expected for all formats
      );

      setSound(newSound);
      setIsPlaying(true);

      // Listen for playback status updates to know when it finishes
      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          console.log('Playback finished');
          setIsPlaying(false);
          newSound.unloadAsync(); // Clean up resources
          setSound(null);
        }
      });

    } catch (error) {
      console.error('Error playing audio:', error);
      Alert.alert('播放失败', '无法播放单词音频。');
      setIsPlaying(false);
      setSound(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Mock options - in reality, fetch based on word and history
  // This should ideally come from a service or be passed in
  const generateOptions = (): string[] => {
    // Simple mock: correct answer + 5 random incorrect ones
    // In practice, this would use a smarter algorithm based on word history
    const incorrectOptions = [
      '错误选项 A', '错误选项 B', '错误选项 C',
      '错误选项 D', '错误选项 E'
    ];
    const allOptions = [word.chinese_meaning, ...incorrectOptions];
    return allOptions.sort(() => Math.random() - 0.5); // Shuffle
  };

  const [options] = useState<string[]>(generateOptions()); // Generate once

  // const playAudio = async () => {
  //   if (isPlaying) return; // Prevent multiple plays
  //   setIsLoading(true);
  //   setIsPlaying(true);
  //   try {
  //     // 1. Determine which audio file to use based on user preference and word data
  //     const audioFileId = useAuthStore.getState().userPreferences?.pronunciation_preference === 1
  //       ? word.british_audio
  //       : word.american_audio;

  //     if (!audioFileId) {
  //       throw new Error('No audio file available for this word.');
  //     }

  //     // 2. Construct URL from Appwrite Storage
  //     const audioUrl = `${APPWRITE_ENDPOINT}/storage/buckets/${STORAGE_BUCKET_WORD_ASSETS}/files/${audioFileId}/view?project=${APPWRITE_PROJECT_ID}`;

  //     // 3. Load and play using expo-av
  //     const { sound } = await Audio.Sound.createAsync({ uri: audioUrl });
  //     // Apply speed if possible (expo-av might not support direct speed change easily)
  //     // sound.setRateAsync(speed / 100, true); // This might not work as expected
  //     await sound.playAsync();

  //     // 4. Listen for finish event
  //     sound.setOnPlaybackStatusUpdate((status) => {
  //       if (status.isLoaded && status.didJustFinish) {
  //         setIsPlaying(false);
  //         sound.unloadAsync(); // Clean up
  //       }
  //     });
  //   } catch (error) {
  //     console.error('Error playing audio:', error);
  //     Alert.alert('播放失败', '无法播放单词音频。');
  //     setIsPlaying(false);
  //   } finally {
  //     setIsLoading(false);
  //   }
  // };

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

    // Mock correctness check - replace with actual logic
    const isCorrect = selectedOption === word.chinese_meaning;

    // Mock response time calculation
    const responseTimeMs = Math.floor(Math.random() * 2000) + 500; // 500ms - 2500ms

    const result = {
    type: 'listen' as const,
    correct: isCorrect,
    selectedOption,
    wordId: word.$id,
    responseTimeMs,
  };

  // --- NEW: Log the action ---
  // Determine actionType and activityType based on context
  // These would ideally be passed as props or derived from the test flow
  const actionType = 1; // Example: Pre-test (前置评测)
  const phase = 1; // Example: Pre-test phase
  const activityType = 1; // Example: Listen Word (听单词)
  const sessionId = useDailyLearningStore.getState().session?.$id || null; // Get session ID
  const userId = useAuthStore.getState().user?.$id || 'unknown_user'; // Get user ID
  const speedUsed = 70; // Example speed, get from state/context

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
    // learningMethod, studyDurationMs can be added if relevant
  });
  // --- END NEW ---

    // Show immediate feedback
    setShowFeedback({
      correct: isCorrect,
      message: isCorrect ? '✅ 正确！' : '❌ 再试试',
    });

    // Automatically submit answer and proceed after delay (as per requirements.md)
    setTimeout(() => {
      onAnswer(result);
      // Reset state for potential reuse (though component usually unmounts)
      setSelectedOption(null);
      setShowFeedback(null);
    }, 1500); // 1.5 seconds delay as per requirements.md
  };

  return (
    <View style={styles.container}>
      {/* Play Button */}
      <TouchableOpacity
        style={styles.playButton}
        // onPress={playAudio}
        disabled={isPlaying || isLoading} // Disable while playing or loading
      >
        {isLoading ? (
          <ActivityIndicator size="small" color="#4A90E2" />
        ) : (
          <Text style={styles.playButtonText}>
            {isPlaying ? '🔊 Playing...' : '🔊 播放单词'}
          </Text>
        )}
      </TouchableOpacity>

      {/* Feedback Message */}
      {showFeedback && (
        <View style={[styles.feedbackContainer, showFeedback.correct ? styles.correctFeedback : styles.incorrectFeedback]}>
          <Text style={styles.feedbackText}>{showFeedback.message}</Text>
        </View>
      )}

      {/* Options */}
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
            disabled={!!showFeedback} // Disable after feedback
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

      {/* Submit Button */}
      <TouchableOpacity
        style={[styles.submitButton, (!selectedOption || showFeedback) && styles.submitButtonDisabled]}
        onPress={handleSubmit}
        disabled={!selectedOption || !!showFeedback} // Disable if no selection or feedback shown
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
    minWidth: 150, // Ensure button has a minimum width
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  feedbackContainer: {
    padding: 10,
    borderRadius: 5,
    marginBottom: 15,
    minWidth: 100,
    alignItems: 'center',
  },
  correctFeedback: {
    backgroundColor: '#d4edda', // Light green
    borderColor: '#c3e6cb',
    borderWidth: 1,
  },
  incorrectFeedback: {
    backgroundColor: '#f8d7da', // Light red
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
    backgroundColor: '#d4edda', // Light green highlight for correct answer
    borderColor: '#28a745',
  },
  incorrectOptionHighlight: {
    backgroundColor: '#f8d7da', // Light red highlight for incorrect selection
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
    backgroundColor: '#4CAF50', // Success Green
    padding: 15,
    borderRadius: 5,
    width: '80%',
    alignItems: 'center',
    marginTop: 10,
  },
  submitButtonDisabled: {
    backgroundColor: 'gray', // Gray when disabled
  },
  submitButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default ListenWord;