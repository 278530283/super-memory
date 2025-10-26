// src/app/(auth)/register/step3.tsx
import useAuthStore from '@/src/lib/stores/useAuthStore';
import { UserPreferences } from '@/src/types/User';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import RNPickerSelect from 'react-native-picker-select';

export default function RegisterStep3() {
  // 状态现在使用字符串类型以匹配 picker 的值
  const [learningMode, setLearningMode] = useState<string>('2');
  const [enableSpelling, setEnableSpelling] = useState<boolean>(false);
  const [pronunce, setPronunce] = useState<string>('1'); // 注意：这里应该是 'pronounce'
  const [reviewStrategy, setReviewStrategy] = useState<string>('2'); // 复习策略：1=传统, 2=FSRS
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { user } = useAuthStore(); // 获取当前用户

  // 组件挂载时，尝试从 store 的 user 状态中加载现有偏好
  useEffect(() => {
    // console.log("Current user in Step3:", user); // 调试用
    if (user && user.prefs) {
      // 从用户偏好中加载数据
      // 注意：这里需要处理可能未定义的情况，并提供默认值
      setLearningMode(user.prefs.learningMode?.toString() || '2'); // 假设 learningMode 存储为数字，需要转为字符串
      setEnableSpelling(!!user.prefs.enableSpelling); // 确保布尔值
      // 注意：你的 UserPreferences 类型中定义的是 'pronounce'，但这里使用了 'pronunce'
      // 如果实际存储的键是 'pronunce'，则按此处理；如果是 'pronounce'，则应修改
      // 假设实际存储的键是 'pronounce'
      setPronunce(user.prefs.pronounce?.toString() || '1'); // 假设 pronounce 存储为数字，需要转为字符串
      // 加载复习策略，默认为FSRS(2)
      setReviewStrategy(user.prefs.reviewStrategy?.toString() || '2');
    }
  }, [user]); // 依赖于 user 对象，当 user 更新时重新加载

  const handleFinish = async () => {
    setIsLoading(true);
    try {
      // 准备用户偏好数据，将字符串转换为数字
      // 注意：确保 UserPreferences 类型中定义的字段名与这里一致
      const updates: Partial<UserPreferences> = {
        learningMode,
        pronounce: parseInt(pronunce, 10), // 转换为数字，注意字段名
        enableSpelling, // 布尔值
        reviewStrategy: parseInt(reviewStrategy, 10), // 转换为数字
      };

      // console.log("Updates being sent:", updates); // 调试用

      // 保存到状态管理 (这会调用 userService.updateUserPreferences)
      await useAuthStore.getState().updatePreferences(updates);

      // 导航到主应用
      router.replace('/(tabs)/today');
    } catch (error: any) {
      Alert.alert('保存失败', error.message || '请稍后重试');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>定制你的学习计划</Text>
      <Text style={styles.subtitle}>步骤 3/3</Text>
      
      {/* 新增：复习策略选择 */}
      <Text style={styles.label}>选择复习算法</Text>
      <View style={styles.strategyCardContainer}>
        {[
          { 
            id: '2', 
            name: 'FSRS智能算法', 
            desc: 'AI驱动的自适应复习，根据记忆曲线动态调整',
            features: ['✓ 智能预测遗忘点', '✓ 个性化间隔调整', '✓ 学习效率最大化']
          },
          { 
            id: '1', 
            name: '传统间隔重复', 
            desc: '固定的复习间隔，简单可靠',
            features: ['✓ 固定时间间隔', '✓ 简单易用', '✓ 经典可靠']
          },
        ].map((strategy) => (
          <TouchableOpacity
            key={strategy.id}
            style={[
              styles.strategyCard, 
              reviewStrategy === strategy.id && styles.selectedStrategyCard
            ]}
            onPress={() => setReviewStrategy(strategy.id)}
          >
            <View style={styles.strategyHeader}>
              <Text style={[
                styles.strategyName, 
                reviewStrategy === strategy.id && styles.selectedStrategyName
              ]}>
                {strategy.name}
              </Text>
              {strategy.id === '2' && (
                <View style={styles.recommendedBadge}>
                  <Text style={styles.recommendedText}>推荐</Text>
                </View>
              )}
            </View>
            <Text style={styles.strategyDesc}>{strategy.desc}</Text>
            <View style={styles.featuresContainer}>
              {strategy.features.map((feature, index) => (
                <Text key={index} style={styles.featureText}>{feature}</Text>
              ))}
            </View>
          </TouchableOpacity>
        ))}
      </View>

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
          onValueChange={(value) => setPronunce(value)}
          items={[
            { label: '英式发音', value: '1' },
            { label: '美式发音', value: '2' },
          ]}
          value={pronunce}
          style={pickerSelectStyles}
          useNativeAndroidPickerStyle={false}
        />
      </View>
      <TouchableOpacity
        style={[styles.button, isLoading && styles.buttonDisabled]}
        onPress={handleFinish}
        disabled={isLoading}
      >
        <Text style={styles.buttonText}>
          {isLoading ? '保存中...' : '完成，开始学习！'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20 },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 10, textAlign: 'center' },
  subtitle: { fontSize: 16, color: 'gray', marginBottom: 20, textAlign: 'center' },
  label: { fontSize: 16, marginBottom: 10, marginTop: 15 },
  
  // 复习策略卡片样式
  strategyCardContainer: { marginBottom: 20 },
  strategyCard: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  selectedStrategyCard: {
    borderColor: '#4A90E2',
    backgroundColor: '#e3f2fd',
    borderWidth: 2,
  },
  strategyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  strategyName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  selectedStrategyName: {
    color: '#4A90E2',
  },
  strategyDesc: {
    fontSize: 14,
    color: 'gray',
    marginBottom: 8,
  },
  featuresContainer: {
    marginTop: 4,
  },
  featureText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  recommendedBadge: {
    backgroundColor: '#4A90E2',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  recommendedText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  
  // 原有样式保持不变
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
    backgroundColor: '#e3f2fd',
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