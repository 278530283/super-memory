// src/components/ProtectedRoute.tsx
import useAuthStore from '@/src/lib/stores/useAuthStore';
import { Redirect, usePathname } from 'expo-router';
import React from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuthStore();
  const pathname = usePathname();

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