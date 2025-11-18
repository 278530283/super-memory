import dataReportService, {
    WordDifficultyLevel,
    WordReportItem
} from '@/src/lib/services/dataReportService';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import WordReportItemComponent from './WordReportItem';

interface WordReportListProps {
  userId: string;
}

// 创建类型安全的难度选项
type DifficultyOption = {
  label: string;
  value: WordDifficultyLevel | 'all';
};

export default function WordReportList({ userId }: WordReportListProps) {
  const [words, setWords] = useState<WordReportItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDifficulty, setSelectedDifficulty] = useState<WordDifficultyLevel | 'all'>('all');

  // 使用类型安全的难度选项
  const difficulties: DifficultyOption[] = [
    { label: '全部', value: 'all' },
    { label: '简单', value: WordDifficultyLevel.EASY },
    { label: '正常', value: WordDifficultyLevel.NORMAL },
    { label: '困难', value: WordDifficultyLevel.DIFFICULT },
  ];

  useEffect(() => {
    loadWords();
  }, [selectedDifficulty, userId]);

  const loadWords = async () => {
    setLoading(true);
    try {
      let response;
      if (selectedDifficulty === 'all') {
        response = await dataReportService.getUserWordReport(userId, 1, 50);
      } else {
        response = await dataReportService.getUserWordReportByDifficulty(
          userId, selectedDifficulty, 1, 50
        );
      }
      setWords(response.items);
    } catch (error) {
      console.error('加载单词报告失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 类型安全的处理函数
  const handleDifficultyChange = (value: WordDifficultyLevel | 'all') => {
    setSelectedDifficulty(value);
  };

  return (
    <View style={styles.container}>
      {/* 简化的难度筛选器 */}
      <View style={styles.filterContainer}>
        {difficulties.map((difficulty) => (
          <TouchableOpacity
            key={difficulty.value}
            style={[
              styles.filterButton,
              selectedDifficulty === difficulty.value && styles.filterButtonActive
            ]}
            onPress={() => handleDifficultyChange(difficulty.value)}
          >
            <Text
              style={[
                styles.filterText,
                selectedDifficulty === difficulty.value && styles.filterTextActive
              ]}
            >
              {difficulty.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* 单词列表 */}
      <FlatList
        data={words}
        keyExtractor={(item) => item.wordId}
        renderItem={({ item }) => <WordReportItemComponent word={item} />}
        refreshing={loading}
        onRefresh={loadWords}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={48} color="#ccc" />
            <Text style={styles.emptyText}>暂无单词数据</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  filterContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    padding: 8,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 8,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  filterButtonActive: {
    backgroundColor: '#4A90E2',
  },
  filterText: {
    fontSize: 14,
    color: '#666',
  },
  filterTextActive: {
    color: 'white',
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyText: {
    marginTop: 8,
    color: '#999',
    fontSize: 14,
  },
});