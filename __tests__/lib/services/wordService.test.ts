// src/__tests__/services/wordService.test.ts
import { COLLECTION_WORDS, DATABASE_ID } from '@/src/constants/appwrite';
import { tablesDB } from '@/src/lib/appwrite';
import wordService from '@/src/lib/services/wordService';
import { Word } from '@/src/types/Word';

// 模拟 Appwrite 模块
jest.mock('@/src/lib/appwrite', () => ({
  tablesDB: {
    getRow: jest.fn(),
    listRows: jest.fn(),
  },
}));

// 模拟 Query 模块
jest.mock('appwrite', () => ({
  Query: {
    equal: jest.fn((field, value) => ({ field, value })),
    notEqual: jest.fn((field, value) => ({ field, value })),
    limit: jest.fn((value) => ({ value })),
  },
}));

describe('WordService Unit Tests', () => {
  const mockWord: Word = {
    $id: 'test-word-id',
    spelling: 'test',
    chinese_meaning: 'n. 测试',
    syllable_count: 1,
    is_abstract: false,
    letter_count: 4,
    british_audio: 'british-audio-id',
    american_audio: 'american-audio-id',
    image_path: 'image-id',
    speed_sensitivity: 2,
    difficulty_level: 1,
    is_analyzed: true,
  };

  const mockWords: Word[] = [
    mockWord,
    {
      $id: 'test-word-id-2',
      spelling: 'example',
      chinese_meaning: 'n. 例子',
      syllable_count: 3,
      is_abstract: true,
      letter_count: 7,
      british_audio: null,
      american_audio: null,
      image_path: null,
      speed_sensitivity: 1,
      difficulty_level: 2,
      is_analyzed: true,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getWordById', () => {
    test('returns word when found', async () => {
      // 模拟成功响应
      (tablesDB.getRow as jest.Mock).mockResolvedValue(mockWord);

      const result = await wordService.getWordById('test-word-id');

      expect(tablesDB.getRow).toHaveBeenCalledWith({
        databaseId: DATABASE_ID,
        tableId: COLLECTION_WORDS,
        rowId: 'test-word-id',
      });
      expect(result).toEqual(mockWord);
    });

    test('returns null when word not found', async () => {
      // 模拟 404 错误
      const error = new Error('Not found');
      (error as any).code = 404;
      (tablesDB.getRow as jest.Mock).mockRejectedValue(error);

      const result = await wordService.getWordById('non-existent-id');

      expect(result).toBeNull();
    });

    test('throws error for non-404 errors', async () => {
      // 模拟其他错误
      const error = new Error('Database error');
      (error as any).code = 500;
      (tablesDB.getRow as jest.Mock).mockRejectedValue(error);

      await expect(wordService.getWordById('test-word-id')).rejects.toThrow('Database error');
    });
  });

  describe('getWordsByIds', () => {
    test('returns empty array when no wordIds provided', async () => {
      const result = await wordService.getWordsByIds([]);

      expect(result).toEqual([]);
      expect(tablesDB.listRows).not.toHaveBeenCalled();
    });

    test('returns words when found', async () => {
      // 模拟成功响应
      (tablesDB.listRows as jest.Mock).mockResolvedValue({ rows: mockWords });

      const result = await wordService.getWordsByIds(['test-word-id', 'test-word-id-2']);

      expect(tablesDB.listRows).toHaveBeenCalledWith({
        databaseId: DATABASE_ID,
        tableId: COLLECTION_WORDS,
        queries: [{ field: '$id', value: ['test-word-id', 'test-word-id-2'] }],
      });
      expect(result).toEqual(mockWords);
    });

    test('throws error when listRows fails', async () => {
      const error = new Error('Database error');
      (tablesDB.listRows as jest.Mock).mockRejectedValue(error);

      await expect(wordService.getWordsByIds(['test-word-id'])).rejects.toThrow('Database error');
    });
  });

  describe('getWordsBySpellings', () => {
    test('returns empty array when no spellings provided', async () => {
      const result = await wordService.getWordsBySpellings([]);

      expect(result).toEqual([]);
      expect(tablesDB.listRows).not.toHaveBeenCalled();
    });

    test('returns words when found', async () => {
      // 模拟成功响应
      (tablesDB.listRows as jest.Mock).mockResolvedValue({ rows: [mockWord] });

      const result = await wordService.getWordsBySpellings(['test']);

      expect(tablesDB.listRows).toHaveBeenCalledWith({
        databaseId: DATABASE_ID,
        tableId: COLLECTION_WORDS,
        queries: [{ field: 'spelling', value: ['test'] }],
      });
      expect(result).toEqual([mockWord]);
    });

    test('throws error when listRows fails', async () => {
      const error = new Error('Database error');
      (tablesDB.listRows as jest.Mock).mockRejectedValue(error);

      await expect(wordService.getWordsBySpellings(['test'])).rejects.toThrow('Database error');
    });
  });

  describe('parseChineseMeaning', () => {
    test('parses Chinese meaning correctly', () => {
      const result = wordService.parseChineseMeaning('n. 苹果');
      console.log('Parsed Result:', result);
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
      const result = wordService.parseChineseMeaning('invalid input');
      expect(result).toEqual({
        partOfSpeech: '',
        meaning: 'invalid input'
      });
    });
  });

  describe('generateRandomOptions', () => {
    test('returns empty array when count is 0', async () => {
      const result = await wordService.generateRandomOptions(mockWord, 'en', 0);
      expect(result).toEqual([]);
      expect(tablesDB.listRows).not.toHaveBeenCalled();
    });

    test('returns empty array when count is negative', async () => {
      const result = await wordService.generateRandomOptions(mockWord, 'en', -1);
      expect(result).toEqual([]);
      expect(tablesDB.listRows).not.toHaveBeenCalled();
    });

    test('generates English options successfully', async () => {
      // 模拟成功响应
      const otherWords = [
        { ...mockWord, $id: 'other-word-1', spelling: 'apple' },
        { ...mockWord, $id: 'other-word-2', spelling: 'banana' },
        { ...mockWord, $id: 'other-word-3', spelling: 'cherry' },
      ];
      (tablesDB.listRows as jest.Mock).mockResolvedValue({ rows: otherWords });

      const result = await wordService.generateRandomOptions(mockWord, 'en', 3);

      console.log('Generated Options:', result);

      expect(tablesDB.listRows).toHaveBeenCalledWith({
        databaseId: DATABASE_ID,
        tableId: COLLECTION_WORDS,
        queries: [
          { field: '$id', value: mockWord.$id }, // notEqual
          { value: 50 }, // limit
        ],
      });
      expect(result).toHaveLength(3);
      // 检查选项结构
      result.forEach(option => {
        expect(option).toHaveProperty('id');
        expect(option).toHaveProperty('meaning');
        expect(option).toHaveProperty('partOfSpeech');
      });
      // 确保包含正确选项
      expect(result.some(option => option.id === mockWord.$id)).toBe(true);
    });

    test.only('generates Chinese options successfully', async () => {
      // 模拟成功响应
      const otherWords = [
        { ...mockWord, $id: 'other-word-1', chinese_meaning: 'n. 苹果' },
        { ...mockWord, $id: 'other-word-2', chinese_meaning: 'n. 香蕉' },
        { ...mockWord, $id: 'other-word-3', chinese_meaning: 'n. 樱桃' },
      ];
      (tablesDB.listRows as jest.Mock).mockResolvedValue({ rows: otherWords });

      const result = await wordService.generateRandomOptions(mockWord, 'ch', 3);

      console.log('Generated Options:', result);

      expect(result).toHaveLength(3);
      // 检查选项结构
      result.forEach(option => {
        expect(option).toHaveProperty('id');
        expect(option).toHaveProperty('meaning');
        expect(option).toHaveProperty('partOfSpeech');
      });
      // 确保包含正确选项
      expect(result.some(option => option.id === mockWord.$id)).toBe(true);
    });

    test('handles case when not enough options available', async () => {
      // 模拟只有1个选项的响应
      const otherWords = [
        { ...mockWord, $id: 'other-word-1', spelling: 'apple' },
      ];
      (tablesDB.listRows as jest.Mock).mockResolvedValue({ rows: otherWords });

      const result = await wordService.generateRandomOptions(mockWord, 'en', 3);

      // 应该返回所有可用的选项（2个：正确选项+1个错误选项）
      expect(result).toHaveLength(2);
    });

    test('returns only correct option when no other words found', async () => {
      // 模拟空响应
      (tablesDB.listRows as jest.Mock).mockResolvedValue({ rows: [] });

      const result = await wordService.generateRandomOptions(mockWord, 'en', 3);

      // 应该只返回正确选项
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(mockWord.$id);
    });

    test('returns empty array when database query fails', async () => {
      // 模拟数据库错误
      (tablesDB.listRows as jest.Mock).mockRejectedValue(new Error('Database error'));

      const result = await wordService.generateRandomOptions(mockWord, 'en', 3);

      expect(result).toEqual([]);
    });
  });
});