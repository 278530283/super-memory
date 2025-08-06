// src/screens/home/HomeScreen.tsx
import React from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity } from 'react-native';
import { useSelector } from 'react-redux';
import type { RootState } from '../../redux/store';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '../../types/navigation'; // 假设主应用导航器参数类型定义在此或单独文件

// 假设主应用导航器类型
type HomeScreenNavigationProp = NativeStackNavigationProp<any, 'Home'>; // 需要替换 `any` 为主应用导航器参数

// --- 占位符组件 ---
function StatCard({ title, value }: { title: string; value: string | number }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statTitle}>{title}</Text>
    </View>
  );
}

function FunctionButton({ title, onPress, icon }: { title: string; onPress: () => void; icon: string }) {
  return (
    <TouchableOpacity style={styles.functionButton} onPress={onPress}>
      <Text style={styles.buttonIcon}>{icon}</Text>
      <Text style={styles.buttonText}>{title}</Text>
    </TouchableOpacity>
  );
}

export function HomeScreen() {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const user = useSelector((state: RootState) => state.auth.user);
  // const userStats = useSelector((state: RootState) => state.stats); // 假设有 stats slice

  // --- 模拟数据 ---
  const continuousDays = 5;
  const todayProgress = 0.6; // 60%
  const learningMode = '正常'; // 从 Redux 或 API 获取

  return (
    <ScrollView style={styles.container}>
      {/* 顶部信息栏 */}
      <View style={styles.header}>
        <Image
          source={{ uri: user?.avatarUrl || 'https://via.placeholder.com/50' }} // 默认头像
          style={styles.avatar}
        />
        <View style={styles.userInfo}>
          <Text style={styles.welcomeText}>你好, {user?.nickname || '用户'}!</Text>
          <View style={styles.streakContainer}>
            <Text style={styles.streakText}>🔥 连续学习 {continuousDays} 天</Text>
            {/* 可以根据天数显示不同勋章图标 */}
          </View>
        </View>
      </View>

      {/* 今日进度卡片 */}
      <View style={styles.progressCard}>
        <Text style={styles.progressTitle}>今日进度</Text>
        <View style={styles.progressBarContainer}>
          <View style={[styles.progressBar, { width: `${todayProgress * 100}%` }]} />
        </View>
        <Text style={styles.progressText}>{Math.round(todayProgress * 100)}% 完成</Text>
        <Text style={styles.modeText}>学习模式: {learningMode}</Text>
      </View>

      {/* 核心功能区 */}
      <View style={styles.functionsContainer}>
        <Text style={styles.sectionTitle}>核心功能</Text>
        <View style={styles.buttonsRow}>
          <FunctionButton
            title="今日学习"
            icon="📚"
            onPress={() => navigation.navigate('Learning' as any)} // 需要正确导航到学习模块
          />
          <FunctionButton
            title="快速复习"
            icon="🔁"
            onPress={() => navigation.navigate('Review' as any)} // 需要正确导航到复习模块
          />
        </View>
        <View style={styles.buttonsRow}>
          <FunctionButton
            title="逻辑拓展"
            icon="🧩"
            onPress={() => console.log('Navigate to Logic Expansion')}
          />
          <FunctionButton
            title="数据统计"
            icon="📊"
            onPress={() => navigation.navigate('Stats' as any)} // 需要正确导航到统计模块
          />
        </View>
      </View>

      {/* 数据概览区 */}
      <View style={styles.statsContainer}>
        <Text style={styles.sectionTitle}>数据概览</Text>
        <View style={styles.statsRow}>
          <StatCard title="掌握单词" value={120} />
          <StatCard title="学习天数" value={30} />
          <StatCard title="最高 streak" value={15} />
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'white',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 15,
  },
  userInfo: {
    flex: 1,
  },
  welcomeText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  streakContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  streakText: {
    fontSize: 14,
    color: '#666',
  },
  progressCard: {
    margin: 20,
    padding: 20,
    backgroundColor: 'white',
    borderRadius: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  progressTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  progressBarContainer: {
    height: 10,
    backgroundColor: '#e0e0e0',
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 10,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#4CAF50', // 绿色进度条
    borderRadius: 5,
  },
  progressText: {
    fontSize: 16,
    color: '#333',
  },
  modeText: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  functionsContainer: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  buttonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  functionButton: {
    flex: 1,
    backgroundColor: '#E0E0E0',
    padding: 20,
    marginHorizontal: 5,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonIcon: {
    fontSize: 30,
    marginBottom: 10,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  statsContainer: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statCard: {
    flex: 1,
    backgroundColor: 'white',
    padding: 15,
    marginHorizontal: 5,
    borderRadius: 10,
    alignItems: 'center',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.18,
    shadowRadius: 1.0,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  statTitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
});
