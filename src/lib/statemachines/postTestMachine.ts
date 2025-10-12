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
    // 默认流程
    isFlow1: () => true,
    
    // 2. 第3次以上复习
    isFlow3: ({ context }) => 
      context.historyLevels.length >= 4 && context.historyLevels[context.historyLevels.length - 1] !== 0,
    
    // 默认分支（第1次复习）
    isFlow2: ({ context }) =>
      context.historyLevels.length >= 2 && context.historyLevels[context.historyLevels.length - 1] !== 0,
    
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
  /** @xstate-layout N4IgpgJg5mDOIC5QAcD2sAuBaAhrWcsAtmAHYYB0EYGYATkQJalgAKOGAFgMQDKAKgEEASvwDaABgC6iFOkYZGqUrJAAPRAEYAnADYKmzQCYALNoCsegOwTdRgBxWANCACeWkwGYK9z38862iZWxp7mAL7hLmiYuPiEJORUNPRMLOxcfEKiYpoySCAxCkoqBRoIOvqGphbWtg7OboieRpoU5r5+hp4mmjaekdHo2HgE+ImU1LQMzGwcPAIi4kb5crDFyqrllQbGZpa6NnaOLu4IRhJGFP5dJq0SfboRUYXDcWPEZJQAZgA2qAB3TQAfQwdBwpFgAFFSNxBAA5XgAdShwkkq1e60UmzKiEsV0cZm0ngk5is2laulOWgsFG0ml0jJM9iJjKsukGmJG8XGXwof0BILBEOhsIRyNRuQxRWxpVA5XxPisRJJZIpDOpCCe5goRkZjM0YR0OiMnJi3I+E35-yBwOQdGUAFdSABjMBwxEotHSVQykpbLQSYIURlGcwSPzsxnmIyarw68wMpmXck6Exmt6jBJ8gW2+1O13u8VeqW++SygMVINWEN2cOR-UxzX2NpGbTtjtGEmaWwcl7m97ZpK5ozA36MTBkD0S73S8v+3EIRWE9uq8mUzUBHVJpnmXQBNMZ2JZ3nDm2j8eTsWeyV5MtYhfyvEUpUq0nrjVNBAt+w+DvEvoY10XwjwtIcfnPUFwUhGFpxLH0Cj9HEnyrYNQ3rTwoyeWMv3MHo6R3TR7EcQxiVAwdTwgwFR2FGDrxnUtEPnZD1EDNC6wjTDGxws57DDa4k0sZV92NciT0+M9AU8KCRVg4tJQQtYNjlVilxfFdiXfdUqS-Q0a16Rs7k8A1gjEnkJKogFpNo0U4NvOcHxYhV1OVVctI3L8zDafc-DbGN7DJS4zMtHMbWky9aHo+CHOUyse3YsNOKwptdPsCQQ3-KwrD4+4Y2C8DrSkscJ0iuy0TvJjHJU7Zq1rRKG2jHitBJOl-2IoCez7IZj3Mq1c2k-NSGdN0yvRe9YsXeKa3QpLuLjALdR3PyrETMj+0zXrQqKwbhqLG9ypiitJtqmaGuwzUsp1XQdwkFtDhNSIXlIVBqHgSqwMo8ajpQrAdLOX6KAkIHgZB4HNHTdaepCpIplSWYMk4L7H1Uu5NQuK4vH8QwrD1XQzC6rkKIswrbRsmEkacxA7hMa4VxsCR+m0RoznRihMa6Ppcfx-LKJJkEdsLCnqsQRwdQeRLwf8UlzE1HYHn1ExdHl8Hbp54mR2Kq8hcrLwrj6W6HBZFoLk8TdWhDToSXalt2TVvrILJlSkOF78+IobKVtJYyGVMTRmyI1rOwpXR6XMZ5uo+9WwpkujtcXanadc+nGeZjxvGJLHhLCaw7a2qzNciuOUPsF8u09zx7Dx4JDVlzD2h3RMVqt+xc8k-OBbdIvVNFwHjHDSW-GluN6Xd-w2wcS5ANbygABkJC77Y-G0HwwcAi4zE1aMQxuvQgj3TRp4oGfNAX5rPGXtKgexmMg20Zsazu-UwxbPUzEPmejFPiol5Xq+19vuMJgdSV31MZIBQC7AQwjkTK0M9PBf0NOfX+Dx-4b1SjWSkTJsYtB8o9cIQA */
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
          { target: 'flow3_transEn', guard: 'isFlow3' },
          { target: 'flow2_listen', guard: 'isFlow2' }, 
          { target: 'flow1_transEn', guard: 'isFlow1' },// 默认流程
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
    
    // 流程2: 第1次复习 - 听单词测试
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
    
    // 新增流程3: 第3次以上复习 - 中译英测试
    flow3_transEn: {
      on: {
        ANSWER: [
          { 
            target: 'flow3_listen', 
            guard: 'answerCorrect' 
          },
          { 
            target: 'flow3_pronunce', 
            guard: 'answerWrong' 
          },
        ],
      },
    },
    
    // 流程3: 听单词测试
    flow3_listen: {
      on: {
        ANSWER: [
          { 
            target: 'L3', 
            guard: 'answerCorrect' 
          },
          { 
            target: 'L1', 
            guard: 'answerWrong' 
          },
        ],
      },
    },
    
    // 流程3: 读单词测试
    flow3_pronunce: {
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