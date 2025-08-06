// src/types/user.ts
// --- 用户角色 ---
export type UserRole = 'student' | 'parent';

// --- 英语水平 (根据实际需求调整) ---
export type EnglishLevel = 'beginner' | 'elementary' | 'intermediate' | 'advanced';

// --- 用户信息 ---
export interface User {
  id: string;
  phone: string;
  nickname: string;
  role: UserRole;
  englishLevel?: EnglishLevel; // 可选，注册时可能未设置
  grade?: number; // 学生年级
  childPhone?: string; // 家长关联的孩子手机号
  avatarUrl?: string; // 头像URL
  // ... 其他用户字段，如注册时间、最后登录时间等
  createdAt?: string; // ISO 8601
  lastLoginAt?: string; // ISO 8601
}

// --- 单词等级 (使用 Map 替代 Enum，符合 expo.md 要求) ---
// architecture.md 中的 Enum 示例已更新为 Map
export const WordLevelMap = {
  L0: 0,
  L1: 1,
  L2: 2,
  L3: 3,
  L4: 4,
} as const;

export type WordLevelKey = keyof typeof WordLevelMap;
export type WordLevelValue = typeof WordLevelMap[WordLevelKey];

// 反向映射，方便根据数字获取字符串键
export const WordLevelReverseMap: Record<WordLevelValue, WordLevelKey> = {
  0: 'L0',
  1: 'L1',
  2: 'L2',
  3: 'L3',
  4: 'L4',
};

// --- 学习模式 ---
export type LearningMode = 'easy' | 'normal' | 'hard';
export const LearningModeMap = {
  easy: '轻松',
  normal: '正常',
  hard: '努力',
} as const;
