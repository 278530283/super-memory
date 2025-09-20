// src/app/(tabs)/today/[sessionId]/learn/index.tsx
import WordLearningComponent from '@/src/components/features/LearnTypes/WordLearningComponent'; // Create this component
import wordService from '@/src/lib/services/wordService'; // Import word service
import useAuthStore from '@/src/lib/stores/useAuthStore';
import useDailyLearningStore from '@/src/lib/stores/useDailyLearningStore';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from 'react-native';

export default function LearnScreen() {
  const router = useRouter();
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const { session, loading: sessionLoading, error: sessionError, updateSessionProgress } = useDailyLearningStore();
  const { user } = useAuthStore(); // Get user for preferences like speed

  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [wordList, setWordList] = useState<any[]>([]); // Use Word type
  const [currentWord, setCurrentWord] = useState<any | null>(null); // Use Word type
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchWords = async () => {
      if (!sessionId || !session || session.$id !== sessionId) {
        setIsLoading(false);
        return;
      }

      const wordIds = session.learning_word_ids || [];
      if (wordIds.length === 0) {
        Alert.alert('提示', '没有找到需要学习的单词。');
        router.back();
        return;
      }

      try {
        const words = await wordService.getWordsBySpellings(wordIds);
        setWordList(words);
        if (words.length > 0) {
          setCurrentWord(words[0]);
        }
      } catch (error: any) {
        console.error("Error fetching learning words:", error);
        Alert.alert('加载失败', error.message || '无法加载学习内容。');
      } finally {
        setIsLoading(false);
      }
    };

    fetchWords();
  }, [sessionId, session]);

  const handleNext = async () => {
    const total = wordList.length;
    const nextIndex = currentWordIndex + 1;

    // Update session progress
    const progressField = 'learning_progress';
    await updateSessionProgress(sessionId!, { [progressField]: `${nextIndex}/${total}` });

    if (nextIndex < wordList.length) {
      setCurrentWordIndex(nextIndex);
      setCurrentWord(wordList[nextIndex]);
    } else {
      // Finish learning phase
      console.log("Learning phase completed for session", sessionId);
      Alert.alert('完成', '学习阶段已完成！');
      // Update session status to 3 (post-test)
      await updateSessionProgress(sessionId!, { status: 3 });
      router.back(); // Navigate back to today's main screen
    }
  };

  if (sessionLoading || isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text>加载学习内容...</Text>
      </View>
    );
  }

  if (sessionError) {
    return (
      <View style={styles.center}>
        <Text>加载失败: {sessionError}</Text>
      </View>
    );
  }

  if (!session || !currentWord) {
    return (
      <View style={styles.center}>
        <Text>未找到学习内容。</Text>
      </View>
    );
  }

  const total = wordList.length;
  const current = currentWordIndex + 1;
  // Get user's preferred speed or default
  const userSpeed = useAuthStore.getState().userPreferences?.pronunciation === 1 ? 70 : 80; // Example logic

  return (
    <View style={styles.container}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <Text style={styles.progressText}>单词 {current}/{total}</Text>
        {/* <TouchableOpacity onPress={() => { /* Handle Pause * / }}>
          <Text style={styles.pauseButton}>⏸️</Text>
        </TouchableOpacity> */}
      </View>

      {/* Learning Area */}
      <ScrollView contentContainerStyle={styles.learnArea}>
        {currentWord && (
          <WordLearningComponent
            word={currentWord}
            userSpeed={userSpeed} // Pass user's preferred speed
            onComplete={handleNext} // Callback when learning for this word is done
          />
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#f0f0f0',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  progressText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  pauseButton: {
    fontSize: 20,
  },
  learnArea: {
    flexGrow: 1, // Allow ScrollView to grow
    padding: 20,
    justifyContent: 'flex-start', // Align content to top
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});