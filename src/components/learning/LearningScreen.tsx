// src/screens/learning/LearningScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { useRoute, RouteProp } from '@react-navigation/native';
import type { RootState } from '../../redux/store';
import { WordCard } from '../../components/learning/WordCard';
import { SpeedControlBar } from '../../components/learning/SpeedControlBar';
import { PronunciationEvaluator } from '../../components/learning/PronunciationEvaluator';
import { Button } from '../../components/common/Button';
import { fetchWordsAsync, submitEvaluationAsync } from '../../redux/slices/learningSlice'; // 假设已创建
import { Word } from '../../types/api';
import { WordLevelMap } from '../../types/user';
import * as AV from 'expo-av'; // 需要安装 expo-av

// 假设导航参数类型
type LearningScreenRouteProp = RouteProp<any, 'Learning'>; // 需要替换 `any` 为实际的导航参数类型

export function LearningScreen() {
  const dispatch = useDispatch();
  const route = useRoute<LearningScreenRouteProp>();
  // const { mode } = route.params || { mode: 'normal' }; // 从导航参数获取学习模式

  const words = useSelector((state: RootState) => state.learning.words); // 假设 learning slice
  const isLoading = useSelector((state: RootState) => state.learning.isLoading);
  const error = useSelector((state: RootState) => state.learning.error);
  const currentWordIndex = useSelector((state: RootState) => state.learning.currentWordIndex);
  const evaluationResult = useSelector((state: RootState) => state.learning.evaluationResult); // 假设包含 score, segmentScores, feedback

  const [currentSpeed, setCurrentSpeed] = useState<number>(100); // 默认100%
  const [sound, setSound] = useState<AV.Audio.Sound | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedAudioUri, setRecordedAudioUri] = useState<string | null>(null);

  const currentWord: Word | undefined = words[currentWordIndex];

  // 加载单词列表
  useEffect(() => {
    // dispatch(fetchWordsAsync({ mode })); // 调用 Redux Thunk 获取单词
    // 模拟加载
    // dispatch({ type: 'learning/setWords', payload: [/* ... */] });
  }, [dispatch]); // , mode

  // 播放单词发音
  const playPronunciation = async (speed: number = currentSpeed) => {
    if (!currentWord?.pronunciationUrl) {
      Alert.alert('提示', '该单词暂无发音');
      return;
    }

    try {
      console.log('Loading Sound');
      const { sound: newSound } = await AV.Audio.Sound.createAsync(
        { uri: currentWord.pronunciationUrl },
        { rate: speed / 100 } // Expo AV 使用 0.5-2.0 范围
      );
      setSound(newSound);
      console.log('Playing Sound');
      await newSound.playAsync();
      // 监听播放完成事件以卸载资源
      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          newSound.unloadAsync();
          setSound(null);
        }
      });
    } catch (error) {
      console.error('Error playing sound:', error);
      Alert.alert('错误', '播放发音失败');
    }
  };

  // 开始录音 (简化示例)
  const startRecording = async () => {
    try {
      console.log('Requesting permissions..');
      // await Audio.requestPermissionsAsync(); // 需要处理权限
      await AV.Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      console.log('Starting recording..');
      const recording = new AV.Audio.Recording();
      await recording.prepareToRecordAsync(AV.Audio.RECORDING_OPTIONS_PRESET_HIGH_QUALITY);
      await recording.startAsync();
      // setIsRecording(true);
      console.log('Recording started');
      // 这里需要将 recording 对象存储起来以便停止
      // 例如存储在 ref 或 Redux state 中
    } catch (err) {
      console.error('Failed to start recording', err);
    }
  };

  // 停止录音并提交评估 (简化示例)
  const stopRecordingAndEvaluate = async () => {
    // const recording = ... // 从 ref 或 state 获取
    // try {
    //   await recording.stopAndUnloadAsync();
    //   const uri = recording.getURI();
    //   console.log('Recording stopped and stored at', uri);
    //   setRecordedAudioUri(uri);
    //   setIsRecording(false);
    //   // 提交评估
    //   if (uri && currentWord) {
    //     dispatch(submitEvaluationAsync({ wordId: currentWord.id, audioUri: uri }));
    //   }
    // } catch (err) {
    //   console.error('Failed to stop recording', err);
    // }
  };

  // 处理下一个单词
  const handleNextWord = () => {
    // dispatch({ type: 'learning/nextWord' }); // 假设的 Redux action
    // 重置评估结果
    // dispatch({ type: 'learning/clearEvaluationResult' });
  };

  // 处理上一个单词 (L0/L1)
  const handlePreviousWord = () => {
    // dispatch({ type: 'learning/previousWord' });
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Text>加载中...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={{ color: 'red' }}>加载失败: {error}</Text>
        {/* <Button title="重试" onPress={() => dispatch(fetchWordsAsync({ mode }))} /> */}
      </View>
    );
  }

  if (!currentWord) {
    return (
      <View style={styles.container}>
        <Text>暂无单词</Text>
        {/* 可以添加返回首页的按钮 */}
      </View>
    );
  }

  const wordLevel = currentWord.level; // 假设 Word 对象有 level 字段 (0-4)

  return (
    <View style={styles.container}>
      {/* 语速控制栏 */}
      <SpeedControlBar
        currentSpeed={currentSpeed}
        minSpeed={wordLevel <= 1 ? 50 : 30}
        maxSpeed={wordLevel <= 1 ? 100 : 150}
        step={wordLevel <= 1 ? 10 : 5}
        onSpeedChange={setCurrentSpeed}
        wordLevel={wordLevel}
      />

      {/* 单词卡片 */}
      <View style={styles.wordCardContainer}>
        <WordCard
          word={currentWord}
          level={wordLevel}
          onPronounce={() => playPronunciation(currentSpeed)}
        />
      </View>

      {/* 发音评估反馈区 */}
      <View style={styles.evaluatorContainer}>
        <PronunciationEvaluator
          level={wordLevel}
          score={evaluationResult?.score}
          segmentScores={evaluationResult?.segmentScores}
          feedback={evaluationResult?.feedback}
          isEvaluating={false} // 需要从 Redux 获取评估状态
          onRetry={startRecording} // 简化处理，实际应区分开始录音和重试
        />
      </View>

      {/* 交互按钮区 */}
      <View style={styles.buttonContainer}>
        {/* L0/L1 显示上一个/下一个 */}
        {(wordLevel === WordLevelMap.L0 || wordLevel === WordLevelMap.L1) && (
          <>
            <Button title="上一个" onPress={handlePreviousWord} style={styles.navButton} />
            <Button title="下一个" onPress={handleNextWord} style={styles.navButton} />
          </>
        )}
        {/* L2-L4 可能有更多按钮，如返回列表、提交等 */}
        {wordLevel >= WordLevelMap.L2 && (
          <>
            <Button
              title={isRecording ? "停止录音" : "开始录音"}
              onPress={isRecording ? stopRecordingAndEvaluate : startRecording}
              style={styles.actionButton}
            />
            <Button title="下一个" onPress={handleNextWord} style={styles.navButton} />
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  wordCardContainer: {
    flex: 1, // 占据主要空间
    justifyContent: 'center',
    alignItems: 'center',
  },
  evaluatorContainer: {
    // 高度可以根据内容自适应，或设置固定高度
    minHeight: 150, // 确保有足够空间显示反馈
    marginHorizontal: 10,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 20,
  },
  navButton: {
    flex: 1,
    marginHorizontal: 10,
  },
  actionButton: {
    flex: 1,
    marginHorizontal: 10,
  },
});
