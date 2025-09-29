// src/app/(auth)/login.tsx
import useAuthStore from '@/src/lib/stores/useAuthStore';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function LoginScreen() {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const { login, loading, error, clearError } = useAuthStore();

  const handleLogin = async () => {
    if (!phone || !password) {
      Alert.alert('出错了', '请输入手机号和密码');
      return;
    }
    try {
      await login(phone, password);
      // Successful login handled by ProtectedRoute redirect
      router.replace('/(tabs)/today');
    } catch (err) {
      // Error handled by store, but you can show an alert too if needed
      console.error('Login error:', err);
      Alert.alert('登录失败', '手机号或密码错误！');
    }
  };

  const handleRegister = () => {
    // Navigate to register
    console.log('Navigating to register');
    router.push('/(auth)/register/step1');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>登录</Text>
      {error && <Text style={styles.error}>{error}</Text>}
      <TextInput
        style={styles.input}
        placeholder="手机号"
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        autoCapitalize="none"
        onFocus={clearError} // Clear error when user starts typing
      />
      <TextInput
        style={styles.input}
        placeholder="密码"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        onFocus={clearError}
      />
      <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? '登录中...' : '登录'}</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={handleRegister}>
        <Text style={styles.link}>{"没有账号? 去注册"}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 10, marginBottom: 15, borderRadius: 5 },
  button: { backgroundColor: '#4A90E2', padding: 15, borderRadius: 5, alignItems: 'center' },
  buttonText: { color: 'white', fontWeight: 'bold' },
  link: { marginTop: 15, color: '#4A90E2', textAlign: 'center' },
  error: { color: 'red', marginBottom: 10, textAlign: 'center' },
});