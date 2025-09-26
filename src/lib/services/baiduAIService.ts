// src/lib/services/baiduAIService.ts

// --- 配置项 ---
// 注意：在实际项目中，这些密钥不应硬编码在前端代码中，而应通过后端服务提供或使用更安全的方式管理。
// 这里保留原始示例的硬编码方式，但请务必注意安全风险。
const BAIDU_API_KEY = process.env.EXPO_PUBLIC_BAIDU_API_KEY;
const BAIDU_SECRET_KEY = process.env.EXPO_PUBLIC_BAIDU_SECRET_KEY;
const BAIDU_TOKEN_URL = `https://openapi.baidu.com/oauth/2.0/token?grant_type=client_credentials&client_id=${BAIDU_API_KEY}&client_secret=${BAIDU_SECRET_KEY}`; // 百度获取访问令牌API地址
const BAIDU_ASR_URL = 'https://vop.baidu.com/server_api'; // 百度ASR API地址
const BAIDU_SIMILARITY_URL = 'https://aip.baidubce.com/rpc/2.0/nlp/v2/simnet'; // 短文本相似度API

// 定义服务返回结果的类型
interface RecognitionResult {
  recognizedText: string;
}

interface SimilarityResult {
  score: number; // 0-1 之间的相似度分数
}

class BaiduAIService {
  private accessToken: string | null = null;
  private tokenExpiryTime: number = 0; // 记录令牌过期时间戳

  /**
   * 获取百度API访问令牌
   * @returns Promise<string> 令牌字符串
   */
  private async getAccessToken(): Promise<string> {
    // 检查是否有有效的缓存令牌
    const now = Date.now();
    if (this.accessToken && now < this.tokenExpiryTime) {
      console.log('[BaiduAIService] Using cached access token.');
      return this.accessToken;
    }

    console.log('[BaiduAIService] Fetching new access token...');
    try {
      const response = await fetch(BAIDU_TOKEN_URL);
      const data = await response.json();
      console.log('[BaiduAIService] Access token response:', data);
      if (!data) {
        console.error('[BaiduAIService] Invalid response from Baidu API:', response);
        throw new Error('百度API返回无效数据');
      }

      if (data.access_token) {
        // 假设令牌有效期为 29 天 (29 * 24 * 60 * 60 * 1000 ms)，实际值可能在 data.expires_in 中
        // 这里使用一个安全的较短时间，例如 28 天，以避免临界情况
        const expiryBuffer = 28 * 24 * 60 * 60 * 1000; // 28 天
        this.tokenExpiryTime = now + expiryBuffer;
        this.accessToken = data.access_token;
        console.log('[BaiduAIService] New access token fetched and cached.');
        return this.accessToken!;
      } else {
        console.error('[BaiduAIService] Failed to get Baidu access token:', data);
        throw new Error(data.error_description || '获取访问令牌失败');
      }
    } catch (error) {
      console.error('[BaiduAIService] Error fetching access token:', error);
      throw new Error('无法连接到百度服务以获取访问令牌');
    }
  }

  /**
   * 使用百度ASR API识别语音
   * @param base64Data 音频文件的Base64编码字符串
   * @param fileSize 音频文件的原始大小（字节）
   * @param format 音频格式，默认 'm4a'
   * @param rate 采样率，默认 16000
   * @returns Promise<RecognitionResult>
   */
  async recognizeSpeech(base64Data: string, fileSize: number, format: string = 'm4a', rate: number = 16000): Promise<RecognitionResult> {
    console.log('[BaiduAIService] Starting speech recognition.');
    let token: string;

    try {
      token = await this.getAccessToken();
    } catch (error) {
      console.error('[BaiduAIService] Failed to get token for recognition:', error);
      throw error; // 重新抛出错误，让调用者处理
    }

    try {
      const response = await fetch(BAIDU_ASR_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          format: format,
          rate: rate,
          dev_pid: 1737, // 英语
          channel: 1,
          token: token,
          cuid: 'expo-app', // 设备唯一标识，可以使用设备ID或其他唯一字符串
          speech: base64Data,
          len: fileSize,
        }),
      });

      const data = await response.json();
      console.log('[BaiduAIService] Baidu ASR API response:', data);

      if (data.err_no === 0 && data.result && data.result.length > 0) {
        // 百度返回的文本可能以句号结尾，这里移除
        const recognizedText = data.result[0].replace(/。$/, '');
        console.log('[BaiduAIService] Recognized text:', recognizedText);
        return { recognizedText };
      } else {
        console.error('[BaiduAIService] ASR API error:', data);
        const errorMessage = data.err_msg || '语音识别失败';
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error('[BaiduAIService] Error during speech recognition:', error);
      throw new Error('语音识别过程中发生错误');
    }
  }

  /**
   * 使用百度短文本相似度API计算相似度
   * @param text1 第一个文本
   * @param text2 第二个文本
   * @param model 模型类型，默认 'BOW' (可选 'BOW', 'CNN', 'DNN', 'NLP')
   * @returns Promise<SimilarityResult>
   */
  async getTextSimilarity(text1: string, text2: string, model: 'BOW' | 'CNN' | 'DNN' | 'NLP' = 'BOW'): Promise<SimilarityResult> {
    console.log('[BaiduAIService] Calculating text similarity between:', text1, 'and', text2);
    let token: string;

    try {
      token = await this.getAccessToken();
    } catch (error) {
      console.error('[BaiduAIService] Failed to get token for similarity check:', error);
      throw error; // 重新抛出错误，让调用者处理
    }

    try {
      const url = `${BAIDU_SIMILARITY_URL}?access_token=${token}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text_1: text1,
          text_2: text2,
          model: model, // 可选参数
        }),
      });

      const data = await response.json();
      console.log('[BaiduAIService] Similarity API response:', data);

      if (data.error_code) {
        console.error('[BaiduAIService] Similarity API error:', data);
        const errorMessage = data.error_msg || `相似度计算失败 (错误码: ${data.error_code})`;
        throw new Error(errorMessage);
      }

      const score = data.score; // 返回 0-1 之间的分数
      console.log(`[BaiduAIService] Similarity score: ${score}`);
      return { score };
    } catch (error) {
      console.error('[BaiduAIService] Error calculating text similarity:', error);
      throw new Error('文本相似度计算过程中发生错误');
    }
  }
}

export default new BaiduAIService(); // 导出单例