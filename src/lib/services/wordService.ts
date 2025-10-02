// src/lib/services/wordService.ts
import { COLLECTION_WORDS, DATABASE_ID } from '@/src/constants/appwrite';
import { tablesDB } from '@/src/lib/appwrite';
import { Word, WordOption } from '@/src/types/Word';
import { Query } from 'appwrite';

class WordService {
  async getWordById(wordId: string): Promise<Word | null> {
    try {
      const word = await tablesDB.getRow({databaseId:DATABASE_ID, tableId:COLLECTION_WORDS, rowId:wordId});
      return word as unknown as Word;
    } catch (error: any) {
      if (error.code === 404) {
        return null;
      }
      console.error("WordService.getWordById error:", error);
      throw error;
    }
  }

  async getWordsByIds(wordIds: string[]): Promise<Word[]> {
    if (wordIds.length === 0) return [];
    try {
      // Appwrite Query.equal with array checks if the field value is IN the array
      const response = await tablesDB.listRows({databaseId:DATABASE_ID, tableId:COLLECTION_WORDS, queries:[
        Query.equal('$id', wordIds)
      ]});
      let words = response.rows as unknown as Word[];
      words.map(word => {
        this.generateRandomOptions(word, 6);
      });
      return words;
    } catch (error) {
      console.error("WordService.getWordsByIds error:", error);
      throw error;
    }
  }

  // --- 新增的辅助函数 (如果之前没有) ---
/**
 * 从中文翻译字符串中解析出词性和含义 (简化版)
 * @param chineseMeaning 中文翻译字符串，格式如 "nn. 苹果 v. 动作 v./n. 玩"
 * @returns { partOfSpeech: string; meaning: string } 解析结果
 */
parseChineseMeaning = (chineseMeaning: string): { partOfSpeech: string; meaning: string } => {
  if (!chineseMeaning?.trim()) {
    return { partOfSpeech: '', meaning: '' };
  }
  const trimmedMeaning = chineseMeaning.trim();
  let partOfSpeech = '';
  let meaningPart = trimmedMeaning;
  // 查找第一个点空格的位置
  const dotSpaceIndex = trimmedMeaning.indexOf('. ');
  if (dotSpaceIndex !== -1) {
    // 词性部分：从开始到点空格之前的点（包括点）
    const partOfSpeechTemp = trimmedMeaning.substring(0, dotSpaceIndex + 1); // 包括点，但不包括空格
    if (/^[a-z./]+$/i.test(partOfSpeechTemp)) {
      partOfSpeech = partOfSpeechTemp;
    }
    // 含义部分：从点空格之后开始
    meaningPart = trimmedMeaning.substring(dotSpaceIndex + 2); // 跳过点空格
  }
  // 只获取 第一个含义
  let meaningSeparator = meaningPart.search(/[,;\\]/); // 查找第一个逗号或分号
  if(meaningSeparator !== -1)
    meaningPart = meaningPart.substring(0, meaningSeparator);

  return {
      partOfSpeech: partOfSpeech,
      meaning: meaningPart
    };
};
// ---------------------------------------

// --- 修改后的 generateRandomOptions 方法 ---
/**
 * 生成指定单词的随机选项（包括正确选项和错误选项）
 * @param correctWord 正确的 Word 对象
 * @param count 所需选项的总数量 (包括正确选项)
 * @returns Promise<WordOption[]> 包含选项对象的数组
 */
async generateRandomOptions(correctWord: Word, count: number): Promise<Word> {
  try {
    // 1. 参数校验
    if (count <= 0) {
      console.warn('[WordService] Requested option count is <= 0, returning empty array.');
      return correctWord;
    }
    const parsed = this.parseChineseMeaning(correctWord.chinese_meaning || '');
    correctWord.partOfSpeech = parsed.partOfSpeech;
    correctWord.meaning = parsed.meaning;

    const totalOptionsNeeded = count;
    const falseOptionsCount = Math.max(0, totalOptionsNeeded - 1);

    // 2. 查询候选单词 (排除正确单词)
    let candidateWords: Word[] = [];
    if (falseOptionsCount > 0) {
      console.log(`[WordService] Fetching candidate words (excluding ${correctWord.$id})...`);
      const response = await tablesDB.listRows({
        databaseId: DATABASE_ID,
        tableId: COLLECTION_WORDS,
        queries: [
          Query.notEqual('$id', correctWord.$id),
          Query.limit(Math.max(falseOptionsCount * 5, 50)) // 获取更多以增加随机性
        ]
      });
      candidateWords = response.rows as unknown as Word[];
      console.log(`[WordService] Fetched ${candidateWords.length} candidate words.`);
    }

    // 3. 从候选单词中随机选择 count-1 个
    let selectedFalseWords: Word[] = [];
    if (candidateWords.length > 0 && falseOptionsCount > 0) {
      const shuffledCandidates = candidateWords.sort(() => 0.5 - Math.random());
      selectedFalseWords = shuffledCandidates.slice(0, falseOptionsCount);
      console.log(`[WordService] Selected ${selectedFalseWords.length} false words.`);
    }

    // 4. 合并正确单词和选中的错误单词
    const selectedWordsForOptions: Word[] = [correctWord, ...selectedFalseWords];
    console.log(`[WordService] Total words for options: ${selectedWordsForOptions.length}`);

    // 5. 将选中的单词转换为 WordOption 对象
    let allOptions: WordOption[] = selectedWordsForOptions.map(word => {
        const parsed = this.parseChineseMeaning(word.chinese_meaning || '');
        return {
          partOfSpeech: parsed.partOfSpeech, // 解析出的词性
          spelling: word.spelling,
          meaning: parsed.meaning,           // 解析出的含义
          id: word.$id                      // 使用单词ID
        };
    });

    // 6. 随机打乱所有选项
    const shuffledOptions = allOptions.sort(() => 0.5 - Math.random());
    console.log(`[WordService] Generated and shuffled ${shuffledOptions.length} total options.`);

    // 7. 返回所需数量的选项
    correctWord.options = shuffledOptions;
    // --- 简化逻辑结束 ---
    return correctWord;

  } catch (error: any) {
    console.error(`[WordService] generateRandomOptions error for word ${correctWord?.$id}, count ${count}:`, error);
    return correctWord;
  }
}
}

export default new WordService();