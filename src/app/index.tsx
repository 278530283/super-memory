// src/app/index.tsx
import useAuthStore from '@/src/lib/stores/useAuthStore';
import { Redirect } from 'expo-router';
import React from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

export default function Index() {
  const { user, loading } = useAuthStore();

  if (loading) {
    // Show splash screen or loading indicator
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
        <Text>Loading...</Text>
      </View>
    );
  }

  // Redirect logic based on auth state
  if (user) {
    return <Redirect href="/(tabs)/today" />; // Redirect to main app if logged in
  } else {
    return <Redirect href="/(auth)/login" />; // Redirect to login if not
  }
  
}