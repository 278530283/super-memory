// src/app/index.tsx
import { Redirect } from 'expo-router';
import React from 'react';
import useAuthStore from '../lib/stores/useAuthStore';

export default function Index() {
  const { user, loading } = useAuthStore();

  // Optional: Fetch user on app start if needed beyond just checking session
  // useEffect(() => {
  //   if (user && !preferences) {
  //     fetchUserPreferences(); // Call action from useUserStore
  //   }
  // }, [user, preferences, fetchUserPreferences]);

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