// src/components/ProtectedRoute.tsx
import { Redirect, usePathname } from 'expo-router';
import React from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import useAuthStore from '../lib/stores/useAuthStore';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuthStore();
  const pathname = usePathname();

  // Optional: Check if user data is fully loaded (e.g., preferences)
  // const { preferences } = useUserStore();
  // const isFullyLoaded = user && preferences; // Or just user if preferences load is async

  if (loading) {
    // Show a loading indicator while checking auth state
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
        <Text>Loading...</Text>
      </View>
    );
  }

  if (!user) {
    // If not authenticated, redirect to login
    // Preserve the attempted route to redirect back after login (optional, needs more logic)
    console.log(`Redirecting from ${pathname} to /login`);
    return <Redirect href="/login" />;
  }

  // If authenticated, render the protected content
  return <>{children}</>;
};

export default ProtectedRoute;