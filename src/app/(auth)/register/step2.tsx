// src/app/(auth)/register/step2.tsx
import useAuthStore from '@/src/lib/stores/useAuthStore';
import { Models } from 'appwrite';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import RNPickerSelect from 'react-native-picker-select';

export default function RegisterStep2() {
  const [nickname, setNickname] = useState('');
  const [role, setRole] = useState('1');
  const [englishLevel, setEnglishLevel] = useState('2');
  const [grade, setGrade] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { user, updatePreferences } = useAuthStore(); // 获取当前用户和更新方法

  // 组件挂载时，尝试从 store 的 user 状态中加载现有偏好
  useEffect(() => {
    // console.log("Current user in Step2:", user); // 调试用
    if (user && user.prefs) {
      setNickname(user.name || ''); // 从 user.name 加载初始值
      // 从用户偏好中加载数据
      setRole(user.prefs.role?.toString() || '1'); // 假设 role 存储为数字，需要转为字符串
      setEnglishLevel(user.prefs.englishLevel?.toString() || '2'); // 假设 englishLevel 存储为数字
      // grade 的处理取决于你的数据结构，如果它在 englishLevel 为 2 时才存在
      // 这里假设它存储为数字，需要转为字符串
      const userGrade = user.prefs.grade;
      if (userGrade !== undefined && userGrade !== null) {
        setGrade(userGrade.toString());
      } else {
        // 如果 englishLevel 不是 2，或者 grade 未定义，则设置为 null
        if (user.prefs.englishLevel !== 2) {
          setGrade(null);
        }
      }
    }
  }, [user]); // 依赖于 user 对象，当 user 更新时重新加载

  const handleNext = async () => {
    // 数据校验
    if (englishLevel === '2' && !grade) {
      Alert.alert('请选择小学年级');
      return;
    }
    setIsLoading(true);
    try {
      // 准备用户偏好数据
      const updates: Partial<Models.Preferences> = {
        nickname: nickname || undefined, // 如果 nickname 为空，则设为 undefined (Appwrite 会移除该字段)
        role: role ? parseInt(role, 10) : undefined, // 确保转换为数字
        englishLevel: englishLevel ? parseInt(englishLevel, 10) : undefined, // 确保转换为数字
        ...(englishLevel === '2' && { 
          grade: grade ? parseInt(grade, 10) : null // 转换为数字或保持null
        })
      };
      // console.log("Updates being sent:", updates); // 调试用
      // 保存到状态管理 (这会调用 authService.updateUserPreferences)
      await updatePreferences(updates);
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
            if (value !== '2') setGrade(null); // 如果不是小学，清空年级
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