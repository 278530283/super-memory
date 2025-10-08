// src/lib/services/speechRecognitionService.ts
import baiduAIService from '@/src/lib/services/baiduAIService';
import { File } from 'expo-file-system';

// 定义识别结果类型
interface RecognitionResult {
  recognizedText: string;
  isCorrect?: boolean; // 添加是否正确的判断
}

// 配置对象（如果需要）
interface RecognitionConfig {
  language?: string; // 例如 'en-US'
  // ... 其他配置项
}

class SpeechRecognitionService {
  /**
   * 使用百度ASR API识别语音，并与正确答案进行相似度比较
   * @param audioUri 音频文件 URI
   * @param correctSpelling 正确的拼写（用于相似度比较）
   * @param config 识别配置（可选）
   * @returns Promise<RecognitionResult>
   */
  async recognizeSpeech(audioUri: string | null, correctSpelling: string, config?: RecognitionConfig): Promise<RecognitionResult> {
    if (!audioUri) {
      console.log('[SpeechRecognitionService] No audio URI provided for recognition.');
      return { recognizedText: '' };
    }
    if (!correctSpelling) {
        console.log('[SpeechRecognitionService] No correct spelling provided for similarity check.');
        return { recognizedText: '' };
    }
    console.log('[SpeechRecognitionService] Recognizing speech from URI:', audioUri);

    try {

      // 1. 读取临时文件
      let fileSize = 0;
      let base64Data = '';
      try {
        const fileInfo = new File(audioUri);
        base64Data = fileInfo.base64Sync();
        if (fileInfo.exists && fileInfo.size !== undefined) {
          fileSize = fileInfo.size;
        } else {
          console.warn('[SpeechRecognitionService] file does not exist or size is undefined:');
        }
      } catch (error) {
        console.error('[SpeechRecognitionService] Failed to get file info or read ', error);
        throw error; // 重新抛出错误，以便在 finally 中也能处理
      }
      console.log('[SpeechRecognitionService] audio file size:', fileSize);

      // 2. 调用百度ASR API
      console.log('[SpeechRecognitionService] Calling Baidu ASR API...');
      const asrResult = await baiduAIService.recognizeSpeech(base64Data, fileSize);
      const recognizedText = asrResult.recognizedText.trim().replaceAll(/\s+/g, '');
      console.log('[SpeechRecognitionService] Baidu ASR result:', recognizedText);

      // 3. 判断是否正确
      const isCorrect = recognizedText === correctSpelling;
      console.log('[SpeechRecognitionService] Comparing against correct spelling:', correctSpelling);
      console.log('[SpeechRecognitionService] Recognition result - Text:', recognizedText, 'Is Correct:', isCorrect);

      return { recognizedText, isCorrect };
    } catch (error) {
      console.error('[SpeechRecognitionService] Error during speech recognition process:', error);
      // 如果任何步骤失败，返回空结果
      return { recognizedText: '' };
    }
  }
}

export default new SpeechRecognitionService(); // 导出单例