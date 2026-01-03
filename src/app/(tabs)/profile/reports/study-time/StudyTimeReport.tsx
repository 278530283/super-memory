// WeeklyStudyTimeReport.tsx
import dataReportService, { WeeklyStudyReport } from '@/src/lib/services/dataReportService';
import useAuthStore from '@/src/lib/stores/useAuthStore';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Svg, { G, Line, Rect, Text as SvgText } from 'react-native-svg';


interface WeeklyStudyTimeReportProps {
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_WIDTH = SCREEN_WIDTH - 64;
const CHART_HEIGHT = 400;
const BAR_WIDTH = 24;
const BAR_SPACING = 16;

export default function WeeklyStudyTimeReport() {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [currentReport, setCurrentReport] = useState<WeeklyStudyReport | null>(null);
  const [weekOffset, setWeekOffset] = useState(0);

  useEffect(() => {
    if (user) {
      loadWeeklyReport();
    }
  }, [user, weekOffset]);

  const loadWeeklyReport = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const report = await dataReportService.getWeeklyStudyReport(
        user?.$id,
        undefined,
        weekOffset
      );
      setCurrentReport(report);
    } catch (error) {
      console.error('加载周报失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const goToPreviousWeek = () => {
    setWeekOffset(prev => prev - 1);
  };

  const goToNextWeek = () => {
    setWeekOffset(prev => prev + 1);
  };

  const formatWeekTitle = () => {
    if (!currentReport) return '加载中...';
    
    const startDate = currentReport.weekStart.slice(5).replace(/\//g, '.');
    const endDate = currentReport.weekEnd.slice(5).replace(/\//g, '.');
    
    return weekOffset === 0 
      ? `本周 (${startDate} - ${endDate})`
      : `第${currentReport.weekNumber}周 (${startDate} - ${endDate})`;
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes}分钟`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}小时${mins}分钟` : `${hours}小时`;
  };

  // StudyTimeReport.tsx - 修改 renderChart 函数
const renderChart = () => {
  if (!currentReport || currentReport.dailyStudyTime.length === 0) {
    return (
      <View style={styles.emptyChart}>
        <Ionicons name="bar-chart-outline" size={48} color="#CCCCCC" />
        <Text style={styles.emptyText}>本周暂无学习数据</Text>
      </View>
    );
  }

  const data = currentReport.dailyStudyTime;
  
  // 使用固定的最大刻度值，确保不同周之间可比
  const FIXED_MAX_MINUTES = 60; // 固定最大值为60分钟（1小时）
  const maxValue = Math.max(
    FIXED_MAX_MINUTES, 
    ...data.map(d => d.studyTimeMinutes), 
    currentReport.averageDailyStudyTime
  );
  
  const scale = maxValue > 0 ? (CHART_HEIGHT - 60) / maxValue : 0;
  
  const baseLine = 15;
  // 计算平均线位置
  const averageLineY = CHART_HEIGHT - 40 - (baseLine * scale);
  
  // 计算每个柱子的起始位置
  const totalWidth = (BAR_WIDTH + BAR_SPACING) * data.length - BAR_SPACING;
  const startX = (CHART_WIDTH - totalWidth) / 2;

  // 固定Y轴刻度值：0, 30, 60, 90, 120 分钟
  const yAxisTicks = [0, 30, 60, 90, 120];

  return (
    <View style={styles.chartContainer}>
      {/* 图表标题 */}
      <View style={styles.chartHeader}>
        <View style={styles.chartHeaderItem}>
          <Text style={styles.chartHeaderLabel}>总时长</Text>
          <Text style={styles.chartHeaderValue}>{formatDuration(currentReport.totalStudyTime)}</Text>
        </View>
        <View style={styles.chartHeaderItem}>
          <Text style={styles.chartHeaderLabel}>平均时长</Text>
          <Text style={styles.chartHeaderValue}>{formatDuration(currentReport.averageDailyStudyTime)}</Text>
        </View>
        <View style={styles.chartHeaderItem}>
          <Text style={styles.chartHeaderLabel}>学习天数</Text>
          <Text style={styles.chartHeaderValue}>
            {currentReport.dailyStudyTime.filter(day => day.studyTimeMinutes > 0).length}天
          </Text>
        </View>
      </View>

      {/* SVG图表 */}
      <Svg width={CHART_WIDTH} height={CHART_HEIGHT}>
        {/* Y轴刻度线和标签 */}
        {yAxisTicks.map((value, index) => {
          const y = CHART_HEIGHT - 40 - (value * scale);
          return (
            <G key={`y-tick-${index}`}>
              <Line
                x1={0}
                y1={y}
                x2={CHART_WIDTH}
                y2={y}
                stroke="#E5E5EA"
                strokeWidth="1"
                strokeDasharray={value === 0 ? "0" : "4,4"} // 0刻度线用实线
              />
              <SvgText
                x={8}
                y={y - 4}
                fontSize="10"
                fill="#8E8E93"
                textAnchor="start"
              >
                {value+"'"}
              </SvgText>
            </G>
          );
        })}

        {/* 平均线 */}
        <Line
          x1={0}
          y1={averageLineY}
          x2={CHART_WIDTH}
          y2={averageLineY}
          stroke="#FF9500"
          strokeWidth="1"
          strokeDasharray="3,3"
        />
        <SvgText
            x={CHART_WIDTH - 8}
            y={averageLineY - 8}
            fontSize="10"
            fill="#FF9500"
            textAnchor="end"
          >
            { baseLine+"'" }
          </SvgText>

        {/* 柱子 */}
        {data.map((day, index) => {
          const x = startX + index * (BAR_WIDTH + BAR_SPACING);
          
          // 如果学习时间超过固定最大值，柱子高度限制在最大值位置
          const barHeight = Math.min(day.studyTimeMinutes, FIXED_MAX_MINUTES) * scale;
          const barY = CHART_HEIGHT - 40 - barHeight;
          
          // 判断是否超过固定最大值
          const exceedsMax = day.studyTimeMinutes > FIXED_MAX_MINUTES;
          
          return (
            <G key={`bar-${index}`}>
              {/* 柱子 */}
              <Rect
                x={x}
                y={barY}
                width={BAR_WIDTH}
                height={barHeight}
                fill={day.studyTimeMinutes >= currentReport.averageDailyStudyTime ? "#34C759" : "#4A90E2"}
                rx={4}
              />
              
              {/* 未超过最大值，在柱子内部显示数值 */}
              {!exceedsMax && (day.studyTimeMinutes > 0) && (
                <SvgText
                  x={x + BAR_WIDTH / 2}
                  y={barY - 8}
                  fontSize="10"
                  fill={day.studyTimeMinutes >= currentReport.averageDailyStudyTime ? "#34C759" : "#4A90E2"}
                  fontWeight="1000"
                  textAnchor="middle"
                >
                {day.studyTimeMinutes+"'"}
                </SvgText>
              )}
              
              {/* 日期标签 */}
              <SvgText
                x={x + BAR_WIDTH / 2}
                y={CHART_HEIGHT - 20}
                fontSize="10"
                fill="#8E8E93"
                textAnchor="middle"
              >
                {day.date.slice(5).replace(/\//g, '.')}
              </SvgText>
            </G>
          );
        })}
      </Svg>
      
    </View>
  );
};

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>加载中...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* 周选择器 */}
        <View style={styles.weekSelector}>
          <TouchableOpacity 
            onPress={goToPreviousWeek} 
            style={styles.weekButton}
            disabled={loading}
          >
            <Ionicons name="chevron-back" size={24} color="#007AFF" />
            <Text style={styles.weekButtonText}></Text>
          </TouchableOpacity>

          <Text style={styles.weekTitle}>{formatWeekTitle()}</Text>

          <TouchableOpacity 
            onPress={goToNextWeek} 
            style={styles.weekButton}
            disabled={loading}
          >
            <Text style={styles.weekButtonText}></Text>
            <Ionicons name="chevron-forward" size={24} color="#007AFF" />
          </TouchableOpacity>
        </View>

        {/* 图表 */}
        {renderChart()}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  scrollView: {
    flex: 1,
  },
  weekSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  weekButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  weekButtonText: {
    fontSize: 14,
    color: '#007AFF',
    marginHorizontal: 4,
  },
  weekTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  chartContainer: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  chartHeaderItem: {
    alignItems: 'center',
  },
  chartHeaderLabel: {
    fontSize: 12,
    color: '#8E8E93',
    marginBottom: 4,
  },
  chartHeaderValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  emptyChart: {
    height: CHART_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    marginTop: 12,
    fontSize: 14,
    color: '#8E8E93',
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
    gap: 20,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 2,
    marginRight: 6,
  },
  legendText: {
    fontSize: 12,
    color: '#8E8E93',
  },
  detailsContainer: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  detailsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#000',
  },
  detailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  detailDate: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailDay: {
    fontSize: 16,
    color: '#000',
  },
  detailWeekDay: {
    fontSize: 14,
    color: '#8E8E93',
    marginLeft: 8,
  },
  detailTime: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  durationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#F2F2F7',
  },
  durationText: {
    fontSize: 14,
    marginLeft: 4,
  },
  activeDuration: {
    color: '#4A90E2',
    fontWeight: '500',
  },
  inactiveDuration: {
    color: '#8E8E93',
  },
  compareBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  aboveAverage: {
    backgroundColor: '#34C759',
  },
  belowAverage: {
    backgroundColor: '#FF3B30',
  },
  compareText: {
    fontSize: 12,
    color: 'white',
    marginLeft: 4,
  },
  summaryCard: {
    flexDirection: 'row',
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 32,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryContent: {
    flex: 1,
    marginLeft: 16,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#000',
  },
  summaryText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  highlight: {
    color: '#007AFF',
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#8E8E93',
  },
  chartNote: {
    fontSize: 10,
    color: '#8E8E93',
    marginTop: 12,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});