// src/utils/storage.ts
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = 'userToken';
const USER_PREFERENCES_KEY = 'userPreferences';

/**
 * 安全地存储用户 Token
 * @param token JWT Token
 */
export async function storeToken(token: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  } catch (error) {
    console.error('Failed to store token:', error);
    // 可以在这里集成 Sentry 等错误日志服务
    throw new Error('存储 Token 失败');
  }
}

/**
 * 获取存储的用户 Token
 * @returns Token 字符串或 null
 */
export async function getStoredToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch (error) {
    console.error('Failed to get stored token:', error);
    return null;
  }
}

/**
 * 移除存储的用户 Token
 */
export async function removeStoredToken(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  } catch (error) {
    console.error('Failed to remove stored token:', error);
  }
}

/**
 * 存储用户偏好设置 (非敏感)
 * @param preferences 用户偏好对象
 */
export async function storeUserPreferences(preferences: object): Promise<void> {
  try {
    const jsonValue = JSON.stringify(preferences);
    await AsyncStorage.setItem(USER_PREFERENCES_KEY, jsonValue);
  } catch (error) {
    console.error('Failed to store user preferences:', error);
    throw new Error('存储用户偏好失败');
  }
}

/**
 * 获取存储的用户偏好设置
 * @returns 用户偏好对象或 null
 */
export async function getStoredUserPreferences(): Promise<object | null> {
  try {
    const jsonValue = await AsyncStorage.getItem(USER_PREFERENCES_KEY);
    return jsonValue != null ? JSON.parse(jsonValue) : null;
  } catch (error) {
    console.error('Failed to get stored user preferences:', error);
    return null;
  }
}

/**
 * 移除存储的用户偏好设置
 */
export async function removeStoredUserPreferences(): Promise<void> {
  try {
    await AsyncStorage.removeItem(USER_PREFERENCES_KEY);
  } catch (error) {
    console.error('Failed to remove stored user preferences:', error);
  }
}
