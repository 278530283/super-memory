// src/types/DailyLearningSession.ts

/**
 * 每日学习会话接口定义
 * 对应数据库中的 daily_learning_session 表
 */
export interface DailyLearningSession {
  /** Appwrite Document ID */
  $id: string;
  
  /** 用户ID */
  user_id: string;
  
  /** 会话日期（YYYY-MM-DD） */
  session_date: string;
  
  /** 学习模式ID：1=轻松，2=正常，3=努力 */
  mode_id: number;
  
  /** 会话状态：0=待开始，1=前置评测中，2=学习中，3=当日评测中，4=已完成 */
  status: number;
  
  /** 前置评测进度（如："3/7"） */
  pre_test_progress?: string | null;
  
  /** 学习阶段进度（如："5/10"） */
  learning_progress?: string | null;
  
  /** 当日评测进度（如："2/7"） */
  post_test_progress?: string | null;
  
  /** 前置评测单词ID列表（从JSON数组反序列化） */
  pre_test_word_ids: string[];
  
  /** 学习阶段单词ID列表（从JSON数组反序列化） */
  learning_word_ids: string[];
  
  /** 当日评测单词ID列表（从JSON数组反序列化） */
  post_test_word_ids: string[];
}

/**
 * 解析会话进度字符串的工具函数
 * @param progress 进度字符串（格式："当前进度/总单词数"）
 * @returns 解析后的进度信息对象
 */
export function parseSessionProgress(progress: string | null | undefined): { current: number; total: number; percentage: number } {
  if (!progress) {
    return { current: 0, total: 0, percentage: 0 };
  }
  
  const [currentStr, totalStr] = progress.split('/');
  const current = parseInt(currentStr, 10) || 0;
  const total = parseInt(totalStr, 10) || 0;
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0;
  
  return { current, total, percentage };
}

/**
 * 生成会话进度字符串的工具函数
 * @param current 当前进度
 * @param total 总单词数
 * @returns 格式化的进度字符串
 */
export function formatSessionProgress(current: number, total: number): string {
  return `${current}/${total}`;
}

/**
 * 获取会话状态文本描述
 * @param status 会话状态
 * @returns 状态文本描述
 */
export function getSessionStatusText(status: number): string {
  switch (status) {
    case 0: return '待开始';
    case 1: return '前置评测中';
    case 2: return '学习中';
    case 3: return '当日评测中';
    case 4: return '已完成';
    default: return '未知状态';
  }
}

/**
 * 检查会话是否已完成
 * @param session 会话对象
 * @returns 是否已完成
 */
export function isSessionCompleted(session: DailyLearningSession): boolean {
  return session.status === 4;
}

/**
 * 检查前置评测是否已完成
 * @param session 会话对象
 * @returns 是否已完成
 */
export function isPreTestCompleted(session: DailyLearningSession): boolean {
  const progress = parseSessionProgress(session.pre_test_progress);
  return progress.current >= progress.total && progress.total > 0;
}

/**
 * 检查学习阶段是否已完成
 * @param session 会话对象
 * @returns 是否已完成
 */
export function isLearningCompleted(session: DailyLearningSession): boolean {
  const progress = parseSessionProgress(session.learning_progress);
  return progress.current >= progress.total && progress.total > 0;
}

/**
 * 检查当日评测是否已完成
 * @param session 会话对象
 * @returns 是否已完成
 */
export function isPostTestCompleted(session: DailyLearningSession): boolean {
  const progress = parseSessionProgress(session.post_test_progress);
  return progress.current >= progress.total && progress.total > 0;
}

/**
 * 获取会话中所有单词ID（去重）
 * @param session 会话对象
 * @returns 所有单词ID数组
 */
export function getAllWordIds(session: DailyLearningSession): string[] {
  const allIds = [
    ...session.pre_test_word_ids,
    ...session.learning_word_ids,
    ...session.post_test_word_ids
  ];
  
  return Array.from(new Set(allIds)); // 去重
}

/**
 * 获取当前阶段的进度信息
 * @param session 会话对象
 * @param phase 阶段：'pre_test' | 'learning' | 'post_test'
 * @returns 进度信息对象
 */
export function getPhaseProgress(session: DailyLearningSession, phase: 'pre_test' | 'learning' | 'post_test'): { current: number; total: number; percentage: number } {
  const progress = phase === 'pre_test' 
    ? session.pre_test_progress 
    : phase === 'learning' 
      ? session.learning_progress 
      : session.post_test_progress;
  
  return parseSessionProgress(progress);
}

/**
 * 更新会话中特定阶段的进度
 * @param session 会话对象
 * @param phase 阶段：'pre_test' | 'learning' | 'post_test'
 * @param current 当前进度
 * @returns 更新后的会话对象（浅拷贝）
 */
export function updatePhaseProgress(session: DailyLearningSession, phase: 'pre_test' | 'learning' | 'post_test', current: number): DailyLearningSession {
  const total = phase === 'pre_test' 
    ? session.pre_test_word_ids.length 
    : phase === 'learning' 
      ? session.learning_word_ids.length 
      : session.post_test_word_ids.length;
  
  const progress = formatSessionProgress(current, total);
  
  return {
    ...session,
    [`${phase}_progress`]: progress
  };
}