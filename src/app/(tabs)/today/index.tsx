// src/app/(tabs)/today/index.tsx
import SessionCard from '@/src/components/features/today/SessionCard';
import SummaryCard from '@/src/components/features/today/SummaryCard'; // Import SummaryCard
import dailyLearningService from '@/src/lib/services/dailyLearningService';
import useAuthStore from '@/src/lib/stores/useAuthStore';
import useDailyLearningStore from '@/src/lib/stores/useDailyLearningStore';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from 'react-native';

export default function TodayScreen() {
  const { user } = useAuthStore();
  const {
    session,
    loading: sessionLoading,
    error: sessionError,
    getSession,
    createSession, // This now accepts initialWordIds
    clearError: clearSessionError,
  } = useDailyLearningStore();

  const [isLoading, setIsLoading] = useState(true);
  const [showSummary, setShowSummary] = useState(false); // State for summary card

  useEffect(() => {
    const loadSession = async () => {
      if (user?.$id) {
        const today = new Date().toISOString().split('T')[0];
        await getSession(user.$id, today);
        setIsLoading(false);
      }
    };
    loadSession();
  }, [user?.$id, getSession]);

  useEffect(() => {
    const createNewSessionIfNeeded = async () => {
        if (!sessionLoading && !session && user?.$id && !isLoading) {
            // Assume we have user preferences to get default mode
            const userPrefs = useAuthStore.getState().userPreferences;
            const modeId = userPrefs?.learningMode || 2; // Default to Normal

            try {
                setIsLoading(true); // Set loading while creating
                const initialWordIds = await dailyLearningService.generateTodaysWordLists(user.$id, modeId);
                // Call the store's createSession method with initialWordIds
                await createSession(user.$id, modeId, initialWordIds);
            } catch (err) {
                console.error("Failed to create new session:", err);
                Alert.alert('错误', '无法创建今日学习计划。');
            } finally {
                setIsLoading(false);
            }
        }
    };

    createNewSessionIfNeeded();
  }, [session, sessionLoading, user?.$id, isLoading, createSession]); // Add createSession dependency

  useEffect(() => {
    if (sessionError) {
      Alert.alert('Error', sessionError, [{ text: 'OK', onPress: clearSessionError }]);
    }
  }, [sessionError, clearSessionError]);

  // --- Show Summary Card when session is complete ---
  useEffect(() => {
    if (session?.status === 4 && !showSummary) {
      // Delay showing the summary slightly to ensure UI transition is smooth
      const timer = setTimeout(() => {
        setShowSummary(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [session?.status, showSummary]);

  const handleStartPhase = (phase: 'pre_test' | 'learning' | 'post_test') => {
    if (session?.$id) {
      router.push(`/(tabs)/today/${session.$id}/test/${phase}`);
    }
  };

  const getStatusText = (
    status: number | undefined,
    progress: string | null | undefined,
    phase: 'pre_test' | 'learning' | 'post_test'
  ) => {
    if (status === undefined) return '未知状态';
    switch (phase) {
      case 'pre_test':
        if (status === 0) return '待开始';
        if (status === 1) return `进行中... ${progress || ''}`;
        if (status >= 1) return '已完成 ✅';
        break;
      case 'learning':
        if (status < 1) return '等待中... (🔒)';
        if (status === 2) return `进行中... ${progress || ''}`;
        if (status > 2) return '已完成 ✅';
        if (status === 1) return '待开始';
        break;
      case 'post_test':
        if (status < 2) return '等待中... (🔒)';
        if (status === 3) return `进行中... ${progress || ''}`;
        if (status === 4) return '已完成 ✅'; // Show completed when session is done
        if (status === 2 || status === 3) return '待开始';
        break;
    }
    return '未知状态';
  };

  const isPhaseUnlocked = (phase: 'pre_test' | 'learning' | 'post_test') => {
    if (!session) return false;
    switch (phase) {
      case 'pre_test':
        return true;
      case 'learning':
        return session.status >= 1;
      case 'post_test':
        return session.status >= 2;
      default:
        return false;
    }
  };

  // Mock data for summary - in reality, this would come from the session or calculated
  // after the post-test is finished. For now, we'll use dummy data.
  // A more robust solution would involve calculating these in the store/service
  // after the post-test updates the session to status 4.
  const summaryData = {
    newData: 3,
    reviewData: 4,
    levelUpData: 2,
    correctRate: 85,
  };

  // --- Render ---
  if (isLoading || (sessionLoading && !session)) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text>加载中...</Text>
      </View>
    );
  }

  if (!session) {
    return (
      <View style={styles.center}>
        <Text>未找到今日学习会话。请稍后重试或联系支持。</Text>
      </View>
    );
  }

  // Mock mode details - fetch from learningModeService or attach to session
  const modeDetails = { mode_name: '正常', word_count: 7, phrase_count: 1, sentence_count: 1 };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.header}>
        今日目标：{modeDetails.word_count}个单词 + {modeDetails.phrase_count}词组 + {modeDetails.sentence_count}句型
      </Text>
      <Text style={styles.mode}>当前模式：{modeDetails.mode_name}模式</Text>

      <SessionCard
        title="第一步：摸底评测"
        subtitle="测一测还记得多少？"
        status={getStatusText(session.status, session.pre_test_progress, 'pre_test')}
        onStart={() => handleStartPhase('pre_test')}
        isLocked={!isPhaseUnlocked('pre_test')}
      />

      <SessionCard
        title="第二步：针对性学习"
        subtitle="根据你的水平定制学习内容"
        status={getStatusText(session.status, session.learning_progress, 'learning')}
        onStart={() => handleStartPhase('learning')}
        isLocked={!isPhaseUnlocked('learning')}
      />

      <SessionCard
        title="第三步：巩固验收"
        subtitle="检验今日学习成果！"
        status={getStatusText(session.status, session.post_test_progress, 'post_test')}
        onStart={() => handleStartPhase('post_test')}
        isLocked={!isPhaseUnlocked('post_test')}
      />

      {/* Summary Card Modal */}
      <SummaryCard
        isVisible={showSummary}
        onClose={() => setShowSummary(false)}
        newData={summaryData.newData}
        reviewData={summaryData.reviewData}
        levelUpData={summaryData.levelUpData}
        correctRate={summaryData.correctRate}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, backgroundColor: '#f5f5f5' },
  header: { fontSize: 18, fontWeight: 'bold', marginBottom: 5 },
  mode: { fontSize: 16, color: 'gray', marginBottom: 20 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});