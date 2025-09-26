// src/lib/services/speechRecognitionService.ts
import baiduAIService from '@/src/lib/services/baiduAIService';
import { Audio } from 'expo-av';
import { AndroidAudioEncoder, AndroidOutputFormat, IOSAudioQuality, IOSOutputFormat } from 'expo-av/build/Audio';
import { File } from 'expo-file-system';

// 定义识别结果类型
interface RecognitionResult {
  recognizedText: string;
  confidence?: number; // 如果识别库支持置信度
  similarityScore?: number; // 添加相似度分数
  isCorrect?: boolean; // 添加是否正确的判断
}

// 配置对象（如果需要）
interface RecognitionConfig {
  language?: string; // 例如 'en-US'
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
  private recordingUri: string | null = null; // <--- 新增：保存录音 URI
  private playbackObject: Audio.Sound | null = null; // <--- 新增：用于播放
  private isPlaying: boolean = false; // <--- 新增：跟踪播放状态

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
      // 重置 URI，因为新的录音会覆盖旧的
      this.recordingUri = null;
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

      // 保存 URI
      this.recordingUri = uri;

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
    console.log('[SpeechRecognitionService] Comparing against correct spelling:', correctSpelling);

    try {

      // 1. 读取文件
      let fileSize = 0;
      let base64Data = '';
      try {
        const fileInfo = new File(audioUri);
        base64Data = fileInfo.base64Sync();
        if (fileInfo.exists && fileInfo.size !== undefined) {
          fileSize = fileInfo.size;
        } else {
          console.warn('[SpeechRecognitionService] File does not exist or size is undefined:', audioUri);
        }
      } catch (error) {
        console.error('[SpeechRecognitionService] Failed to get file info for size using new API:', error);
        fileSize = 0; // 设置为 0，让百度 API 处理错误
      }
      console.log('[SpeechRecognitionService] Audio file size:', fileSize);

      // 2. 调用百度ASR API
      console.log('[SpeechRecognitionService] Calling Baidu ASR API...');
      const asrResult = await baiduAIService.recognizeSpeech(base64Data, fileSize);
      const recognizedText = asrResult.recognizedText;

      console.log('[SpeechRecognitionService] Baidu ASR result:', recognizedText);

      // 3. 判断是否正确
      const isCorrect = recognizedText == correctSpelling;

      console.log('[SpeechRecognitionService] Recognition result - Text:', recognizedText, 'Is Correct:', isCorrect);

      return { recognizedText, isCorrect };
    } catch (error) {
      console.error('[SpeechRecognitionService] Error during speech recognition or similarity check:', error);
      // 如果任何步骤失败，返回空结果
      return { recognizedText: '' };
    }
  }

  /**
   * 播放最近录制的音频
   * @returns Promise<void>
   */
  async playRecording(): Promise<void> {
    if (this.isPlaying) {
      console.log('[SpeechRecognitionService] Playback already in progress.');
      return;
    }

    if (!this.recordingUri) {
      console.log('[SpeechRecognitionService] No recording URI to play.');
      return;
    }

    try {
      console.log('[SpeechRecognitionService] Loading recording for playback:', this.recordingUri);
      // 如果之前有播放对象，先卸载它
      if (this.playbackObject) {
        await this.playbackObject.unloadAsync();
      }

      const { sound, status } = await Audio.Sound.createAsync(
        { uri: this.recordingUri },
        { shouldPlay: true } // 创建后立即播放
      );
      this.playbackObject = sound;

      // 监听播放完成事件，重置播放状态
      sound.setOnPlaybackStatusUpdate((playbackStatus) => {
        if ('didJustFinish' in playbackStatus && playbackStatus.didJustFinish) {
          this.isPlaying = false;
          console.log('[SpeechRecognitionService] Playback finished.');
        }
      });

      this.isPlaying = true;
      console.log('[SpeechRecognitionService] Playback started.');
    } catch (error) {
      console.error('[SpeechRecognitionService] Failed to play recording:', error);
      this.isPlaying = false;
      // 卸载失败的播放对象
      if (this.playbackObject) {
        this.playbackObject.unloadAsync().catch(console.error);
        this.playbackObject = null;
      }
    }
  }

  /**
   * 停止当前播放
   * @returns Promise<void>
   */
  async stopPlayback(): Promise<void> {
    if (!this.isPlaying || !this.playbackObject) {
      console.log('[SpeechRecognitionService] No playback in progress to stop.');
      return;
    }

    try {
      console.log('[SpeechRecognitionService] Stopping playback.');
      await this.playbackObject.stopAsync();
      this.isPlaying = false;
      // 通常在播放完成后，onPlaybackStatusUpdate 会自动将 this.isPlaying 设置为 false
      // 但手动停止时也需要设置
    } catch (error) {
      console.error('[SpeechRecognitionService] Failed to stop playback:', error);
    }
  }

  /**
   * 检查是否正在录音
   * @returns boolean
   */
  isCurrentlyRecording(): boolean {
    return this.isRecording;
  }

  /**
   * 检查是否正在播放
   * @returns boolean
   */
  isCurrentlyPlaying(): boolean {
    return this.isPlaying;
  }

  /**
   * 获取最近录制的音频 URI
   * @returns string | null
   */
  getRecordingUri(): string | null {
    return this.recordingUri;
  }
}

export default new SpeechRecognitionService(); // 导出单例