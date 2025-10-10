// src/types/actionTypes.ts
export const ACTION_TYPES = {
    LISTEN: 1,
    TRANS_EN: 2,
    TRANS_CH: 3,
    SPELLING: 4,
    PRONUNCE: 5,
    LEARN: 6,
    SKIP: 7, // 新增跳过动作类型
  } as const;
  
  export type ActionType = typeof ACTION_TYPES[keyof typeof ACTION_TYPES];