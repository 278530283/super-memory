// src/app/(tabs)/profile/settings/basic.tsx
import useAuthStore from '@/src/lib/stores/useAuthStore';
import { Models } from 'appwrite';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import RNPickerSelect from 'react-native-picker-select';

export default function BasicSettings() {
  const [nickname, setNickname] = useState('');
  const [role, setRole] = useState('1');
  const [englishLevel, setEnglishLevel] = useState('2');
  const [grade, setGrade] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { user, updatePreferences } = useAuthStore();

  // 从用户数据加载现有设置
  useEffect(() => {
    if (user) {
      setNickname(user.name || '');
      
      if (user.prefs) {
        setRole(user.prefs.role?.toString() || '1');
        setEnglishLevel(user.prefs.englishLevel?.toString() || '2');
        
        const userGrade = user.prefs.grade;
        if (userGrade !== undefined && userGrade !== null) {
          setGrade(userGrade.toString());
        } else {
          if (user.prefs.englishLevel !== 2) {
            setGrade(null);
          }
        }
      }
    }
  }, [user]);

  const handleSave = async () => {
    // 数据校验
    if (englishLevel === '2' && !grade) {
      Alert.alert('请选择小学年级');
      return;
    }

    setIsSaving(true);
    try {
      const updates: Partial<Models.Preferences> = {
        nickname: nickname || undefined,
        role: role ? parseInt(role, 10) : undefined,
        englishLevel: englishLevel ? parseInt(englishLevel, 10) : undefined,
        ...(englishLevel === '2' && { 
          grade: grade ? parseInt(grade, 10) : null
        })
      };

      await updatePreferences(updates);
      Alert.alert('成功', '基本信息已更新', [
        {
          text: '确定',
          onPress: () => {
            router.replace('/profile');
          }
        }
      ]);
    } catch (error: any) {
      Alert.alert('保存失败', error.message || '请稍后重试');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4A90E2" />
        <Text style={styles.loadingText}>加载中...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>基本信息设置</Text>
      
      <View style={styles.section}>
        <Text style={styles.label}>昵称</Text>
        <TextInput
          style={styles.input}
          placeholder="请输入昵称"
          value={nickname}
          onChangeText={setNickname}
          maxLength={20}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>身份</Text>
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
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>英语水平</Text>
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
      </View>

      {englishLevel === '2' && (
        <View style={styles.section}>
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
        </View>
      )}

      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={[styles.saveButton, isSaving && styles.saveButtonDisabled]} 
          onPress={handleSave}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.saveButtonText}>保存设置</Text>
          )}
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.cancelButton}
          onPress={() => router.back()}
        >
          <Text style={styles.cancelButtonText}>取消</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  title: { 
    fontSize: 24, 
    fontWeight: 'bold', 
    textAlign: 'center',
    marginBottom: 24,
    color: '#1A1A1A',
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  label: { 
    fontSize: 16, 
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  input: { 
    borderWidth: 1, 
    borderColor: '#E0E0E0', 
    padding: 12, 
    borderRadius: 8,
    fontSize: 16,
    backgroundColor: '#FAFAFA',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    backgroundColor: '#FAFAFA',
    justifyContent: 'center',
  },
  buttonContainer: {
    marginTop: 8,
    marginBottom: 24,
  },
  saveButton: { 
    backgroundColor: '#4A90E2', 
    padding: 16, 
    borderRadius: 8, 
    alignItems: 'center',
    marginBottom: 12,
  },
  saveButtonDisabled: { 
    backgroundColor: '#A0A0A0' 
  },
  saveButtonText: { 
    color: 'white', 
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: { 
    padding: 16, 
    borderRadius: 8, 
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: 'white',
  },
  cancelButtonText: { 
    color: '#666',
    fontSize: 16,
  },
});

const pickerSelectStyles = StyleSheet.create({
  inputIOS: {
    fontSize: 16,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderWidth: 0,
    borderRadius: 8,
    color: 'black',
    paddingRight: 30,
  },
  inputAndroid: {
    fontSize: 16,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 0,
    borderRadius: 8,
    color: 'black',
    paddingRight: 30,
  },
});