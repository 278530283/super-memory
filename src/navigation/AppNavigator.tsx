// src/navigation/AppNavigator.tsx
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSelector } from 'react-redux';
import type { RootState } from '../redux/store';
import { AuthNavigator } from './AuthNavigator';
// --- 主应用页面 (待实现) ---
// import HomeScreen from '../screens/home/HomeScreen';
// import LearningNavigator from './LearningNavigator'; // 可能需要嵌套导航
// import ReviewScreen from '../screens/review/ReviewScreen';
// import StatsScreen from '../screens/stats/StatsScreen';
// import ProfileScreen from '../screens/profile/ProfileScreen';
// --- 图标 (使用 react-native-vector-icons 或自定义组件) ---
// import Icon from 'react-native-vector-icons/MaterialIcons';

const Tab = createBottomTabNavigator();

/**
 * 主应用导航器 (标签栏)
 * 根据用户认证状态决定显示认证流程还是主应用
 */
export function AppNavigator() {
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);

  return (
    <>
      {isAuthenticated ? (
        <Tab.Navigator
          screenOptions={({ route }) => ({
            tabBarActiveTintColor: '#007AFF', // 主色调
            tabBarInactiveTintColor: 'gray',
            headerShown: false, // 通常标签页不显示标题栏，或在子页面控制
            // tabBarIcon: ({ focused, color, size }) => {
            //   let iconName;
            //   if (route.name === 'Home') {
            //     iconName = focused ? 'home' : 'home-outline';
            //   } else if (route.name === 'Learning') {
            //     iconName = focused ? 'school' : 'school-outline';
            //   } // ... 其他 tab
            //   return <Icon name={iconName} size={size} color={color} />;
            // },
          })}
        >
          {/* <Tab.Screen name="Home" component={HomeScreen} options={{ title: '首页' }} />
          <Tab.Screen name="Learning" component={LearningNavigator} options={{ title: '学习' }} />
          <Tab.Screen name="Review" component={ReviewScreen} options={{ title: '复习' }} />
          <Tab.Screen name="Stats" component={StatsScreen} options={{ title: '统计' }} />
          <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: '我的' }} /> */}
          {/* 占位符屏幕，实际开发时替换 */}
          <Tab.Screen name="Home" component={PlaceholderScreen} options={{ title: '首页' }} />
          <Tab.Screen name="Learning" component={PlaceholderScreen} options={{ title: '学习' }} />
          <Tab.Screen name="Review" component={PlaceholderScreen} options={{ title: '复习' }} />
          <Tab.Screen name="Stats" component={PlaceholderScreen} options={{ title: '统计' }} />
          <Tab.Screen name="Profile" component={PlaceholderScreen} options={{ title: '我的' }} />
        </Tab.Navigator>
      ) : (
        <AuthNavigator />
      )}
    </>
  );
}

// --- 占位符组件 ---
function PlaceholderScreen() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>此页面尚未实现</Text>
    </View>
  );
}
// --- 占位符组件 ---
import { View, Text } from 'react-native';
