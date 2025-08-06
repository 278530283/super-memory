// src/api/auth.ts
import apiClient from './index';
import { phoneSchema, otpSchema, registerUserInfoStudentSchema } from '../utils/validation';
import { User, UserRole, EnglishLevel } from '../types/user';
import { z } from 'zod';

// 1. 发送验证码
export interface SendOtpRequest {
  phone: string;
}
export interface SendOtpResponse {
  success: boolean;
  message?: string;
  // 可能返回临时用户ID或用于后续验证的信息
}

export const sendOtp = async (data: SendOtpRequest): Promise<SendOtpResponse> => {
  // 前端初步验证
  phoneSchema.parse(data.phone);
  const response = await apiClient.post<SendOtpResponse>('/auth/send-otp', data);
  return response.data;
};

// 2. 验证手机号和验证码 (注册第一步)
export interface VerifyOtpRequest {
  phone: string;
  otp: string;
}
export interface VerifyOtpResponse {
  success: boolean;
  message?: string;
  tempUserId?: string; // 后端返回的临时用户ID，用于下一步
  token?: string; // 如果验证即登录，可能返回token
}

export const verifyOtp = async (data: VerifyOtpRequest): Promise<VerifyOtpResponse> => {
  // 前端初步验证
  const validatedData = registerPhoneSchema.parse(data);
  const response = await apiClient.post<VerifyOtpResponse>('/auth/verify-otp', validatedData);
  return response.data;
};

// 3. 提交用户信息 (注册第二步 - 学生角色示例)
export interface RegisterUserInfoStudentRequest {
  tempUserId: string;
  nickname: string;
  role: 'student';
  englishLevel: string; // EnglishLevel;
  grade: number;
  // 家长角色可能有不同字段
}
export interface RegisterUserInfoResponse {
  success: boolean;
  message?: string;
  user?: User; // 注册成功后返回完整用户信息
  token?: string; // JWT Token
}

export const registerUserInfoStudent = async (
  data: RegisterUserInfoStudentRequest
): Promise<RegisterUserInfoResponse> => {
  // 前端初步验证
  registerUserInfoStudentSchema.parse(data);
  const response = await apiClient.post<RegisterUserInfoResponse>(
    '/auth/register-user-info',
    data
  );
  return response.data;
};
