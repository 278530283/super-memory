// src/app/(tabs)/today/[sessionId]/learn/index.tsx
import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import useDailyLearningStore from '../../../../../lib/stores/useDailyLearningStore';

export default function LearnScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const { session, loading, error } = useDailyLearningStore();

  // State for current word index, word details, learning method, etc.
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [wordDetails, setWordDetails] = useState<any>(null); // Use Word type
  const [learningMethod, setLearningMethod] = useState<number | null>(null); // Based on word level/user prefs

  useEffect(() => {
    // Fetch session details if not already loaded, or use session from store
    // Determine current word list (learning_word_ids) and current index
    // Fetch word details for current word index
    // Determine learning method based on word level and user settings
    console.log(`Loading learning session for ID: ${sessionId}`);
    // Placeholder logic
    if (session && session.$id === sessionId) {
        // Simulate fetching word details
        setWordDetails({ spelling: 'example', chinese_meaning: '例子' });
        setLearningMethod(1); // Placeholder method
    }
  }, [sessionId, session]);

  const handleNext = () => {
    // Logic to go to next word
    // Update progress in dailyLearningStore
    // Record action log
    console.log("Moving to next word...");
    if (session && currentWordIndex < session.learning_word_ids.length - 1) {
        setCurrentWordIndex(currentWordIndex + 1);
    } else {
        // Finish learning phase
        console.log("Learning phase completed.");
        // Update session status to 3 (post-test)
        // Navigate back or to post-test
    }
  };

  if (loading || !wordDetails) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text>Loading learning content...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.progress}>单词 {currentWordIndex + 1}/{session?.learning_word_ids.length || 0}</Text>
      {/* Pause button placeholder */}
      <View style={styles.learnArea}>
        <Text style={styles.word}>{wordDetails.spelling}</Text>
        <Text style={styles.meaning}>{wordDetails.chinese_meaning}</Text>
        {/* Render learning content based on learningMethod */}
        <Text>Learning Method: {learningMethod}</Text>
        {/* Add audio playback, images, morpheme breakdown, custom materials etc. */}
      </View>
      <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
        <Text style={styles.nextButtonText}>Next</Text>
      </TouchableOpacity>
      {/* Navigation/Control buttons placeholder */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  progress: { fontSize: 16, marginBottom: 10 },
  learnArea: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  word: { fontSize: 32, fontWeight: 'bold', marginBottom: 10 },
  meaning: { fontSize: 20, color: 'gray', marginBottom: 20 },
  nextButton: {
    backgroundColor: '#4A90E2',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 20,
  },
  nextButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});