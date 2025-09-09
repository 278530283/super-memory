// src/app/(tabs)/today/index.tsx
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import SessionCard from '../../../components/features/today/SessionCard';
import useAuthStore from '../../../lib/stores/useAuthStore';
import useDailyLearningStore from '../../../lib/stores/useDailyLearningStore';
// import SummaryCard from '../../../components/features/today/SummaryCard'; // For modal

export default function TodayScreen() {
  const { user } = useAuthStore();
  const {
    session,
    loading: sessionLoading,
    error: sessionError,
    getSession,
    createSession, // Might be called if no session exists
    clearError: clearSessionError,
  } = useDailyLearningStore();

  const [isLoading, setIsLoading] = useState(true); // Local loading state for initial check

  useEffect(() => {
    const loadSession = async () => {
      if (user?.$id) {
        const today = new Date().toISOString().split('T')[0];
        await getSession(user.$id, today);
        setIsLoading(false); // Done checking for session
      }
    };
    loadSession();
  }, [user?.$id, getSession]);

  useEffect(() => {
    if (sessionError) {
      Alert.alert('Error', sessionError, [{ text: 'OK', onPress: clearSessionError }]);
    }
  }, [sessionError, clearSessionError]);

  // --- Logic for SessionCard interactions ---
  const handleStartPhase = (phase: 'pre_test' | 'learning' | 'post_test') => {
    if (session?.$id) {
      // Navigate to the specific phase screen using expo-router
      router.push(`/(tabs)/today/${session.$id}/test/${phase}`);
      // TODO: For 'learn', path might be `/(tabs)/today/${session.$id}/learn`
    }
  };

  // --- Logic for SessionCard status display ---
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
        if (status >= 1) return '已完成 ✅'; // Considered done once started
        break;
      case 'learning':
        if (status < 1) return '等待中... (🔒)';
        if (status === 2) return `进行中... ${progress || ''}`;
        if (status > 2) return '已完成 ✅';
        if (status === 1) return '待开始'; // Unlocked but not started
        break;
      case 'post_test':
        if (status < 2) return '等待中... (🔒)';
        if (status === 3) return `进行中... ${progress || ''}`;
        if (status === 4) return '已完成 ✅';
        if (status === 2 || status === 3) return '待开始'; // Unlocked but not started
        break;
    }
    return '未知状态';
  };

  const isPhaseUnlocked = (phase: 'pre_test' | 'learning' | 'post_test') => {
    if (!session) return false;
    switch (phase) {
      case 'pre_test':
        return true; // Always unlocked if session exists
      case 'learning':
        return session.status >= 1; // Unlocked after pre-test starts/finishes
      case 'post_test':
        return session.status >= 2; // Unlocked after learning starts/finishes
      default:
        return false;
    }
  };

  // --- Determine Goal and Mode ---
  // This would ideally come from user preferences or session.learning_mode_details
  // For now, we'll mock it or fetch it.
  // const modeDetails = session?.mode_details || { mode_name: 'Normal', word_count: 7, phrase_count: 1, sentence_count: 1 };
  const modeDetails = { mode_name: '正常', word_count: 7, phrase_count: 1, sentence_count: 1 }; // Placeholder from requirements

  // --- Render ---
  if (isLoading || (sessionLoading && !session)) {
    // Show loading only on initial load or when store is fetching but no session yet
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text>加载中...</Text>
      </View>
    );
  }

  // Optional: Handle case where session needs to be created
  // if (!session) {
  //   return (
  //     <View style={styles.center}>
  //       <Text>正在为您创建今日学习计划...</Text>
  //       {/* Trigger createSession logic here if needed, or let useEffect handle it */}
  //     </View>
  //   );
  // }

  // If session is still null after loading, it might mean it needs creation or there's an issue
  if (!session) {
      return (
          <View style={styles.center}>
              <Text>未找到今日学习会话。请稍后重试或联系支持。</Text>
              {/* Or, trigger creation logic here */}
          </View>
      );
  }


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
        onStart={() => handleStartPhase('learning')} // Adjust path if needed
        isLocked={!isPhaseUnlocked('learning')}
      />

      <SessionCard
        title="第三步：巩固验收"
        subtitle="检验今日学习成果！"
        status={getStatusText(session.status, session.post_test_progress, 'post_test')}
        onStart={() => handleStartPhase('post_test')}
        isLocked={!isPhaseUnlocked('post_test')}
      />

      {/* Summary Card Modal (Placeholder/Trigger) */}
      {/* The actual modal display logic would be handled by state in this component or globally */}
      {/* For now, we just show a button if session is complete */}
      {/* {session.status === 4 && (
        <View style={styles.summaryPlaceholder}>
          <Text>Session Complete! Show Summary Modal Here.</Text>
        </View>
      )} */}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, backgroundColor: '#f5f5f5' },
  header: { fontSize: 18, fontWeight: 'bold', marginBottom: 5 },
  mode: { fontSize: 16, color: 'gray', marginBottom: 20 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  summaryPlaceholder: { marginTop: 20, padding: 15, backgroundColor: 'white', borderRadius: 8, alignItems: 'center' },
});