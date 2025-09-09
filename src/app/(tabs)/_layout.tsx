// src/app/(tabs)/_layout.tsx
import { Ionicons } from '@expo/vector-icons'; // Or any icon library you prefer
import { Tabs } from 'expo-router';
import React from 'react';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#4A90E2', // Match design spec
        headerShown: false, // Hide default header
      }}
    >
      <Tabs.Screen
        name="today"
        options={{
          title: '今日学习',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'book' : 'book-outline'} color={color} size={24} />
          ),
        }}
      />
      <Tabs.Screen
        name="quick-review"
        options={{
          title: '快速复习',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'flash' : 'flash-outline'} color={color} size={24} />
          ),
          // tabBarBadge: 15, // Example: Show badge for review count
        }}
      />
      <Tabs.Screen
        name="special-training"
        options={{
          title: '专项训练',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'target' : 'target-outline'} color={color} size={24} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: '我的',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'person' : 'person-outline'} color={color} size={24} />
          ),
        }}
      />
    </Tabs>
  );
}