// assessmentMachine.ts
import { setup } from 'xstate';

// 定义上下文类型
interface AssessmentContext {
  historyLevels: string[]; // 历史等级列表，如 ['L1', 'L2', 'L2']
  level?: string; // 用于存储最终评估等级
}

// 定义事件类型
type AssessmentEvent =
  | { type: 'START' }
  | { type: 'ANSWER'; answer: 'success' | 'fail' };

// 使用 setup 创建强类型机器
export const assessmentMachine = setup({
  types: {
    context: {} as AssessmentContext,
    events: {} as AssessmentEvent,
    input: {} as AssessmentContext,
  },
  guards: {
    // --- 分支判断 guards ---
    // 1. 首次评测：历史列表为空
    isFlow1: ({ context }) => context.historyLevels.length === 0,
    // 2. 非首次评测：只有一个等级，且是 L3
    isFlow2: ({ context }) =>
      context.historyLevels.length === 1 &&
      context.historyLevels[0] === 'L3',
    // 3. 非首次评测：最近3次评测 >= L2, 或最近一次为 L3
    isFlow3: ({ context }) => {
      const { historyLevels } = context;
      // 最近一次为 L3
      if(historyLevels[historyLevels.length - 1] === 'L3') return true;
      if(historyLevels.length < 3) return false;
      const lastThree = historyLevels.slice(-3);
      // 最近三次都在 L2 及以上
      return lastThree.every(level => ['L2', 'L3', 'L4'].includes(level));
    },
    // 4. 非首次评测：只评测一次且是 L1 ，首次是 L0 且最近2次 >= L2
    isFlow4: ({ context }) => {
      const { historyLevels } = context;
      // 只评测一次且是 L1
      const first = historyLevels[0];
      if(historyLevels.length === 1 && first === 'L1' ) return true;
      if(historyLevels.length < 2) return false;
      const lastTwo = historyLevels.slice(-2);
      // 首次是 L0 且最近2次 >= L2
      return (('L0' === first) &&
        lastTwo.every(level => ['L2', 'L3', 'L4'].includes(level))
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
  },
  actions: {
    // 定义一个动作，用于在进入最终状态时设置上下文中的 level
    setLevel: ({ context, event }, params: { level: string }) => {
      // 注意：在 entry 动作中，context 是进入状态前的值
      // 如果需要，可以在这里进行更复杂的逻辑处理
      // 但通常我们只是设置一个静态值
      // 这里我们直接返回新的 context
      return {
        ...context,
        level: params.level
      };
    }
  }
}).createMachine({
  /** @xstate-layout N4IgpgJg5mDOIC5QEsB2AXMUBOBDTEAtLrLHLALZgYB0EYm2FaYACvgBYDEAygCoBBAEp8A2gAYAuolAAHAPaxk6ZPNQyQAD0QAmHQDYaARiM6ArOPEBmK6bNGAHGYA0IAJ6IzV8TXFH9AQDsACziZnrBVgC+Ua5omDj4kMSk5FS09IzMqGycvIIiokbSSCAKSipqGtoIeoYm5pY2do4u7ojNNDr+QdY6gWb2wTFxGFh4BClkpOnodAxgTCzs6Nz8wmI6JXKKyqrqpTV1xnZNtuatrh4IZg4ONPYB+gNNRgMjIPHjSUQk05TUOaZRbZXKrfIbURWbZlXaVA6gI4GE6NaznexOK6IIzBQxeGyBKzdBz9RzRWKfMaJSZ-NKA+ZZZZ5daFYIw8p7KqHXTIhoWNEtTHtBB3Xw2cXBCxE-QATg+X2pyVpM3pADNkNhYOg+MgqFwBAA5HgAdQAokIJOy4ftqohAvbfC8-F4jIMQliEPpbDQHJY-TKjOIAzLhhSFRMlakVbR1ZrtbqwPqjWaLcUNBz4baEPbAo7+a7bG7gh7wlYaPo-ZZAnpAuIHIF5VSI78owDaGoADZuAAyViTJvNlvT1q5iLtDvEToLrrM7uFROCPsr1gsOisMv0jYSzamdPbqC7vf7KaKVoqNu52YnU5dRY9wUJNBly-0OhlZgDZi33xprdmNGwMAAGNAT4AB3eRux0AB5bAAAlkCgDhFmPQcpGHc9Ry0cdc0nfNb1nYthX0BwjAeStA3EUIrGeb9FRbf5-0AkCMHAyCYPgxDkOwVDUzPTkEWwq9cJvQtCJLEljGXUjAl9HQ6J3ZU2zmWMtW7cRYO7IwhGAwEoN4odSgzC8x2EvNLGnO9hRxHwTACGVmhxatQ1Gbcfl3aMVI1NSNOwLSdJY9B9MNAc+IwgSsxzcznTEudrmCHRFx0ZcvH0B8EoU9ylP-eRVkWABhEg4AM9CjJHQSaiivCLIIuLEFI8seiCZ5SKMIlMt-Rj6Vy7jCumAy0zKzCKpw6LLPE+cQnIytgkiKwzFlDrIy62hMC1HhZDADsOzQKASv4zNL1MYJ7j0flzA-BKQw9NKzBoXEnkCCsZR0BwaKWhi9zmNb0A2radtQPaQpPQadmGrNjtO1ELpDN8iOuZLF0lStvBo313w+jzlJoH7WGwNQAFdUCA5B8H2fbwsO0zIa6aHBlh67rMie7+UsZLElMFxMey+lcfx1AiZJsm1AGg6TKEmmzrZ+mrvh+qdBZii-BxXEGw+VB5HoeBSnDLK-0BSnxZqQh9A9E3fErfRA3m11bu5-WMgWJYchWDhDawmoEo9SinyeAJSMiNXXJ-ZavpoVT4yod2Rs9Exy0lN7JQ-ZKrBLbwTke0IEpo8lg-orGcoPHsrGjrMrdzN9bisSVCVdUiPU6WxHusN5nnksMmz1la5mY0CIKg2CEKQxZS8vQYywcl5A0CF7-Ak+4rczmUHLfIPKTczqw4j9TNO03SMCg0fTIWhXXWCfwc3EOGjG93Fy3FGwzFmyI9HbvPFIduYeoKortbBiLLwVjIs+c+LUSLpQcB6UUbUH6zQclYO4m4O4b1Dp5HGcBfqbW2rtI+EsgxkSflYAYr9fSTlNsRdcxhWZBnMLJK+9tu7oK1HjQmxNSZU1hODI6k4yz2nOm8Ges1IHClFBuP2skDDViMHKZBIdPpoPUrgmo09eFOm6PaEMJ17zVhoE6Swr5Bj+EnAwsOWklHYnCD4Z4-JbC1lfLfBW3gKIyjekQly685EF3pIfIaADqaWPLE6Wx4h7EiLIk4ysMo7EvXcbrTeCiS6+I4cogJ1jXh2J0A3b0TdeirzrPWExCjgjmIQK6ZKgSbFvBCZk4UKcaARLZsvCs48YgxCAA */
  id: 'integrated-assessment',
  initial: 'determinePath',
  context: ({ input }) => ({
    historyLevels: input?.historyLevels || [],
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
          { target: 'flow1_spelling', guard: 'answerCorrect' },
          { target: 'flow1_transEn', guard: 'answerWrong' },
        ],
      },
    },
    // 流程1: 拼写测试
    flow1_spelling: {
      on: {
        ANSWER: [
          { target: 'L4', guard: 'answerCorrect' },
          { target: 'L3', guard: 'answerWrong' },
        ],
      },
    },
    // 流程1: 英译中测试
    flow1_transEn: {
      on: {
        ANSWER: [
          { target: 'L1', guard: 'answerCorrect' },
          { target: 'L0', guard: 'answerWrong' },
        ],
      },
    },
    // 流程2: 英译中测试
    flow2_transEn: {
      on: {
        ANSWER: [
          { target: 'L3', guard: 'answerCorrect' },
          { target: 'L0', guard: 'answerWrong' },
        ],
      },
    },
    // 流程3: 听单词测试
    flow3_listen: {
      on: {
        ANSWER: [
          { target: 'L3', guard: 'answerCorrect' },
          { target: 'flow3_transEn', guard: 'answerWrong' },
        ],
      },
    },
    // 流程3: 英译中测试
    flow3_transEn: {
      on: {
        ANSWER: [
          { target: 'L2', guard: 'answerCorrect' },
          { target: 'L0', guard: 'answerWrong' },
        ],
      },
    },
    // 流程4: 中译英测试
    flow4_transCh: {
      on: {
        ANSWER: [
          { target: 'flow4_pronunce', guard: 'answerCorrect' },
          { target: 'L0', guard: 'answerWrong' },
        ],
      },
    },
    // 流程4: 读单词测试
    flow4_pronunce: {
      on: {
        ANSWER: [
          { target: 'L1', guard: 'answerWrong' },
          { target: 'L2', guard: 'answerCorrect' },
        ],
      },
    },
    // 流程5: 英译中测试
    flow5_transEn: {
      on: {
        ANSWER: [
          { target: 'flow5_pronunce', guard: 'answerCorrect' },
          { target: 'L0', guard: 'answerWrong' },
        ],
      },
    },
    // 流程5: 读单词测试
    flow5_pronunce: {
      on: {
        ANSWER: [
          { target: 'L2', guard: 'answerCorrect' },
          { target: 'L1', guard: 'answerWrong' },
        ],
      },
    },
    // 最终等级
    L0: { type: 'final', data: { level: 'L0: 陌生' } },
    L1: { type: 'final', data: { level: 'L1: 认识' } },
    L2: { type: 'final', data: { level: 'L2: 知道' } },
    L3: { type: 'final', data: { level: 'L3: 掌握' } },
    L4: { type: 'final', data: { level: 'L4: 熟练' } },
  },
});
