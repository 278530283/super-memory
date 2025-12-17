import dataReportService, {
  PaginatedWordReport,
  WordDifficultyLevel,
  WordReportItem
} from '@/src/lib/services/dataReportService';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedDifficulty, setSelectedDifficulty] = useState<WordDifficultyLevel | 'all'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [totalWords, setTotalWords] = useState(0);

  // 使用类型安全的难度选项
  const difficulties: DifficultyOption[] = [
    { label: '全部', value: 'all' },
    { label: '简单', value: WordDifficultyLevel.EASY },
    { label: '中等', value: WordDifficultyLevel.NORMAL },
    { label: '困难', value: WordDifficultyLevel.DIFFICULT },
  ];

  useEffect(() => {
    // 重置状态并重新加载
    setWords([]);
    setCurrentPage(1);
    loadWords(1, true);
  }, [selectedDifficulty, userId]);

  const loadWords = async (page: number = 1, isRefresh: boolean = false) => {
    if (isRefresh) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    try {
      let response: PaginatedWordReport;
      
      response = await dataReportService.getUserWordReport(userId, selectedDifficulty, page, 10);

      if (isRefresh) {
        setWords(response.items);
      } else {
        setWords(prevWords => [...prevWords, ...response.items]);
      }

      setHasNextPage(response.hasNextPage);
      setTotalWords(response.total);
      
      if (isRefresh) {
        setCurrentPage(1);
      } else {
        setCurrentPage(page);
      }
    } catch (error) {
      console.error('加载单词报告失败:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleLoadMore = () => {
    if (!loadingMore && hasNextPage) {
      loadWords(currentPage + 1, false);
    }
  };

  // 类型安全的处理函数
  const handleDifficultyChange = (value: WordDifficultyLevel | 'all') => {
    setSelectedDifficulty(value);
  };

  const handleRefresh = () => {
    loadWords(1, true);
  };

  // 渲染底部加载指示器
  const renderFooter = () => {
    if (!loadingMore) return null;
    
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color="#4A90E2" />
        <Text style={styles.footerText}>加载更多...</Text>
      </View>
    );
  };

  // 渲染空状态
  const renderEmptyState = () => {
    if (loading) return null;
    
    return (
      <View style={styles.emptyState}>
        <Ionicons name="document-text-outline" size={48} color="#ccc" />
        <Text style={styles.emptyText}>暂无单词数据</Text>
      </View>
    );
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

      {/* 单词列表 - 修改了renderItem以传递序号 */}
      <FlatList
        data={words}
        keyExtractor={(item) => item.wordId}
        renderItem={({ item, index }) => (
          <WordReportItemComponent 
            word={item} 
            index={index + 1} // 传递序号，从1开始
          />
        )}
        refreshing={loading}
        onRefresh={handleRefresh}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={words.length === 0 ? styles.emptyContainer : null}
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
  emptyContainer: {
    flexGrow: 1,
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
  footerLoader: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  footerText: {
    marginLeft: 8,
    color: '#666',
    fontSize: 14,
  },
});