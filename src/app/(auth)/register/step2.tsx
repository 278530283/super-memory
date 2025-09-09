// src/app/(auth)/register/step2.tsx
import { router } from 'expo-router';
import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import RNPickerSelect from 'react-native-picker-select'; // You'll need to install this

export default function RegisterStep2() {
  const [nickname, setNickname] = useState('');
  const [role, setRole] = useState('1'); // Default to student
  const [englishLevel, setEnglishLevel] = useState('2'); // Default to 小学
  const [grade, setGrade] = useState<string | null>(null); // For 小学年级

  const handleNext = () => {
    // Validation can be added here
    // Navigate to next step, potentially passing data
    // router.push({ pathname: '/(auth)/register/step3', params: { nickname, role, englishLevel, grade } });
    router.push('/(auth)/register/step3');
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
            if (value !== '2') setGrade(null); // Reset grade if not 小学
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

      <TouchableOpacity style={styles.button} onPress={handleNext}>
        <Text style={styles.buttonText}>下一步</Text>
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
    justifyContent: 'center', // Vertically center the picker
  },
  button: { backgroundColor: '#4A90E2', padding: 15, borderRadius: 5, alignItems: 'center', marginTop: 20 },
  buttonText: { color: 'white', fontWeight: 'bold' },
});

const pickerSelectStyles = StyleSheet.create({
  inputIOS: {
    fontSize: 16,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderWidth: 0, // Remove inner border
    borderRadius: 5,
    color: 'black',
    paddingRight: 30, // to ensure the text is never behind the icon
  },
  inputAndroid: {
    fontSize: 16,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 0,
    borderRadius: 5,
    color: 'black',
    paddingRight: 30, // to ensure the text is never behind the icon
  },
});