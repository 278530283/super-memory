// src/app/(tabs)/profile/settings/index.tsx
import useAuthStore from '@/src/lib/stores/useAuthStore';
import { UserPreferences } from '@/src/types/User';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function LearningSettings() {
  const { user, updatePreferences } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async (updates: Partial<UserPreferences>) => {
    setIsLoading(true);
    try {
      await updatePreferences(updates);
      Alert.alert('成功', '设置已保存');
    } catch (error) {
      Alert.alert('错误', '保存失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>学习设置</Text>
      
      {/* 基本信息部分 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>基本信息</Text>
        <TouchableOpacity 
          style={styles.settingItem}
          onPress={() => router.push('/profile/settings/basic')}
        >
          <Text>昵称、身份、英语水平</Text>
          <Text style={styles.arrow}>›</Text>
        </TouchableOpacity>
      </View>

      {/* 学习偏好部分 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>学习偏好</Text>
        <TouchableOpacity 
          style={styles.settingItem}
          onPress={() => router.push('/profile/settings/preferences')}
        >
          <Text>学习模式、发音、拼写测试</Text>
          <Text style={styles.arrow}>›</Text>
        </TouchableOpacity>
      </View>

      {/* 复习策略部分 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>复习策略</Text>
        <TouchableOpacity 
          style={styles.settingItem}
          onPress={() => router.push('/profile/settings/review-strategy')}
        >
          <Text>选择复习算法</Text>
          <Text style={styles.arrow}>›</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  title: { fontSize: 24, fontWeight: 'bold', padding: 20, textAlign: 'center' },
  section: { 
    backgroundColor: 'white', 
    margin: 10, 
    borderRadius: 10,
    padding: 15,
  },
  sectionTitle: { 
    fontSize: 18, 
    fontWeight: 'bold', 
    marginBottom: 10,
    color: '#333',
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  arrow: {
    fontSize: 18,
    color: '#999',
  },
});