// src/app/(tabs)/profile/index.tsx
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import useAuthStore from '../../../lib/stores/useAuthStore';

export default function ProfileScreen() {
  const { user, logout } = useAuthStore();

  const handleLogout = async () => {
    try {
      await logout();
      // Navigation handled by ProtectedRoute
    } catch (error) {
      console.error("Logout failed:", error);
      // Handle error, e.g., show alert
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.username}>{user?.name || 'User'}</Text>
        {/* Add avatar or user icon here */}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>本周成就</Text>
        <View style={styles.achievementRow}>
          <Text>学习天数：</Text>
          <Text style={styles.bold}>7天</Text>
        </View>
        <View style={styles.achievementRow}>
          <Text>学习单词：</Text>
          <Text style={styles.bold}>120个</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>能力雷达图</Text>
        <Text>（图表占位符）</Text>
        {/* Integrate a charting library here */}
      </View>

      <View style={styles.section}>
        <TouchableOpacity style={styles.listItem}>
          <Text>📊 学习报告</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.listItem}>
          <Text>⚙️ 学习设置</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.listItem}>
          <Text>📝 英语水平</Text>
        </TouchableOpacity>
        {/* Conditionally render based on user role */}
        {/* <TouchableOpacity style={styles.listItem}>
          <Text>👨‍👩‍👧‍👦 家长中心</Text>
        </TouchableOpacity> */}
      </View>

      <View style={styles.section}>
        <TouchableOpacity style={styles.listItem}>
          <Text>❓ 帮助与反馈</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.listItem, styles.logoutButton]} onPress={handleLogout}>
          <Text style={styles.logoutText}>🚪 退出登录</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  username: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  achievementRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  bold: {
    fontWeight: 'bold',
  },
  listItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  logoutButton: {
    // backgroundColor: '#f8d7da', // Light red background
    // borderRadius: 5,
  },
  logoutText: {
    color: 'red', // Red text for logout
    fontWeight: 'bold',
  },
});