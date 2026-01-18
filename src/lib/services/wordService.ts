// src/lib/services/wordService.ts
import { COLLECTION_WORDS, DATABASE_ID } from "@/src/constants/appwrite";
import { functions, tablesDB } from "@/src/lib/appwrite";
import {
  Word,
  WordMeaning
} from "@/src/types/Word";
import { Query } from "appwrite";

class WordService {
  // 云函数名称
  private FUNCTION_ID = process.env.EXPO_PUBLIC_APPWRITE_FUNCTION_SESSION || "";

  async getWordById(
    wordId: string,
    isIncludeExample?: boolean,
    isIncludeOptions?: boolean,
  ): Promise<Word | null> {
    try {
      console.log(`[WordService] 通过云函数获取单词: ${wordId}`);

      // 准备请求数据
      const payload = {
        action: "getWordById",
        wordId,
        isIncludeExample: isIncludeExample ?? true,
        isIncludeOptions: isIncludeOptions ?? true,
      };

      // 调用云端 Function
      const execution = await functions.createExecution({
        functionId: this.FUNCTION_ID,
        body: JSON.stringify(payload), // 数据作为字符串传递
        async: false, // 设置为 false 表示同步执行（等待结果）
      });

      console.log("[WordService] 云函数执行结果:", execution);
      // 检查执行状态
      if (execution.status === "failed") {
        throw new Error(
          `[WordService] 云函数执行失败: ${execution.errors || "未知错误"}`,
        );
      }

      // 解析响应
      let result;
      try {
        result = JSON.parse(execution.responseBody || "{}");
      } catch (parseError) {
        console.error("[WordService] 解析云函数响应失败:", parseError);
        throw new Error("云函数返回的数据格式错误");
      }

      if (!result.success) {
        if (result.code === "WORD_NOT_FOUND") {
          return null;
        }
        throw new Error(result.error || "获取单词失败");
      }

      const word = result.data as Word;
      console.log("[WordService] 获取的单词:", word);

      return word;
    } catch (error: any) {
      console.error("WordService.getWordById error:", error);
      throw error;
    }
  }

  async getWordsByIds(
    wordIds: string[],
    isIncludeExample?: boolean,
    isIncludeOptions?: boolean,
  ): Promise<Word[]> {
    try {
      console.log(`[WordService] 批量获取单词: ${wordIds.length} 个单词`);

      if (wordIds.length === 0) {
        return [];
      }

      // 准备请求数据
      const payload = {
        action: "getWordsByIds",
        wordIds: wordIds,
        isIncludeExample: isIncludeExample ?? true,
        isIncludeOptions: isIncludeOptions ?? true,
      };

      console.log(`[WordService] 调用云函数获取批量单词...`);

      // 调用云端 Function
      const execution = await functions.createExecution({
        functionId: this.FUNCTION_ID,
        body: JSON.stringify(payload),
        async: false, // 同步执行
      });

      console.log("[WordService] 云函数执行结果:", execution);

      // 检查执行状态
      if (execution.status === "failed") {
        throw new Error(
          `[WordService] 云函数执行失败: ${execution.errors || "未知错误"}`,
        );
      }

      // 解析响应
      let result;
      try {
        result = JSON.parse(execution.responseBody || "{}");
      } catch (parseError) {
        console.error("[WordService] 解析云函数响应失败:", parseError);
        throw new Error("云函数返回的数据格式错误");
      }

      if (!result.success) {
        throw new Error(result.error || "批量获取单词失败");
      }

      const words = result.data as Word[];
      console.log(`[WordService] 成功获取 ${words.length} 个单词`);

      return words;
    } catch (error: any) {
      console.error("WordService.getWordsByIds error:", error);
      throw error;
    }
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
    if (meaningText.includes("\\n")) {
      meaningText = meaningText.replaceAll("\\n", "\n");
    }
    const meaningBlocks = meaningText
      .split("\n")
      .filter((block) => block.trim());

    // 定义支持的词性模式
    const pattern =
      /^(n|a|v|r|s|vi|vt|pl|num|adv|pron|conj|prep|interj|\[[^\]]+\])([\.\s])(.*)$/;

    for (const block of meaningBlocks) {
      const trimmedBlock = block.trim();

      // 尝试匹配词性
      let matchedPos = "";
      let meaningPart = trimmedBlock;

      const match = trimmedBlock.match(pattern);
      if (match && match.length === 4) {
        matchedPos = match[1];
        meaningPart = match[3];
      }

      // 提取含义部分并清理
      meaningPart = meaningPart.trim();
      meaningPart = meaningPart.replace(/^[.:：\s\r]+/, "");
      meaningPart = meaningPart.replace("；", ";");
      meaningPart = meaningPart.replace("（", "(");
      meaningPart = meaningPart.replace("）", ")");
      if (meaningPart.includes("(")) {
        meaningPart = meaningPart.replace(/\([^)]*\)/g, "");
      }
      if (meaningPart.includes("[")) {
        meaningPart = meaningPart.replace(/\[[^)]*\]/g, "");
      }

      // 按分号分割多个含义
      const subMeanings = meaningPart
        .split(";")
        .map((m) => this.getFirstPart(m.trim()))
        .filter((m) => m.length > 0);

      if (subMeanings.length > 0) {
        // 为每个词性创建一个条目，包含所有含义
        results.push({
          partOfSpeech: matchedPos,
          meanings: subMeanings,
        });
      } else {
        // 如果没有明确分隔的含义，将整个部分作为一个含义
        results.push({
          partOfSpeech: matchedPos,
          meanings: [this.getFirstPart(meaningPart)],
        });
      }
    }

    return results;
  };

  getFirstPart = (meaning: string): string => {
    return meaning.split(",")[0].trim();
  };

  /**
   * 查询新学的单词（只返回单词ID，按照frequency排序）
   * @param userId 用户ID
   * @param reviewedWordIds 已复习过的单词ID数组（需要排除）
   * @param englishLevel 英语水平（可选），0:零基础 1：小学 2：初中 3：高中
   * @param tag 标签（可选），支持模糊匹配（如输入"gk"可以匹配到"zk gk"）
   * @param limit 限制返回数量，默认10
   * @returns Promise<string[]> 新学单词ID数组
   */
  async getNewWordIds(
    userId: string,
    reviewedWordIds: string[] = [],
    englishLevel?: number,
    tag?: string | null,
    limit: number = 20,
  ): Promise<string[]> {
    try {
      console.log(
        `[WordService] Getting new word IDs for user ${userId}, excluding ${reviewedWordIds.length} reviewed words, tag: ${tag}`,
      );

      const queries = [];

      // 排除已复习过的单词
      if (reviewedWordIds.length > 0) {
        queries.push(Query.notContains("$id", reviewedWordIds.slice(0, 100)));
      }

      // 难度等级筛选
      if (englishLevel !== undefined) {
        const difficultyLevel = this.getDifficultyLevel(englishLevel);
        queries.push(Query.equal("difficulty_level", difficultyLevel));
      }

      // 标签筛选 - 使用模糊搜索
      if (tag) {
        queries.push(Query.contains("tag", tag));
      }

      // 添加限制、排序和字段选择
      queries.push(Query.select(["$id"]));
      queries.push(Query.orderRandom());
      queries.push(Query.limit(limit));

      const response = await tablesDB.listRows({
        databaseId: DATABASE_ID,
        tableId: COLLECTION_WORDS,
        queries,
      });

      const wordIds = response.rows.map((row) => row.$id as string);

      console.log(
        `[WordService] Found ${wordIds.length} new word IDs for user ${userId}, tag: ${tag}`,
      );
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
