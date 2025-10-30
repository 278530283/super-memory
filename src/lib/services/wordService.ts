// src/lib/services/wordService.ts
import { COLLECTION_WORDS, DATABASE_ID } from '@/src/constants/appwrite';
import { tablesDB } from '@/src/lib/appwrite';
import { parseExampleSentences, Word, WordMeaning, WordOption } from '@/src/types/Word';
import { Query } from 'appwrite';

class WordService {
  async getWordById(wordId: string): Promise<Word | null> {
    try {
      const response = await tablesDB.getRow({databaseId:DATABASE_ID, tableId:COLLECTION_WORDS, rowId:wordId});
      let word = response as unknown as Word;
      this.processWordData(word);
      await this.generateRandomOptions(word, 6);
      return word;
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
      words = words.map(word => this.processWordData(word));
      
      // 按顺序获取单词
      const wordMap = new Map(words.map(word => [word.$id, word]));
      const orderedWords = wordIds
        .map(id => wordMap.get(id))
        .filter(word => word !== undefined) as Word[];
      
      // 为每个单词生成选项
      const wordsWithOptions = await Promise.all(
        orderedWords.map(word => this.generateRandomOptions(word, 6))
      );
      
      return wordsWithOptions;
    } catch (error) {
      console.error("WordService.getWordsByIds error:", error);
      throw error;
    }
  }

  /**
   * 处理单词数据，包括解析例句等
   */
  private processWordData(word: Word): Word {
    // 解析例句数据
    if (word.example_sentence && !word.example_sentences) {
      word.example_sentences = parseExampleSentences(word.example_sentence);
    }
    return word;
  }

  // --- 通用的词性拆分方法 ---
  /**
   * 通用的词性拆分方法，支持中英文释义处理
   * @param meaning 释义字符串，多个释义由\\n分隔，每个释义格式如 "n. 苹果; 苹果公司\\n v. 动作; 行动"
   * @returns WordMeaning[] 解析结果数组，每个词性包含多个含义
   */
  parseMeanings = (meaning: string): WordMeaning[] => {
    if (!meaning?.trim()) {
      return [];
    }

    const results: { partOfSpeech: string; meanings: string[] }[] = [];
    
    // 按换行符分割多个释义
    let meaningText = meaning;
    if(meaningText.includes('\\n')){
      meaningText = meaningText.replaceAll('\\n', '\n');
    }
    const meaningBlocks = meaningText.split('\n').filter(block => block.trim());
    
    // 定义支持的词性模式
    const pattern = /^(n|a|v|r|s|vi|vt|pl|num|adv|pron|prep|interj|\[[^\]]+\])([\.\s])(.*)$/;

    for (const block of meaningBlocks) {
      const trimmedBlock = block.trim();
      
      // 尝试匹配词性
      let matchedPos = '';
      let meaningPart = trimmedBlock;
      
      const match = trimmedBlock.match(pattern);
      if (match && match.length === 4) {
        matchedPos = match[1];
        meaningPart = match[3];
      }

      // 提取含义部分并清理
      meaningPart = meaningPart.trim();
      meaningPart = meaningPart.replace(/^[.:：\s\r]+/, '');

      // 按分号分割多个含义
      const subMeanings = meaningPart.split(';')
        .map(m => this.getFirstPart(m.trim()))
        .filter(m => m.length > 0);
      
      if (subMeanings.length > 0) {
        // 为每个词性创建一个条目，包含所有含义
        results.push({
          partOfSpeech: matchedPos,
          meanings: subMeanings
        });
      } else {
        // 如果没有明确分隔的含义，将整个部分作为一个含义
        
        results.push({
          partOfSpeech: matchedPos,
          meanings: [this.getFirstPart(meaningPart)]
        });
      }
    }

    return results;
  };

  getFirstPart = (meaning: string): string => {
    return meaning.split(',')[0].trim();
  }

  // --- 修改后的 parseChineseMeaning 方法，使用通用的词性拆分 ---
  /**
   * 从中文翻译字符串中解析出词性和含义
   * @param chineseMeaning 中文翻译字符串，格式如 "n. 苹果; 苹果公司\\nv. 动作; 行动"
   * @returns { partOfSpeech: string; meaning: string } 解析结果（返回第一个词性的第一个含义）
   */
  parseChineseMeaning = (chineseMeaning: string): { partOfSpeech: string; meaning: string } => {
    if (!chineseMeaning?.trim()) {
      return { partOfSpeech: '', meaning: '' };
    }

    const parsedMeanings = this.parseMeanings(chineseMeaning);
  
    return this.getFirstMeaning(parsedMeanings);
  };

  /**
   * 获取单词的第一个词性和含义
   * @param meanings 
   * @returns 
   */
  getFirstMeaning(meanings: WordMeaning[]): { partOfSpeech: string; meaning: string } { 
    
    // 返回第一个词性的第一个含义
    if (meanings.length > 0 && meanings[0].meanings.length > 0) {
      return {
        partOfSpeech: meanings[0].partOfSpeech,
        meaning: meanings[0].meanings[0]
      };
    }
    
    return { partOfSpeech: '', meaning: '' };
  }

  // --- 新增方法：获取所有词性和含义 ---
  /**
   * 获取单词的所有词性和含义
   * @param meaning 释义字符串
   * @returns WordMeaning[] 所有词性和含义的数组
   */
  getAllMeanings = (meaning: string): WordMeaning[] => {
    return this.parseMeanings(meaning);
  };

  // --- 新增方法：获取扁平化的所有含义（保持向后兼容）---
  /**
   * 获取扁平化的所有含义（每个含义单独一个对象）
   * @param meaning 释义字符串
   * @returns { partOfSpeech: string; meaning: string }[] 扁平化的含义数组
   */
  getAllMeaningsFlat = (meaning: string): { partOfSpeech: string; meaning: string }[] => {
    const groupedMeanings = this.parseMeanings(meaning);
    const flatMeanings: { partOfSpeech: string; meaning: string }[] = [];
    
    groupedMeanings.forEach(group => {
      group.meanings.forEach(meaningText => {
        flatMeanings.push({
          partOfSpeech: group.partOfSpeech,
          meaning: meaningText
        });
      });
    });
    
    return flatMeanings;
  };

// --- 修改后的 generateRandomOptions 方法 ---
/**
 * 生成指定单词的随机选项（包括正确选项和错误选项）
 * @param correctWord 正确的 Word 对象
 * @param count 所需选项的总数量 (包括正确选项)
 * @returns Promise<Word> 包含选项的单词对象
 */
async generateRandomOptions(correctWord: Word, count: number): Promise<Word> {
  try {
    // 1. 参数校验
    if (count <= 0) {
      console.warn('[WordService] Requested option count is <= 0, returning empty array.');
      return correctWord;
    }
    const definitions = this.getAllMeanings(correctWord.definition || '');
    correctWord.definitions = definitions;
    correctWord.chinese_meanings = this.getAllMeanings(correctWord.chinese_meaning || '');
    const parsed = this.getFirstMeaning(correctWord.chinese_meanings);
    correctWord.partOfSpeech = parsed.partOfSpeech;
    correctWord.meaning = parsed.meaning;

    const totalOptionsNeeded = count;
    const falseOptionsCount = Math.max(0, totalOptionsNeeded - 1);

    // 2. 查询候选单词 (排除正确单词)
    let candidateWords: Word[] = [];
    if (falseOptionsCount > 0) {
      const response = await tablesDB.listRows({
        databaseId: DATABASE_ID,
        tableId: COLLECTION_WORDS,
        queries: [
          Query.notEqual('$id', correctWord.$id),
          Query.limit(Math.max(falseOptionsCount * 5, 50)) // 获取更多以增加随机性
        ]
      });
      candidateWords = response.rows as unknown as Word[];
    }

    // 3. 从候选单词中随机选择 count-1 个
    let selectedFalseWords: Word[] = [];
    if (candidateWords.length > 0 && falseOptionsCount > 0) {
      const shuffledCandidates = candidateWords.sort(() => 0.5 - Math.random());
      selectedFalseWords = shuffledCandidates.slice(0, falseOptionsCount);
    }

    // 4. 合并正确单词和选中的错误单词
    const selectedWordsForOptions: Word[] = [correctWord, ...selectedFalseWords];

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

      // 7. 设置处理后的单词选项
    correctWord.options = shuffledOptions;
    console.log(`[WordService] Generated options for word ${correctWord.$id}:`, shuffledOptions);
    // --- 简化逻辑结束 ---
    return correctWord;

  } catch (error: any) {
    console.error(`[WordService] generateRandomOptions error for word ${correctWord?.$id}, count ${count}:`, error);
    return correctWord;
  }
}

  /**
 * 查询新学的单词（只返回单词ID，按照frequency排序）
 * @param userId 用户ID
 * @param reviewedWordIds 已复习过的单词ID数组（需要排除）
 * @param englishLevel 英语水平（可选），0:零基础 1：小学 2：初中 3：高中
 * @param tag 标签（可选），支持模糊匹配（如输入"gk"可以匹配到"gk, zk gk"）
 * @param limit 限制返回数量，默认10
 * @returns Promise<string[]> 新学单词ID数组
 */
async getNewWordIds(
  userId: string,
  reviewedWordIds: string[] = [],
  englishLevel?: number,
  tag?: string | null,
  limit: number = 20
): Promise<string[]> {
  try {
    console.log(`[WordService] Getting new word IDs for user ${userId}, excluding ${reviewedWordIds.length} reviewed words, tag: ${tag}`);

    const queries = [];

    // 排除已复习过的单词
    if (reviewedWordIds.length > 0) {
      queries.push(Query.notContains('$id', reviewedWordIds));
    }

    // 难度等级筛选
    if (englishLevel !== undefined) {
      const difficultyLevel = this.getDifficultyLevel(englishLevel);
      queries.push(Query.equal('difficulty_level', difficultyLevel));
    }

    // 标签筛选 - 使用模糊搜索
    if (tag) {
      queries.push(Query.contains('tag', tag)); // 使用search进行模糊匹配
    }

    // 添加限制、排序和字段选择
    queries.push(Query.select(['$id'])); // 只选择ID字段
    queries.push(Query.orderDesc('frequency')); // 按照frequency降序排列（高频词优先）
    queries.push(Query.limit(limit));

    const response = await tablesDB.listRows({
      databaseId: DATABASE_ID,
      tableId: COLLECTION_WORDS,
      queries
    });

    const wordIds = response.rows.map(row => row.$id as string);
    
    console.log(`[WordService] Found ${wordIds.length} new word IDs for user ${userId}, tag: ${tag}, sorted by frequency`);
    return wordIds;

  } catch (error) {
    console.error("WordService.getNewWordIds error:", error);
    throw error;
  }
}

/**
 * 将englishLevel映射到对应的难度级别
 * @param englishLevel 英语水平等级（0-3及其他）
 * @returns 映射后的难度级别（1,2,3）
 */
getDifficultyLevel(englishLevel: number): number {
  // 检查0、1、2 -> 难度1：中考
  if ([0, 1, 2].includes(englishLevel)) {
      return 1;
  }
  // 检查3 -> 难度2：高考
  else if (englishLevel === 3) {
      return 2;
  }
  // 其他情况（包括负数、4及以上等）-> 难度3
  else {
      return 3;
  }
}

}

export default new WordService();