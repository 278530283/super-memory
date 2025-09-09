// src/components/features/today/LearnTypes/WordLearningComponent.tsx
import { APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID, STORAGE_BUCKET_WORD_ASSETS } from '@/src/constants/appwrite';
import actionLogService from '@/src/lib/services/actionLogService';
import morphemeService from '@/src/lib/services/morphemeService';
import useAuthStore from '@/src/lib/stores/useAuthStore';
import useDailyLearningStore from '@/src/lib/stores/useDailyLearningStore';
import { UserWordProgress } from '@/src/types/UserWordProgress';
import { Word } from '@/src/types/Word';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// Import potential learning content components
// import ExampleSentenceComponent from './ExampleSentenceComponent';
// import CustomMaterialComponent from './CustomMaterialComponent';

interface WordLearningComponentProps {
  word: Word;
  userSpeed: number; // User's preferred learning speed
  userProgress?: UserWordProgress; // Pass user's progress for this word
  onComplete: () => void; // Callback when learning for this word is "done"
}

const WordLearningComponent: React.FC<WordLearningComponentProps> = ({ word, userSpeed, userProgress, onComplete }) => {
  const startTime = React.useRef<number>(Date.now());
  const [morphemes, setMorphemes] = useState<any[]>([]); // Use Morpheme type
  const [customMaterial, setCustomMaterial] = useState<any | null>(null); // Use CustomMaterial type
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const fetchPromises = [];

        // Fetch morphemes if the word is analyzed
        if (word.is_analyzed) {
          fetchPromises.push(
            morphemeService.getMorphemesForWord(word.$id).then(setMorphemes)
          );
        }

        // Fetch custom material for the user and word
        // This would typically require the user ID, which might be passed as a prop or gotten from a store
        // const userId = useAuthStore.getState().user?.$id;
        // if (userId) {
        //   fetchPromises.push(
        //     customMaterialService.getCustomMaterial(userId, word.$id).then(setCustomMaterial)
        //   );
        // }

        await Promise.all(fetchPromises);
      } catch (error: any) {
        console.error("Error fetching learning data:", error);
        setError(error.message || '加载学习内容失败。');
        // Decide whether to proceed with partial data or show an error
        // For now, we'll show an error message but still render what we can
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [word.$id, word.is_analyzed]); // Add userId to dependency array if used

  const handleComplete = () => {
    // --- NEW: Log the learning action ---
    const actionType = 2; // 学习阶段 (2)
    // Phase is not typically used for actionType=2, but could be learning sub-phase if tracked
    const activityType = 10; // 观看图文 (10) - This is a simplification, could be dynamic
    const sessionId = useDailyLearningStore.getState().session?.$id || null;
    const userId = useAuthStore.getState().user?.$id || 'unknown_user';
    const speedUsed = userSpeed;
    const studyDurationMs = Date.now() - startTime.current;
    // Determine learning method based on level/content shown
    const learningMethod = 1; // Example: 词根词缀法 (1) - Needs dynamic logic

    actionLogService.logAction({
      userId,
      wordId: word.$id,
      sessionId,
      actionType,
      phase: null, // Not typically used for learning stage logs
      activityType,
      learningMethod,
      isCorrect: null, // Not applicable for pure learning activity
      responseTimeMs: null, // Not typically applicable
      studyDurationMs,
      speedUsed,
    });
    // --- END NEW ---
    onComplete();
  };

  // Determine learning content based on level and properties
  const getLearningContent = () => {
    // Use the passed userProgress or a default/mock level
    const level = userProgress?.current_level ?? 0; // Default to L0 if no progress

    switch (level) {
      case 0:
        return (
          <>
            <Text style={styles.word}>{word.spelling}</Text>
            {word.image_path && (
              <Image
                source={{
                  uri: `${APPWRITE_ENDPOINT}/storage/buckets/${STORAGE_BUCKET_WORD_ASSETS}/files/${word.image_path}/view?project=${APPWRITE_PROJECT_ID}`,
                }}
                style={styles.image}
                resizeMode="contain"
              />
            )}
            <Text style={styles.meaning}>{word.chinese_meaning}</Text>
            <Text style={styles.detail}>基础认知阶段</Text>
            {/* Add slow playback, matching exercises etc. */}
          </>
        );
      case 1:
        return (
          <>
            <Text style={styles.word}>{word.spelling}</Text>
            {word.image_path && (
              <Image
                source={{
                  uri: `${APPWRITE_ENDPOINT}/storage/buckets/${STORAGE_BUCKET_WORD_ASSETS}/files/${word.image_path}/view?project=${APPWRITE_PROJECT_ID}`,
                }}
                style={styles.image}
                resizeMode="contain"
              />
            )}
            <Text style={styles.meaning}>{word.chinese_meaning}</Text>
            <Text style={styles.detail}>词义关联与发音基础</Text>
            <Text>语速: {userSpeed}%</Text>
            {/* Add pronunciation practice, listening exercises etc. */}
          </>
        );
      case 2:
        return (
          <>
            <Text style={styles.word}>{word.spelling}</Text>
            <Text style={styles.meaning}>{word.chinese_meaning}</Text>
            {/* Add audio playback at userSpeed, listening exercises, pronunciation practice */}
            <Text style={styles.detail}>发音训练与词义巩固</Text>
            <Text>语速: {userSpeed}%</Text>
          </>
        );
      case 3:
        return (
          <>
            <Text style={styles.word}>{word.spelling}</Text>
            <Text style={styles.meaning}>{word.chinese_meaning}</Text>
            {/* Add normal speed audio, spelling exercises, listening comprehension */}
            <Text style={styles.detail}>听力与拼写训练</Text>
          </>
        );
      case 4:
        return (
          <>
            <Text style={styles.word}>{word.spelling}</Text>
            <Text style={styles.meaning}>{word.chinese_meaning}</Text>
            {/* Add slightly faster audio, advanced exercises, context/sentences */}
            <Text style={styles.detail}>综合应用</Text>
            <Text>语速: {Math.min(userSpeed + 20, 120)}%</Text> {/* Example: up to 120% for L4 */}
          </>
        );
      default:
        return (
          <>
            <Text style={styles.word}>{word.spelling}</Text>
            {word.image_path && (
              <Image
                source={{
                  uri: `${APPWRITE_ENDPOINT}/storage/buckets/${STORAGE_BUCKET_WORD_ASSETS}/files/${word.image_path}/view?project=${APPWRITE_PROJECT_ID}`,
                }}
                style={styles.image}
                resizeMode="contain"
              />
            )}
            <Text style={styles.meaning}>{word.chinese_meaning}</Text>
            <Text style={styles.detail}>默认学习内容</Text>
          </>
        );
    }
  };

  const renderMorphemes = () => {
    if (isLoading) {
      // Show indicator only for morphemes if that's what's loading
      // Or keep the main loading indicator
    }
    if (morphemes.length > 0) {
      return (
        <View style={styles.morphemeSection}>
          <Text style={styles.sectionTitle}>词根词缀解析</Text>
          {morphemes.map((morpheme, index) => (
            <Text key={index} style={styles.morphemeText}>
              {morpheme.morphemeText} ({morpheme.meaningZh})
            </Text>
          ))}
        </View>
      );
    }
    return null;
  };

  const renderCustomMaterial = () => {
    if (isLoading) {
      // Show indicator only for custom material if that's what's loading
    }
    if (customMaterial) {
      return (
        <View style={styles.customMaterialSection}>
          <Text style={styles.sectionTitle}>家长自定义材料</Text>
          {customMaterial.memoryStory && <Text>{customMaterial.memoryStory}</Text>}
          {customMaterial.customImage && (
            <Image
              source={{
                uri: `${APPWRITE_ENDPOINT}/storage/buckets/${STORAGE_BUCKET_WORD_ASSETS}/files/${customMaterial.customImage}/view?project=${APPWRITE_PROJECT_ID}`,
              }}
              style={styles.customImage}
              resizeMode="contain"
            />
          )}
          {/* Add logic to play custom recording if exists and speed matches or can be adjusted */}
        </View>
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A90E2" />
        <Text>加载学习内容...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>错误: {error}</Text>
        <TouchableOpacity onPress={() => { /* Retry logic */ }} style={styles.retryButton}>
          <Text style={styles.retryButtonText}>重试</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {getLearningContent()}
      {renderMorphemes()}
      {renderCustomMaterial()}

      {/* Example: Auto-proceed after a delay or manual button */}
      {/* Use a timer: useEffect(() => { const timer = setTimeout(onComplete, 5000); return () => clearTimeout(timer); }, []) */}
      <TouchableOpacity style={styles.nextButton} onPress={onComplete}>
        <Text style={styles.nextButtonText}>下一个</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: 'red',
    marginBottom: 10,
  },
  retryButton: {
    padding: 10,
    backgroundColor: '#4A90E2',
    borderRadius: 5,
  },
  retryButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  word: {
    fontSize: 36,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  image: {
    width: 200,
    height: 200,
    marginBottom: 15,
  },
  meaning: {
    fontSize: 20,
    color: 'gray',
    marginBottom: 15,
    textAlign: 'center',
  },
  detail: {
    fontSize: 16,
    marginBottom: 10,
    textAlign: 'center',
  },
  morphemeSection: {
    marginTop: 20,
    padding: 10,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    width: '100%',
  },
  customMaterialSection: {
    marginTop: 20,
    padding: 10,
    backgroundColor: '#e3f2fd', // Different color for custom material
    borderRadius: 8,
    width: '100%',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  morphemeText: {
    fontSize: 16,
    marginBottom: 3,
  },
  customImage: {
    width: 150,
    height: 150,
    marginVertical: 10,
  },
  nextButton: {
    backgroundColor: '#4A90E2',
    padding: 15,
    borderRadius: 5,
    marginTop: 20,
    width: '80%',
    alignItems: 'center',
  },
  nextButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default WordLearningComponent;