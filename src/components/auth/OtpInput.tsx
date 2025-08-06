// src/components/auth/OtpInput.tsx
import React, { useRef, useEffect } from 'react';
import { View, TextInput, StyleSheet, Text } from 'react-native';
import { Input } from '../common/Input';

interface OtpInputProps {
  value: string;
  onChangeText: (text: string) => void;
  error?: string;
  isValid?: boolean;
  onFilled?: () => void; // 当6位输入完成时回调
}

export function OtpInput({ value, onChangeText, error, isValid, onFilled }: OtpInputProps) {
  const inputRefs = useRef<Array<TextInput | null>>([]);

  useEffect(() => {
    // 当value变化且长度为6时，调用onFilled
    if (value.length === 6) {
      onFilled?.();
    }
  }, [value, onFilled]);

  const handleChangeText = (text: string, index: number) => {
    const newOtp = value.split('');
    newOtp[index] = text;
    const newValue = newOtp.join('');
    onChangeText(newValue);

    // 自动聚焦到下一个输入框
    if (text && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    // 处理退格键
    if (e.nativeEvent.key === 'Backspace' && !value[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>验证码</Text>
      <View style={styles.otpContainer}>
        {Array.from({ length: 6 }).map((_, index) => (
          <TextInput
            key={index}
            ref={(ref) => (inputRefs.current[index] = ref)}
            style={[
              styles.otpInput,
              error ? styles.otpInputError : null,
              isValid === true ? styles.otpInputValid : null,
            ]}
            maxLength={1}
            keyboardType="number-pad"
            onChangeText={(text) => handleChangeText(text, index)}
            onKeyPress={(e) => handleKeyPress(e, index)}
            value={value[index] || ''}
            autoFocus={index === 0}
          />
        ))}
      </View>
      {/* 复用通用Input的错误显示逻辑 */}
      {error && <Text style={{ color: 'red', marginTop: 4 }}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    marginBottom: 8,
    fontSize: 16,
    color: '#333',
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  otpInput: {
    width: 40,
    height: 50,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    textAlign: 'center',
    fontSize: 20,
    backgroundColor: '#fff',
  },
  otpInputError: {
    borderColor: 'red',
  },
  otpInputValid: {
    borderColor: 'green',
  },
});
