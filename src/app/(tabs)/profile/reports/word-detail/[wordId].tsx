import dataReportService, { WordReportItem } from '@/src/lib/services/dataReportService';
import useAuthStore from '@/src/lib/stores/useAuthStore';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

// 定义类型
interface HistoryItem {
  date: string;
  proficiency: number;
  testLevel: number;
  phase: number;
}

interface WordDetailData {
  wordInfo: WordReportItem;
  history: HistoryItem[];
}

interface ProficiencyChartProps {
  history: HistoryItem[];
}

// 根据熟练度获取颜色
const getProficiencyColor = (proficiency: number) => {
  switch (proficiency) {
    case 0: return '#FF3B30';
    case 1: return '#FF9500';
    case 2: return '#4A90E2';
    case 3: return '#34C759';
    case 4: return '#5856D6';
    default: return '#8E8E93';
  }
};

// 获取难度颜色
const getDifficultyColor = (level: number) => {
  switch (level) {
    case 1: return '#34C759';
    case 2: return '#4A90E2';
    case 3: return '#FF3B30';
    default: return '#8E8E93';
  }
};

// 简单的折线图组件
const ProficiencyChart = ({ history }: ProficiencyChartProps) => {
  if (!history || history.length === 0) {
    return (
      <View style={styles.emptyChart}>
        <Text style={styles.emptyChartText}>暂无历史数据</Text>
      </View>
    );
  }

  const maxProficiency = 4;
  const chartHeight = 150;
  const pointRadius = 6;

  // 计算点的位置
  const points = history.map((item: HistoryItem, index: number) => {
    const x = (index / (history.length - 1 || 1)) * 100; // 百分比
    const y = ((maxProficiency - item.proficiency) / maxProficiency) * chartHeight;
    return { x, y, ...item };
  });

  return (
    <View style={styles.chartContainer}>
      <Text style={styles.chartTitle}>熟练度变化曲线</Text>
      
      {/* Y轴标签 */}
      <View style={styles.yAxis}>
        {[4, 3, 2, 1, 0].map(level => (
          <Text key={level} style={styles.yAxisLabel}>
            {level}
          </Text>
        ))}
      </View>

      {/* 图表区域 */}
      <View style={styles.chart}>
        {/* 网格线 */}
        <View style={styles.gridLines}>
          {[0, 1, 2, 3, 4].map((_, index) => (
            <View
              key={index}
              style={[
                styles.gridLine,
                { top: (index / 4) * chartHeight }
              ]}
            />
          ))}
        </View>

        {/* 折线 */}
        <View style={styles.lineContainer}>
          {points.map((point: any, index: number) => (
            <React.Fragment key={index}>
              {/* 连线 */}
              {index > 0 && (
                <View
                  style={[
                    styles.line,
                    {
                      left: `${points[index - 1].x}%`,
                      width: `${point.x - points[index - 1].x}%`,
                      top: points[index - 1].y,
                      height: Math.sqrt(
                        Math.pow(point.x - points[index - 1].x, 2) + 
                        Math.pow(point.y - points[index - 1].y, 2)
                      ),
                      transform: [
                        {
                          rotate: Math.atan2(
                            point.y - points[index - 1].y,
                            point.x - points[index - 1].x
                          ) * (180 / Math.PI) + 'deg'
                        }
                      ]
                    }
                  ]}
                />
              )}
              
              {/* 数据点 */}
              <View
                style={[
                  styles.dataPoint,
                  {
                    left: `${point.x}%`,
                    top: point.y - pointRadius,
                    backgroundColor: getProficiencyColor(point.proficiency)
                  }
                ]}
              >
                <Text style={styles.dataPointText}>{point.proficiency}</Text>
              </View>
            </React.Fragment>
          ))}
        </View>
      </View>

      {/* X轴日期标签 */}
      <View style={styles.xAxis}>
        {points.map((point: any, index: number) => (
          <Text key={index} style={styles.xAxisLabel}>
            {new Date(point.date).toLocaleDateString('zh-CN', {
              month: 'short',
              day: 'numeric'
            })}
          </Text>
        ))}
      </View>
    </View>
  );
};

export default function WordDetailScreen() {
  const { wordId } = useLocalSearchParams();
  const { user } = useAuthStore();
  const [wordData, setWordData] = useState<WordDetailData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && wordId) {
      loadWordData();
    } else {
      setLoading(false);
    }
  }, [user, wordId]);

  const loadWordData = async () => {
    // 再次检查用户是否存在
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      // 这里使用我们新添加的方法
      const data = await dataReportService.getWordHistoryDetails(user.$id, wordId as string);
      setWordData(data);
    } catch (error) {
      console.error('加载单词详情失败:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A90E2" />
        <Text style={styles.loadingText}>加载中...</Text>
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

  if (!wordData) {
    return (
      <View style={styles.loadingContainer}>
        <Text>加载失败</Text>
      </View>
    );
  }

  const { wordInfo, history } = wordData;

  return (
    <ScrollView style={styles.container}>
      {/* 单词基本信息 */}
      <View style={styles.wordCard}>
        <View style={styles.wordHeader}>
          <Text style={styles.spelling}>{wordInfo.spelling}</Text>
          <View style={[
            styles.difficultyBadge,
            { backgroundColor: getDifficultyColor(wordInfo.difficultyLevel) }
          ]}>
            <Text style={styles.difficultyText}>
              {dataReportService.getDifficultyLevelName(wordInfo.difficultyLevel)}
            </Text>
          </View>
        </View>
        <Text style={styles.meaning}>{wordInfo.meaning}</Text>
        
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Ionicons name="star" size={16} color="#FF9500" />
            <Text style={styles.statText}>熟练度: {wordInfo.currentProficiency}/4</Text>
          </View>
          <View style={styles.stat}>
            <Ionicons name="repeat" size={16} color="#4A90E2" />
            <Text style={styles.statText}>复习: {wordInfo.reviewedTimes || 0}次</Text>
          </View>
          {wordInfo.startDate && (
            <View style={styles.stat}>
              <Ionicons name="calendar" size={16} color="#34C759" />
              <Text style={styles.statText}>
                开始: {new Date(wordInfo.startDate).toLocaleDateString('zh-CN')}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* 评级变化曲线 */}
      <View style={styles.chartSection}>
        <ProficiencyChart history={history} />
      </View>

      {/* 详细历史记录 */}
      <View style={styles.historySection}>
        <Text style={styles.sectionTitle}>详细历史记录</Text>
        {history.length === 0 ? (
          <Text style={styles.emptyText}>暂无测试记录</Text>
        ) : (
          history.map((record: HistoryItem, index: number) => (
            <View key={index} style={styles.historyItem}>
              <Text style={styles.historyDate}>
                {new Date(record.date).toLocaleDateString('zh-CN', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </Text>
              <View style={styles.historyDetails}>
                <View style={[
                  styles.proficiencyBadge,
                  { backgroundColor: getProficiencyColor(record.proficiency) }
                ]}>
                  <Text style={styles.proficiencyBadgeText}>
                    评级: {record.proficiency}
                  </Text>
                </View>
                <Text style={styles.phaseText}>阶段: {record.phase}</Text>
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
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
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  wordCard: {
    backgroundColor: 'white',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  wordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  spelling: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1D1D1F',
  },
  difficultyBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  difficultyText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  meaning: {
    fontSize: 16,
    color: '#666',
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    marginBottom: 8,
  },
  statText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
  },
  chartSection: {
    backgroundColor: 'white',
    margin: 16,
    padding: 16,
    borderRadius: 12,
  },
  historySection: {
    backgroundColor: 'white',
    margin: 16,
    padding: 16,
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#1D1D1F',
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    fontSize: 16,
    padding: 20,
  },
  historyItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  historyDate: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  historyDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  proficiencyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  proficiencyBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  phaseText: {
    fontSize: 12,
    color: '#666',
  },
  // 图表样式
  chartContainer: {
    marginVertical: 16,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  yAxis: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 30,
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  yAxisLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  chart: {
    height: 150,
    marginLeft: 30,
    marginRight: 20,
  },
  gridLines: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: '#f0f0f0',
  },
  lineContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  line: {
    position: 'absolute',
    backgroundColor: '#4A90E2',
    transformOrigin: 'left center',
  },
  dataPoint: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  dataPointText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  xAxis: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginLeft: 30,
    marginRight: 20,
    marginTop: 8,
  },
  xAxisLabel: {
    fontSize: 10,
    color: '#666',
    transform: [{ rotate: '-45deg' }],
    width: 40,
    textAlign: 'center',
  },
  emptyChart: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyChartText: {
    color: '#999',
    fontSize: 16,
  },
});