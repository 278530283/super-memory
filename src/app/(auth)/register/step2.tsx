// src/app/(auth)/register/step2.tsx
import useAuthStore from '@/src/lib/stores/useAuthStore';
import { UserPreferences } from '@/src/types/User';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import RNPickerSelect from 'react-native-picker-select';

export default function RegisterStep2() {
  const [nickname, setNickname] = useState('');
  const [role, setRole] = useState('1');
  const [englishLevel, setEnglishLevel] = useState('2');
  const [grade, setGrade] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const { updateUserPreferences } = useAuthStore();

  console.log('RegisterStep2, ', updateUserPreferences);

  const handleNext = async () => {
    // 数据校验
    if (englishLevel === '2' && !grade) {
      Alert.alert('请选择小学年级');
      return;
    }

    setIsLoading(true);
    
    try {
      // 准备用户偏好数据
      const updates: Partial<UserPreferences> = {
        nickname: nickname || undefined,
        role: parseInt(role, 10),
        englishLevel: parseInt(englishLevel, 10),
        ...(englishLevel === '2' && { 
          grade: grade ? parseInt(grade, 10) : null // 转换为数字或保持null
        })
      };

      // 保存到状态管理
      await updateUserPreferences(updates);
      
      // 导航到下一步
      router.push('/(auth)/register/step3');
    } catch (error: any) {
      Alert.alert('保存失败', error.message || '请稍后重试');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>完善你的学习档案</Text>
      <Text style={styles.subtitle}>步骤 2/3</Text>

      <TextInput
        style={styles.input}
        placeholder="昵称 (选填)"
        value={nickname}
        onChangeText={setNickname}
        maxLength={20}
      />

      <Text style={styles.label}>我是</Text>
      <View style={styles.pickerContainer}>
        <RNPickerSelect
          onValueChange={(value) => setRole(value)}
          items={[
            { label: '学生', value: '1' },
            { label: '家长', value: '2' },
          ]}
          value={role}
          style={pickerSelectStyles}
          useNativeAndroidPickerStyle={false}
        />
      </View>

      <Text style={styles.label}>我的英语水平</Text>
      <View style={styles.pickerContainer}>
        <RNPickerSelect
          onValueChange={(value) => {
            setEnglishLevel(value);
            if (value !== '2') setGrade(null);
          }}
          items={[
            { label: '零基础', value: '1' },
            { label: '小学', value: '2' },
            { label: '初中', value: '3' },
            { label: '高中', value: '4' },
          ]}
          value={englishLevel}
          style={pickerSelectStyles}
          useNativeAndroidPickerStyle={false}
        />
      </View>

      {englishLevel === '2' && (
        <>
          <Text style={styles.label}>小学年级</Text>
          <View style={styles.pickerContainer}>
            <RNPickerSelect
              onValueChange={(value) => setGrade(value)}
              items={[
                { label: '一年级', value: '1' },
                { label: '二年级', value: '2' },
                { label: '三年级', value: '3' },
                { label: '四年级', value: '4' },
                { label: '五年级', value: '5' },
                { label: '六年级', value: '6' },
              ]}
              value={grade}
              style={pickerSelectStyles}
              placeholder={{ label: '请选择年级', value: null }}
              useNativeAndroidPickerStyle={false}
            />
          </View>
        </>
      )}

      <TouchableOpacity 
        style={[styles.button, isLoading && styles.buttonDisabled]} 
        onPress={handleNext}
        disabled={isLoading}
      >
        <Text style={styles.buttonText}>
          {isLoading ? '保存中...' : '下一步'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20 },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 10, textAlign: 'center' },
  subtitle: { fontSize: 16, color: 'gray', marginBottom: 20, textAlign: 'center' },
  label: { fontSize: 16, marginBottom: 5, marginTop: 15 },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 10, marginBottom: 15, borderRadius: 5 },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    marginBottom: 15,
    justifyContent: 'center',
  },
  button: { backgroundColor: '#4A90E2', padding: 15, borderRadius: 5, alignItems: 'center', marginTop: 20 },
  buttonDisabled: { backgroundColor: '#A0A0A0' },
  buttonText: { color: 'white', fontWeight: 'bold' },
});

const pickerSelectStyles = StyleSheet.create({
  inputIOS: {
    fontSize: 16,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderWidth: 0,
    borderRadius: 5,
    color: 'black',
    paddingRight: 30,
  },
  inputAndroid: {
    fontSize: 16,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 0,
    borderRadius: 5,
    color: 'black',
    paddingRight: 30,
  },
});