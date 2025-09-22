// src/__tests__/services/wordService.test.ts
import { tablesDB } from '@/src/lib/appwrite';
import wordService from '@/src/lib/services/wordService';
import { Word } from '@/src/types/Word';

// 模拟 Appwrite 模块
jest.mock('@/src/lib/appwrite', () => ({
  tablesDB: {
    getRow: jest.fn(),
    listRows: jest.fn(),
    client: {
      ping: jest.fn()
    }
  }
}));

describe('WordService Unit Tests', () => {
  // 模拟数据 - 包含所有必需的属性
  const mockWord: Word = {
    $id: 'test-word-id',
    spelling: 'apple',
    chinese_meaning: 'n.苹果',
    syllable_count: 2,
    is_abstract: false,
    letter_count: 5,
    speed_sensitivity: 1,
    difficulty_level: 1,
    is_analyzed: false,
  };

  const mockWords: Word[] = [
    mockWord,
    {
      $id: 'test-word-id-2',
      spelling: 'banana',
      chinese_meaning: 'n.香蕉',
      syllable_count: 3,
      is_abstract: false,
      letter_count: 6,
      speed_sensitivity: 1,
      difficulty_level: 1,
      is_analyzed: false
    },
    {
      $id: 'test-word-id-3',
      spelling: 'orange',
      chinese_meaning: 'n.橙子',
      syllable_count: 2,
      is_abstract: false,
      letter_count: 6,
      speed_sensitivity: 1,
      difficulty_level: 1,
      is_analyzed: false
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getWordById', () => {
    test('returns word when found', async () => {
      // 模拟成功响应
      (tablesDB.getRow as jest.Mock).mockResolvedValue(mockWord);

      const result = await wordService.getWordById('test-word-id');
      
      expect(result).toEqual(mockWord);
      expect(tablesDB.getRow).toHaveBeenCalledWith({
        databaseId: expect.any(String),
        tableId: expect.any(String),
        rowId: 'test-word-id'
      });
    });

    test('returns null when word not found', async () => {
      // 模拟 404 错误
      const error = new Error('Not found') as any;
      error.code = 404;
      (tablesDB.getRow as jest.Mock).mockRejectedValue(error);

      const result = await wordService.getWordById('non-existent-id');
      
      expect(result).toBeNull();
    });

    test('throws error for other errors', async () => {
      // 模拟其他错误
      const error = new Error('Database error');
      (tablesDB.getRow as jest.Mock).mockRejectedValue(error);

      await expect(wordService.getWordById('test-id')).rejects.toThrow('Database error');
    });
  });

  describe('getWordsByIds', () => {
    test('returns empty array when no wordIds provided', async () => {
      const result = await wordService.getWordsByIds([]);
      
      expect(result).toEqual([]);
      expect(tablesDB.listRows).not.toHaveBeenCalled();
    });

    test('returns words for given IDs', async () => {
      // 模拟成功响应
      (tablesDB.listRows as jest.Mock).mockResolvedValue({
        rows: mockWords
      });

      const result = await wordService.getWordsByIds(['test-word-id', 'test-word-id-2']);
      
      expect(result).toHaveLength(2);
      expect(tablesDB.listRows).toHaveBeenCalledWith({
        databaseId: expect.any(String),
        tableId: expect.any(String),
        queries: [expect.any(Object)]
      });
    });

    test('throws error when listRows fails', async () => {
      // 模拟错误
      const error = new Error('Query failed');
      (tablesDB.listRows as jest.Mock).mockRejectedValue(error);

      await expect(wordService.getWordsByIds(['test-id'])).rejects.toThrow('Query failed');
    });
  });

  describe('parseChineseMeaning', () => {
    test('parses Chinese meaning with part of speech', () => {
      const result = wordService.parseChineseMeaning('n.苹果');
      
      expect(result).toEqual({
        partOfSpeech: 'n',
        meaning: '苹果'
      });
    });

    test('handles empty input', () => {
      const result = wordService.parseChineseMeaning('');
      
      expect(result).toEqual({
        partOfSpeech: '',
        meaning: ''
      });
    });

    test('handles malformed input', () => {
      const result = wordService.parseChineseMeaning('just some text');
      
      expect(result).toEqual({
        partOfSpeech: '',
        meaning: 'just some text'
      });
    });
  });

  describe('generateRandomOptions', () => {
    test('returns word with options when count is valid', async () => {
      // 模拟 listRows 返回候选单词
      (tablesDB.listRows as jest.Mock).mockResolvedValue({
        rows: mockWords.slice(1) // 返回除正确单词外的其他单词
      });

      const result = await wordService.generateRandomOptions(mockWord, 3);
      
      expect(result.options).toBeDefined();
      expect(result.options).toHaveLength(3);
      expect(result.options?.some(opt => opt.id === mockWord.$id)).toBe(true);
    });

    test('returns word with empty options when count is 0', async () => {
      const result = await wordService.generateRandomOptions(mockWord, 0);
      
      expect(result.options).toBeUndefined();
      expect(tablesDB.listRows).not.toHaveBeenCalled();
    });

    test('handles errors gracefully', async () => {
      // 模拟错误
      (tablesDB.listRows as jest.Mock).mockRejectedValue(new Error('Database error'));

      const result = await wordService.generateRandomOptions(mockWord, 3);
      
      // 即使出错也应该返回原始单词
      expect(result).toEqual(mockWord);
    });
  });
});