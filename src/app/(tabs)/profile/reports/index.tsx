// app/(tabs)/profile/reports/index.tsx
import LearningOverview from '@/src/components/reports/LearningOverview';
import WordReportList from '@/src/components/reports/WordReportList';
import dataReportService from '@/src/lib/services/dataReportService';
import useAuthStore from '@/src/lib/stores/useAuthStore';
import useDailyLearningStore from '@/src/lib/stores/useDailyLearningStore';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface LearningStats {
  totalLearned: number;
  easyCount: number;
  normalCount: number;
  difficultCount: number;
  longDifficultCount: number;
  averageProficiency: number;
  todayLearnTime: number;
}

export default function LearningReportsScreen() {
  const { user } = useAuthStore();
  const { session } = useDailyLearningStore();
  const [stats, setStats] = useState<LearningStats | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter(); // 添加路由hook

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const learningStats = await dataReportService.getUserLearningStats(user.$id, session?.session_date ?? '');
      setStats(learningStats);
    } catch (error) {
      console.error('加载统计数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTotalLearnedPress = () => {
    // 使用路由导航到学习时间周报页面
    router.push('/profile/reports/study-time/StudyTimeReport');
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>加载中...</Text>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.loadingContainer}>
        <Text>请先登录</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* 直接渲染组件，不使用 ScrollView */}
      {stats && <LearningOverview stats={stats} onTotalLearnedPress={handleTotalLearnedPress}/>}
      <WordReportList userId={user.$id} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});