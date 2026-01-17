// src/lib/utils/WordAudioPlayer.ts
import { createAudioPlayer } from "expo-audio";
import { Directory, File, Paths } from "expo-file-system";
import * as Speech from "expo-speech";

interface PlayOptions {
  accent?: "uk" | "us";
  fallbackToTTS?: boolean;
  playbackRate?: number;
}

class WordAudioPlayer {
  private static instance: WordAudioPlayer;
  private cacheDir: Directory;
  private player: any = null;

  private constructor() {
    // 使用缓存目录，根据新 API 创建 Directory 对象
    this.cacheDir = new Directory(Paths.cache, "word_audio");
    this.ensureCacheDir();
  }

  static getInstance(): WordAudioPlayer {
    if (!WordAudioPlayer.instance) {
      WordAudioPlayer.instance = new WordAudioPlayer();
    }
    return WordAudioPlayer.instance;
  }

  private async ensureCacheDir(): Promise<void> {
    try {
      // 创建缓存目录（如果不存在）
      if (!(await this.cacheDir.exists)) {
        await this.cacheDir.create();
      }
    } catch (error) {
      console.error("Failed to create cache directory:", error);
    }
  }

  private getCacheFilePath(word: string, accent: "uk" | "us"): string {
    return `${this.cacheDir.uri}${word.toLowerCase()}_${accent}.mp3`;
  }

  private async getCachedAudio(
    word: string,
    accent: "uk" | "us",
  ): Promise<File | null> {
    try {
      const fileName = `${word.toLowerCase()}_${accent}.mp3`;
      const file = new File(this.cacheDir, fileName);
      console.log(`文件路径: ${file.uri}`);
      console.log(`文件是否存在: ${file.exists}`);

      const exists = await file.exists;
      return exists ? file : null;
    } catch (error) {
      console.error("Error checking cached audio:", error);
      return null;
    }
  }

  private async downloadAudio(
    word: string,
    accent: "uk" | "us",
  ): Promise<File | null> {
    try {
      const type = accent === "uk" ? 1 : 2;
      const encodedWord = encodeURIComponent(word);
      const url = `https://dict.youdao.com/dictvoice?type=${type}&audio=${encodedWord}`;

      const fileName = `${word.toLowerCase()}_${accent}.mp3`;

      console.log(`下载音频: ${word} (${accent}) from ${url}`);
      console.log(`缓存地址: ${this.cacheDir.uri}`);

      // 使用新 API 下载文件
      const file = new File(this.cacheDir, fileName);
      console.log(`文件是否存在:${file.exists}`);
      await File.downloadFileAsync(url, file, {
        idempotent: true,
      });

      // 重命名文件为我们想要的文件名
      if (file.exists) {
        return file;
      }

      return null;
    } catch (error) {
      console.error(`下载音频失败 ${word}:`, error);
      return null;
    }
  }

  private async getOrDownloadAudio(
    word: string,
    accent: "uk" | "us",
  ): Promise<File | null> {
    // 检查缓存
    const cachedFile = await this.getCachedAudio(word, accent);
    if (cachedFile) {
      return cachedFile;
    }

    // 下载音频
    return await this.downloadAudio(word, accent);
  }

  private async playLocalAudio(
    file: File,
    playbackRate: number = 1.0,
  ): Promise<boolean> {
    try {
      console.log(`开始播放本地音频: ${file.uri}`);
      // 先停止当前播放
      await this.stop();

      // 创建播放器并设置播放速度
      this.player = createAudioPlayer(file.uri);
      this.player.seekTo(0);
      // this.player.playbackRate = playbackRate;

      // 开始播放
      this.player.play();

      console.log(`播放完成`);

      return true;
    } catch (error) {
      console.error("播放本地音频失败:", error);
      return false;
    }
  }

  private async playTTS(
    word: string,
    playbackRate: number = 0.6,
  ): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        Speech.speak(word, {
          language: "en-US",
          rate: playbackRate,
          pitch: 1.0,
          volume: 1.0,
          onDone: () => resolve(true),
          onError: () => resolve(false),
        });
      } catch {
        resolve(false);
      }
    });
  }

  /**
   * 预下载单词发音
   */
  async preload(word: string, accent: "uk" | "us" = "us"): Promise<void> {
    try {
      await this.getOrDownloadAudio(word, accent);
    } catch (error) {
      console.error(`预下载 ${word} 发音失败:`, error);
    }
  }

  /**
   * 播放单词发音
   */
  async play(word: string, options: PlayOptions = {}): Promise<boolean> {
    const { accent = "us", fallbackToTTS = true, playbackRate = 1.0 } = options;

    try {
      // 尝试获取音频文件
      const audioFile = await this.getOrDownloadAudio(word, accent);

      if (audioFile) {
        // 播放本地音频文件
        return await this.playLocalAudio(audioFile, playbackRate);
      }

      // 如果没有音频文件，使用TTS
      if (fallbackToTTS) {
        return await this.playTTS(word, playbackRate);
      }

      return false;
    } catch (error) {
      console.error("播放失败:", error);

      if (fallbackToTTS) {
        return await this.playTTS(word, playbackRate);
      }

      return false;
    }
  }

  /**
   * 停止播放
   */
  async stop(): Promise<void> {
    try {
      if (this.player) {
        this.player.remove();
        this.player = null;
      }
      Speech.stop();
    } catch (error) {
      console.error("停止播放失败:", error);
    }
  }

  /**
   * 检查单词是否有缓存
   */
  async hasCache(word: string, accent: "uk" | "us" = "us"): Promise<boolean> {
    const file = await this.getCachedAudio(word, accent);
    return !!file;
  }

  /**
   * 获取缓存统计信息
   */
  async getCacheStats(): Promise<{ count: number; size: number }> {
    try {
      const files = await this.cacheDir.list();
      const mp3Files = files.filter((file) => file.name.endsWith(".mp3"));

      let totalSize = 0;
      for (const file of mp3Files) {
        const info = await file.info();
        totalSize += info.size || 0;
      }

      return { count: mp3Files.length, size: totalSize };
    } catch (error) {
      console.error("获取缓存统计失败:", error);
      return { count: 0, size: 0 };
    }
  }

  /**
   * 清理所有缓存
   */
  async clearCache(): Promise<void> {
    try {
      await this.stop();
      await this.cacheDir.delete();
      await this.ensureCacheDir();
      console.log("音频缓存已清理");
    } catch (error) {
      console.error("清理缓存失败:", error);
    }
  }
}

export default WordAudioPlayer.getInstance();
