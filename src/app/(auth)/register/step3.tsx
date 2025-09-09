// src/app/(auth)/register/step3.tsx
import { router } from 'expo-router';
import React, { useState } from 'react';
import { StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import RNPickerSelect from 'react-native-picker-select';

export default function RegisterStep3() {
  const [learningMode, setLearningMode] = useState('2'); // Default to 正常模式
  const [enableSpelling, setEnableSpelling] = useState(false);
  const [pronunciation, setPronunciation] = useState('1'); // Default to 英式

  const handleFinish = async () => {
    // Here you would typically update the user's preferences in the database
    // using the user ID from useAuthStore (obtained after login in step 1)
    // const userId = useAuthStore.getState().user?.$id;
    // if (userId) {
    //   try {
    //     await userService.updateUserPreferences(userId, {
    //       default_learning_mode: parseInt(learningMode),
    //       pronunciation_preference: parseInt(pronunciation),
    //       // ... other fields
    //     });
    //     // Navigate to main app
    //     router.replace('/(tabs)/today');
    //   } catch (error) {
    //     Alert.alert('Error', 'Failed to save preferences.');
    //   }
    // } else {
    //   Alert.alert('Error', 'User not found.');
    // }

    // For now, just navigate
    router.replace('/(tabs)/today');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>定制你的学习计划</Text>
      <Text style={styles.subtitle}>步骤 3/3</Text>

      <Text style={styles.label}>选择学习模式</Text>
      <View style={styles.modeCardContainer}>
        {[
          { id: '1', name: '轻松模式', desc: '10-15分钟 | 5词+1组+1句' },
          { id: '2', name: '正常模式', desc: '15-20分钟 | 7词+1组+1句' },
          { id: '3', name: '努力模式', desc: '20-25分钟 | 10词+2组+1-2句' },
        ].map((mode) => (
          <TouchableOpacity
            key={mode.id}
            style={[styles.modeCard, learningMode === mode.id && styles.selectedModeCard]}
            onPress={() => setLearningMode(mode.id)}
          >
            <Text style={[styles.modeName, learningMode === mode.id && styles.selectedModeName]}>{mode.name}</Text>
            <Text style={styles.modeDesc}>{mode.desc}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.switchContainer}>
        <Text style={styles.label}>启用拼写测试</Text>
        <Switch
          trackColor={{ false: "#767577", true: "#81b0ff" }}
          thumbColor={enableSpelling ? "#4A90E2" : "#f4f3f4"}
          onValueChange={setEnableSpelling}
          value={enableSpelling}
        />
      </View>

      <Text style={styles.label}>发音偏好</Text>
      <View style={styles.pickerContainer}>
        <RNPickerSelect
          onValueChange={(value) => setPronunciation(value)}
          items={[
            { label: '英式发音', value: '1' },
            { label: '美式发音', value: '2' },
          ]}
          value={pronunciation}
          style={pickerSelectStyles}
          useNativeAndroidPickerStyle={false}
        />
      </View>

      <TouchableOpacity style={styles.button} onPress={handleFinish}>
        <Text style={styles.buttonText}>完成，开始学习！</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20 },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 10, textAlign: 'center' },
  subtitle: { fontSize: 16, color: 'gray', marginBottom: 20, textAlign: 'center' },
  label: { fontSize: 16, marginBottom: 10, marginTop: 15 },
  modeCardContainer: { marginBottom: 15 },
  modeCard: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    backgroundColor: '#fff',
  },
  selectedModeCard: {
    borderColor: '#4A90E2',
    backgroundColor: '#e3f2fd', // Light blue background for selected
  },
  modeName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  selectedModeName: {
    color: '#4A90E2',
  },
  modeDesc: {
    fontSize: 14,
    color: 'gray',
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    marginBottom: 20,
    justifyContent: 'center',
  },
  button: { backgroundColor: '#4A90E2', padding: 15, borderRadius: 5, alignItems: 'center' },
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