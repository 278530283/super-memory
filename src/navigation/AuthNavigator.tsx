// src/navigation/AuthNavigator.tsx
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { RegisterPhoneScreen } from '../screens/auth/RegisterPhoneScreen';
import { RegisterUserInfoScreen } from '../screens/auth/RegisterUserInfoScreen';
import type { AuthStackParamList } from '../types/navigation';
// import { LoginScreen } from '../screens/auth/LoginScreen'; // 如果需要登录页

const Stack = createNativeStackNavigator<AuthStackParamList>();

/**
 * 认证流程导航器
 * 包含注册、登录等相关页面
 */
export function AuthNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="RegisterPhone"
      screenOptions={{
        headerShown: true, // 或根据设计隐藏
        headerBackTitle: '', // 隐藏返回按钮文字
      }}
    >
      <Stack.Screen
        name="RegisterPhone"
        component={RegisterPhoneScreen}
        options={{ title: '手机号注册' }}
      />
      <Stack.Screen
        name="RegisterUserInfo"
        component={RegisterUserInfoScreen}
        options={{ title: '用户信息配置' }}
      />
      {/* 如果有登录页
      <Stack.Screen
        name="Login"
        component={LoginScreen}
        options={{ title: '登录' }}
      />
      */}
    </Stack.Navigator>
  );
}
