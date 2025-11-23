import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface WordReportItemProps {
  word: any;
  index?: number; // 新增序号属性
}

export default function WordReportItem({ word, index }: WordReportItemProps) {
  const getDifficultyText = (level: number) => {
    switch (level) {
      case 1: return '容易';
      case 2: return '中等'; 
      case 3: return '困难';
      default: return '未知';
    }
  };

  const getDifficultyColor = (level: number) => {
    switch (level) {
      case 1: return '#34C759'; // 绿色保持不变
      case 2: return '#8E8E93'; // 中等改为灰色，更加低调
      case 3: return '#A2845E'; // 困难改为棕色/米色，更加柔和
      default: return '#8E8E93';
    }
  };

  const handlePress = () => {
    router.push(`/profile/reports/word-detail/${word.wordId}`);
  };

  return (
    <TouchableOpacity style={styles.container} onPress={handlePress}>
      {/* 新增序号显示 */}
      {index !== undefined && (
        <View style={styles.indexContainer}>
          <Text style={styles.indexText}>{index}</Text>
        </View>
      )}
      
      <View style={styles.mainContent}>
        <View style={styles.header}>
          <Text style={styles.spelling}>{word.spelling}</Text>
          <View style={[styles.difficultyBadge, { backgroundColor: getDifficultyColor(word.difficultyLevel) }]}>
            <Text style={styles.difficultyText}>
              {getDifficultyText(word.difficultyLevel)}
            </Text>
          </View>
        </View>
        
        <Text style={styles.meaning}>{word.meaning}</Text>
        
        <View style={styles.footer}>
          <View style={styles.leftFooter}>
            <View style={styles.proficiency}>
              <Ionicons name="star" size={14} color="#FF9500" />
              <Text style={styles.proficiencyText}>L{word.currentProficiency}</Text>
            </View>
            
            {/* 将评级时间移到熟练度后面 */}
            <View style={styles.timeContainer}>
              <Ionicons name="time-outline" size={12} color="#8E8E93" />
              <Text style={styles.timeText}>
                {word.reviewTimeAgo}
              </Text>
            </View>
          </View>
          
          <Text style={styles.reviewCount}>
            复习 {word.reviewedTimes || 0} 次
          </Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginVertical: 4,
    padding: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#4A90E2',
    flexDirection: 'row',
    alignItems: 'center',
  },
  // 新增序号样式
  indexContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  indexText: {
    color: '#8E8E93',
    fontSize: 12,
    fontWeight: 'bold',
  },
  mainContent: {
    flex: 1,
    marginRight: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  spelling: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1D1D1F',
  },
  meaning: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leftFooter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  proficiency: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  proficiencyText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
    marginRight: 12, // 为时间容器添加右边距
  },
  // 新增时间容器样式
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeText: {
    fontSize: 12,
    color: '#8E8E93',
    marginLeft: 4,
  },
  reviewCount: {
    fontSize: 12,
    color: '#8E8E93',
  },
  difficultyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    minWidth: 50,
    alignItems: 'center',
  },
  difficultyText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
});