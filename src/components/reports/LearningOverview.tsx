import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface LearningOverviewProps {
  stats: {
    totalLearned: number;
    easyCount: number;
    normalCount: number;
    difficultCount: number;
    averageProficiency: number;
  };
}

export default function LearningOverview({ stats }: LearningOverviewProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>学习概览</Text>
      
      <View style={styles.statsGrid}>
        <View style={styles.statItem}>
          <Ionicons name="book-outline" size={24} color="#4A90E2" />
          <Text style={styles.statValue}>{stats.totalLearned}</Text>
          <Text style={styles.statLabel}>已学单词</Text>
        </View>
        
        <View style={styles.statItem}>
          <Ionicons name="trending-up-outline" size={24} color="#34C759" />
          <Text style={styles.statValue}>{stats.averageProficiency.toFixed(1)}</Text>
          <Text style={styles.statLabel}>平均熟练度</Text>
        </View>
        
        <View style={styles.statItem}>
          <Ionicons name="alert-circle-outline" size={24} color="#FF3B30" />
          <Text style={styles.statValue}>{stats.difficultCount}</Text>
          <Text style={styles.statLabel}>困难单词</Text>
        </View>
      </View>

      {/* 简化的难度分布 */}
      <View style={styles.difficultySection}>
        <Text style={styles.sectionTitle}>难度分布</Text>
        <View style={styles.difficultyBar}>
          <View 
            style={[styles.difficultySegment, styles.easySegment, { flex: stats.easyCount }]} 
          />
          <View 
            style={[styles.difficultySegment, styles.normalSegment, { flex: stats.normalCount }]} 
          />
          <View 
            style={[styles.difficultySegment, styles.difficultSegment, { flex: stats.difficultCount }]} 
          />
        </View>
        <View style={styles.difficultyLabels}>
          <Text style={styles.difficultyLabel}>简单: {stats.easyCount}</Text>
          <Text style={styles.difficultyLabel}>中等: {stats.normalCount}</Text>
          <Text style={styles.difficultyLabel}>困难: {stats.difficultCount}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    margin: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    marginVertical: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
  },
  difficultySection: {
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  difficultyBar: {
    flexDirection: 'row',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  difficultySegment: {
    minWidth: 8,
  },
  easySegment: {
    backgroundColor: '#34C759',
  },
  normalSegment: {
    backgroundColor: '#4A90E2',
  },
  difficultSegment: {
    backgroundColor: '#FF3B30',
  },
  difficultyLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  difficultyLabel: {
    fontSize: 12,
    color: '#666',
  },
});