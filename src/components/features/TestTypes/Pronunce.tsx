// src/components/features/today/TestTypes/Pronunce.tsx
import speechRecognitionService from '@/src/lib/services/speechRecognitionService';
import { TestTypeProps } from '@/src/types/Word';
import { Ionicons } from '@expo/vector-icons';
import { AudioModule, AudioQuality, createAudioPlayer, RecordingOptions, setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus, useAudioRecorder, useAudioRecorderState } from 'expo-audio';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import {
  ActivityIndicator,
  Alert,
  Animated,
  SafeAreaView,
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
const PronunceFC: React.FC<TestTypeProps> = ({ 
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

  // 初始化权限和音频模式
  useEffect(() => {
    (async () => {
      const status = await AudioModule.requestRecordingPermissionsAsync();
      if (!status.granted) {
        Alert.alert('权限被拒绝', '请允许麦克风权限以进行语音评测');
      }

      await setAudioModeAsync({
        playsInSilentMode: true,
        allowsRecording: true,
      });
    })();
  }, []);

  const [recognizedText, setRecognizedText] = useState<string|null>(null);
  const [showFeedback, setShowFeedback] = useState<{ correct: boolean; message: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false); // 新增：提交状态
  const [startTime] = useState<number>(Date.now());
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [audioSource, setAudioSource] = useState<string>('');

  let audioPlayer = useAudioPlayer(audioSource);
  let playerStatus = useAudioPlayerStatus(audioPlayer);
  const correctSpelling = word.spelling;

  // 动画效果
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  // 处理录音
  const handleStartRecording = async () => {
    console.log('[Pronunce] Preparing to record...');
    if (recorderState.isRecording) {
        console.log('[Pronunce] Recording already in progress.');
        return;
    }
    try {
      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();
      setRecognizedText('');
      setAudioSource('');
      setShowFeedback(null);
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
        const result = await speechRecognitionService.recognizeSpeech(uri, correctSpelling);
        setRecognizedText(result.recognizedText || '');
    } catch (serviceError: any) {
      console.error('[Pronunce] Error from speech recognition service or during stop:', serviceError);
      Alert.alert('录音/识别失败', serviceError.message || '处理录音时出现错误。');
    }
  };

  // 处理播放录音
  const handlePlayRecording = async () => {
    if (recorderState.isRecording) {
        console.log('[Pronunce] Cannot play while recording.');
        return;
    }

    if (audioSource === null || audioSource.length === 0) {
        Alert.alert('没有可播放的录音', '请先录制一段语音。');
        return;
    }

    try {
      audioPlayer = createAudioPlayer(audioSource);
      audioPlayer.seekTo(0);
      audioPlayer.play();
      await new Promise(resolve => setTimeout(resolve, 500));
      playerStatus = audioPlayer.currentStatus;
    } catch (error) {
        console.error('[Pronunce] Failed to play recording:', error);
        Alert.alert('播放失败', '无法播放录音，请重试。');
    }
  };

  // 处理停止播放
  const handleStopPlayback = async () => {
      if (audioPlayer && playerStatus.isLoaded && playerStatus.playing) {
          try {
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
      if (showFeedback || isSubmitting) return;
      
      setIsSubmitting(true); // 开始提交
      
      const isCorrect = recognizedText.trim() === correctSpelling;
      const responseTimeMs = Date.now() - startTime;
      const result = {
        type: testType,
        correct: isCorrect,
        userAnswer: recognizedText,
        wordId: word.$id,
        responseTimeMs
      };
      
      setShowFeedback({
        correct: isCorrect,
        message: isCorrect ? '正确！' : '错误！',
      });
      
      setTimeout(() => {
        onAnswer(result);
        // setIsSubmitting(false); // 提交完成
        // setRecognizedText(null);
        // setShowFeedback(null);
      }, 0);
    }, [recognizedText, showFeedback, isSubmitting, startTime, word, onAnswer, testType, correctSpelling]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
        {/* 单词信息卡片 */}
        <View style={styles.wordCard}>
          <Text style={styles.wordText}>{word.spelling || ''}</Text>
          {/* --- 修改：条件渲染音标 --- */}
          {(word.american_phonetic || word.british_phonetic) && (
            <Text style={styles.phoneticText}>
              {word.american_phonetic ? `美 /${word.american_phonetic}/` : `英 /${word.british_phonetic}/`}
            </Text>
          )}
          
          {/* <View style={styles.exampleContainer}>
            <Text style={styles.exampleText}>
              {word.example_sentence || ''}
            </Text>
          </View> */}
        </View>

        {/* 录音区域 */}
        <View style={styles.recordingSection}>
          {/* <Text style={styles.sectionTitle}>请朗读单词</Text> */}
          
          <TouchableOpacity
            style={[styles.recordButton, recorderState.isRecording && styles.recordingActive]}
            onPress={recorderState.isRecording ? handleStopRecording : handleStartRecording}
            accessibilityLabel={recorderState.isRecording ? "停止录音" : "开始录音"}
          >
            <Ionicons
              name={recorderState.isRecording ? "mic" : "mic-outline"}
              size={56}
              color="#fff"
            />
          </TouchableOpacity>
           {/* 新增行容器：将识别结果和播放按钮放到同一行 */}
        <View style={styles.resultAndPlayRow}>
          <Text style={styles.statusText}>
            {recorderState.isRecording 
              ? "正在录音..." 
              : recognizedText 
                ? <>
                    <Text style={[
                      styles.recognizedTextValue,
                      showFeedback && (showFeedback.correct ? styles.correctText : styles.incorrectText)
                    ]}>
                      {recognizedText}
                    </Text>
                  </>
                : "点击麦克风开始录音"}
          </Text>
            {audioSource && (
              <TouchableOpacity
                  style={styles.playButton}
                  onPress={playerStatus.playing ? handleStopPlayback : handlePlayRecording}
                  disabled={recorderState.isRecording}
                  accessibilityLabel={playerStatus.playing ? "停止播放录音" : "播放录音"}
                >
                  <Ionicons
                    name={playerStatus.playing ? "stop-circle" : "play-circle"}
                    size={30}
                    color={playerStatus.playing ? "#FF3B30" : "#4A90E2"}
                  />
                </TouchableOpacity>
            )}
        </View>
        </View>

        {/* 提交按钮 */}
        <TouchableOpacity
          testID="submit-button"
          style={[styles.submitButton, (!recognizedText || showFeedback || isSubmitting) && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={!recognizedText || !!showFeedback || isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.submitButtonText}>提交答案</Text>
          )}
        </TouchableOpacity>

        {/* 答题反馈 */}
        {/* {showFeedback && (
          <View style={styles.feedbackContainer}>
            <View style={[styles.feedbackBubble, showFeedback.correct ? styles.correctBubble : styles.incorrectBubble]}>
              <Ionicons 
                name={showFeedback.correct ? "checkmark-circle" : "close-circle"} 
                size={32} 
                color="#fff" 
              />
              <Text style={styles.feedbackText}>
                {showFeedback.message}
              </Text>
            </View>
          </View>
        )} */}
      </Animated.View>
    </SafeAreaView>
  );
};

const Pronunce: React.FC<TestTypeProps> = (props) => {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <PronunceFC {...props} />
    </ErrorBoundary>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  container: {
    flex: 1,
    padding: 20,
    position: 'relative',
  },
  // 单词信息卡片
  wordCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  wordText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: 8,
  },
  phoneticText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
  },
  exampleContainer: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 16,
  },
  exampleText: {
    fontSize: 14,
    color: '#555',
    fontStyle: 'italic',
    lineHeight: 22,
  },
  
  // 录音区域
  recordingSection: {
    alignItems: 'center',
    marginVertical: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 20,
  },
  recordButton: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#4A90E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#4A90E2',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  recordingActive: {
    backgroundColor: '#FF3B30',
    shadowColor: '#FF3B30',
  },
  resultAndPlayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginTop: 8,
    width: '100%',
  },
  statusText: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
  },
  recognizedTextValue: {
    fontWeight: '500',
  },
  correctText: {
    color: '#28A745',
  },
  incorrectText: {
    color: '#DC3545',
  },
  playButton: {
    marginBottom: -10,
  },
  
  // 提交按钮
  submitButton: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    right: 20,
    backgroundColor: '#4A90E2',
    borderRadius: 30,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#4A90E2',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: {
    backgroundColor: '#C5C5C7',
    shadowOpacity: 0,
    elevation: 0,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  
  // 反馈样式
  feedbackContainer: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    alignItems: 'center',
    transform: [{ translateY: -20 }],
    zIndex: 10,
  },
  feedbackBubble: {
    backgroundColor: '#28A745',
    borderRadius: 24,
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: 'rgba(0,0,0,0.2)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  correctBubble: {
    backgroundColor: '#28A745',
  },
  incorrectBubble: {
    backgroundColor: '#DC3545',
  },
  feedbackText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 12,
  },
  
  // 错误处理样式
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f7fa',
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
});

export default Pronunce;