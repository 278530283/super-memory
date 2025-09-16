// src/app/(tabs)/today/_layout.tsx
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import React from 'react';
import { TouchableOpacity } from 'react-native';

export default function TodayLayout() {
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
        // 全局返回按钮配置
        headerLeft: () => (
          <TouchableOpacity 
            onPress={() => router.back()}
            style={{ marginLeft: 16 }}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
        )
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: '今日学习',
          // 在主页隐藏返回按钮
          headerLeft: () => null,
        }}
      />

       {/* 修改 test 路由的 options 配置 */}
      <Stack.Screen
        name="[sessionId]/test/[type]/index" // 这会匹配 today/test/[type]/index.tsx
        options={({ route }: any) => { // options 本身是一个函数
          // 从 route.params 中获取 type 参数
          const { type } = route.params || {};
          
          const titleMap: Record<string, string> = {
            pre_test: "前置评测",
            post_test: "当日评测",
            listen: "听力测试",
            translate: "翻译测试",
          };
          
          // 构建完整的标题
          const subTitle = titleMap[type] || "单词评测";
          return {
            title: ` 今日学习 / ${subTitle}`, // 返回一个包含 title 字符串的对象
          };
        }}
      />
    </Stack>
  );
}