// src/components/features/today/TestTypes/Learn.tsx
import speechRecognitionService from "@/src/lib/services/speechRecognitionService";
import wordAudioPlayer from "@/src/lib/utils/WordAudioPlayer";
import { ExampleSentence, TestTypeProps } from "@/src/types/Word";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import {
  AudioModule,
  AudioQuality,
  createAudioPlayer,
  RecordingOptions,
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
  useAudioRecorder,
  useAudioRecorderState,
} from "expo-audio";
import React, { JSX, useCallback, useEffect, useRef, useState } from "react";
import { ErrorBoundary } from "react-error-boundary";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// 错误回退组件
const ErrorFallback = ({ error, resetErrorBoundary }: any) => (
  <View style={styles.errorContainer}>
    <View style={styles.errorIconContainer}>
      <Ionicons name="warning" size={64} color="#FF9500" />
    </View>
    <Text style={styles.errorText}>组件加载失败</Text>
    <Text style={styles.errorSubText}>{error.message}</Text>
    <TouchableOpacity style={styles.retryButton} onPress={resetErrorBoundary}>
      <Text style={styles.retryButtonText}>重试</Text>
    </TouchableOpacity>
  </View>
);

// 定义双语片段接口
interface BilingualSegment {
  id: string;
  enKey: string;
  chValue: string;
  enStart: number;
  enEnd: number;
  chStart: number;
  chEnd: number;
}

// 主组件
const LearnFC: React.FC<TestTypeProps> = ({
  word,
  onAnswer,
  testType = "learn",
}) => {
  const navigation = useNavigation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [startTime] = useState<number>(Date.now());
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  // 发音相关状态
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playCount, setPlayCount] = useState(0);
  const [hasRecordingPermission, setHasRecordingPermission] = useState<
    boolean | null
  >(null);
  const playIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // 新增状态：释义切换和例句显示
  const [showEnglishDefinition, setShowEnglishDefinition] = useState(false);
  const [showMoreExamples, setShowMoreExamples] = useState(false);

  // 修改状态：为每个例句单独管理高亮状态
  const [activeSegments, setActiveSegments] = useState<{
    [exampleIndex: number]: string | null;
  }>({});

  // 新增：跟读练习相关状态
  const [showFollowRead, setShowFollowRead] = useState(false);
  const [recognizedText, setRecognizedText] = useState<string | null>(null);
  const [followReadFeedback, setFollowReadFeedback] = useState<{
    correct: boolean;
    message: string;
  } | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [audioSource, setAudioSource] = useState<string>("");

  // 录音配置
  const recordOptions: RecordingOptions = {
    extension: ".m4a",
    sampleRate: 8000,
    numberOfChannels: 2,
    bitRate: 48000,
    android: {
      outputFormat: "mpeg4",
      audioEncoder: "aac",
    },
    ios: {
      outputFormat: "aac ",
      audioQuality: AudioQuality.MAX,
      linearPCMBitDepth: 16,
      linearPCMIsBigEndian: false,
      linearPCMIsFloat: false,
    },
    web: {
      mimeType: "audio/webm",
      bitsPerSecond: 128000,
    },
  };

  const audioRecorder = useAudioRecorder(recordOptions);
  const recorderState = useAudioRecorderState(audioRecorder);
  let audioPlayer = useAudioPlayer(audioSource);
  let playerStatus = useAudioPlayerStatus(audioPlayer);

  // 监听页面焦点，动态设置顶部栏显示状态
  useFocusEffect(
    useCallback(() => {
      // 当学习页面获得焦点时，隐藏顶部栏
      navigation.setOptions({
        headerShown: false,
      });

      return () => {
        // 当学习页面失去焦点时，不需要恢复顶部栏显示
        // 因为其他页面会在自己的 useFocusEffect 中设置
        navigation.setOptions({
          headerShown: true,
        });
      };
    }, [navigation]),
  );

  // 检查录音权限和初始化音频模式
  useEffect(() => {
    const checkPermissionAndSetup = async () => {
      const status = await AudioModule.requestRecordingPermissionsAsync();
      const permission = status.granted;
      setHasRecordingPermission(permission);

      if (!permission) {
        Alert.alert(
          "权限不足",
          "需要录音权限才能正常使用听力测试功能，请在设置中开启权限。",
          [{ text: "知道了" }],
        );
      }

      await setAudioModeAsync({
        playsInSilentMode: true,
        allowsRecording: true,
      });
    };

    checkPermissionAndSetup();
  }, [word.spelling]);

  // 动画效果
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, scaleAnim]);

  useEffect(() => {
    if (word.spelling) {
      wordAudioPlayer.preload(word.spelling, "us");
    }

    return () => {
      wordAudioPlayer.stop();
    };
  }, [word.spelling]);

  // 处理双语片段数据
  const processBilingualSegments = useCallback(
    (example: ExampleSentence): BilingualSegment[] => {
      const segments: BilingualSegment[] = [];

      if (!example.trans) return segments;

      // 收集所有中文位置信息，用于检测重复
      const chinesePositions: { [key: string]: boolean } = {};

      Object.entries(example.trans).forEach(([enKey, chValue], index) => {
        const enStart = example.en.indexOf(enKey);
        const chStart = example.ch.indexOf(chValue);

        if (enStart !== -1 && chStart !== -1) {
          // 检查这个中文片段是否已经被其他片段包含
          let isOverlapping = false;

          // 简单的重叠检测：如果这个中文文本已经出现在其他片段覆盖的区域，则跳过
          for (let i = chStart; i < chStart + chValue.length; i++) {
            if (chinesePositions[i]) {
              isOverlapping = true;
              break;
            }
          }

          if (!isOverlapping) {
            // 标记这个中文片段占用的位置
            for (let i = chStart; i < chStart + chValue.length; i++) {
              chinesePositions[i] = true;
            }

            segments.push({
              id: `segment_${index}`,
              enKey,
              chValue,
              enStart,
              enEnd: enStart + enKey.length,
              chStart,
              chEnd: chStart + chValue.length,
            });
          }
        }
      });

      return segments.sort((a, b) => a.enStart - b.enStart);
    },
    [],
  );

  // 高亮处理函数
  const handleSegmentPress = useCallback(
    (exampleIndex: number, segmentId: string) => {
      setActiveSegments((prev) => ({
        ...prev,
        [exampleIndex]: segmentId,
      }));
    },
    [],
  );

  // 渲染可点击的英文文本
  const renderClickableEnglish = useCallback(
    (example: ExampleSentence, exampleIndex: number) => {
      const segments = processBilingualSegments(example);
      if (segments.length === 0) {
        return <Text style={styles.exampleEnglish}>{example.en}</Text>;
      }

      const elements: JSX.Element[] = [];
      let lastIndex = 0;

      // 按英文起始位置排序
      const sortedSegments = [...segments].sort(
        (a, b) => a.enStart - b.enStart,
      );

      sortedSegments.forEach((segment, index) => {
        // 添加片段前的文本
        if (segment.enStart > lastIndex) {
          const textBefore = example.en.slice(lastIndex, segment.enStart);
          if (textBefore) {
            elements.push(
              <Text key={`before_${index}`} style={styles.exampleEnglish}>
                {textBefore}
              </Text>,
            );
          }
        }

        // 添加可点击的片段
        elements.push(
          <TouchableOpacity
            key={`segment_${index}`}
            onPress={() => handleSegmentPress(exampleIndex, segment.id)}
          >
            <Text
              style={[
                styles.englishSegment,
                activeSegments[exampleIndex] === segment.id &&
                  styles.highlightedEnglish,
              ]}
            >
              {segment.enKey}
            </Text>
          </TouchableOpacity>,
        );

        lastIndex = segment.enEnd;
      });

      // 添加最后的文本
      if (lastIndex < example.en.length) {
        const textAfter = example.en.slice(lastIndex);
        if (textAfter) {
          elements.push(
            <Text key="after" style={styles.exampleEnglish}>
              {textAfter}
            </Text>,
          );
        }
      }

      return <View style={styles.englishRow}>{elements}</View>;
    },
    [processBilingualSegments, activeSegments, handleSegmentPress],
  );

  // 渲染可点击的中文文本
  const renderClickableChinese = useCallback(
    (example: ExampleSentence, exampleIndex: number) => {
      const segments = processBilingualSegments(example);
      if (segments.length === 0) {
        return <Text style={styles.exampleChinese}>{example.ch}</Text>;
      }

      const elements: JSX.Element[] = [];
      let lastIndex = 0;

      // 按中文起始位置排序
      const sortedSegments = [...segments].sort(
        (a, b) => a.chStart - b.chStart,
      );

      sortedSegments.forEach((segment, index) => {
        // 添加片段前的文本
        if (segment.chStart > lastIndex) {
          const textBefore = example.ch.slice(lastIndex, segment.chStart);
          if (textBefore) {
            elements.push(
              <Text key={`before_${index}`} style={styles.exampleChinese}>
                {textBefore}
              </Text>,
            );
          }
        }

        // 添加可点击的片段
        elements.push(
          <TouchableOpacity
            key={`segment_${index}`}
            onPress={() => handleSegmentPress(exampleIndex, segment.id)}
          >
            <Text
              style={[
                styles.chineseSegment,
                activeSegments[exampleIndex] === segment.id &&
                  styles.highlightedChinese,
              ]}
            >
              {segment.chValue}
            </Text>
          </TouchableOpacity>,
        );

        lastIndex = segment.chEnd;
      });

      // 添加最后的文本
      if (lastIndex < example.ch.length) {
        const textAfter = example.ch.slice(lastIndex);
        if (textAfter) {
          elements.push(
            <Text key="after" style={styles.exampleChinese}>
              {textAfter}
            </Text>,
          );
        }
      }

      return <View style={styles.chineseRow}>{elements}</View>;
    },
    [processBilingualSegments, activeSegments, handleSegmentPress],
  );

  // 播放单词发音
  const playWordSound = useCallback(async () => {
    console.log("[Learn] Playing word sound...");
    setIsPlaying(true);

    const success = await wordAudioPlayer.play(word.spelling || "", {
      accent: "us",
      playbackRate: playbackRate,
      fallbackToTTS: true,
    });

    setIsPlaying(false);
    if (success) {
      setPlayCount((prev) => prev + 1);
    }
  }, [word.spelling, playbackRate]);

  // 手动播放单词发音
  const handlePlaySound = useCallback(() => {
    playWordSound();
  }, [playWordSound]);

  useEffect(() => {
    if (hasRecordingPermission) {
      playWordSound(); // 立即播放
    }
  }, [hasRecordingPermission, playWordSound]);

  // 新增：跟读练习功能
  const handleStartRecording = async () => {
    console.log("[Learn] Preparing to record...");
    if (recorderState.isRecording) {
      console.log("[Learn] Recording already in progress.");
      return;
    }
    try {
      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();
      setIsRecording(true);
      setRecognizedText("");
      setAudioSource("");
      setFollowReadFeedback(null);
    } catch (error: any) {
      console.error("[Learn] Failed to start recording:", error);
      Alert.alert("录音失败", error.message || "无法开始录音。");
    }
  };

  const handleStopRecording = async () => {
    console.log("[Learn] Stopping recording, current state:", recorderState);

    if (!recorderState.isRecording) {
      console.log("[Learn] No recording in progress to stop.");
      return;
    }

    try {
      const uri = audioRecorder.uri;
      if (!uri) {
        console.error("[Learn] URI is null or undefined");
        Alert.alert("录音失败", "无法获取录音文件路径。");
        return;
      }
      setAudioSource(uri);
      await audioRecorder.stop();
      setIsRecording(false);

      // 这里可以调用语音识别服务
      const result = await speechRecognitionService.recognizeSpeech(
        uri,
        word.spelling,
      );
      setRecognizedText(result.recognizedText || "");
      const isCorrect = result.recognizedText === word.spelling;
      setFollowReadFeedback({
        correct: isCorrect,
        message: isCorrect ? "发音准确！" : "再试一次，注意发音",
      });
      // 模拟识别结果
      // setTimeout(() => {
      //   const isCorrect = Math.random() > 0.3; // 模拟70%正确率
      //   setRecognizedText(isCorrect ? word.spelling : 'recognized');
      //   setFollowReadFeedback({
      //     correct: isCorrect,
      //     message: isCorrect ? '发音准确！' : '再试一次，注意发音'
      //   });
      // }, 1000);
    } catch (serviceError: any) {
      console.error(
        "[Learn] Error from speech recognition service or during stop:",
        serviceError,
      );
      Alert.alert(
        "录音/识别失败",
        serviceError.message || "处理录音时出现错误。",
      );
      setIsRecording(false);
    }
  };

  // 处理播放录音
  const handlePlayRecording = async () => {
    if (recorderState.isRecording) {
      console.log("[Learn] Cannot play while recording.");
      return;
    }

    if (audioSource === null || audioSource.length === 0) {
      Alert.alert("没有可播放的录音", "请先录制一段语音。");
      return;
    }

    try {
      audioPlayer = createAudioPlayer(audioSource);
      audioPlayer.seekTo(0);
      audioPlayer.play();
      await new Promise((resolve) => setTimeout(resolve, 500));
      playerStatus = audioPlayer.currentStatus;
    } catch (error) {
      console.error("[Learn] Failed to play recording:", error);
      Alert.alert("播放失败", "无法播放录音，请重试。");
    }
  };

  // 处理停止播放
  const handleStopPlayback = async () => {
    if (audioPlayer && playerStatus.isLoaded && playerStatus.playing) {
      try {
        audioPlayer.remove();
      } catch (error) {
        console.error("[Learn] Failed to stop playback:", error);
      }
    }
  };

  // 切换跟读练习显示
  const toggleFollowRead = useCallback(() => {
    setShowFollowRead((prev) => !prev);
    // 重置跟读状态
    if (showFollowRead) {
      setRecognizedText(null);
      setFollowReadFeedback(null);
      setAudioSource("");
    }
  }, [showFollowRead]);

  // 处理下一题
  const handleNext = useCallback(() => {
    console.log("handleNext");
    if (isSubmitting) return;

    setIsSubmitting(true);

    const responseTimeMs = Date.now() - startTime;
    const result = {
      type: testType,
      correct: true, // 默认成功
      userAnswer: "learn_completed", // 固定答案
      wordId: word.$id,
      responseTimeMs,
      speedUsed: 50,
    };

    // 延迟提交以显示加载状态
    setTimeout(() => {
      onAnswer(result);
    }, 300);
  }, [isSubmitting, startTime, word, onAnswer, testType]);

  // 切换释义显示
  const toggleDefinition = useCallback(() => {
    setShowEnglishDefinition((prev) => !prev);
  }, []);

  // 切换更多例句
  const toggleMoreExamples = useCallback(() => {
    setShowMoreExamples((prev) => !prev);
    // 切换例句时重置所有高亮状态
    setActiveSegments({});
  }, []);

  // 获取例句数据 - 修改为从 word.example_sentences 读取
  const getExampleSentences = (): ExampleSentence[] => {
    // 如果有结构化的例句数据，直接使用
    if (word.example_sentences && word.example_sentences.length > 0) {
      if (showMoreExamples) {
        // 显示所有例句
        return word.example_sentences;
      } else {
        // 只显示第一个例句
        return [word.example_sentences[0]];
      }
    }

    return [];
  };

  const exampleSentences = getExampleSentences();

  // 检查是否有例句数据
  const hasExampleSentences =
    word.example_sentences && word.example_sentences.length > 0;

  // 权限未获取时显示的提示
  if (hasRecordingPermission === false) {
    return (
      <View style={styles.permissionDeniedContainer}>
        <View style={styles.permissionDeniedIcon}>
          <Ionicons name="mic-off" size={64} color="#FF9500" />
        </View>
        <Text style={styles.permissionDeniedText}>录音权限未开启</Text>
        <Text style={styles.permissionDeniedSubText}>
          请在设置中开启录音权限以使用听力测试功能
        </Text>
      </View>
    );
  }

  // 权限正在获取中显示加载状态
  if (hasRecordingPermission === null) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#7C3AED" />
        <Text style={styles.loadingText}>正在获取权限...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* 固定底部的下一题按钮 */}
      <View style={styles.footer}>
        <TouchableOpacity
          testID="next-button"
          style={[styles.nextButton, isSubmitting && styles.nextButtonDisabled]}
          onPress={handleNext}
          disabled={isSubmitting}
          accessibilityLabel="提交答案"
          accessibilityRole="button"
          accessibilityState={{ disabled: isSubmitting }}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <View style={styles.nextButtonContent}>
              <Text style={styles.nextButtonText}>完成学习</Text>
              <Ionicons name="arrow-forward" size={20} color="#7C3AED" />
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* 可滚动的单词内容区域 */}
      <Animated.View
        style={[
          styles.contentContainer,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* 顶部单词信息区域 */}
          <View style={styles.wordCard}>
            <View style={styles.wordHeader}>
              <View style={styles.wordMain}>
                <Text style={styles.wordText}>
                  {word.spelling || "upbringing"}
                </Text>
              </View>

              {/* 音标区域 */}
              <View style={styles.phoneticContainer}>
                <Text style={styles.phoneticText}>
                  {word.american_phonetic
                    ? `美 /${word.american_phonetic}/`
                    : word.british_phonetic
                      ? `英 /${word.british_phonetic}/`
                      : ""}
                </Text>
                <TouchableOpacity
                  style={[
                    styles.soundButton,
                    isPlaying && styles.soundButtonActive,
                  ]}
                  onPress={handlePlaySound}
                  disabled={isPlaying}
                >
                  <Ionicons
                    name={isPlaying ? "volume-medium" : "volume-medium-outline"}
                    size={20}
                    color={isPlaying ? "#7C3AED" : "#6B7280"}
                  />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* 释义区域 */}
          <View style={styles.meaningCard}>
            <View style={styles.meaningHeader}>
              <View style={styles.sectionTitleContainer}>
                <Ionicons name="book-outline" size={20} color="#7C3AED" />
                <Text style={styles.sectionTitle}>释义</Text>
              </View>
              <TouchableOpacity
                style={styles.definitionToggle}
                onPress={toggleDefinition}
              >
                <Text style={styles.definitionToggleText}>
                  {showEnglishDefinition ? "英文释义" : "中文释义"}
                </Text>
                <Ionicons
                  name="swap-vertical"
                  size={16}
                  color="#7C3AED"
                  style={styles.toggleIcon}
                />
              </TouchableOpacity>
            </View>

            <View style={styles.meaningContent}>
              {showEnglishDefinition ? (
                // 英文释义 - 直接从word.definitions获取
                <View style={styles.definitionContent}>
                  {word.definitions && word.definitions.length > 0 ? (
                    word.definitions.map((definition, index) => (
                      <View key={index} style={styles.meaningItem}>
                        {definition.partOfSpeech ? (
                          <>
                            <Text style={styles.englishPartOfSpeech}>
                              {definition.partOfSpeech}
                            </Text>
                            <Text style={styles.englishMeaningText}>
                              {definition.meanings.join("; ")}
                            </Text>
                          </>
                        ) : (
                          <Text style={styles.englishMeaningText}>
                            {definition.meanings.join("; ")}
                          </Text>
                        )}
                      </View>
                    ))
                  ) : (
                    <Text style={styles.englishMeaningText}>
                      The way in which a child is cared for and taught how to
                      behave by their parents or guardians.
                    </Text>
                  )}
                </View>
              ) : (
                // 中文释义 - 直接从word.chinese_meanings获取
                <View style={styles.chineseDefinitionContent}>
                  {word.chinese_meanings && word.chinese_meanings.length > 0 ? (
                    word.chinese_meanings.map((meaning, index) => (
                      <View key={index} style={styles.meaningItem}>
                        {meaning.partOfSpeech ? (
                          <>
                            <Text style={styles.chinesePartOfSpeech}>
                              {meaning.partOfSpeech}
                            </Text>
                            <Text style={styles.chineseMeaningText}>
                              {meaning.meanings.join("; ")}
                            </Text>
                          </>
                        ) : (
                          <Text style={styles.chineseMeaningText}>
                            {meaning.meanings.join("; ")}
                          </Text>
                        )}
                      </View>
                    ))
                  ) : (
                    <Text style={styles.chineseMeaningText}>
                      {word.chinese_meaning || "教养；养育"}
                    </Text>
                  )}
                </View>
              )}
            </View>
          </View>

          {/* 例句区域 */}
          <View style={styles.exampleCard}>
            <View style={styles.exampleHeader}>
              <View style={styles.sectionTitleContainer}>
                <Ionicons
                  name="chatbubble-ellipses-outline"
                  size={20}
                  color="#7C3AED"
                />
                <Text style={styles.sectionTitle}>例句</Text>
              </View>
              {hasExampleSentences && word.example_sentences!.length > 1 && (
                <TouchableOpacity
                  style={styles.moreExamplesButton}
                  onPress={toggleMoreExamples}
                >
                  <Text style={styles.moreExamplesText}>
                    {showMoreExamples
                      ? "收起"
                      : `更多 (${word.example_sentences!.length - 1})`}
                  </Text>
                  <Ionicons
                    name={showMoreExamples ? "chevron-up" : "chevron-down"}
                    size={16}
                    color="#7C3AED"
                  />
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.examplesList}>
              {exampleSentences.length > 0 ? (
                exampleSentences.map((example, index) => (
                  <View key={index} style={styles.exampleItem}>
                    <View style={styles.exampleNumber}>
                      <Text style={styles.exampleNumberText}>{index + 1}</Text>
                    </View>
                    <View style={styles.exampleContent}>
                      {/* 可点击的英文例句 - 传入例句索引 */}
                      {renderClickableEnglish(example, index)}
                      {/* 可点击的中文翻译 - 传入例句索引 */}
                      {renderClickableChinese(example, index)}
                    </View>
                  </View>
                ))
              ) : (
                <View style={styles.noExamplesContainer}>
                  <Ionicons
                    name="document-text-outline"
                    size={48}
                    color="#D1D5DB"
                  />
                  <Text style={styles.noExamplesText}>暂无例句</Text>
                </View>
              )}
            </View>
          </View>

          {/* 新增：跟读练习区域 */}
          <View style={styles.followReadCard}>
            <View style={styles.followReadHeader}>
              <View style={styles.sectionTitleContainer}>
                <Ionicons name="mic-outline" size={20} color="#7C3AED" />
                <Text style={styles.sectionTitle}>跟读练习</Text>
              </View>
              <TouchableOpacity
                style={styles.followReadToggle}
                onPress={toggleFollowRead}
              >
                <Text style={styles.followReadToggleText}>
                  {showFollowRead ? "收起" : "开始练习"}
                </Text>
                <Ionicons
                  name={showFollowRead ? "chevron-up" : "chevron-down"}
                  size={16}
                  color="#7C3AED"
                />
              </TouchableOpacity>
            </View>

            {showFollowRead && (
              <View style={styles.followReadContent}>
                <Text style={styles.followReadInstruction}>
                  请跟读下面的单词，注意发音准确
                </Text>

                <View style={styles.recordingSection}>
                  <TouchableOpacity
                    style={[
                      styles.recordButton,
                      isRecording && styles.recordingActive,
                    ]}
                    onPress={
                      isRecording ? handleStopRecording : handleStartRecording
                    }
                    accessibilityLabel={isRecording ? "停止录音" : "开始录音"}
                  >
                    <Ionicons
                      name={isRecording ? "mic" : "mic-outline"}
                      size={48}
                      color="#fff"
                    />
                  </TouchableOpacity>

                  {/* 识别结果和播放按钮 */}
                  <View style={styles.resultAndPlayRow}>
                    <Text style={styles.statusText}>
                      {isRecording
                        ? "正在录音..."
                        : recognizedText
                          ? `识别结果: ${recognizedText}`
                          : "点击麦克风开始跟读"}
                    </Text>
                    {audioSource && (
                      <TouchableOpacity
                        style={styles.playButton}
                        onPress={
                          playerStatus.playing
                            ? handleStopPlayback
                            : handlePlayRecording
                        }
                        disabled={isRecording}
                        accessibilityLabel={
                          playerStatus.playing ? "停止播放录音" : "播放录音"
                        }
                      >
                        <Ionicons
                          name={
                            playerStatus.playing ? "stop-circle" : "play-circle"
                          }
                          size={28}
                          color={playerStatus.playing ? "#FF3B30" : "#4A90E2"}
                        />
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* 反馈信息 */}
                  {followReadFeedback && (
                    <View
                      style={[
                        styles.feedbackContainer,
                        followReadFeedback.correct
                          ? styles.correctFeedback
                          : styles.incorrectFeedback,
                      ]}
                    >
                      <Ionicons
                        name={
                          followReadFeedback.correct
                            ? "checkmark-circle"
                            : "close-circle"
                        }
                        size={20}
                        color={
                          followReadFeedback.correct ? "#10B981" : "#EF4444"
                        }
                      />
                      <Text style={styles.feedbackText}>
                        {followReadFeedback.message}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            )}
          </View>

          {/* 学习提示区域 
          <View style={styles.learningTip}>
            <View style={styles.tipIcon}>
              <Ionicons name="school-outline" size={20} color="#7C3AED" />
            </View>
            <Text style={styles.learningTipText}>点击例句中的单词可查看对应翻译</Text>
          </View>
          */}
        </ScrollView>
      </Animated.View>
    </View>
  );
};

// 使用错误边界包装组件
const Learn: React.FC<TestTypeProps> = (props) => {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <LearnFC {...props} />
    </ErrorBoundary>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  contentContainer: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 80, // 为底部按钮留出更多空间
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#FFFFFF",
  },
  errorIconContainer: {
    padding: 16,
    backgroundColor: "#FFF7ED",
    borderRadius: 50,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 20,
    fontWeight: "bold",
    marginTop: 16,
    color: "#1E293B",
  },
  errorSubText: {
    fontSize: 16,
    color: "#64748B",
    marginTop: 8,
    textAlign: "center",
    lineHeight: 22,
  },
  retryButton: {
    marginTop: 24,
    backgroundColor: "#7C3AED",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: "#7C3AED",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  // 单词卡片区域
  wordCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    marginTop: 16,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  wordHeader: {
    alignItems: "center",
  },
  wordMain: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  wordText: {
    fontSize: 30,
    fontWeight: "bold",
    color: "#1E293B",
    marginRight: 16,
    textAlign: "center",
  },
  soundButton: {
    padding: 4,
    backgroundColor: "#F1F5F9",
    borderRadius: 50,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  soundButtonActive: {
    backgroundColor: "#EDE9FE",
    transform: [{ scale: 1.05 }],
  },
  phoneticContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  phoneticText: {
    fontSize: 16,
    color: "#64748B",
    fontStyle: "italic",
    paddingRight: 6,
  },
  // 释义卡片
  meaningCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  meaningHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  sectionTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1E293B",
    marginLeft: 8,
  },
  definitionToggle: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  definitionToggleText: {
    fontSize: 14,
    color: "#7C3AED",
    fontWeight: "500",
    marginRight: 4,
  },
  toggleIcon: {
    marginLeft: 2,
  },
  meaningContent: {
    // 高度自适应内容
  },
  definitionContent: {
    // 英文释义容器
    gap: 12,
  },
  chineseDefinitionContent: {
    // 中文释义容器
    gap: 12,
  },
  meaningItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    flexWrap: "wrap",
  },
  chinesePartOfSpeech: {
    fontSize: 16,
    color: "#DC2626",
    fontWeight: "600",
    marginRight: 8,
    minWidth: 36,
    backgroundColor: "#FEF2F2",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  chineseMeaningText: {
    fontSize: 16,
    color: "#374151",
    lineHeight: 24,
    flex: 1,
    flexWrap: "wrap",
  },
  englishPartOfSpeech: {
    fontSize: 16,
    color: "#7C3AED",
    fontWeight: "600",
    marginRight: 6,
    minWidth: 38,
    backgroundColor: "#F5F3FF",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    fontStyle: "italic",
  },
  englishMeaningText: {
    fontSize: 16,
    color: "#374151",
    lineHeight: 24,
    flex: 1,
    flexWrap: "wrap",
    fontStyle: "italic",
  },
  // 例句卡片
  exampleCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  exampleHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  moreExamplesButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  moreExamplesText: {
    fontSize: 14,
    color: "#7C3AED",
    fontWeight: "500",
    marginRight: 4,
  },
  examplesList: {
    gap: 16,
  },
  exampleItem: {
    flexDirection: "row",
    gap: 12,
  },
  exampleNumber: {
    width: 24,
    height: 24,
    backgroundColor: "#7C3AED",
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 2,
  },
  exampleNumberText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "bold",
  },
  exampleContent: {
    flex: 1,
    gap: 8,
    alignSelf: "stretch",
  },
  englishRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "flex-start",
    // 确保行高一致
    lineHeight: 22,
    alignContent: "flex-start",
    justifyContent: "flex-start",
  },
  chineseRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "flex-start",
    // 确保行高一致
    lineHeight: 22,
  },
  wordContainer: {},
  exampleEnglish: {
    fontSize: 16,
    color: "#1E293B",
    lineHeight: 22, // 统一行高
    fontStyle: "italic",
    includeFontPadding: false,
    textAlignVertical: "center",
    flexShrink: 1,
  },
  exampleChinese: {
    fontSize: 15,
    color: "#475569",
    lineHeight: 22, // 统一行高
    includeFontPadding: false,
    textAlignVertical: "center",
    flexShrink: 1,
  },
  clickableText: {
    includeFontPadding: false,
    textAlignVertical: "center",
  },
  noExamplesContainer: {
    alignItems: "center",
    paddingVertical: 32,
  },
  noExamplesText: {
    fontSize: 16,
    color: "#94A3B8",
    marginTop: 12,
    fontStyle: "italic",
  },
  // 学习提示区域
  learningTip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: "#EDE9FE",
    borderRadius: 16,
    marginBottom: 20,
  },
  tipIcon: {
    marginRight: 8,
  },
  learningTipText: {
    fontSize: 14,
    color: "#7C3AED",
    fontWeight: "500",
  },
  // 底部按钮 - 固定在底部
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "transparent",
    paddingHorizontal: 20,
    paddingVertical: 16,
    zIndex: 1000,
  },
  nextButton: {
    borderColor: "#7C3AED",
    backgroundColor: "#dfcffaff",
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: "center",
    shadowColor: "#8ca6f4ff",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  nextButtonDisabled: {
    backgroundColor: "#CBD5E1",
    shadowColor: "#CBD5E1",
    shadowOpacity: 0.3,
  },
  nextButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  nextButtonText: {
    color: "#7C3AED",
    fontSize: 18,
    fontWeight: "bold",
    marginRight: 8,
  },
  // 权限相关样式
  permissionDeniedContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#FFFFFF",
  },
  permissionDeniedIcon: {
    padding: 16,
    backgroundColor: "#FFF7ED",
    borderRadius: 50,
    marginBottom: 16,
  },
  permissionDeniedText: {
    fontSize: 20,
    fontWeight: "bold",
    marginTop: 16,
    color: "#1E293B",
  },
  permissionDeniedSubText: {
    fontSize: 16,
    color: "#64748B",
    marginTop: 8,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#64748B",
  },
  // 英文片段样式
  englishSegment: {
    fontSize: 16,
    color: "#1E293B",
    // lineHeight: 22,
    fontStyle: "italic",
    textDecorationLine: "underline",
    textDecorationColor: "#7C3AED",
    // 添加这些属性来改善布局
    includeFontPadding: false,
    textAlignVertical: "center",
    // 对于包含空格的文本，防止在空格处断开
    flexShrink: 1,
    flexWrap: "nowrap",
  },
  // 中文片段样式
  chineseSegment: {
    fontSize: 15,
    color: "#475569",
    // lineHeight: 22,
    textDecorationLine: "underline",
    textDecorationColor: "#DC2626",
  },

  // 点击后的高亮样式
  highlightedEnglish: {
    color: "#7C3AED",
    textDecorationColor: "#7C3AED",
  },

  highlightedChinese: {
    color: "#DC2626",
    textDecorationColor: "#DC2626",
  },

  // 新增：跟读练习样式
  followReadCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  followReadHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  followReadToggle: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  followReadToggleText: {
    fontSize: 14,
    color: "#7C3AED",
    fontWeight: "500",
    marginRight: 4,
  },
  followReadContent: {
    gap: 16,
  },
  followReadInstruction: {
    fontSize: 16,
    color: "#475569",
    textAlign: "center",
    lineHeight: 22,
  },
  recordingSection: {
    alignItems: "center",
    gap: 16,
  },
  recordButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#4A90E2",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#4A90E2",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  recordingActive: {
    backgroundColor: "#FF3B30",
    shadowColor: "#FF3B30",
  },
  resultAndPlayRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    width: "100%",
  },
  statusText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
  },
  playButton: {
    // 样式调整
  },
  feedbackContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 8,
  },
  correctFeedback: {
    backgroundColor: "#ECFDF5",
    borderColor: "#10B981",
    borderWidth: 1,
  },
  incorrectFeedback: {
    backgroundColor: "#FEF2F2",
    borderColor: "#EF4444",
    borderWidth: 1,
  },
  feedbackText: {
    fontSize: 14,
    fontWeight: "500",
  },
});

export default Learn;
