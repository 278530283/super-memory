// src/app/_layout.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'; // Optional but recommended for data fetching
import { Stack } from 'expo-router';
import React from 'react';

// Create a client
const queryClient = new QueryClient();

export default function RootLayout() {
  return (
    // Wrap the entire app with QueryClientProvider if using react-query
    <QueryClientProvider client={queryClient}>
      <Stack
        screenOptions={{
          headerShown: false, // Hide default header, use custom headers in screens/layouts
        }}
      >
        {/* Define initial route or let index.tsx handle it */}
        <Stack.Screen name="index" />
      </Stack>
    </QueryClientProvider>
  );
}