// src/app/(auth)/_layout.tsx
import { Stack } from 'expo-router';
import React from 'react';

export default function AuthLayout() {
  return (
    <Stack>
      <Stack.Screen name="login" options={{ title: 'Login' }} />
      <Stack.Screen name="register/step1" options={{ title: 'Register Step 1' }} />
      <Stack.Screen name="register/step2" options={{ title: 'Register Step 2' }} />
      <Stack.Screen name="register/step3" options={{ title: 'Register Step 3' }} />
      {/* Add other auth screens if needed */}
    </Stack>
  );
}