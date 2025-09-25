// src/lib/services/speechRecognitionService.ts
import { Audio } from 'expo-av';
import { AndroidAudioEncoder, AndroidOutputFormat, IOSAudioQuality, IOSOutputFormat } from 'expo-av/build/Audio';

// 模拟语音识别的延迟时间（毫秒）
const SIMULATED_RECOGNITION_DELAY = 1500;

// 定义识别结果类型
interface RecognitionResult {
  recognizedText: string;
  confidence?: number; // 如果识别库支持置信度
}

// 配置对象（如果需要）
interface RecognitionConfig {
  // language?: string; // 例如 'en-US'
  // ... 其他配置项
}

// 音频录制配置
const RECORDING_OPTIONS: Audio.RecordingOptions = {
  // 以下配置适用于 iOS 和 Android
  // iOS
  ios: {
    extension: '.m4a',
    outputFormat: IOSOutputFormat.MPEG4AAC,
    audioQuality: IOSAudioQuality.MAX,
    sampleRate: 44100,
    numberOfChannels: 2,
    bitRate: 128000,
  },
  // Android
  android: {
    extension: '.m4a',
    outputFormat: AndroidOutputFormat.MPEG_4,
    audioEncoder: AndroidAudioEncoder.AAC,
    sampleRate: 44100,
    numberOfChannels: 2,
    bitRate: 128000,
  },
  // Web
  web: {
    mimeType: 'audio/webm', // 或 'audio/ogg'
    bitsPerSecond: 128000,
  },
};

class SpeechRecognitionService {
  private recording: Audio.Recording | null = null;
  private isRecording: boolean = false;

  /**
   * 开始录音
   * @returns Promise<void>
   */
  async startRecording(): Promise<void> {
    if (this.isRecording) {
      console.log('[SpeechRecognitionService] Recording already in progress.');
      return;
    }

    try {
      console.log('[SpeechRecognitionService] Requesting permissions...');
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status !== 'granted') {
        throw new Error('录音权限被拒绝');
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      console.log('[SpeechRecognitionService] Starting recording...');
      const { recording } = await Audio.Recording.createAsync(RECORDING_OPTIONS);
      this.recording = recording;
      this.isRecording = true;
      console.log('[SpeechRecognitionService] Recording started.');
    } catch (error) {
      console.error('[SpeechRecognitionService] Failed to start recording:', error);
      this.isRecording = false;
      throw error;
    }
  }

  /**
   * 停止录音并获取音频 URI
   * @returns Promise<string | null> 返回音频文件 URI，如果失败或未录音则返回 null
   */
  async stopRecording(): Promise<string | null> {
    if (!this.isRecording || !this.recording) {
      console.log('[SpeechRecognitionService] No recording in progress to stop.');
      return null;
    }

    try {
      console.log('[SpeechRecognitionService] Stopping recording...');
      await this.recording.stopAndUnloadAsync();
      const uri = this.recording.getURI();
      console.log('[SpeechRecognitionService] Recording stopped. URI:', uri);

      // 重置状态
      this.recording = null;
      this.isRecording = false;

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });

      return uri;
    } catch (error) {
      console.error('[SpeechRecognitionService] Failed to stop recording:', error);
      this.isRecording = false;
      this.recording = null;
      return null;
    }
  }

  /**
   * 模拟语音识别过程
   * @param audioUri 音频文件 URI
   * @param config 识别配置（可选）
   * @returns Promise<RecognitionResult>
   */
  async recognizeSpeech(audioUri: string | null, config?: RecognitionConfig): Promise<RecognitionResult> {
    if (!audioUri) {
      console.log('[SpeechRecognitionService] No audio URI provided for recognition.');
      return { recognizedText: '' };
    }

    console.log('[SpeechRecognitionService] Recognizing speech from URI:', audioUri);
    // --- 模拟识别延迟 ---
    await new Promise(resolve => setTimeout(resolve, SIMULATED_RECOGNITION_DELAY));

    // --- 模拟识别结果 ---
    // 在实际应用中，这里应该调用真实的语音识别 API 或库
    // 例如，使用 react-native-voice 或者调用后端 API
    // 以下是一个非常简化的模拟逻辑，实际应根据音频内容返回结果
    const mockRecognizedText = 'property'; // 模拟识别出的文本

    console.log('[SpeechRecognitionService] Recognition result:', mockRecognizedText);
    return { recognizedText: mockRecognizedText };
  }

  /**
   * 便捷方法：开始录音 -> 停止录音 -> 识别 -> 返回结果
   * @param config 识别配置（可选）
   * @returns Promise<RecognitionResult>
   */
  async startAndRecognize(config?: RecognitionConfig): Promise<RecognitionResult> {
    try {
      await this.startRecording();
      // 等待用户停止（实际应用中需要 UI 控制）
      // 这里模拟一个录音时间，或者等待外部信号停止
      // 为了简化，我们直接停止（实际应用需要外部调用 stop）
      // 这个方法可能不太适合直接调用，因为停止录音的时机不确定
      // 更适合在 UI 中分开调用 start 和 stop，然后在 stop 后调用 recognize
      // 因此，我们主要提供 start, stop, recognize 三个独立的方法
      console.warn('[SpeechRecognitionService] startAndRecognize is not fully implemented for UI control.');
      return { recognizedText: '' };
    } catch (error) {
      console.error('[SpeechRecognitionService] Error in startAndRecognize:', error);
      return { recognizedText: '' };
    }
  }

  /**
   * 检查是否正在录音
   * @returns boolean
   */
  isCurrentlyRecording(): boolean {
    return this.isRecording;
  }
}

export default new SpeechRecognitionService(); // 导出单例