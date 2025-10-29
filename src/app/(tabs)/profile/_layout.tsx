// src/app/(tabs)/profile/_layout.tsx
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import React from 'react';
import { TouchableOpacity } from 'react-native';

export default function ProfileLayout() {
  const router = useRouter();
  
  return (
    <Stack
    // 高度低一点
      screenOptions={{
        headerStyle: {
          backgroundColor: '#f1f1f1',
        },
        headerTintColor: '#000000',
        headerTitleStyle: {
          fontWeight: 'bold',
          fontSize: 16,
        },
        headerTitleAlign: 'center',
        // 全局返回按钮配置
        headerLeft: () => (
          <TouchableOpacity 
            onPress={() => router.back()}
            style={{ marginLeft: 10 }}
          >
            <Ionicons name="arrow-back" size={18} color="#000000" />
          </TouchableOpacity>
        )
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: '我的',
          headerLeft: () => null, // 在主页面隐藏返回按钮
        }}
      />
      {/* 添加个人资料子页面配置 */}
      <Stack.Screen
        name="settings/preferences"
        options={({ route }: any) => {
          return {
            title: `学习偏好`,
            headerLeft: () => null,
          };
        }}
      />
      <Stack.Screen
        name="settings/review-strategy"
        options={({ route }: any) => {
          return {
            title: `复习策略`,
            headerLeft: () => null,
          };
        }}
      />
      {/* <Stack.Screen
        name="reports"
        options={{
          title: '学习报告',
        }}
      /> */}
      {/* <Stack.Screen
        name="level"
        options={{
          title: '英语水平',
        }}
      /> */}
      {/* <Stack.Screen
        name="help"
        options={{
          title: '帮助与反馈',
        }}
      /> */}
    </Stack>
  );
}