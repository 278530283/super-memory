import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface WordReportItemProps {
  word: any;
}

export default function WordReportItem({ word }: WordReportItemProps) {
  const getDifficultyIcon = (level: number) => {
    switch (level) {
      case 1: return 'happy-outline';
      case 2: return 'help-outline'; 
      case 3: return 'sad-outline';
      default: return 'help-outline';
    }
  };

  const getDifficultyColor = (level: number) => {
    switch (level) {
      case 1: return '#34C759';
      case 2: return '#4A90E2';
      case 3: return '#FF3B30';
      default: return '#8E8E93';
    }
  };

  const handlePress = () => {
    // 跳转到单词详情页面
    router.push(`/profile/reports/word-detail/${word.wordId}`);
  };

  return (
    <TouchableOpacity style={styles.container} onPress={handlePress}>
      <View style={styles.mainContent}>
        <View style={styles.header}>
          <Text style={styles.spelling}>{word.spelling}</Text>
          <Ionicons 
            name={getDifficultyIcon(word.difficultyLevel)} 
            size={20} 
            color={getDifficultyColor(word.difficultyLevel)} 
          />
        </View>
        
        <Text style={styles.meaning}>{word.meaning}</Text>
        
        <View style={styles.footer}>
          <View style={styles.proficiency}>
            <Ionicons name="star" size={14} color="#FF9500" />
            <Text style={styles.proficiencyText}>{word.currentProficiency}/4</Text>
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
  proficiency: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  proficiencyText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  reviewCount: {
    fontSize: 12,
    color: '#8E8E93',
  },
});