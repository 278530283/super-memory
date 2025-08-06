// src/redux/slices/authSlice.ts
import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { RegisterUserInfoResponse, registerUserInfoStudent, RegisterUserInfoStudentRequest, verifyOtp, VerifyOtpRequest, VerifyOtpResponse } from '../../api/auth';
import { User } from '../../types/user';
import { removeStoredToken, storeToken } from '../../utils/storage'; // 假设已实现

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  // 注册流程特定状态
  tempUserId: string | null; // 存储第一步验证后得到的临时ID
}

const initialState: AuthState = {
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  tempUserId: null,
};

// 异步 Thunk: 验证OTP
export const verifyOtpAsync = createAsyncThunk<
  { tempUserId?: string; token?: string; user?: User }, // 返回类型
  VerifyOtpRequest, // 参数类型
  { rejectValue: string } // rejectWithValue 类型
>('auth/verifyOtp', async (data, { rejectWithValue }) => {
  try {
    const response: VerifyOtpResponse = await verifyOtp(data);
    if (response.success) {
      // 如果后端验证即登录，处理token和user
      if (response.token) {
        await storeToken(response.token); // 存储到 SecureStore
      }
      return {
        tempUserId: response.tempUserId,
        token: response.token,
        user: response.user // 如果有
      };
    } else {
      return rejectWithValue(response.message || '验证失败');
    }
  } catch (err: any) {
    return rejectWithValue(err.response?.data?.message || err.message || '网络错误');
  }
});

// 异步 Thunk: 注册用户信息 (学生)
export const registerUserInfoStudentAsync = createAsyncThunk<
  { user: User; token: string }, // 返回类型
  RegisterUserInfoStudentRequest, // 参数类型
  { rejectValue: string } // rejectWithValue 类型
>('auth/registerUserInfoStudent', async (data, { rejectWithValue }) => {
  try {
    const response: RegisterUserInfoResponse = await registerUserInfoStudent(data);
    if (response.success && response.token && response.user) {
      await storeToken(response.token); // 存储到 SecureStore
      return { user: response.user, token: response.token };
    } else {
      return rejectWithValue(response.message || '注册信息提交失败');
    }
  } catch (err: any) {
    return rejectWithValue(err.response?.data?.message || err.message || '网络错误');
  }
});


const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.tempUserId = null;
      removeStoredToken(); // 从 SecureStore 移除
    },
    clearError: (state) => {
      state.error = null;
    },
    // 可以添加其他同步reducer，如设置tempUserId（如果需要手动设置）
    setTempUserId: (state, action: PayloadAction<string>) => {
       state.tempUserId = action.payload;
    }
  },
  extraReducers: (builder) => {
    builder
      // --- verifyOtpAsync ---
      .addCase(verifyOtpAsync.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(verifyOtpAsync.fulfilled, (state, action) => {
        state.isLoading = false;
        // 根据后端响应决定是设置tempUserId还是直接登录
        if (action.payload.token && action.payload.user) {
            // 直接登录成功
            state.token = action.payload.token;
            state.user = action.payload.user;
            state.isAuthenticated = true;
            state.tempUserId = null; // 清除临时ID
        } else if (action.payload.tempUserId) {
            // 需要继续第二步
            state.tempUserId = action.payload.tempUserId;
        }
        // 如果只有tempUserId，isAuthenticated保持false
      })
      .addCase(verifyOtpAsync.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || '验证失败';
      })
      // --- registerUserInfoStudentAsync ---
      .addCase(registerUserInfoStudentAsync.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(registerUserInfoStudentAsync.fulfilled, (state, action) => {
        state.isLoading = false;
        state.token = action.payload.token;
        state.user = action.payload.user;
        state.isAuthenticated = true;
        state.tempUserId = null; // 清除临时ID
      })
      .addCase(registerUserInfoStudentAsync.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || '注册失败';
      });
  },
});

export const { logout, clearError, setTempUserId } = authSlice.actions;
export default authSlice.reducer;
