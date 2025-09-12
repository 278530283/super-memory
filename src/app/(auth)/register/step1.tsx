// src/app/(auth)/register/step1.tsx
import useAuthStore from '@/src/lib/stores/useAuthStore';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function RegisterStep1() {
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [verificationId, setVerificationId] = useState<string | null>(null); // Placeholder for SMS verification ID
  const { register, loading, error, clearError } = useAuthStore();

  const handleSendCode = () => {
    // Implement SMS sending logic here (or mock it)
    // For now, just simulate
    if (!phone) {
      Alert.alert('Error', 'Please enter phone number.');
      return;
    }
    Alert.alert('Info', `Code sent to ${phone} (mock)`);
    setVerificationId('mock_verification_id'); // Set a mock ID
  };

  const handleRegister = async () => {
    if (!phone || !code || !verificationId) { // Check verification ID
      Alert.alert('Error', 'Please enter phone, code, and verify first.');
      return;
    }
    // Here you would typically verify the code against the verificationId
    // Mock verification success
    const isCodeValid = code === '123456'; // Example mock code
    if (!isCodeValid) {
        Alert.alert('Error', 'Invalid verification code.');
        return;
    }

    try {
      // Pass phone and a temporary password for now, name can be set later or here if collected
      // You might need a more complex flow for SMS verification
      await register(phone, '12345678', `User_${phone}`); // Use phone as name placeholder
      // Successful registration handled by ProtectedRoute redirect after login
      // Or navigate to next step if registration doesn't auto-login
      router.push('/(auth)/register/step2');
    } catch (err) {
      Alert.alert('Registration Failed', error || 'An error occurred.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>欢迎！开启你的高效背词之旅</Text>
      <Text style={styles.subtitle}>步骤 1/3</Text>
      {error && <Text style={styles.error}>{error}</Text>}
      <TextInput
        style={styles.input}
        placeholder="请输入11位手机号"
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        autoCapitalize="none"
        onFocus={clearError}
      />
      <TouchableOpacity style={styles.secondaryButton} onPress={handleSendCode} disabled={!phone || loading}>
        <Text style={styles.secondaryButtonText}>获取验证码</Text>
      </TouchableOpacity>
      <TextInput
        style={styles.input}
        placeholder="请输入6位验证码"
        value={code}
        onChangeText={setCode}
        keyboardType="number-pad"
        onFocus={clearError}
      />
      <TouchableOpacity style={styles.button} onPress={handleRegister} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? '注册中...' : '下一步'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20 },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 10, textAlign: 'center' },
  subtitle: { fontSize: 16, color: 'gray', marginBottom: 20, textAlign: 'center' },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 10, marginBottom: 15, borderRadius: 5 },
  button: { backgroundColor: '#4A90E2', padding: 15, borderRadius: 5, alignItems: 'center', marginTop: 10 },
  buttonText: { color: 'white', fontWeight: 'bold' },
  secondaryButton: { alignSelf: 'flex-end', padding: 10 },
  secondaryButtonText: { color: '#4A90E2' },
  error: { color: 'red', marginBottom: 10, textAlign: 'center' },
});