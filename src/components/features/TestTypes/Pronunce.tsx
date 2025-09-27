// src/components/features/today/TestTypes/Pronunce.tsx
import speechRecognitionService from '@/src/lib/services/speechRecognitionService';
import { TestTypeProps } from '@/src/types/Word';
import { Ionicons } from '@expo/vector-icons';
import { AudioModule, AudioQuality, createAudioPlayer, RecordingOptions, setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus, useAudioRecorder, useAudioRecorderState } from 'expo-audio'; // 导入 expo-audio
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import {
  Alert,
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

// 错误回退组件
const ErrorFallback = ({ error, resetErrorBoundary }: any) => (
  <View style={styles.errorContainer}>
    <Ionicons name="warning" size={48} color="#FF9500" />
    <Text style={styles.errorText}>组件加载失败</Text>
    <Text style={styles.errorSubText}>{error.message}</Text>
    <TouchableOpacity style={styles.retryButton} onPress={resetErrorBoundary}>
      <Text style={styles.retryButtonText}>重试</Text>
    </TouchableOpacity>
  </View>
);

// 主组件
const Pronunce: React.FC<TestTypeProps> = ({ 
  word, 
  onAnswer, 
  testType = 'pronunce'
}) => {
  const recordOptions: RecordingOptions = {
  extension: '.m4a',
  sampleRate: 8000,
  numberOfChannels: 2,
  bitRate: 48000,
  android: {
    outputFormat: 'mpeg4',
    audioEncoder: 'aac',
  },
  ios: {
    outputFormat: 'aac ',
    audioQuality: AudioQuality.MAX,
    linearPCMBitDepth: 16,
    linearPCMIsBigEndian: false,
    linearPCMIsFloat: false,
  },
  web: {
    mimeType: 'audio/webm',
    bitsPerSecond: 128000,
  },
};

  const audioRecorder = useAudioRecorder(recordOptions);
  const recorderState = useAudioRecorderState(audioRecorder);

  useEffect(() => {
    (async () => {
      const status = await AudioModule.requestRecordingPermissionsAsync();
      if (!status.granted) {
        Alert.alert('Permission to access microphone was denied');
      }

      setAudioModeAsync({
        playsInSilentMode: true,
        allowsRecording: true,
      });
    })();
  }, []);

  const [recognizedText, setRecognizedText] = useState<string|null>(null);
  const [showFeedback, setShowFeedback] = useState<{ correct: boolean; message: string } | null>(null);
  const [startTime] = useState<number>(Date.now());
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const [audioSource, setAudioSource] = useState<string>('');

  // --- 使用 useAudioPlayer Hook (动态更新源) ---
  let audioPlayer = useAudioPlayer(audioSource);
  // --- 使用 useAudioPlayerStatus Hook 监听播放状态 ---
  let playerStatus = useAudioPlayerStatus(audioPlayer);

  // 正确的英文拼写
  const correctSpelling = word.spelling;

  // --- 初始化权限和音频模式 ---
  useEffect(() => {
    (async () => {
      console.log('[Pronunce] Requesting recording permissions...');
      const status = await AudioModule.requestRecordingPermissionsAsync();
      if (!status.granted) {
        Alert.alert('权限被拒绝', '请允许麦克风权限以进行语音评测');
        return;
      }
      console.log('[Pronunce] Setting audio mode...');
      await setAudioModeAsync({
        playsInSilentMode: true,
        allowsRecording: true,
      });
      console.log('[Pronunce] Permissions granted and audio mode set.');
    })();
  }, []); // 仅在组件挂载时执行一次

  // --- 动画效果 ---
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  // --- 处理录音 ---
  const handleStartRecording = async () => {
    console.log('[Pronunce] Preparing to record...');
    if (recorderState.isRecording) {
        console.log('[Pronunce] Recording already in progress.');
        return;
    }
    try {
      // if (!hasUserInteracted.current) {
      //   Speech.speak(word.spelling, { language: 'en' });
      //   hasUserInteracted.current = true;
      // }
      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();
      setRecognizedText('');
      setAudioSource('');
      setShowFeedback(null);
      console.log('[Pronunce] Recording started.');
    } catch (error: any) {
      console.error('[Pronunce] Failed to start recording:', error);
      Alert.alert('录音失败', error.message || '无法开始录音。');
    }
  };

  const handleStopRecording = async () => {
    console.log('[Pronunce] Stopping recording, current state:', recorderState);
    
    if (!recorderState.isRecording) {
        console.log('[Pronunce] No recording in progress to stop.');
        return;
    }
    
    try {
        const uri = audioRecorder.uri;
        if (!uri) {
            console.error('[Pronunce] URI is null or undefined');
            Alert.alert('录音失败', '无法获取录音文件路径。');
            return;
        }
        setAudioSource(uri);
        await audioRecorder.stop();
        console.log('[Pronunce] stop() completed!');
        console.log('[Pronunce] URI after stop:', uri);
        const result = await speechRecognitionService.recognizeSpeech(uri, correctSpelling);
        setRecognizedText(result.recognizedText || '');
        // if (result.isCorrect !== undefined) {
      //   const responseTimeMs = Date.now() - startTime;
      //   const answerResult = {
      //     type: testType,
      //     correct: result.isCorrect,
      //     wordId: word.$id,
      //     responseTimeMs,
      //     userAnswer: result.recognizedText?.trim()
      //   };

      //   setShowFeedback({
      //     correct: result.isCorrect,
      //     message: result.isCorrect ? '✅ 读音正确！' : `❌ 读音有误，正确拼写是: ${correctSpelling}`,
      //   });

      //   setTimeout(() => {
      //     onAnswer(answerResult);
      //     setRecognizedText('');
      //     setShowFeedback(null);
      //   }, 1500);

      // } else {
      //      Alert.alert('识别失败', '语音识别过程中出现错误。');
      // }
        
    } catch (serviceError: any) {
      console.error('[Pronunce] Error from speech recognition service or during stop:', serviceError);
      Alert.alert('录音/识别失败', serviceError.message || '处理录音时出现错误。');
    }
};

  // --- 处理播放自己录音 (使用 useAudioPlayer) ---
  const handlePlayRecording = async () => {
    if (recorderState.isRecording) {
        console.log('[Pronunce] Cannot play while recording.');
        return;
    }

    // 检查是否有录音 URI
    if (audioSource === null || audioSource.length === 0) {
        Alert.alert('没有可播放的录音', '请先录制一段语音。');
        return;
    }

    try {
      console.log('[Pronunce] audioSource file is', audioSource);
      audioPlayer = createAudioPlayer(audioSource);
      audioPlayer.seekTo(0);
      audioPlayer.play();
      //等待1s
      await new Promise(resolve => setTimeout(resolve, 500));
      playerStatus = audioPlayer.currentStatus;
      console.log('[Pronunce] audioPlayer is ready to play', playerStatus);

    } catch (error) {
        console.error('[Pronunce] Failed to play recording:', error);
        // 播放错误可能不会自动更新 playerStatus，需要手动处理
        // 但通常 playerStatus.isError 会变为 true，可以由 UI 监听
        Alert.alert('播放失败', '无法播放录音，请重试。');
    }
  };

  // --- 处理停止播放 (使用 useAudioPlayer) ---
  const handleStopPlayback = async () => {
      // 检查 playerStatus.isPlaying 以确保正在播放
      if (audioPlayer && playerStatus.isLoaded && playerStatus.playing) {
          try {
              console.log('[Pronunce] Stopping playback.');
              audioPlayer.remove();
          } catch (error) {
              console.error('[Pronunce] Failed to stop playback:', error);
          }
      }
  };

  const handleSubmit = useCallback(() => {
      if (!recognizedText) {
        Alert.alert('请朗读单词');
        return;
      }
      if (showFeedback) return;
      const isCorrect = recognizedText.trim() === correctSpelling;
      const responseTimeMs = Date.now() - startTime;
      const result = {
        type: testType, // 使用传入的 testType
        correct: isCorrect,
        userAnswer: recognizedText,
        wordId: word.$id,
        responseTimeMs
      };
      
      setShowFeedback({
        correct: isCorrect,
        message: isCorrect ? '✅ 正确！' : '❌ 错误！',
      });
      
      setTimeout(() => {
        onAnswer(result);
        setRecognizedText(null);
        setShowFeedback(null);
      }, 1500);
    }, [recognizedText, showFeedback, startTime, word, onAnswer, testType, correctSpelling]);

  // --- 渲染 ---
  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <View style={styles.wordPhoneticContainer}>
        <Text style={styles.wordText}>{word.spelling || 'property'}</Text>
        <Text style={styles.phoneticText}>
          美 {word.american_phonetic || '/prap rti/'}
        </Text>
      </View>

      <Text style={styles.exampleText}>
        {word.example_sentence || 'Glitter is one of the properties of gold.'}
      </Text>

      <View style={styles.recognitionContainer}>
        <Text style={styles.recognitionLabel}>请朗读单词</Text>
        <TouchableOpacity
          style={styles.recordButton}
          onPress={recorderState.isRecording ? handleStopRecording : handleStartRecording}
          accessibilityLabel={recorderState.isRecording ? "停止录音" : "开始录音"}
          accessibilityRole="button"
        >
          <Ionicons
            name={recorderState.isRecording ? "mic" : "mic-outline"}
            size={48}
            color={recorderState.isRecording ? "#FF3B30" : "#4A90E2"}
          />
          <Text>{recorderState.isRecording}</Text>
        </TouchableOpacity>
        <Text style={styles.recognitionStatus}>
          {recorderState.isRecording ? "录音中..." : recognizedText ? `识别结果: ${recognizedText}` : "等待识别..."}
        </Text>
      </View>

      <View style={styles.playbackContainer}>
        <TouchableOpacity
          style={styles.playButton}
          onPress={playerStatus.playing ? handleStopPlayback : handlePlayRecording} // <--- 根据 playerStatus.playing 状态切换按钮功能
          disabled={recorderState.isRecording}
          accessibilityLabel={playerStatus.playing ? "停止播放录音" : "播放录音"}
          accessibilityRole="button"
        >
          <Ionicons
            name={playerStatus.playing ? "stop-circle" : "play-circle"} // <--- 根据 playerStatus.playing 状态切换图标
            size={48}
            color={playerStatus.playing ? "#FF3B30" : "#4A90E2"} // <--- 根据 playerStatus.playing 状态切换颜色
          />
        </TouchableOpacity>
        <View>
    </View>
        <Text style={styles.playbackStatus}>
          {recorderState.isRecording ? "录音中，无法播放" : playerStatus.playing ? "播放中..." : "播放录音"}
        </Text>
      </View>

      {/* 提交按钮 */}
      <TouchableOpacity
        testID="submit-button"
        style={[styles.submitButton, (!recognizedText || showFeedback) && styles.submitButtonDisabled]}
        onPress={handleSubmit}
        disabled={!recognizedText || !!showFeedback}
        accessibilityLabel="提交答案"
        accessibilityRole="button"
        accessibilityState={{ disabled: !recognizedText || !!showFeedback }}
      >
        <Text style={styles.submitButtonText}>提交</Text>
      </TouchableOpacity>
      {/* 答题反馈 */}
      {showFeedback && (
        <View style={styles.feedbackContainer}>
          <Ionicons 
            name={showFeedback.correct ? "checkmark-circle" : "close-circle"} 
            size={32} 
            color={showFeedback.correct ? "#28A745" : "#DC3545"} 
          />
          <Text style={[
            styles.feedbackText,
            showFeedback.correct ? styles.correctFeedbackText : styles.incorrectFeedbackText,
          ]}>
            {showFeedback.message}
          </Text>
        </View>
      )}
    </Animated.View>
  );
};

const PronunceWithErrorBoundary: React.FC<TestTypeProps> = (props) => {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <Pronunce {...props} />
    </ErrorBoundary>
  );
};

const styles = StyleSheet.create({
  // ... (样式保持不变)
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 20,
    position: 'relative',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFFFFF',
  },
  errorText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
    color: '#1A1A1A',
  },
  errorSubText: {
    fontSize: 14,
    color: '#666666',
    marginTop: 8,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 20,
    backgroundColor: '#4A90E2',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  wordPhoneticContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  wordText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  phoneticText: {
    fontSize: 16,
    color: '#666666',
    marginTop: 5,
  },
  exampleText: {
    fontSize: 14,
    color: '#666666',
    fontStyle: 'italic',
    marginBottom: 20,
    lineHeight: 20,
    width: '100%',
    textAlign: 'left',
  },
  recognitionContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
  },
  recognitionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 10,
  },
  recordButton: {
    marginVertical: 10,
    padding: 10,
  },
  recognitionStatus: {
    fontSize: 14,
    color: '#666666',
    marginTop: 10,
    textAlign: 'center',
  },
  playbackContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
  },
  playButton: {
    marginVertical: 10,
    padding: 10,
  },
  playbackStatus: {
    fontSize: 14,
    color: '#666666',
    marginTop: 10,
    textAlign: 'center',
  },
  submitButton: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    backgroundColor: '#4A90E2',
    borderRadius: 24,
    paddingVertical: 14,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#C5C5C7',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  feedbackContainer: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    alignItems: 'center',
    transform: [{ translateY: -20 }],
    zIndex: 10,
  },
  feedbackText: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 8,
  },
  correctFeedbackText: {
    color: '#28A745',
  },
  incorrectFeedbackText: {
    color: '#DC3545',
  },
});

export default PronunceWithErrorBoundary;