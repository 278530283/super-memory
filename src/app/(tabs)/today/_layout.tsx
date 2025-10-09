// src/app/(tabs)/today/_layout.tsx
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import React from 'react';
import { TouchableOpacity } from 'react-native';

export default function TodayLayout() {
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
          // const { type } = route.params || {};
          
          // const titleMap: Record<string, string> = {
          //   pre_test: "前置评测",
          //   post_test: "当日评测",
          //   listen: "听力测试",
          //   translate: "翻译测试",
          // };
          
          // // 构建完整的标题
          // const subTitle = titleMap[type] || "单词评测";
          return {
            title: ` 今日学习`, // 返回一个包含 title 字符串的对象  ${subTitle}
          };
        }}
      />
    </Stack>
  );
}