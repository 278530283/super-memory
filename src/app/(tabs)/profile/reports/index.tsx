// app/(tabs)/profile/reports/index.tsx
import LearningOverview from '@/src/components/reports/LearningOverview';
import WordReportList from '@/src/components/reports/WordReportList';
import dataReportService from '@/src/lib/services/dataReportService';
import useAuthStore from '@/src/lib/stores/useAuthStore';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface LearningStats {
  totalLearned: number;
  easyCount: number;
  normalCount: number;
  difficultCount: number;
  longDifficultCount: number;
  averageProficiency: number;
}

export default function LearningReportsScreen() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<LearningStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const learningStats = await dataReportService.getUserLearningStats(user.$id);
      setStats(learningStats);
    } catch (error) {
      console.error('加载统计数据失败:', error);
    } finally {
      setLoading(false);
    }
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
      {stats && <LearningOverview stats={stats} />}
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