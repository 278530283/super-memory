// src/app/(auth)/_layout.tsx
import { Stack } from 'expo-router';
import React from 'react';

export default function AuthLayout() {
  return (
    <Stack>
      <Stack.Screen name="login" options={{ title: 'Login', headerTitleAlign:'center' }} />
      <Stack.Screen name="register/step1" options={{ title: 'Register', headerTitleAlign:'center' }} />
      <Stack.Screen name="register/step2" options={{ title: 'Register', headerTitleAlign:'center' }} />
      <Stack.Screen name="register/step3" options={{ title: 'Register', headerTitleAlign:'center' }} />
      {/* Add other auth screens if needed */}
    </Stack>
  );
}