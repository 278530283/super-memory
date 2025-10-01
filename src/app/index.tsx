// src/app/index.tsx
import useAuthStore from '@/src/lib/stores/useAuthStore';
import { Redirect } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

export default function Index() {
  const { user, getCurrentUser } = useAuthStore();
  const [loading, setLoading] = useState(true);

  // 在组件挂载时执行 getCurrentUser
  useEffect(() => {
    console.log('[Index] getCurrentUser');
    getCurrentUser()
      .then(() => {
        console.log('[Index] getCurrentUser done');
        setLoading(false);
      })
      .catch((error) => {
        console.log('Error fetching user:', error);
        setLoading(false);
      });
  }, [getCurrentUser]);


  // 则显示加载指示器
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
        <Text>加载中...</Text>
      </View>
    );
  }

  // 如果 getCurrentUser 调用完成 (loading 为 false)，则根据 store 中更新后的 user 状态进行重定向
  // 此时，user 状态是 getCurrentUser 执行完毕后得到的最新结果
  if (user) {
    // 用户存在，重定向到主应用
    return <Redirect href="/(tabs)/today" />;
  } else {
    // 用户不存在，重定向到登录页
    return <Redirect href="/(auth)/login" />;
  }
}