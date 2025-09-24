// src/types/Word.ts
// Based on `word` table from database.md and architecture.md

export interface Word {
  $id: string; // Appwrite Document ID
  spelling: string;
  british_phonetic?: string | null;
  american_phonetic?: string | null;
  definition?: string | null;
  chinese_meaning: string;
  frequency?: string | null;
  syllable_count: number;
  is_abstract: boolean; // 1=true, 0=false -> boolean
  letter_count: number;
  // File IDs for audio/images in Appwrite Storage
  british_audio?: string | null; // File ID
  american_audio?: string | null; // File ID
  image_path?: string | null; // File ID or path
  example_sentence?: string | null;
  exchange?: string | null; // 词形变化信息，格式：类型1:变换单词1/类型2:变换单词2
  speed_sensitivity: number; // 1=低, 2=中, 3=高
  difficulty_level: number; // 1=小学, 2=初中, 3=高中
  tag?: string | null; // 字符串标签：zk/中考，gk/高考，cet4/四级 等等标签，空格分割
  is_analyzed: boolean; // 1=true, 0=false -> boolean
  // Add other fields if present in Appwrite collection
  options?: WordOption[];
}

// 定义选项对象的类型
export interface WordOption {
  partOfSpeech: string;
  spelling: string;
  chinese_meaning: string;
  id: string; // 单词的 $id 或生成的唯一 ID
}

// 词形变化类型定义（基于exchange字段的格式）
export interface WordExchange {
  type: ExchangeType;
  word: string;
}

export enum ExchangeType {
  PAST_TENSE = 'p',        // 过去式（did）
  PAST_PARTICIPLE = 'd',   // 过去分词（done）
  PRESENT_PARTICIPLE = 'i', // 现在分词（doing）
  THIRD_PERSON = '3',      // 第三人称单数（does）
  COMPARATIVE = 'r',       // 形容词比较级（-er）
  SUPERLATIVE = 't',       // 形容词最高级（-est）
  PLURAL = 's',            // 名词复数形式
  LEMMA = '0',             // Lemma，如 perceived 的 Lemma 是 perceive
  LEMMA_DERIVED = '1'      // Lemma 的变换形式，比如 s 代表 apples 是其 lemma 的复数形式
}

// 工具函数：解析exchange字段
export function parseExchange(exchangeString: string | null | undefined): WordExchange[] {
  if (!exchangeString) return [];
  
  return exchangeString.split('/').map(item => {
    const [type, word] = item.split(':');
    return {
      type: type as ExchangeType,
      word: word || ''
    };
  });
}

// 工具函数：生成exchange字段
export function buildExchange(exchanges: WordExchange[]): string {
  return exchanges.map(ex => `${ex.type}:${ex.word}`).join('/');
}

// 难度级别枚举
export enum DifficultyLevel {
  PRIMARY = 1,    // 小学
  MIDDLE = 2,     // 初中
  HIGH = 3        // 高中
}

// 语速敏感度枚举
export enum SpeedSensitivity {
  LOW = 1,        // 低
  MEDIUM = 2,     // 中
  HIGH = 3        // 高
}

export interface TestTypeProps {
  word: Word;
  onAnswer: (result: { 
    type: string; 
    correct: boolean; 
    selectedOption: string; 
    wordId: string; 
    responseTimeMs?: number;
    speedUsed?: number; // 新增速度使用参数
  }) => void;
  testType?: string; // 新增测试类型参数
}