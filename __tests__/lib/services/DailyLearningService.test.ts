// src/__tests__/services/dailyLearningService.test.ts
import { tablesDB } from '@/src/lib/appwrite';
import dailyLearningService from '@/src/lib/services/dailyLearningService';
import learningModeService from '@/src/lib/services/learningModeService';
import { UserWordProgress } from '@/src/types/UserWordProgress';

// 设置较长的超时时间，因为涉及网络请求
jest.setTimeout(30000);

describe('DailyLearningService Integration Tests', () => {
  let testSessionId: string;
  const testUserId = '68c19de90027e9732ea0';
  const testModeId = 1;
  const testDate = new Date().toISOString().split('T')[0];

  // 清理测试数据
  afterAll(async () => {
    if (testSessionId) {
      try {
        await dailyLearningService.deleteSession(testSessionId);
      } catch (error) {
        console.warn('Cleanup failed:', error);
      }
    }
  });

  test('createSession creates a new session', async () => {
    const initialWordIds = {
      pre_test: ['word1', 'word2'],
      learning: ['word3', 'word4'],
      post_test: ['word5', 'word6']
    };

    const session = await dailyLearningService.createSession(
      testUserId,
      testModeId,
      initialWordIds
    );

    expect(session).toBeDefined();
    expect(session.user_id).toBe(testUserId);
    expect(session.session_date).toBe(testDate);
    expect(session.mode_id).toBe(testModeId);
    expect(Array.isArray(session.pre_test_word_ids)).toBe(true);
    expect(session.pre_test_word_ids).toEqual(initialWordIds.pre_test);
    expect(Array.isArray(session.learning_word_ids)).toBe(true);
    expect(session.learning_word_ids).toEqual(initialWordIds.learning);
    expect(Array.isArray(session.post_test_word_ids)).toBe(true);
    expect(session.post_test_word_ids).toEqual(initialWordIds.post_test);

    testSessionId = session.$id;
  });

  test('getTodaysSession retrieves today\'s session', async () => {
    const session = await dailyLearningService.getTodaysSession(testUserId, testDate);
    
    expect(session).not.toBeNull();
    expect(session?.$id).toBe(testSessionId);
    expect(session?.user_id).toBe(testUserId);
    expect(Array.isArray(session?.pre_test_word_ids)).toBe(true);
    expect(Array.isArray(session?.learning_word_ids)).toBe(true);
    expect(Array.isArray(session?.post_test_word_ids)).toBe(true);
  });

  test('updateSession updates session data', async () => {
    const updates = {
      status: 1,
      pre_test_progress: '2/2'
    };

    const updatedSession = await dailyLearningService.updateSession(testSessionId, updates);
    
    expect(updatedSession.status).toBe(1);
    expect(updatedSession.pre_test_progress).toBe('2/2');
    // 确保数组字段仍然是数组
    expect(Array.isArray(updatedSession.pre_test_word_ids)).toBe(true);
    expect(Array.isArray(updatedSession.learning_word_ids)).toBe(true);
    expect(Array.isArray(updatedSession.post_test_word_ids)).toBe(true);
  });

  test('getSessionById retrieves session by ID', async () => {
    const session = await dailyLearningService.getSessionById(testSessionId);
    
    expect(session).not.toBeNull();
    expect(session?.$id).toBe(testSessionId);
    expect(Array.isArray(session?.pre_test_word_ids)).toBe(true);
    expect(Array.isArray(session?.learning_word_ids)).toBe(true);
    expect(Array.isArray(session?.post_test_word_ids)).toBe(true);
  });

  test('deleteSession removes a session', async () => {
    await dailyLearningService.deleteSession(testSessionId);
    
    // 验证会话已被删除
    const session = await dailyLearningService.getSessionById(testSessionId);
    expect(session).toBeNull();
    
    testSessionId = ''; // 重置ID，避免afterAll中重复删除
  });

  test('recordWordAction records a word action', async () => {
    const actionData = {
      userId: testUserId,
      wordId: 'test_word_id',
      sessionId: testSessionId,
      actionType: 'answer',
      isCorrect: true,
      timeTaken: 5000,
      timestamp: new Date().toISOString()
    };

    // 使用 jest.spyOn 来监视 tablesDB.createRow 方法
    const createRowSpy = jest.spyOn(tablesDB, 'createRow').mockResolvedValueOnce({} as any);
    
    await dailyLearningService.recordWordAction(actionData);
    
    // 验证 createRow 方法被调用，并且使用了正确的参数
    expect(createRowSpy).toHaveBeenCalledWith({
      databaseId: expect.any(String),
      tableId: expect.any(String),
      rowId: expect.any(String),
      data: actionData
    });
    
    // 清理 spy
    createRowSpy.mockRestore();
  });

  test('recordWordAction handles errors', async () => {
    const actionData = {
      userId: testUserId,
      wordId: 'test_word_id',
      sessionId: testSessionId,
      actionType: 'answer',
      isCorrect: true,
      timeTaken: 5000,
      timestamp: new Date().toISOString()
    };

    // 模拟抛出错误
    const createRowSpy = jest.spyOn(tablesDB, 'createRow').mockRejectedValueOnce(new Error('Database error'));
    
    // 验证会抛出错误
    await expect(dailyLearningService.recordWordAction(actionData)).rejects.toThrow('Database error');
    
    // 清理 spy
    createRowSpy.mockRestore();
  });

  test.only('generateTodaysWordLists generates word lists', async () => {
    // 模拟学习模式数据
    const mockLearningMode = {
      $id: '1',
      name: 'Standard Mode',
      word_count: 10,
      description: 'Standard learning mode'
    };

    // 模拟用户进度数据
    const mockUserProgress: UserWordProgress[] = [
      {
        $id: 'progress1',
        user_id: testUserId,
        word_id: 'word1',
        current_level: 1,
        current_speed: 50,
        last_review_time: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(), // 2天前
        last_learn_time: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3天前
        is_long_difficult: false
      },
      {
        $id: 'progress2',
        user_id: testUserId,
        word_id: 'word2',
        current_level: 2,
        current_speed: 50,
        last_review_time: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(), // 12小时前
        last_learn_time: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2天前
        is_long_difficult: false
      },
      {
        $id: 'progress3',
        user_id: testUserId,
        word_id: 'word3',
        current_level: 1,
        current_speed: 50,
        last_review_time: null,
        last_learn_time: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5天前
        is_long_difficult: false
      }
    ];
    
    // 模拟新的单词数据
    const mockNewWords = [
      { $id: 'newWord1' },
      { $id: 'newWord2' },
      { $id: 'newWord3' }
    ];
    
    // 设置模拟返回值
    jest.spyOn(learningModeService, 'getLearningMode').mockResolvedValue(mockLearningMode as any);
    jest.spyOn(tablesDB, 'listRows')
      .mockResolvedValueOnce({ rows: mockUserProgress } as any) // 第一次调用 - 用户进度
      .mockResolvedValueOnce({ rows: mockNewWords } as any); // 第二次调用 - 新单词
    
    const result = await dailyLearningService.generateTodaysWordLists(testUserId, testModeId);

    console.log("generateTodaysWordLists result:", result);
    
    // 验证结果结构
    expect(result).toHaveProperty('pre_test');
    expect(result).toHaveProperty('learning');
    expect(result).toHaveProperty('post_test');
    
    // 验证所有字段都是数组
    expect(Array.isArray(result.pre_test)).toBe(true);
    expect(Array.isArray(result.learning)).toBe(true);
    expect(Array.isArray(result.post_test)).toBe(true);
    
    // 验证学习模式服务被调用
    expect(learningModeService.getLearningMode).toHaveBeenCalledWith(testModeId);
    
    // 验证数据库查询被调用
    expect(tablesDB.listRows).toHaveBeenCalledTimes(2);

    // 验证预测试单词包含符合条件的单词
    // 只有超过24小时未复习的单词才会被选入预测试
    expect(result.pre_test).toContain('word1'); // 2天前复习过，符合条件
    expect(result.pre_test).toContain('word3'); // 从未复习过，符合条件
    expect(result.pre_test).not.toContain('word2'); // 12小时前复习过，不符合条件

    // 验证学习单词包含预测试单词和新单词
    expect(result.learning).toEqual(expect.arrayContaining(result.pre_test));
    expect(result.learning).toEqual(expect.arrayContaining(mockNewWords.map(w => w.$id)));

    // 验证后测试单词与学习单词相同
    expect(result.post_test).toEqual(result.learning);

    // 清理模拟
    jest.restoreAllMocks();
  });

  test('generateTodaysWordLists handles errors gracefully', async () => {
    // 模拟 learningModeService.getLearningMode 抛出错误
    jest.spyOn(learningModeService, 'getLearningMode').mockRejectedValue(new Error('Mode not found'));
    
    const result = await dailyLearningService.generateTodaysWordLists(testUserId, testModeId);
    
    // 验证在错误情况下返回空数组
    expect(result).toEqual({
      pre_test: [],
      learning: [],
      post_test: []
    });

    // 清理模拟
    jest.restoreAllMocks();
  });

  test('generateTodaysWordLists handles empty progress and word lists', async () => {
    // 模拟学习模式数据
    const mockLearningMode = {
      $id: '1',
      name: 'Standard Mode',
      word_count: 10,
      description: 'Standard learning mode'
    };

    // 模拟空数据
    jest.spyOn(learningModeService, 'getLearningMode').mockResolvedValue(mockLearningMode as any);
    jest.spyOn(tablesDB, 'listRows')
      .mockResolvedValueOnce({ rows: [] } as any) // 空用户进度
      .mockResolvedValueOnce({ rows: [] } as any); // 空新单词
    
    const result = await dailyLearningService.generateTodaysWordLists(testUserId, testModeId);
    
    // 验证返回空数组
    expect(result.pre_test).toEqual([]);
    expect(result.learning).toEqual([]);
    expect(result.post_test).toEqual([]);

    // 清理模拟
    jest.restoreAllMocks();
  });
});