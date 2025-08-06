// src/components/common/Input.tsx
import React, { useState } from 'react';
import { View, TextInput, Text, StyleSheet, TextInputProps } from 'react-native';
import { useColorScheme } from 'react-native';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string; // 错误信息
  isValid?: boolean; // 显式设置有效状态 (可选，优先级高于error)
}

export function Input({ label, error, isValid, style, ...textInputProps }: InputProps) {
  const colorScheme = useColorScheme();
  const [isFocused, setIsFocused] = useState(false);

  // 确定边框颜色
  let borderColor = '#ccc'; // 默认
  if (error) {
    borderColor = 'red';
  } else if (isValid === false) { // 显式无效
    borderColor = 'red';
  } else if (isValid === true) { // 显式有效
    borderColor = 'green';
  } else if (isFocused) {
    borderColor = '#007AFF'; // 蓝色焦点
  }

  return (
    <View style={styles.container}>
      {label && <Text style={[styles.label, colorScheme === 'dark' && styles.labelDark]}>{label}</Text>}
      <TextInput
        {...textInputProps}
        style={[
          styles.input,
          { borderColor },
          colorScheme === 'dark' && styles.inputDark,
          style,
        ]}
        onFocus={(e) => { setIsFocused(true); textInputProps.onFocus?.(e); }}
        onBlur={(e) => { setIsFocused(false); textInputProps.onBlur?.(e); }}
      />
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    marginBottom: 4,
    fontSize: 16,
    color: '#333',
  },
  labelDark: {
    color: '#ddd',
  },
  input: {
    height: 40,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 10,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  inputDark: {
    backgroundColor: '#2c2c2c',
    color: '#fff',
    borderColor: '#555',
  },
  errorText: {
    color: 'red',
    fontSize: 14,
    marginTop: 4,
  },
});
