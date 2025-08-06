// src/utils/validation.ts
import { z } from 'zod';

// 手机号验证 (中国)
export const phoneSchema = z
  .string()
  .regex(/^1[3-9]\d{9}$/, { message: '请输入正确的手机号' });

// 验证码验证
export const otpSchema = z
  .string()
  .length(6, { message: '验证码为6位数字' })
  .regex(/^\d+$/, { message: '验证码必须是数字' });

// 昵称验证 (示例)
export const nicknameSchema = z
  .string()
  .min(2, { message: '昵称至少2个字符' })
  .max(20, { message: '昵称最多20个字符' });

// 组合注册第一步的 schema
export const registerPhoneSchema = z.object({
  phone: phoneSchema,
  otp: otpSchema,
});

// 组合注册第二步的 schema (学生角色示例)
export const registerUserInfoStudentSchema = z.object({
  nickname: nicknameSchema,
  englishLevel: z.string().min(1, { message: '请选择英语水平' }),
  grade: z.number().int().positive({ message: '请选择年级' }),
});
