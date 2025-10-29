// src/app/(tabs)/quick-review/_layout.tsx
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import React from 'react';
import { TouchableOpacity } from 'react-native';

export default function QuickReviewLayout() {
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