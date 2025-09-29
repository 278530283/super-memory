// src/__tests__/services/learningModeService.test.ts
import learningModeService from '@/src/lib/services/learningModeService';

// 使用真实的 Appwrite 客户端，不进行模拟
test('LearningModeService Integration Tests', async () => {
  // 设置较长的超时时间，因为涉及网络请求
  jest.setTimeout(30000);

  // 使用真实的数据ID进行测试
  // 假设数据库中存在ID为1的学习模式
  const result = await learningModeService.getLearningMode("1");
  console.log("getLearningMode result:", result);
  
  expect(result).not.toBeNull();
  expect(result?.$id).toBe(1);
  expect(result?.mode_name).toBeDefined();
  expect(result?.word_count).toBeDefined();
});

test('getLearningMode retrieves learning mode details', async () => {
  const modeList = await learningModeService.getAllLearningModes();
  console.log("getAllLearningModes result:", modeList);
  expect(modeList).not.toBeNull();
  expect(Array.isArray(modeList)).toBe(true);
  expect(modeList.length).toBeGreaterThan(0);
});