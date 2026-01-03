// LearningOverview.tsx
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

interface LearningOverviewProps {
  stats: {
    totalLearned: number;
    easyCount: number;
    normalCount: number;
    difficultCount: number;
    averageProficiency: number;
    todayLearnTime: number;
  };
  onTotalLearnedPress?: () => void;
}

export default function LearningOverview({ stats, onTotalLearnedPress }: LearningOverviewProps) {
  const renderStatItem = (icon: string, iconColor: string, value: string | number, label: string, onPress?: () => void) => {
    const content = (
      <View style={styles.statContent}>
        <Ionicons name={icon as any} size={24} color={iconColor} />
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statLabel}>{label}</Text>
      </View>
    );

    if (onPress) {
      return (
        <TouchableOpacity 
          style={styles.statItem}
          onPress={onPress}
          activeOpacity={0.7}
        >
          {content}
        </TouchableOpacity>
      );
    }

    return (
      <View style={styles.statItem}>
        {content}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>学习概览</Text>
      
      <View style={styles.statsGrid}>
        {renderStatItem(
          "time-outline", 
          "#34C759", 
          stats.todayLearnTime+"'", 
          "今日学习>", 
          onTotalLearnedPress
        )}

        {renderStatItem(
          "book-outline", 
          "#4A90E2", 
          stats.totalLearned, 
          "已学单词"
        )}
        
        {renderStatItem(
          "trending-up-outline", 
          "#FF3B30", 
          stats.averageProficiency.toFixed(1), 
          "平均熟练度"
        )}
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
  statContent: {
    alignItems: 'center',
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