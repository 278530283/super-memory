// src/types/api.ts
// 定义与后端 API 交互的请求和响应数据结构

// --- 认证相关 ---
export interface SendOtpRequest {
  phone: string;
}

export interface SendOtpResponse {
  success: boolean;
  message?: string;
}

export interface VerifyOtpRequest {
  phone: string;
  otp: string;
}

export interface VerifyOtpResponse {
  success: boolean;
  message?: string;
  tempUserId?: string;
  token?: string; // 如果验证即登录
  user?: User; // 如果验证即登录
}

export interface RegisterUserInfoStudentRequest {
  tempUserId: string;
  nickname: string;
  role: 'student';
  englishLevel: string; // 根据后端定义调整
  grade: number;
  // 可添加更多学生特定字段
}

export interface RegisterUserInfoParentRequest {
  tempUserId: string;
  nickname: string;
  role: 'parent';
  childPhone?: string; // 关联学生手机号
 辅导需求?: string; // 示例字段
  // 可添加更多家长特定字段
}

// 使用联合类型定义通用的注册信息请求
export type RegisterUserInfoRequest = RegisterUserInfoStudentRequest | RegisterUserInfoParentRequest;

export interface RegisterUserInfoResponse {
  success: boolean;
  message?: string;
  user?: User;
  token?: string;
}

// --- 学习相关 (示例) ---
export interface Word {
  id: string;
  spelling: string;
  pronunciationUrl?: string; // 音频文件URL
  imageUrl?: string; // 图片URL
  definition: string; // 中文释义
  exampleSentence?: string; // 例句
  level: number; // 0=L0, 1=L1, ...
  // ... 其他单词属性
}

export interface FetchWordsRequest {
  mode: number; // 学习模式
  // 可能还有其他参数，如日期、数量等
}

export interface FetchWordsResponse {
  success: boolean;
  message?: string;
  words: Word[];
  total: number; // 可选：总单词数
}

export interface EvaluatePronunciationRequest {
  wordId: string;
  // 音频数据，通常是文件上传或Base64编码的字符串
  // 这里假设是上传后的URL或临时标识符
  audioUrl: string; // 或者是 FormData 中的文件字段名
  // 可能还有其他上下文信息
}

export interface EvaluatePronunciationResponse {
  success: boolean;
  message?: string;
  score: number; // 总分
  segmentScores?: { // 分项评分
    clarity: number; // 清晰度
    stress: number; // 重音
    // ... 其他
  };
  feedback?: string; // 文字反馈
}

// --- 复习相关 (示例) ---
export interface ReviewWord {
  id: string;
  wordId: string;
  wordSpelling: string; // 为了列表显示方便，可能直接包含拼写
  wordLevel: number;
  imageUrl?: string; // 可选
  nextReviewTime: string; // ISO 8601 格式
  // ... 其他复习相关属性
}

export interface FetchReviewListResponse {
  success: boolean;
  message?: string;
  words: ReviewWord[];
}

// --- 统计相关 (示例) ---
export interface WordLevelDistribution {
  level: number; // 0-4
  count: number;
}

export interface FetchStatsResponse {
  success: boolean;
  message?: string;
  wordLevelDistribution: WordLevelDistribution[];
  // ... 其他统计数据
}

// --- OCR 相关 (示例) ---
export interface UploadOcrImageResponse {
  success: boolean;
  message?: string;
  extractedWords: string[]; // 提取的生词列表
  // 可能还有处理后的图片URL等
}

// --- 导入 User 类型 ---
import { User } from './user'; // 确保 user.ts 已定义 User 接口
