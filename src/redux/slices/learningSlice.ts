// src/redux/slices/learningSlice.ts
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Word, FetchWordsRequest, FetchWordsResponse, EvaluatePronunciationRequest, EvaluatePronunciationResponse } from '../../types/api';
import apiClient from '../../api'; // 假设已创建

// 定义 Slice State
interface LearningState {
  words: Word[];
  currentWordIndex: number;
  isLoading: boolean;
  error: string | null;
  evaluationResult: EvaluatePronunciationResponse | null;
  isEvaluating: boolean;
  evaluationError: string | null;
}

const initialState: LearningState = {
  words: [],
  currentWordIndex: 0,
  isLoading: false,
  error: null,
  evaluationResult: null,
  isEvaluating: false,
  evaluationError: null,
};

// 异步 Thunk: 获取单词列表
export const fetchWordsAsync = createAsyncThunk<
  Word[], // 返回类型
  FetchWordsRequest, // 参数类型
  { rejectValue: string } // rejectWithValue 类型
>('learning/fetchWords', async (params, { rejectWithValue }) => {
  try {
    // const response = await apiClient.get<FetchWordsResponse>('/learning/words', { params });
    // 模拟 API 响应
    const response = { data: { success: true, words: [], total: 0 } }; // 替换为实际 API 调用
    if (response.data.success) {
      return response.data.words;
    } else {
      return rejectWithValue(response.data.message || '获取单词失败');
    }
  } catch (err: any) {
    return rejectWithValue(err.response?.data?.message || err.message || '网络错误');
  }
});

// 异步 Thunk: 提交发音评估
export const submitEvaluationAsync = createAsyncThunk<
  EvaluatePronunciationResponse, // 返回类型
  EvaluatePronunciationRequest, // 参数类型 (可能需要调整，例如包含文件)
  { rejectValue: string } // rejectWithValue 类型
>('learning/submitEvaluation', async (data, { rejectWithValue }) => {
  try {
    // const response = await apiClient.post<EvaluatePronunciationResponse>('/learning/evaluate', data);
    // 模拟 API 响应
    const response = { data: { success: true, score: 85, segmentScores: { clarity: 90, stress: 80 } } }; // 替换
    if (response.data.success) {
      return response.data;
    } else {
      return rejectWithValue(response.data.message || '评估提交失败');
    }
  } catch (err: any) {
    return rejectWithValue(err.response?.data?.message || err.message || '评估网络错误');
  }
});

const learningSlice = createSlice({
  name: 'learning',
  initialState,
  reducers: {
    setCurrentWordIndex: (state, action: PayloadAction<number>) => {
      state.currentWordIndex = action.payload;
    },
    nextWord: (state) => {
      if (state.currentWordIndex < state.words.length - 1) {
        state.currentWordIndex += 1;
        state.evaluationResult = null; // 切换单词时清空上一个的评估结果
        state.evaluationError = null;
      }
    },
    previousWord: (state) => {
      if (state.currentWordIndex > 0) {
        state.currentWordIndex -= 1;
        state.evaluationResult = null; // 切换单词时清空上一个的评估结果
        state.evaluationError = null;
      }
    },
    clearEvaluationResult: (state) => {
      state.evaluationResult = null;
      state.evaluationError = null;
    },
    // 可以添加更多同步 reducers
  },
  extraReducers: (builder) => {
    builder
      // --- fetchWordsAsync ---
      .addCase(fetchWordsAsync.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchWordsAsync.fulfilled, (state, action) => {
        state.isLoading = false;
        state.words = action.payload;
        state.currentWordIndex = 0; // 重置索引
        state.evaluationResult = null; // 清空旧结果
      })
      .addCase(fetchWordsAsync.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || '获取单词列表失败';
      })
      // --- submitEvaluationAsync ---
      .addCase(submitEvaluationAsync.pending, (state) => {
        state.isEvaluating = true;
        state.evaluationError = null;
      })
      .addCase(submitEvaluationAsync.fulfilled, (state, action) => {
        state.isEvaluating = false;
        state.evaluationResult = action.payload;
      })
      .addCase(submitEvaluationAsync.rejected, (state, action) => {
        state.isEvaluating = false;
        state.evaluationError = action.payload || '发音评估失败';
      });
  },
});

export const { setCurrentWordIndex, nextWord, previousWord, clearEvaluationResult } = learningSlice.actions;
export default learningSlice.reducer;
