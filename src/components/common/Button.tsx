// src/components/common/Button.tsx
import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle, TextStyle, TouchableOpacityProps } from 'react-native';
import { useColorScheme } from 'react-native';

interface ButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: 'primary' | 'secondary' | 'outline'; // 按钮样式变体
  loading?: boolean;
  textStyle?: TextStyle;
  style?: ViewStyle;
}

/**
 * 通用按钮组件
 */
export function Button({
  title,
  variant = 'primary',
  loading = false,
  disabled = false,
  textStyle,
  style,
  ...touchableOpacityProps
}: ButtonProps) {
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';

  const buttonStyles = [
    styles.base,
    styles[variant],
    isDarkMode && styles[`${variant}Dark`],
    disabled && styles.disabled,
    style,
  ];

  const textStyles = [
    styles.textBase,
    styles[`${variant}Text`],
    isDarkMode && styles[`${variant}TextDark`],
    disabled && styles.disabledText,
    textStyle,
  ];

  return (
    <TouchableOpacity
      style={buttonStyles}
      disabled={disabled || loading}
      activeOpacity={0.7}
      {...touchableOpacityProps}
    >
      {loading ? (
        <ActivityIndicator size="small" color={variant === 'primary' ? 'white' : '#007AFF'} />
      ) : (
        <Text style={textStyles}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: {
    backgroundColor: '#007AFF',
  },
  primaryDark: {
    backgroundColor: '#0A84FF', // 稍微亮一点的蓝色用于深色模式
  },
  secondary: {
    backgroundColor: '#E5E5EA', // 浅灰色
  },
  secondaryDark: {
    backgroundColor: '#2C2C2E', // 深灰色
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  outlineDark: {
    borderColor: '#0A84FF',
  },
  disabled: {
    opacity: 0.5,
  },
  textBase: {
    fontSize: 16,
    fontWeight: '600',
  },
  primaryText: {
    color: 'white',
  },
  primaryTextDark: {
    color: 'white',
  },
  secondaryText: {
    color: '#000',
  },
  secondaryTextDark: {
    color: '#fff',
  },
  outlineText: {
    color: '#007AFF',
  },
  outlineTextDark: {
    color: '#0A84FF',
  },
  disabledText: {
    color: '#8E8E93',
  },
});
