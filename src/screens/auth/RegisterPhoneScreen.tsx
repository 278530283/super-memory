// src/screens/auth/RegisterPhoneScreen.tsx
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useRef, useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useDispatch } from 'react-redux';
import { z } from 'zod';
import { sendOtp } from '../../api/auth';
import { OtpInput } from '../../components/auth/OtpInput';
import { PhoneInput } from '../../components/auth/PhoneInput';
import { Button } from '../../components/common/Button';
import { verifyOtpAsync } from '../../redux/slices/authSlice';
import type { AuthStackParamList } from '../../types/navigation';
import { otpSchema, phoneSchema } from '../../utils/validation';

type RegisterPhoneScreenNavigationProp = NativeStackNavigationProp<
  AuthStackParamList,
  'RegisterPhone'
>;

export function RegisterPhoneScreen() {
  const dispatch = useDispatch();
  const navigation = useNavigation<RegisterPhoneScreenNavigationProp>();
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [countdown, setCountdown] = useState(0); // 验证码倒计时
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [otpError, setOtpError] = useState<string | null>(null);

  const countdownIntervalRef = useRef<number | null>(null);

  const startCountdown = () => {
    setCountdown(60);
    countdownIntervalRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          countdownIntervalRef.current && clearInterval(countdownIntervalRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleSendOtp = async () => {
    setPhoneError(null);
    try {
      phoneSchema.parse(phone); // 使用 Zod 验证
      setIsSendingOtp(true);
      await sendOtp({ phone });
      Alert.alert('提示', '验证码已发送');
      startCountdown();
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        setPhoneError(err.issues[0]?.message || '手机号格式错误');
      } else {
        setPhoneError(err.response?.data?.message || err.message || '发送失败');
      }
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleVerifyOtp = async () => {
    setOtpError(null);
    try {
      otpSchema.parse(otp); // 使用 Zod 验证
      setIsVerifying(true);
      // 使用 Redux Thunk
      const resultAction = await dispatch(verifyOtpAsync({ phone, otp }) as any); // TS 类型断言可能需要调整
      if (verifyOtpAsync.fulfilled.match(resultAction)) {
        // 检查是进入下一步还是直接登录
        if (resultAction.payload.token && resultAction.payload.user) {
             // 直接登录成功，可以导航到主应用或首页
             Alert.alert('成功', '注册/登录成功');
             // navigation.reset(...) 或其他导航到主应用的逻辑
        } else if (resultAction.payload.tempUserId) {
            // 需要填写用户信息
            navigation.navigate('RegisterUserInfo', {
              tempUserId: resultAction.payload.tempUserId,
              phone, // 传递手机号给下一步
            });
        }
      } else if (verifyOtpAsync.rejected.match(resultAction)) {
        setOtpError(resultAction.payload as string); // payload 是 rejectWithValue 的值
      }
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        setOtpError(err.issues[0]?.message || '验证码格式错误');
      } else {
        setOtpError(err.response?.data?.message || err.message || '验证失败');
      }
    } finally {
      setIsVerifying(false);
    }
  };

  // 清理定时器
  React.useEffect(() => {
    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>手机号注册</Text>
      <PhoneInput
        value={phone}
        onChangeText={setPhone}
        error={phoneError}
        isValid={phone.length === 11 && !phoneError} // 简单的有效性指示
      />
      <TouchableOpacity
        style={[styles.sendOtpButton, (isSendingOtp || countdown > 0) && styles.sendOtpButtonDisabled]}
        onPress={handleSendOtp}
        disabled={isSendingOtp || countdown > 0}
      >
        <Text style={styles.sendOtpButtonText}>
          {isSendingOtp ? '发送中...' : countdown > 0 ? `重新发送 (${countdown}s)` : '发送验证码'}
        </Text>
      </TouchableOpacity>

      <OtpInput
        value={otp}
        onChangeText={setOtp}
        error={otpError}
        isValid={otp.length === 6 && !otpError} // 简单的有效性指示
        onFilled={handleVerifyOtp} // 输入满6位自动触发验证
      />

      <Button
        title={isVerifying ? "验证中..." : "下一步"}
        onPress={handleVerifyOtp}
        disabled={isVerifying || otp.length !== 6}
        loading={isVerifying}
      />

      <TouchableOpacity onPress={() => navigation.navigate('Login')}>
        <Text style={styles.loginText}>已有账号？登录</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 24,
    textAlign: 'center',
  },
  sendOtpButton: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  sendOtpButtonDisabled: {
    backgroundColor: '#ccc',
  },
  sendOtpButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loginText: {
    marginTop: 20,
    color: '#007AFF',
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
});
