// src/app/(tabs)/profile/_layout.tsx
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import React from 'react';
import { TouchableOpacity } from 'react-native';

export default function ProfileLayout() {
  const router = useRouter();
  
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: '#4A90E2',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
        headerLeft: () => (
          <TouchableOpacity 
            onPress={() => router.back()}
            style={{ marginLeft: 16 }}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
        ),
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
      {/* <Stack.Screen
        name="settings"
        options={{
          title: '学习设置',
        }}
      /> */}
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