// src/screens/auth/RegisterUserInfoScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { z } from 'zod';
import { registerUserInfoStudentAsync } from '../../redux/slices/authSlice';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { nicknameSchema, registerUserInfoStudentSchema } from '../../utils/validation';
import type { AuthStackParamList } from '../../types/navigation';
import type { RootState } from '../../redux/store'; // 假设已定义 RootState

type RegisterUserInfoScreenRouteProp = RouteProp<AuthStackParamList, 'RegisterUserInfo'>;
type RegisterUserInfoScreenNavigationProp = NativeStackNavigationProp<
  AuthStackParamList,
  'RegisterUserInfo'
>;

// 示例数据 - 实际应从API获取或在Redux中管理
const ENGLISH_LEVELS = [
  { key: 'beginner', label: '小学 (掌握200+基础词汇)' },
  { key: 'elementary', label: '初中 (掌握1000+词汇)' },
  // ... 其他等级
];

const GRADES = Array.from({ length: 6 }, (_, i) => ({ key: i + 1, label: `📚${i + 1}` }));

export function RegisterUserInfoScreen() {
  const dispatch = useDispatch();
  const navigation = useNavigation<RegisterUserInfoScreenNavigationProp>();
  const route = useRoute<RegisterUserInfoScreenRouteProp>();
  const { tempUserId, phone } = route.params;

  const isLoading = useSelector((state: RootState) => state.auth.isLoading);
  const error = useSelector((state: RootState) => state.auth.error);

  const [nickname, setNickname] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);
  const [selectedGrade, setSelectedGrade] = useState<number | null>(null);
  const [nicknameStatus, setNicknameStatus] = useState<'checking' | 'available' | 'taken' | null>(null);
  const [nicknameError, setNicknameError] = useState<string | null>(null);
  const [levelError, setLevelError] = useState<string | null>(null);
  const [gradeError, setGradeError] = useState<string | null>(null);

  // 模拟检查昵称是否可用 (实际应调用API)
  useEffect(() => {
    const checkNickname = async () => {
      if (nickname.length > 1) { // 简单的触发条件
        setNicknameStatus('checking');
        setNicknameError(null);
        try {
          nicknameSchema.parse(nickname); // 基本格式验证
          // --- 模拟 API 调用 ---
          await new Promise(resolve => setTimeout(resolve, 500)); // 模拟网络延迟
          const isTaken = nickname.toLowerCase().includes('taken'); // 简单模拟逻辑
          // ---------------------
          setNicknameStatus(isTaken ? 'taken' : 'available');
        } catch (err: any) {
           if (err instanceof z.ZodError) {
              setNicknameError(err.errors[0]?.message);
              setNicknameStatus(null);
           }
        }
      } else {
        setNicknameStatus(null);
        setNicknameError(null);
      }
    };

    const timerId = setTimeout(checkNickname, 500); // 防抖
    return () => clearTimeout(timerId);
  }, [nickname]);

  const handleRegister = async () => {
     // 清除之前错误
     setNicknameError(null);
     setLevelError(null);
     setGradeError(null);
     let isValid = true;

     // 前端验证
     try {
        nicknameSchema.parse(nickname);
        if(nicknameStatus !== 'available') {
            setNicknameError('请检查昵称');
            isValid = false;
        }
     } catch (err) {
        if (err instanceof z.ZodError) {
            setNicknameError(err.errors[0]?.message);
            isValid = false;
        }
     }

     if (!selectedLevel) {
        setLevelError('请选择英语水平');
        isValid = false;
     }

     if (selectedGrade === null) {
        setGradeError('请选择年级');
        isValid = false;
     }

     if (!isValid) return;

     const userData = {
        tempUserId,
        nickname,
        role: 'student' as const,
        englishLevel: selectedLevel!,
        grade: selectedGrade!,
     };

     try {
        // 使用 Redux Thunk
        const resultAction = await dispatch(registerUserInfoStudentAsync(userData) as any);
        if (registerUserInfoStudentAsync.fulfilled.match(resultAction)) {
            Alert.alert('成功', '注册完成，欢迎加入！');
            // 导航到主应用 (例如首页)
            // navigation.reset 或 navigate 到主应用的初始路由
        } else if (registerUserInfoStudentAsync.rejected.match(resultAction)) {
            // 错误信息已在 Redux store 中处理，可以通过 useSelector 获取
            // 这里也可以直接使用 payload
            const errorMessage = resultAction.payload as string;
            Alert.alert('注册失败', errorMessage);
        }
     } catch (err: any) {
        Alert.alert('错误', err.message || '注册过程中发生错误');
     }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>用户信息配置</Text>
      <Text style={styles.subtitle}>学生角色</Text>

      <Input
        label="昵称"
        placeholder="请输入昵称"
        value={nickname}
        onChangeText={setNickname}
        error={nicknameError}
        // isValid={nicknameStatus === 'available'} // 可以用isValid属性，但error更直接
      />
      {nicknameStatus === 'checking' && <Text style={styles.statusText}>检查中...</Text>}
      {nicknameStatus === 'available' && <Text style={styles.availableText}>昵称可用</Text>}
      {nicknameStatus === 'taken' && <Text style={styles.takenText}>昵称已占用</Text>}

      <Text style={styles.label}>英语水平</Text>
      <View style={styles.optionsContainer}>
        {ENGLISH_LEVELS.map((level) => (
          <Button
            key={level.key}
            title={level.label}
            onPress={() => {
              setSelectedLevel(level.key);
              setLevelError(null); // 清除错误
            }}
            variant={selectedLevel === level.key ? 'primary' : 'secondary'}
            style={styles.optionButton}
          />
        ))}
      </View>
      {levelError && <Text style={styles.errorText}>{levelError}</Text>}

      <Text style={styles.label}>小学年级</Text>
      <View style={styles.optionsContainer}>
        {GRADES.map((grade) => (
          <Button
            key={grade.key}
            title={grade.label}
            onPress={() => {
              setSelectedGrade(grade.key);
              setGradeError(null); // 清除错误
            }}
            variant={selectedGrade === grade.key ? 'primary' : 'secondary'}
            style={styles.optionButton}
          />
        ))}
      </View>
      {gradeError && <Text style={styles.errorText}>{gradeError}</Text>}

      {/* 显示全局错误 (来自 Redux) */}
      {error && <Text style={styles.errorText}>{error}</Text>}

      <Button
        title={isLoading ? "提交中..." : "完成"}
        onPress={handleRegister}
        disabled={isLoading}
        loading={isLoading}
        style={styles.submitButton}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    marginBottom: 24,
    textAlign: 'center',
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    marginTop: 16,
  },
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  optionButton: {
    margin: 4,
  },
  statusText: {
    fontSize: 14,
    color: '#007AFF',
    marginTop: -8,
    marginBottom: 16,
  },
  availableText: {
    fontSize: 14,
    color: 'green',
    marginTop: -8,
    marginBottom: 16,
  },
  takenText: {
    fontSize: 14,
    color: 'red',
    marginTop: -8,
    marginBottom: 16,
  },
  errorText: {
    color: 'red',
    fontSize: 14,
    marginTop: 4,
  },
  submitButton: {
    marginTop: 32,
  },
});
