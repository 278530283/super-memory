// src/lib/statemachines/postTestMachine.ts
import { setup } from 'xstate';

// 定义上下文类型
interface AssessmentContext {
  historyLevels: number[]; // 历史等级列表
  level?: number; // 用于存储最终评估等级 (0, 1, 2, 3)
}

// 定义事件类型
type AssessmentEvent =
  | { type: 'START' }
  | { type: 'ANSWER'; answer: 'success' | 'fail' };

// 使用 setup 创建强类型机器
export const postTestMachine = setup({
  types: {
    context: {} as AssessmentContext,
    events: {} as AssessmentEvent,
    input: {} as AssessmentContext,
  },
  guards: {
    // --- 分支判断 guards ---
    // 1. 初次测评 或 前次测评为L0级别
    isFlow1: ({ context }) => 
      context.historyLevels.length === 0 || 
      context.historyLevels[context.historyLevels.length - 1] === 0,
    
    // 2. 复习过3次以上（不含）复习入口
    isFlow2: ({ context }) => 
      context.historyLevels.length > 3,
    
    // 默认分支
    isFlowDefault: () => true,
    // --- 用户回答判断 guards ---
    answerCorrect: ({ event }) => {
      return event.type === 'ANSWER' && event.answer === 'success';
    },
    answerWrong: ({ event }) => {
      return event.type === 'ANSWER' && event.answer === 'fail';
    },
  },
  actions: {
    // 设置等级的动作
    setLevel: ({ context }, params: { level: number }) => ({
      ...context,
      level: params.level,
    }),
  },
}).createMachine({
  id: 'post-assessment',
  initial: 'determinePath',
  context: ({ input }) => ({
    historyLevels: input?.historyLevels || [],
    level: undefined,
  }),
  states: {
    // 第一步：根据历史记录决定走哪个流程
    determinePath: {
      on: {
        START: [
          { target: 'flow1_transEn', guard: 'isFlow1' },
          { target: 'flow2_listen', guard: 'isFlow2' },
          { target: 'flowDefault', guard: 'isFlowDefault' },
        ],
      },
    },
    
    // 流程1: 初次测评 或 前次测评为L0级别 - 英语中测试
    flow1_transEn: {
      on: {
        ANSWER: [
          { 
            target: 'flow1_pronunce', 
            guard: 'answerCorrect' 
          },
          { 
            target: 'L0', 
            guard: 'answerWrong' 
          },
        ],
      },
    },
    
    // 流程1: 读单词测试
    flow1_pronunce: {
      on: {
        ANSWER: [
          { 
            target: 'L2', 
            guard: 'answerCorrect' 
          },
          { 
            target: 'L1', 
            guard: 'answerWrong' 
          },
        ],
      },
    },
    
    // 流程2: 复习过3次以上 - 听单词测试
    flow2_listen: {
      on: {
        ANSWER: [
          { 
            target: 'L3', 
            guard: 'answerCorrect' 
          },
          { 
            target: 'flow2_transEn', 
            guard: 'answerWrong' 
          },
        ],
      },
    },
    
    // 流程2: 英语中测试
    flow2_transEn: {
      on: {
        ANSWER: [
          { 
            target: 'L2', 
            guard: 'answerCorrect' 
          },
          { 
            target: 'L0', 
            guard: 'answerWrong' 
          },
        ],
      },
    },
    
    // 默认流程（可根据需要定义）
    flowDefault: {
      on: {
        ANSWER: [
          { 
            target: 'L2', 
            guard: 'answerCorrect' 
          },
          { 
            target: 'L1', 
            guard: 'answerWrong' 
          },
        ],
      },
    },
    
    // 最终等级状态
    L0: {
      type: 'final',
      data: { level: 0 },
    },
    L1: {
      type: 'final',
      data: { level: 1 },
    },
    L2: {
      type: 'final',
      data: { level: 2 },
    },
    L3: {
      type: 'final',
      data: { level: 3 },
    },
  },
});