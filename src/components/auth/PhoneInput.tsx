// src/components/auth/PhoneInput.tsx
import React, { forwardRef } from 'react';
import { TextInput, TextInputProps } from 'react-native';
import { Input } from '../common/Input'; // 使用通用Input组件

interface PhoneInputProps extends Omit<TextInputProps, 'onChangeText'> {
  value: string;
  onChangeText: (text: string) => void;
  error?: string;
  isValid?: boolean;
}

export const PhoneInput = forwardRef<TextInput, PhoneInputProps>(({ value, onChangeText, error, isValid, ...props }, ref) => {
  // 格式化手机号显示 (示例: 138 **** 5678)
  const formatPhoneNumber = (number: string): string => {
    const cleaned = number.replace(/\D/g, '');
    if (cleaned.length >= 7) {
      return `${cleaned.slice(0, 3)} **** ${cleaned.slice(7, 11)}`;
    } else if (cleaned.length >= 3) {
      return `${cleaned.slice(0, 3)} ${cleaned.slice(3)}`;
    }
    return cleaned;
  };

  // 处理输入，只保留数字
  const handleChangeText = (text: string) => {
    const cleaned = text.replace(/\D/g, '');
    // 限制长度为11位
    if (cleaned.length <= 11) {
      onChangeText(cleaned);
    }
  };

  return (
    <Input
      ref={ref}
      label="手机号"
      placeholder="请输入手机号"
      value={formatPhoneNumber(value)} // 显示格式化后的号码
      onChangeText={handleChangeText} // 内部处理为纯数字
      keyboardType="phone-pad"
      maxLength={13} // 考虑格式化后的空格/星号
      error={error}
      isValid={isValid}
      {...props} // 传递其他TextInputProps
    />
  );
});
