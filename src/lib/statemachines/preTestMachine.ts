// src/lib/statemachines/preTestMachine.ts
import { setup } from 'xstate';

// 定义上下文类型，将 level 和 historyLevels 的元素类型从 string 改为 number
interface AssessmentContext {
  historyLevels: number[]; // 历史等级列表，如 [1, 2, 2]
  enableSpelling: boolean; // 是否启用拼写
  level?: number; // 用于存储最终评估等级 (0, 1, 2, 3, 4)
}

// 定义事件类型 (保持不变)
type AssessmentEvent =
  | { type: 'START' }
  | { type: 'ANSWER'; answer: 'success' | 'fail' };

// 使用 setup 创建强类型机器
export const preTestMachine = setup({
  types: {
    context: {} as AssessmentContext,
    events: {} as AssessmentEvent,
    input: {} as AssessmentContext,
  },
  guards: {
    // --- 分支判断 guards ---
    // 1. 首次评测：历史列表为空
    isFlow1: ({ context }) => context.historyLevels.length === 0,
    // 2. 非首次评测：只有一个等级，且是 3 (原 L3)
    isFlow2: ({ context }) =>
      context.historyLevels.length === 1 &&
      context.historyLevels[0] === 3,
    // 3. 非首次评测：最近3次评测 >= 2 (原 L2), 或最近一次为 3 (原 L3)
    isFlow3: ({ context }) => {
      const { historyLevels } = context;
      // 最近一次为 3 (原 L3)
      if (historyLevels[historyLevels.length - 1] === 3) return true;
      if (historyLevels.length < 3) return false;
      const lastThree = historyLevels.slice(-3);
      // 最近三次都在 2 (原 L2) 及以上
      return lastThree.every(level => [2, 3, 4].includes(level)); // 2=L2, 3=L3, 4=L4
    },
    // 4. 非首次评测：只评测一次且是 1 (原 L1)，首次是 0 (原 L0) 且最近2次 >= 2 (原 L2)
    isFlow4: ({ context }) => {
      const { historyLevels } = context;
      // 只评测一次且是 1 (原 L1)
      const first = historyLevels[0];
      if (historyLevels.length === 1 && first === 1) return true; // 1=L1
      if (historyLevels.length < 2) return false;
      const lastTwo = historyLevels.slice(-2);
      // 首次是 0 (原 L0) 且最近2次 >= 2 (原 L2)
      return (
        0 === first && // 0=L0
        lastTwo.every(level => [2, 3, 4].includes(level)) // 2=L2, 3=L3, 4=L4
      );
    },
    // 5. 其他情况
    isFlow5: () => true, // 默认分支，总是为 true
    // --- 用户回答判断 guards ---
    answerCorrect: ({ event }) => {
      return event.type === 'ANSWER' && event.answer === 'success';
    },
    answerWrong: ({ event }) => {
      return event.type === 'ANSWER' && event.answer === 'fail';
    },
    // 新增：检查是否启用拼写测试
    spellingEnabled: ({ context }) => context.enableSpelling,
  },
  actions: {
    // 定义一个动作，用于在进入最终状态时设置上下文中的 level
    // 参数 level 也改为 number 类型
    setLevel: ({ context }, params: { level: number }) => {
      // 注意：在 entry 动作中，context 是进入状态前的值
      // 如果需要，可以在这里进行更复杂的逻辑处理
      // 但通常我们只是设置一个静态值
      // 这里我们直接返回新的 context
      return {
        ...context,
        level: params.level,
      };
    },
  },
}).createMachine({
  /** @xstate-layout N4IgpgJg5mDOIC5QEsB2AXMUBOBDTEAtLrLHLALZgYB0EYm2FaYACvgBYDEAygCoBBAEp8A2gAYAuolAAHAPaxk6ZPNQyQAD0QAmHQDYaARiM6ArOPEBmK6bNGAHGYA0IAJ6IzV8TXFH9AQDsACziZnrBVgC+Ua5omDj4kMSk5FS09IzMqGycvIIiokbSSCAKSipqGtoIeoYm5pY2do4u7ojNNDr+QdY6gWb2wTFxGFh4BClkpOnodAxgTCzs6Nz8wmI6JXKKyqrqpTV1xnZNtuatrh4IZg4ONPYB+gNNRgMjIPHjSUQk05TUOaZRbZXKrfIbURWbZlXaVA6gI4GE6NaznexOK6IIzBQxeGyBKzdBz9RzRWKfMaJSZ-NKA+ZZZZ5daFYIw8p7KqHXTIhoWNEtTHtBB3Xw2cXBCxE-QATg+X2pyVpM3pADNkNhYOg+MgqFwBAA5HgAdQAokIJOy4ftqohAvbfC8-F4jIMQliEPpbDQHJY-TKjOIAzLhhSFRMlakVbR1ZrtbqwPqjWaLcUNBz4baEPbAo7+a7bG7gh7wlYaPo-ZZAnpAuIHIF5VSI78owDaGoADZuAAyViTJvNlvT1q5iLtDvEToLrrM7uFROCPsr1gsOisMv0jYSzamdPbqC7vf7KaKVoqNu52YnU5dRY9wUJNBly-0OhlZgDZi33xprdmNGwMAAGNAT4AB3eRux0AB5bAAAlkCgDhFmPQcpGHc9Ry0cdc0nfNb1nYthX0BwjAeStA3EUIrGeb9FRbf5-0AkCMHAyCYPgxDkOwVDUzPTkEWwq9cJvQtCJLEljGXUjAl9HQ6J3ZU2zmWMtW7cRYO7IwhGAwEoN4odSgzC8x2EvNLGnO9hRxHwTACGVmhxatQ1Gbcfl3aMVI1NSNOwLSdJY9B9MNAc+IwgSsxzcznTEudrmCHRFx0ZcvH0B8EoU9ylP-eRVkWABhEg4AM9CjJHQSaiivCLIIuLEFI8seiCZ5SKMIlMt-Rj6Vy7jCumAy0zKzCKpw6LLPE+cQnIytgkiKwzFlDrIy62hMC1HhZDADsOzQKASv4zNL1MYJ7j0flzA-BKQw9NKzBoXEnkCCsZR0BwaKWhi9zmNb0A2radtQPaQpPQadmGrNjtO1ELpDN8iOuZLF0lStvBo313w+jzlJoH7WGwNQAFdUCA5B8H2fbwsO0zIa6aHBlh67rMie7+UsZLElMFxMey+lcfx1AiZJsm1AGg6TSsVj0y9V3s9d7PQDyvJ8vyAqCkLwp-SLorihKkqTFK0oyrKcrygqiq6EqyvKyrqqq2r6qapqWrajqur0Hq+oG4bRvGybptm+bFuW5bVvWza9F2g7Dum06Zouq6bog+77se57Xvej6vtQb7fv+gHAd+oGQbBiG9ChmHYZhxHEGR1H0cx7Hcdxgn8aJ0midJ8nKep2n6cZ5nWfZznue53mBf5oXhZF8XJZl2X5cV5XVfVzXtb1g3DdN83LbN63bbtx3ned133c973ff9wPA+DkOw4jiPvajmP48T5Pk9T9PM+z3P88Lyvi+rmva4buv66b1vW47zvu97vv+8H4fh9H8fJ+n2f5-nxfF+X1f1-XzfN9f7fH739+j5P8-T8v6-b8f5-r-v1-n839-t8P3fX8P9-j8P3-v9P8-7-f4-v8-3-f7-v9-3--8AIBwCAJAgA */
  id: 'integrated-assessment',
  initial: 'determinePath',
  context: ({ input }) => ({
    historyLevels: input?.historyLevels || [],
    enableSpelling: input?.enableSpelling || false,
    level: undefined, // 初始化时没有等级
  }),
  states: {
    // 第一步：根据历史记录决定走哪个流程
    determinePath: {
      on: {
        START: [
          { target: 'flow1_listen', guard: 'isFlow1' },
          { target: 'flow2_transEn', guard: 'isFlow2' },
          { target: 'flow3_listen', guard: 'isFlow3' },
          { target: 'flow4_transCh', guard: 'isFlow4' },
          { target: 'flow5_transEn', guard: 'isFlow5' }, // 默认分支
        ],
      },
    },
    // 流程1: 听单词测试
    flow1_listen: {
      on: {
        ANSWER: [
          // 修改：只有当启用拼写测试时才进入拼写测试，否则直接返回L3
          { 
            target: 'flow1_spelling', 
            guard: ({ context, event }) => 
              context.enableSpelling && 
              event.type === 'ANSWER' && 
              event.answer === 'success'
          },
          { 
            target: 'L3', 
            guard: ({ context, event }) => 
              !context.enableSpelling && 
              event.type === 'ANSWER' && 
              event.answer === 'success'
          },
          { target: 'flow1_transEn', guard: 'answerWrong' },
        ],
      },
    },
    // 流程1: 拼写测试
    flow1_spelling: {
      on: {
        ANSWER: [
          { target: 'L4', guard: 'answerCorrect' }, // 4 = L4
          { target: 'L3', guard: 'answerWrong' },   // 3 = L3
        ],
      },
    },
    // 流程1: 英译中测试
    flow1_transEn: {
      on: {
        ANSWER: [
          { target: 'L1', guard: 'answerCorrect' }, // 1 = L1
          { target: 'L0', guard: 'answerWrong' },   // 0 = L0
        ],
      },
    },
    // 流程2: 英译中测试
    flow2_transEn: {
      on: {
        ANSWER: [
          { target: 'L3', guard: 'answerCorrect' }, // 3 = L3
          { target: 'L0', guard: 'answerWrong' },   // 0 = L0
        ],
      },
    },
    // 流程3: 听单词测试
    flow3_listen: {
      on: {
        ANSWER: [
          { target: 'L3', guard: 'answerCorrect' }, // 3 = L3
          { target: 'flow3_transEn', guard: 'answerWrong' },
        ],
      },
    },
    // 流程3: 英译中测试
    flow3_transEn: {
      on: {
        ANSWER: [
          { target: 'L2', guard: 'answerCorrect' }, // 2 = L2
          { target: 'L0', guard: 'answerWrong' },   // 0 = L0
        ],
      },
    },
    // 流程4: 中译英测试
    flow4_transCh: {
      on: {
        ANSWER: [
          { target: 'flow4_pronunce', guard: 'answerCorrect' },
          { target: 'L0', guard: 'answerWrong' }, // 0 = L0
        ],
      },
    },
    // 流程4: 读单词测试
    flow4_pronunce: {
      on: {
        ANSWER: [
          { target: 'L1', guard: 'answerWrong' },  // 1 = L1
          { target: 'L2', guard: 'answerCorrect' }, // 2 = L2
        ],
      },
    },
    // 流程5: 英译中测试
    flow5_transEn: {
      on: {
        ANSWER: [
          { target: 'flow5_pronunce', guard: 'answerCorrect' },
          { target: 'L0', guard: 'answerWrong' }, // 0 = L0
        ],
      },
    },
    // 流程5: 读单词测试
    flow5_pronunce: {
      on: {
        ANSWER: [
          { target: 'L2', guard: 'answerCorrect' }, // 2 = L2
          { target: 'L1', guard: 'answerWrong' },  // 1 = L1
        ],
      },
    },
    // 最终等级状态，data.level 可以根据需要调整格式
    L0: {
      type: 'final',
      data: { level: 0 }, // 或者 { level: 0, description: '陌生' }
    },
    L1: {
      type: 'final',
      data: { level: 1 }, // 或者 { level: 1, description: '认识' }
    },
    L2: {
      type: 'final',
      data: { level: 2 }, // 或者 { level: 2, description: '知道' }
    },
    L3: {
      type: 'final',
      data: { level: 3 }, // 或者 { level: 3, description: '掌握' }
    },
    L4: {
      type: 'final',
      data: { level: 4 }, // 或者 { level: 4, description: '熟练' }
    },
  },
});