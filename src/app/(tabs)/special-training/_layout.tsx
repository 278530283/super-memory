// src/app/(tabs)/special-training/_layout.tsx
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import React from 'react';
import { TouchableOpacity } from 'react-native';

export default function SpecialTrainingLayout() {
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
          title: '专项能力训练',
          headerLeft: () => null, // 在主页面隐藏返回按钮
        }}
      />
      {/* 添加专项训练子页面配置 */}
      {/* <Stack.Screen
        name="spelling"
        options={{
          title: '拼写大师',
        }}
      /> */}
      {/* <Stack.Screen
        name="listening"
        options={{
          title: '听力达人',
        }}
      /> */}
      {/* <Stack.Screen
        name="logic"
        options={{
          title: '逻辑拓展',
        }}
      /> */}
      {/* <Stack.Screen
        name="pronunciation"
        options={{
          title: '发音评测',
        }}
      /> */}
    </Stack>
  );
}