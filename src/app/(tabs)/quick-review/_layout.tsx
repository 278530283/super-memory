// src/app/(tabs)/quick-review/_layout.tsx
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import React from 'react';
import { TouchableOpacity } from 'react-native';

export default function QuickReviewLayout() {
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
          title: '快速复习',
          headerLeft: () => null, // 在主页面隐藏返回按钮
        }}
      />
      {/* 添加其他子页面配置 */}
      {/* <Stack.Screen
        name="session"
        options={{
          title: '复习会话',
        }}
      /> */}
      {/* <Stack.Screen
        name="results"
        options={{
          title: '复习结果',
        }}
      /> */}
    </Stack>
  );
}