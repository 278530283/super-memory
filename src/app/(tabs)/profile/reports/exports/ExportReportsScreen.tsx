// ExportReportsScreen.tsx
import dataReportService, { UserReportExport } from '@/src/lib/services/dataReportService';
import useAuthStore from '@/src/lib/stores/useAuthStore';
import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

export default function ExportReportsScreen() {
  const { user } = useAuthStore();
  const [reports, setReports] = useState<UserReportExport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadReports();
    }
  }, [user]);

  const loadReports = async () => {
    try {
      setLoading(true);
      const data = await dataReportService.getUserExportReports(user!.$id);
      setReports(data);
    } catch (error) {
      console.error('加载报表列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenReport = (fileUrl: string) => {
    Linking.openURL(fileUrl).catch(err => {
      console.error('无法打开文件:', err);
      alert('无法打开文件，请稍后重试');
    });
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '未知日期';
    return dateStr.replace(/-/g, '/').slice(5); // 显示 MM/DD
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return '#34C759';
      case 'processing':
        return '#FF9500';
      case 'failed':
        return '#FF3B30';
      default:
        return '#8E8E93';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return '已完成';
      case 'processing':
        return '生成中';
      case 'failed':
        return '失败';
      default:
        return status;
    }
  };

  // 解析 summary JSON
  const parseSummary = (summaryStr: string): Record<string, any> | null => {
    if (!summaryStr) return null;
    try {
      return JSON.parse(summaryStr);
    } catch (e) {
      return null;
    }
  };

  const renderItem = ({ item }: { item: UserReportExport }) => {
    const summaryData = parseSummary(item.summary);
    const summaryEntries = summaryData ? Object.entries(summaryData) : [];

    return (
      <TouchableOpacity
        style={styles.reportCard}
        onPress={() => handleOpenReport(item.file_url)}
        activeOpacity={0.7}
      >
        <View style={styles.cardLeft}>
          <View style={styles.iconContainer}>
            <Ionicons name="document-text-outline" size={32} color="#4A90E2" />
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.reportName}>{item.report_name}</Text>
            <View style={styles.cardMeta}>
              <Text style={styles.metaText}>{item.report_type}</Text>
              <Text style={styles.metaText}>•</Text>
              <Text style={styles.metaText}>{formatDate(item.report_date)}</Text>
            </View>
            {summaryEntries.length > 0 && (
              <View style={styles.summaryRow}>
                {summaryEntries.map(([key, value]) => (
                  <View key={key} style={styles.summaryBadge}>
                    <Text style={styles.summaryKey}>{key}</Text>
                    <Text style={styles.summaryValue}>{String(value)}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>
        <View style={styles.cardRight}>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor(item.status) },
            ]}
          >
            <Text style={styles.statusText}>{getStatusText(item.status)}</Text>
          </View>
          <Ionicons name="download-outline" size={22} color="#007AFF" />
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>加载报表列表中...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={reports}
        keyExtractor={(item) => item.$id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="document-text-outline" size={64} color="#CCCCCC" />
            <Text style={styles.emptyText}>暂无导出报表</Text>
            <Text style={styles.emptySubtext}>
              导出学习报表后，会在这里显示
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#8E8E93',
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  reportCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E8F0FE',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardInfo: {
    flex: 1,
  },
  reportName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  metaText: {
    fontSize: 12,
    color: '#8E8E93',
    marginRight: 6,
  },
  summaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    gap: 8,
  },
  summaryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    borderRadius: 14,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  summaryKey: {
    fontSize: 11,
    color: '#666',
    marginRight: 4,
  },
  summaryValue: {
    fontSize: 12,
    fontWeight: '500',
    color: '#000',
  },
  cardRight: {
    alignItems: 'flex-end',
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginBottom: 6,
  },
  statusText: {
    fontSize: 10,
    color: 'white',
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#8E8E93',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#B0B0B0',
    marginTop: 8,
  },
});