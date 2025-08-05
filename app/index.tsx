import { MaterialIcons } from '@expo/vector-icons';
import { AudioModule, AudioQuality, RecordingPresets, setAudioModeAsync, useAudioRecorder, useAudioRecorderState } from 'expo-audio';
import * as FileSystem from 'expo-file-system';
import * as Speech from 'expo-speech';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// 百度API配置
const BAIDU_API_KEY = 'jxnhTwn4nmoWiBPIjr3g7WrU';
const BAIDU_SECRET_KEY = '5w6MpF4ybIs7zgcRe3xLAiqb5RV4XUbX';
const BAIDU_TOKEN_URL = `https://openapi.baidu.com/oauth/2.0/token?grant_type=client_credentials&client_id=${BAIDU_API_KEY}&client_secret=${BAIDU_SECRET_KEY}`;
const BAIDU_ASR_URL = 'https://vop.baidu.com/server_api';
const BAIDU_SIMILARITY_URL = 'https://aip.baidubce.com/rpc/2.0/nlp/v2/simnet';

// 单词数据模型
type Word = {
  id: number;
  english: string;
  chinese: string;
};

const wordsData: Word[] = [
  { id: 1, english: 'Apple', chinese: '苹果' },
  { id: 2, english: 'Book', chinese: '书' },
  { id: 3, english: 'Computer', chinese: '电脑' },
  { id: 4, english: 'Friend', chinese: '朋友' },
];

const WordLearningApp = () => {
  const [isStarted, setIsStarted] = useState(false);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recognitionResult, setRecognitionResult] = useState('');
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playCount, setPlayCount] = useState(0);
  const [accessToken, setAccessToken] = useState('');
  const [showChineseMeaning, setShowChineseMeaning] = useState(false);
  
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const playIntervalRef = useRef<number | null>(null);
  const autoNextTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pulseAnimationRef = useRef<Animated.CompositeAnimation | null>(null);
  const recordingStartTime = useRef<number | null>(null); // 记录录音开始时间
  const currentWord = wordsData[currentWordIndex];

  // 录音配置与实例
  const customRecordingPreset = {
    ...RecordingPresets.HIGH_QUALITY,
    isMeteringEnabled: true,
    numberOfChannels: 1,
    bitRate: 128000,
    android: {
      ...RecordingPresets.HIGH_QUALITY.android,
      extension: '.m4a',
      sampleRate: 16000,
    },
    ios: {
      ...RecordingPresets.HIGH_QUALITY.ios,
      extension: '.m4a',
      audioQuality: AudioQuality.HIGH,
      sampleRate: 16000,
      linearPCMBitDepth: 16,
      outputFormat: 'aac',
    },
  };
  const audioRecorder = useAudioRecorder(customRecordingPreset);
  const recorderState = useAudioRecorderState(audioRecorder);

  // 获取百度API的访问令牌
  const fetchAccessToken = async () => {
    try {
      const response = await fetch(BAIDU_TOKEN_URL);
      const data = await response.json();
      if (data.access_token) {
        setAccessToken(data.access_token);
      } else {
        console.error('Failed to get Baidu access token:', data);
        Alert.alert('API错误', '无法获取服务访问令牌');
      }
    } catch (error) {
      console.error('Error fetching access token:', error);
      Alert.alert('网络错误', '无法连接服务');
    }
  };

  // 初始化：获取权限、设置音频模式、获取访问令牌
  useEffect(() => {
    (async () => {
      // 请求录音权限
      const status = await AudioModule.requestRecordingPermissionsAsync();
      if (!status.granted) {
        Alert.alert('权限不足', '请允许麦克风权限以使用录音功能');
      }
      // 设置音频模式
      await setAudioModeAsync({
        playsInSilentMode: true,
        allowsRecording: true,
      });
      // 获取百度访问令牌
      await fetchAccessToken();
    })();
  }, []);

  // 播放单词发音
  const playWordSound = async () => {
    try {
      setIsPlaying(true);
      await Speech.speak(currentWord.english, {
        language: 'en-US',
        rate: 0.9,
        onDone: () => {
          setIsPlaying(false);
          setPlayCount(prev => prev + 1);
        }
      });
    } catch (error) {
      console.error('播放失败:', error);
      setIsPlaying(false);
      Alert.alert('播放错误', '无法播放单词发音');
    }
  };

  // 自动播放单词3次
  useEffect(() => {
    if (isStarted && playCount < 3) {
      playWordSound();
      
      // 设置下一次播放的间隔
      playIntervalRef.current = setTimeout(() => {
        if (playCount < 2) {
          playWordSound();
        }
      }, 1500);
    }
    
    return () => {
      if (playIntervalRef.current) {
        clearTimeout(playIntervalRef.current);
      }
    };
  }, [isStarted, playCount, currentWordIndex]);

  // 开始录音
  const startRecording = async () => {
    try {
      // 准备并开始录音
      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();
      
      console.log('开始录音');
      stopPulseAnimation(); // 停止脉冲动画
      setRecognitionResult('');
      setShowFeedback(false);
      setShowChineseMeaning(false);
      
      // 记录录音开始时间
      recordingStartTime.current = Date.now();
      
    } catch (err) {
      console.error('录音失败:', err);
      Alert.alert('录音错误', '无法开始录音，请检查麦克风权限');
    }
  };

  // 停止录音并识别
  const stopRecording = async () => {
    try {
      console.log('停止录音');
      setIsProcessing(true);
      
      // 检查录音时长是否过短（小于1秒）
      if (recordingStartTime.current && Date.now() - recordingStartTime.current < 1000) {
        console.log('录音时间过短，取消识别');
        Alert.alert('录音时间过短', '请至少按住麦克风1秒钟');
        setIsProcessing(false);
        await audioRecorder.stop();
        startPulseAnimation(); // 重新开始脉冲动画
        return;
      }
      
      await audioRecorder.stop();
      const uri = audioRecorder.uri;
      if (!uri) throw new Error('录音文件不存在');
      
      const fileInfo = await FileSystem.getInfoAsync(uri);
      if (!fileInfo.exists) throw new Error('录音文件不存在');
      
      const base64Data = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      
      // 传递原始文件大小（fileInfo.size）
      await recognizeSpeech(base64Data, fileInfo.size);
      
    } catch (err) {
      console.error('停止录音失败:', err);
      setIsProcessing(false);
      Alert.alert('识别错误', '处理录音文件时出错');
    }
  };

  // 调用百度短文本相似度API
  const getTextSimilarity = async (text1: string, text2: string) => {
    try {
      if (!accessToken) {
        await fetchAccessToken();
        if (!accessToken) throw new Error('缺少访问令牌');
      }
      
      const url = `${BAIDU_SIMILARITY_URL}?access_token=${accessToken}`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          "text_1": text1,
          "text_2": text2,
          model: 'BOW'
        }),
      });
      
      const data = await response.json();
      console.log('相似度API响应:', data);
      
      if (data.error_code) {
        throw new Error(`${data.error_msg} (错误码: ${data.error_code})`);
      }
      
      return data.score;
    } catch (error) {
      console.error('文本相似度计算错误:', error);
      throw error;
    }
  };

  // 使用百度API识别语音
  const recognizeSpeech = async (base64Data: string, fileSize: number) => {
    let correct = false;
    
    try {
      if (!accessToken) {
        await fetchAccessToken();
        if (!accessToken) throw new Error('缺少访问令牌');
      }
      
      const response = await fetch(BAIDU_ASR_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          format: 'm4a',
          rate: 16000,
          dev_pid: 1537,
          channel: 1,
          token: accessToken,
          cuid: 'expo-app',
          speech: base64Data,
          len: fileSize,
        }),
      });
        
      const data = await response.json();
      console.log('百度API响应:', data);
      
      if (data.err_no === 0 && data.result && data.result.length > 0) {
        const recognizedText = data.result[0].replace(/。$/, '');
        setRecognitionResult(recognizedText);
        
        // 使用短文本相似度API验证答案
        const similarityScore = await getTextSimilarity(recognizedText, currentWord.chinese);
        console.log(`相似度: ${similarityScore * 100}%`);
        
        // 相似度大于80%认为正确
        correct = similarityScore > 0.8;
        setIsCorrect(correct);
        setShowFeedback(true);
        
        // 如果正确，显示中文含义
        if (correct) {
          setShowChineseMeaning(true);
          
          // 清除之前的自动跳转定时器
          clearAutoNextTimeout();
          
          // 设置3秒后自动跳转到下一个单词
          autoNextTimeoutRef.current = setTimeout(() => {
            nextWord();
          }, 3000);
        }
        
        // 2秒后隐藏反馈
        setTimeout(() => {
          setShowFeedback(false);
        }, 2000);
      } else {
        throw new Error(data.err_msg || '语音识别失败');
      }
      
    } catch (error) {
      console.error('语音识别错误:', error);
      Alert.alert('识别错误', '无法识别语音，请重试');
    } finally {
      setIsProcessing(false);
      
      // 如果不是正确识别，重新启动脉冲动画
      if (!correct) {
        startPulseAnimation();
      }
    }
  };

  // 清除自动跳转定时器
  const clearAutoNextTimeout = () => {
    if (autoNextTimeoutRef.current) {
      clearTimeout(autoNextTimeoutRef.current);
      autoNextTimeoutRef.current = null;
    }
  };

  // 开始学习
  const startLearning = async () => {
    setIsStarted(true);
    setPlayCount(0);
    setShowChineseMeaning(false);
    startPulseAnimation();
  };

  // 下一个单词
  const nextWord = async () => {
    // 清除自动跳转定时器
    clearAutoNextTimeout();
    
    Speech.stop();
    setIsPlaying(false);
    setShowFeedback(false);
    setRecognitionResult('');
    setPlayCount(0);
    setShowChineseMeaning(false);
    
    if (currentWordIndex < wordsData.length - 1) {
      setCurrentWordIndex(prev => prev + 1);
    } else {
      Alert.alert('完成学习', '恭喜你完成今日所有单词学习！');
      setIsStarted(false);
      setCurrentWordIndex(0);
    }
    
    // 启动新单词的脉冲动画
    startPulseAnimation();
  };

  // 脉冲动画效果
  const startPulseAnimation = () => {
    // 停止之前的动画
    stopPulseAnimation();
    
    pulseAnimationRef.current = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ])
    );
    
    pulseAnimationRef.current.start();
  };

  // 停止动画
  const stopPulseAnimation = () => {
    if (pulseAnimationRef.current) {
      pulseAnimationRef.current.stop();
      pulseAnimationRef.current = null;
    }
    pulseAnim.setValue(1);
  };

  // 放弃当前单词
  const skipWord = () => {
    // 清除自动跳转定时器
    clearAutoNextTimeout();
    
    Alert.alert('跳过单词', `确定要跳过单词 "${currentWord.english}" 吗？`, [
      { text: '取消', style: 'cancel' },
      { text: '确定', onPress: nextWord },
    ]);
  };

  // 手动重复播放单词
  const repeatWord = async () => {
    // 清除自动跳转定时器
    clearAutoNextTimeout();
    
    Speech.stop();
    setIsPlaying(false);
    setPlayCount(0);
    playWordSound();
  };

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      // 清除自动跳转定时器
      clearAutoNextTimeout();
      
      if (playIntervalRef.current) {
        clearTimeout(playIntervalRef.current);
      }
      
      // 停止动画
      stopPulseAnimation();
      
      Speech.stop();
      // 停止正在进行的录音
      if (recorderState.isRecording) {
        audioRecorder.stop();
      }
    };
  }, [audioRecorder, recorderState.isRecording]);

  if (!isStarted) {
    return (
      <View style={styles.startContainer}>
        <View style={styles.centerContent}>
          <TouchableOpacity 
            style={styles.startButton} 
            onPress={startLearning}
            activeOpacity={0.7}
          >
            <Text style={styles.startButtonText}>开始今日学习</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* 顶部进度指示器 */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { 
            width: `${(currentWordIndex / wordsData.length) * 100}%` 
          }]} />
        </View>
        <Text style={styles.progressText}>
          {currentWordIndex + 1} / {wordsData.length}
        </Text>
      </View>

      {/* 单词显示区域 */}
      <View style={styles.wordContainer}>
        <View style={styles.englishContainer}>
          <Text style={styles.wordText}>{currentWord.english}</Text>
          {isPlaying && <ActivityIndicator size="small" color="#4ECDC4" style={styles.playingIndicator} />}
        </View>
        
        {/* 中文含义显示在黄色块中 */}
        {showChineseMeaning && (
          <View style={styles.chineseContainer}>
            <Text style={styles.chineseText}>{currentWord.chinese}</Text>
          </View>
        )}
      </View>

      {/* 识别结果区域 */}
      <View style={styles.resultArea}>
        {recognitionResult ? (
          <View style={styles.recognitionContainer}>
            <Text style={styles.recognitionLabel}>我的回答:</Text>
            <Text style={styles.recognitionText}>{recognitionResult}</Text>
          </View>
        ) : null}
      </View>

      {/* 麦克风区域 */}
      <View style={styles.micContainer}>
        <TouchableOpacity 
          onPressIn={startRecording}
          onPressOut={stopRecording}
          activeOpacity={0.7}
          disabled={recorderState.isRecording || showFeedback || isProcessing}
        >
          <Animated.View style={[
            styles.micButton, 
            recorderState.isRecording && styles.recording,
            { transform: [{ scale: pulseAnim }] }
          ]}>
            {isProcessing ? (
              <ActivityIndicator size="large" color="#FF6B6B" />
            ) : (
              <MaterialIcons 
                name={recorderState.isRecording ? 'mic' : 'mic-none'} 
                size={60} 
                color={recorderState.isRecording ? '#FF6B6B' : '#4ECDC4'} 
              />
            )}
          </Animated.View>
        </TouchableOpacity>
        
        {/* 提示文字显示在麦克风下方 */}
        <Text style={styles.hintText}>长按麦克风说出中文意思</Text>
        
        {/* 反馈信息 */}
        {showFeedback && (
          <View style={[
            styles.feedback, 
            isCorrect ? styles.correctFeedback : styles.incorrectFeedback
          ]}>
            <Text style={styles.feedbackText}>
              {isCorrect ? '✓ 正确!' : '✗ 不正确'}
            </Text>
          </View>
        )}
      </View>

      {/* 底部控制按钮 */}
      <View style={styles.controls}>
        <TouchableOpacity 
          style={styles.controlButton} 
          onPress={repeatWord}
          disabled={isPlaying}
        >
          <View style={styles.controlIconContainer}>
            <MaterialIcons 
              name="replay" 
              size={30} 
              color={isPlaying ? '#CCCCCC' : '#4ECDC4'} 
            />
          </View>
          <Text style={[styles.controlText, isPlaying && styles.disabledText]}>重听</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.controlButton} 
          onPress={skipWord}
        >
          <View style={styles.controlIconContainer}>
            <MaterialIcons name="close" size={30} color="#FF6B6B" />
          </View>
          <Text style={styles.controlText}>放弃</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.controlButton, !recognitionResult && styles.disabledButton]} 
          onPress={nextWord}
          disabled={!recognitionResult}
        >
          <View style={styles.controlIconContainer}>
            <MaterialIcons 
              name="navigate-next" 
              size={40} 
              color={!recognitionResult ? '#CCCCCC' : '#1A535C'} 
            />
          </View>
          <Text style={[styles.controlText, !recognitionResult && styles.disabledText]}>下一个</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  startContainer: {
    flex: 1,
    backgroundColor: '#F7FFF7',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  centerContent: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  container: {
    flex: 1,
    backgroundColor: '#F7FFF7',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: 40,
  },
  progressContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 30,
  },
  progressBar: {
    height: 8,
    width: '100%',
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 5,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4ECDC4',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 16,
    color: '#6A8D92',
    fontWeight: '500',
  },
  startButton: {
    backgroundColor: '#4ECDC4',
    paddingVertical: 20,
    paddingHorizontal: 50,
    borderRadius: 35,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    marginBottom: 30,
  },
  startButtonText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
  wordContainer: {
    backgroundColor: '#FFE66D',
    padding: 20,
    borderRadius: 20,
    marginVertical: 10,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    alignItems: 'center',
    minHeight: 150,
    width: '90%',
  },
  englishContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  wordText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1A535C',
    marginRight: 10,
  },
  playingIndicator: {
    marginLeft: 10,
  },
  chineseContainer: {
    marginTop: 10,
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  chineseText: {
    fontSize: 26,
    color: '#4ECDC4',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  resultArea: {
    minHeight: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    width: '100%',
  },
  recognitionContainer: {
    backgroundColor: '#EFF8FF',
    padding: 15,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: '90%',
  },
  recognitionLabel: {
    fontSize: 16,
    color: '#1A535C',
    fontWeight: 'bold',
    marginRight: 8,
  },
  recognitionText: {
    fontSize: 18,
    color: '#1A535C',
    fontWeight: '500',
  },
  micContainer: {
    alignItems: 'center',
    position: 'absolute',
    bottom: 220,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  micButton: {
    backgroundColor: 'white',
    borderRadius: 70,
    padding: 20,
    elevation: 5,
    borderWidth: 4,
    borderColor: '#4ECDC4',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    width: 120,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recording: {
    borderColor: '#FF6B6B',
  },
  hintText: {
    fontSize: 14,
    color: '#888',
    marginTop: 15,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  feedback: {
    position: 'absolute',
    top: -40,
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
    elevation: 2,
  },
  correctFeedback: {
    backgroundColor: '#4ECDC4',
  },
  incorrectFeedback: {
    backgroundColor: '#FF6B6B',
  },
  feedbackText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: 'auto',
    paddingHorizontal: 20,
    marginBottom: 30,
    alignItems: 'flex-end',
  },
  controlButton: {
    alignItems: 'center',
    padding: 10,
    minWidth: 80,
  },
  controlIconContainer: {
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 5,
  },
  controlText: {
    color: '#1A535C',
    fontWeight: '500',
    textAlign: 'center',
  },
  disabledButton: {
    opacity: 0.6,
  },
  disabledText: {
    color: '#CCCCCC',
  },
});

export default WordLearningApp;