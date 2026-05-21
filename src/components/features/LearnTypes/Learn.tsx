import speechRecognitionService from "@/src/lib/services/speechRecognitionService";
import wordAudioPlayer from "@/src/lib/utils/WordAudioPlayer";
import { ExampleSentence, Morpheme, TestTypeProps } from "@/src/types/Word";
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
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

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

interface BilingualSegment {
  id: string;
  enKey: string;
  chValue: string;
  enStart: number;
  enEnd: number;
  chStart: number;
  chEnd: number;
}

type TabType = "word" | "examples" | "root";
const tabList: TabType[] = ["word", "examples", "root"];

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
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasRecordingPermission, setHasRecordingPermission] = useState<
    boolean | null
  >(null);
  const playIntervalRef = useRef<number | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>("word");
  const tabScrollRef = useRef<ScrollView>(null);
  const contentScrollRef = useRef<ScrollView>(null);
  const [activeSegments, setActiveSegments] = useState<{
    [exampleIndex: number]: string | null;
  }>({});
  const [recognizedText, setRecognizedText] = useState<string | null>(null);
  const [followReadFeedback, setFollowReadFeedback] = useState<{
    correct: boolean;
    message: string;
  } | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [audioSource, setAudioSource] = useState<string>("");

  const recordOptions: RecordingOptions = {
    extension: ".m4a",
    sampleRate: 8000,
    numberOfChannels: 2,
    bitRate: 48000,
    android: { outputFormat: "mpeg4", audioEncoder: "aac" },
    ios: {
      outputFormat: "aac",
      audioQuality: AudioQuality.MAX,
      linearPCMBitDepth: 16,
    },
    web: { mimeType: "audio/webm", bitsPerSecond: 128000 },
  };

  const audioRecorder = useAudioRecorder(recordOptions);
  const recorderState = useAudioRecorderState(audioRecorder);
  let audioPlayer = useAudioPlayer(audioSource);
  let playerStatus = useAudioPlayerStatus(audioPlayer);

  useFocusEffect(
    useCallback(() => {
      navigation.setOptions({ headerShown: false });
      return () => {
        navigation.setOptions({ headerShown: true });
      };
    }, [navigation]),
  );

  useEffect(() => {
    const checkPermissionAndSetup = async () => {
      const status = await AudioModule.requestRecordingPermissionsAsync();
      setHasRecordingPermission(status.granted);
      if (!status.granted) {
        Alert.alert("权限不足", "需要录音权限才能使用听力功能");
      }
      await setAudioModeAsync({
        playsInSilentMode: true,
        allowsRecording: true,
      });
    };
    checkPermissionAndSetup();
  }, [word.spelling]);

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
    wordAudioPlayer.stop();
  }, [word.spelling]);

  const processBilingualSegments = useCallback(
    (example: ExampleSentence): BilingualSegment[] => {
      const segments: BilingualSegment[] = [];
      if (!example.trans) return segments;
      const chinesePositions: { [key: string]: boolean } = {};
      Object.entries(example.trans).forEach(([enKey, chValue], index) => {
        const enStart = example.en.indexOf(enKey);
        const chStart = example.ch.indexOf(chValue);
        if (enStart === -1 || chStart === -1) return;
        let isOverlapping = false;
        for (let i = chStart; i < chStart + chValue.length; i++) {
          if (chinesePositions[i]) {
            isOverlapping = true;
            break;
          }
        }
        if (isOverlapping) return;
        for (let i = chStart; i < chStart + chValue.length; i++)
          chinesePositions[i] = true;
        segments.push({
          id: `segment_${index}`,
          enKey,
          chValue,
          enStart,
          enEnd: enStart + enKey.length,
          chStart,
          chEnd: chStart + chValue.length,
        });
      });
      return segments.sort((a, b) => a.enStart - b.enStart);
    },
    [],
  );

  const handleSegmentPress = useCallback(
    (exampleIndex: number, segmentId: string) => {
      setActiveSegments((prev) => ({ ...prev, [exampleIndex]: segmentId }));
    },
    [],
  );

  const renderClickableEnglish = useCallback(
    (example: ExampleSentence, exampleIndex: number) => {
      const segments = processBilingualSegments(example);
      if (segments.length === 0)
        return <Text style={styles.exampleEnglish}>{example.en}</Text>;
      const elements: JSX.Element[] = [];
      let lastIndex = 0;
      segments
        .sort((a, b) => a.enStart - b.enStart)
        .forEach((seg, i) => {
          if (seg.enStart > lastIndex) {
            elements.push(
              <Text key={`b_${i}`} style={styles.exampleEnglish}>
                {example.en.slice(lastIndex, seg.enStart)}
              </Text>,
            );
          }
          elements.push(
            <TouchableOpacity
              key={`s_${i}`}
              onPress={() => handleSegmentPress(exampleIndex, seg.id)}
            >
              <Text
                style={[
                  styles.englishSegment,
                  activeSegments[exampleIndex] === seg.id &&
                    styles.highlightedEnglish,
                ]}
              >
                {seg.enKey}
              </Text>
            </TouchableOpacity>,
          );
          lastIndex = seg.enEnd;
        });
      if (lastIndex < example.en.length) {
        elements.push(
          <Text key="after" style={styles.exampleEnglish}>
            {example.en.slice(lastIndex)}
          </Text>,
        );
      }
      return <View style={styles.englishRow}>{elements}</View>;
    },
    [processBilingualSegments, activeSegments, handleSegmentPress],
  );

  const renderClickableChinese = useCallback(
    (example: ExampleSentence, exampleIndex: number) => {
      const segments = processBilingualSegments(example);
      if (segments.length === 0)
        return <Text style={styles.exampleChinese}>{example.ch}</Text>;
      const elements: JSX.Element[] = [];
      let lastIndex = 0;
      segments
        .sort((a, b) => a.chStart - b.chStart)
        .forEach((seg, i) => {
          if (seg.chStart > lastIndex) {
            elements.push(
              <Text key={`b_${i}`} style={styles.exampleChinese}>
                {example.ch.slice(lastIndex, seg.chStart)}
              </Text>,
            );
          }
          elements.push(
            <TouchableOpacity
              key={`s_${i}`}
              onPress={() => handleSegmentPress(exampleIndex, seg.id)}
            >
              <Text
                style={[
                  styles.chineseSegment,
                  activeSegments[exampleIndex] === seg.id &&
                    styles.highlightedChinese,
                ]}
              >
                {seg.chValue}
              </Text>
            </TouchableOpacity>,
          );
          lastIndex = seg.chEnd;
        });
      if (lastIndex < example.ch.length) {
        elements.push(
          <Text key="after" style={styles.exampleChinese}>
            {example.ch.slice(lastIndex)}
          </Text>,
        );
      }
      return <View style={styles.chineseRow}>{elements}</View>;
    },
    [processBilingualSegments, activeSegments, handleSegmentPress],
  );

  const playWordSound = useCallback(async () => {
    setIsPlaying(true);
    const success = await wordAudioPlayer.play(word.spelling || "", {
      accent: "us",
      playbackRate,
      fallbackToTTS: true,
    });
    setIsPlaying(false);
  }, [word.spelling, playbackRate]);

  const handlePlaySound = useCallback(() => playWordSound(), [playWordSound]);

  useEffect(() => {
    if (hasRecordingPermission) playWordSound();
  }, [hasRecordingPermission, playWordSound]);

  const handleStartRecording = async () => {
    if (recorderState.isRecording) return;
    try {
      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();
      setIsRecording(true);
      setRecognizedText(null);
      setAudioSource("");
      setFollowReadFeedback(null);
    } catch (err: any) {
      Alert.alert("录音失败", err.message);
    }
  };

  const handleStopRecording = async () => {
    if (!recorderState.isRecording) return;
    try {
      const uri = audioRecorder.uri;
      if (!uri) {
        Alert.alert("录音失败", "未获取到录音路径");
        return;
      }
      setAudioSource(uri);
      await audioRecorder.stop();
      setIsRecording(false);
      const result = await speechRecognitionService.recognizeSpeech(
        uri,
        word.spelling,
      );
      setRecognizedText(result.recognizedText || "");
      const correct = result.recognizedText === word.spelling;
      setFollowReadFeedback({
        correct,
        message: correct ? "发音准确！" : "再试一次",
      });
    } catch (err: any) {
      Alert.alert("识别失败", err.message);
      setIsRecording(false);
    }
  };

  const handlePlayRecording = async () => {
    if (recorderState.isRecording || !audioSource) return;
    try {
      audioPlayer = createAudioPlayer(audioSource);
      audioPlayer.seekTo(0);
      audioPlayer.play();
    } catch (err) {
      Alert.alert("播放失败");
    }
  };

  const handleStopPlayback = async () => {
    if (audioPlayer && playerStatus.isLoaded && playerStatus.playing) {
      audioPlayer.remove();
    }
  };

  const handleNext = useCallback(() => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    const responseTimeMs = Date.now() - startTime;
    const result = {
      type: testType,
      correct: true,
      userAnswer: "learn_completed",
      wordId: word.$id,
      responseTimeMs,
      speedUsed: 50,
    };
    setTimeout(() => {
      onAnswer(result);
    }, 300);
  }, [isSubmitting, startTime, word, onAnswer, testType]);

  const switchTab = useCallback((tab: TabType) => {
    setActiveTab(tab);
    const index = tabList.indexOf(tab);
    tabScrollRef.current?.scrollTo({ x: index * 120, animated: true });
    contentScrollRef.current?.scrollTo({
      x: index * SCREEN_WIDTH,
      animated: true,
    });
  }, []);

  const handleMomentumScrollEnd = (e: any) => {
    const x = e.nativeEvent.contentOffset.x;
    const index = Math.round(x / SCREEN_WIDTH);
    if (index >= 0 && index < tabList.length) {
      setActiveTab(tabList[index]);
    }
  };

  const getExampleSentences = () => word.example_sentences || [];
  const exampleSentences = getExampleSentences();

  // ====================== 核心修改：构词类型 + 词素渲染 ======================
  const getFormationText = (type: string) => {
    const map: Record<string, string> = {
      primitive: "原生词",
      derivative: "派生词",
      compound: "合成词",
      mixed: "混合词",
      abbr: "缩略词",
    };
    return map[type] || "原生词";
  };

  const renderMorphemeItem = (m: Morpheme) => {
    let roleText = "";
    switch (m.role_in_word) {
      case "prefix":
        roleText = "前缀";
        break;
      case "root":
        roleText = "词根";
        break;
      case "suffix":
        roleText = "后缀";
        break;
      case "free_word":
        roleText = "自由词素";
        break;
      default:
        roleText = "词素";
    }
    return (
      <View style={styles.affixItem} key={m.morpheme}>
        <Text style={styles.affixLabel}>{roleText}：</Text>
        <Text style={styles.affixText}>
          {m.morpheme}（{m.context_meaning}）
        </Text>
      </View>
    );
  };
  // ========================================================================

  if (hasRecordingPermission === null) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#7C3AED" />
        <Text style={styles.loadingText}>正在获取权限...</Text>
      </View>
    );
  }

  if (hasRecordingPermission === false) {
    return (
      <View style={styles.permissionDeniedContainer}>
        <Ionicons name="mic-off" size={64} color="#FF9500" />
        <Text style={styles.permissionDeniedText}>录音权限未开启</Text>
        <Text style={styles.permissionDeniedSubText}>
          请在设置中开启以使用听力功能
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.tabBarContainer}>
        <ScrollView
          ref={tabScrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabScrollContent}
        >
          <TouchableOpacity
            style={[styles.tabItem, activeTab === "word" && styles.tabActive]}
            onPress={() => switchTab("word")}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === "word" && styles.tabTextActive,
              ]}
            >
              单词
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.tabItem,
              activeTab === "examples" && styles.tabActive,
            ]}
            onPress={() => switchTab("examples")}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === "examples" && styles.tabTextActive,
              ]}
            >
              例句
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabItem, activeTab === "root" && styles.tabActive]}
            onPress={() => switchTab("root")}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === "root" && styles.tabTextActive,
              ]}
            >
              助记
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      <View style={styles.indicatorContainer}>
        {tabList.map((item, i) => (
          <View
            key={i}
            style={[
              styles.indicatorDot,
              activeTab === item && styles.indicatorActive,
            ]}
          />
        ))}
      </View>

      <ScrollView
        ref={contentScrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        style={styles.contentScroll}
      >
        {/* 单词信息 */}
        <View style={styles.pageContainer}>
          <Animated.ScrollView
            style={{ opacity: fadeAnim, transform: [{ scale: scaleAnim }] }}
            contentContainerStyle={styles.contentPadding}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.tabPanel}>
              <View style={styles.wordCard}>
                <Text style={styles.wordTitle}>{word.spelling}</Text>
                <View style={styles.phoneticRow}>
                  <Text style={styles.phonetic}>
                    {word.american_phonetic
                      ? `美 /${word.american_phonetic}/`
                      : "无音标"}
                  </Text>
                  <TouchableOpacity
                    style={styles.playBtn}
                    onPress={handlePlaySound}
                    disabled={isPlaying}
                  >
                    <Ionicons
                      name={
                        isPlaying ? "volume-medium" : "volume-medium-outline"
                      }
                      size={20}
                      color="#0284c7"
                    />
                  </TouchableOpacity>
                </View>
                <View style={styles.meaningRow}>
                  <Text style={styles.meaningText}>
                    {(
                      word.chinese_meaning ||
                      word.chinese_meanings?.[0]?.meanings?.join("；") ||
                      "暂无翻译"
                    )
                      .split("\\n").slice(0, 3)
                      .map((line, index, array) => (
                        <Text key={index}>
                          {line}
                          {index !== array.length - 1 && "\n"}
                        </Text>
                      ))}
                  </Text>
                </View>
                {word.image_path ? (
                  <Image
                    source={{ uri: word.image_path }}
                    style={styles.wordImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.imagePlaceholder}>
                    <Ionicons name="image-outline" size={60} color="#ddd" />
                    <Text style={styles.imageTip}></Text>
                  </View>
                )}
              </View>
            </View>
          </Animated.ScrollView>
        </View>

        {/* 例句 */}
        <View style={styles.pageContainer}>
          <Animated.ScrollView
            style={{ opacity: fadeAnim, transform: [{ scale: scaleAnim }] }}
            contentContainerStyle={styles.contentPadding}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.tabPanel}>
              <View style={styles.exampleCard}>
                {exampleSentences.length > 0 ? (
                  exampleSentences.map((ex, i) => (
                    <View key={i} style={styles.exampleItem}>
                      <View style={styles.exampleNum}>
                        <Text style={styles.exampleNumText}>{i + 1}</Text>
                      </View>
                      <View style={styles.exampleBox}>
                        {renderClickableEnglish(ex, i)}
                        {renderClickableChinese(ex, i)}
                      </View>
                    </View>
                  ))
                ) : (
                  <View style={styles.emptyExample}>
                    <Text>暂无例句</Text>
                  </View>
                )}
              </View>
            </View>
          </Animated.ScrollView>
        </View>

        {/* 构词+跟读（已改用 formation_type + morphemes） */}
        <View style={styles.pageContainer}>
          <Animated.ScrollView
            style={{ opacity: fadeAnim, transform: [{ scale: scaleAnim }] }}
            contentContainerStyle={styles.contentPadding}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.tabPanel}>
              <View style={styles.rootCard}>
                <Text style={styles.sectionTitle}>词根助记</Text>
                <View style={styles.morphologyCard}>
                  {word.morphemes && word.morphemes.length > 0 ? (
                    <View style={styles.morphRow}>
                      {word.morphemes.map((m, i, arr) => (
                        <View key={i} style={styles.morphUnit}>
                          <Text style={styles.morphText}>
                            {m.morpheme.replace("-", "")}
                          </Text>
                          <Text style={styles.morphMeaning}>
                            {m.context_meaning}
                          </Text>
                          {/* 不是最后一个就显示 + */}
                          {i < arr.length - 1 && (
                            <Text style={styles.plusSign}>+</Text>
                          )}
                        </View>
                      ))}
                      {/* 箭头 + 完整单词 */}
                      <View style={styles.arrowWrap}>
                        <Text style={styles.arrowSign}> → </Text>
                      </View>
                      <View style={styles.finalWordWrap}>
                        <Text style={styles.finalWord}>{word.spelling}</Text>
                        <Text style={styles.finalMeaning}>{word.meaning}</Text>
                      </View>
                    </View>
                  ) : (
                    <View style={styles.noMorph}>
                      <Ionicons name="cube-outline" size={20} color="#94A3B8" />
                      <Text style={styles.noMorphText}>原生单词，不可拆分</Text>
                    </View>
                  )}
                </View>

                <View style={styles.followSection}>
                  <Text style={styles.sectionTitle}>跟读练习</Text>
                  <View style={styles.recordBox}>
                    <TouchableOpacity
                      style={[
                        styles.recordBtn,
                        isRecording && styles.recording,
                      ]}
                      onPress={
                        isRecording ? handleStopRecording : handleStartRecording
                      }
                    >
                      <Ionicons
                        name={isRecording ? "mic" : "mic-outline"}
                        size={40}
                        color="#fff"
                      />
                    </TouchableOpacity>
                    <Text style={styles.recordTip}>
                      {isRecording
                        ? "正在录音…"
                        : recognizedText || "点击麦克风跟读"}
                    </Text>
                    {audioSource && (
                      <TouchableOpacity
                        style={styles.playRecordBtn}
                        onPress={
                          playerStatus.playing
                            ? handleStopPlayback
                            : handlePlayRecording
                        }
                      >
                        <Ionicons
                          name={
                            playerStatus.playing ? "stop-circle" : "play-circle"
                          }
                          size={28}
                          color={playerStatus.playing ? "#f33" : "#4A90E2"}
                        />
                      </TouchableOpacity>
                    )}
                    {followReadFeedback && (
                      <View
                        style={[
                          styles.feedback,
                          followReadFeedback.correct
                            ? styles.fbCorrect
                            : styles.fbWrong,
                        ]}
                      >
                        <Ionicons
                          name={
                            followReadFeedback.correct
                              ? "checkmark-circle"
                              : "close-circle"
                          }
                          size={18}
                        />
                        <Text style={styles.fbText}>
                          {followReadFeedback.message}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>
            </View>
          </Animated.ScrollView>
        </View>
      </ScrollView>

      <View style={styles.bottomBtnContainer}>
        <TouchableOpacity
          style={[styles.nextBtn, isSubmitting && styles.nextBtnDisabled]}
          onPress={handleNext}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <View style={styles.btnRow}>
              <Text style={styles.nextBtnText}>完成学习</Text>
              <Ionicons name="arrow-forward" size={20} color="#0284c7" />
            </View>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const Learn: React.FC<TestTypeProps> = (props) => {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <LearnFC {...props} />
    </ErrorBoundary>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  tabBarContainer: {
    backgroundColor: "#fff",
    paddingVertical: 12,
    alignItems: "center",
  },
  tabScrollContent: { paddingHorizontal: 16, gap: 12 },
  tabItem: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#f1f5f9",
  },
  tabActive: { backgroundColor: "#64748b" },
  tabText: { fontSize: 15, color: "#64748b" },
  tabTextActive: { color: "#fff", fontWeight: "600" },
  indicatorContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 8,
    backgroundColor: "#fff",
    gap: 6,
  },
  indicatorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#e2e8f0",
  },
  indicatorActive: { width: 20, backgroundColor: "#64748b" },
  contentScroll: { flex: 1 },
  pageContainer: { width: SCREEN_WIDTH * 0.92, alignSelf: "center" },
  contentPadding: {
    paddingHorizontal: 8,
    paddingVertical: 12,
    paddingBottom: 80,
  },
  tabPanel: { width: "100%" },
  wordCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    gap: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  wordTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1e293b",
    textAlign: "center",
  },
  phoneticRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  phonetic: { fontSize: 16, color: "#64748b", fontStyle: "italic" },
  playBtn: { padding: 8, backgroundColor: "#f1f5f9", borderRadius: 20 },
  meaningRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  meaningLabel: { fontSize: 16, color: "#7C3AED", fontWeight: "600" },
  meaningText: { fontSize: 16, color: "#374151", flex: 1 },
  wordImage: { height: 180, borderRadius: 12, backgroundColor: "#f0f4f8" },
  imagePlaceholder: {
    height: 180,
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  imageTip: { color: "#94a3b8", fontSize: 14 },
  exampleCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    gap: 16,
  },
  exampleItem: { flexDirection: "row", gap: 12, marginBottom: 16 },
  exampleNum: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: "#64748b",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 2,
  },
  exampleNumText: { color: "#fff", fontSize: 12, fontWeight: "bold" },
  exampleBox: { flex: 1, gap: 8 },
  englishRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "flex-start",
    width: "100%",
  },
  chineseRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "flex-start",
    width: "100%",
  },
  exampleEnglish: {
    fontSize: 16,
    color: "#1e293b",
    fontStyle: "italic",
    lineHeight: 22,
  },
  exampleChinese: { fontSize: 15, color: "#475569", lineHeight: 22 },
  englishSegment: {
    fontSize: 16,
    color: "#1e293b",
    textDecorationLine: "underline",
    textDecorationColor: "#0284c7",
  },
  chineseSegment: {
    fontSize: 15,
    color: "#475569",
    textDecorationLine: "underline",
    textDecorationColor: "#DC2626",
  },
  highlightedEnglish: { color: "#0284c7" },
  highlightedChinese: { color: "#0284c7" },
  emptyExample: { padding: 40, alignItems: "center" },
  rootCard: { backgroundColor: "#fff", borderRadius: 16, padding: 20, gap: 24 },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: "#1e293b",
    marginBottom: 8,
  },
  rootInfoBox: {
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    padding: 14,
    gap: 10,
  },
  affixItem: { flexDirection: "row", alignItems: "center", marginBottom: 4 },
  affixLabel: { fontSize: 15, fontWeight: "600", color: "#0284c7", width: 50 },
  affixText: { fontSize: 15, color: "#1e293b", flex: 1 },
  followSection: { gap: 12 },
  recordBox: { alignItems: "center", gap: 16 },
  recordBtn: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "#4A90E2",
    justifyContent: "center",
    alignItems: "center",
  },
  recording: { backgroundColor: "#FF3B30" },
  recordTip: { fontSize: 15, color: "#64748b" },
  playRecordBtn: {},
  feedback: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderRadius: 10,
    gap: 8,
  },
  fbCorrect: {
    backgroundColor: "#ecfdf5",
    borderColor: "#10b981",
    borderWidth: 1,
  },
  fbWrong: {
    backgroundColor: "#fef2f2",
    borderColor: "#ef4444",
    borderWidth: 1,
  },
  fbText: { fontSize: 14, fontWeight: "500" },
  bottomBtnContainer: {
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    marginTop: -60,
  },
  nextBtn: {
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#0284c7",
  },
  nextBtnDisabled: { backgroundColor: "#d8e0ea", borderColor: "#cbd5e1" },
  btnRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  nextBtnText: { fontSize: 17, fontWeight: "bold", color: "#0284c7" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 12, fontSize: 16, color: "#64748b" },
  permissionDeniedContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    gap: 16,
  },
  permissionDeniedText: { fontSize: 18, fontWeight: "bold", color: "#1e293b" },
  permissionDeniedSubText: {
    fontSize: 15,
    color: "#64748b",
    textAlign: "center",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorIconContainer: {
    padding: 16,
    backgroundColor: "#fff7ed",
    borderRadius: 50,
  },
  errorText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1e293b",
    marginTop: 16,
  },
  errorSubText: {
    fontSize: 16,
    color: "#64748b",
    marginTop: 8,
    textAlign: "center",
  },
  retryButton: {
    marginTop: 20,
    backgroundColor: "#0284c7",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryButtonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  // 🔥 简约灰色系 · 词根词缀样式
  morphologyCard: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 20,
    gap: 14,
    shadowOpacity: 0.04,
    shadowRadius: 10,
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  morphRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 4,
  },
  morphUnit: {
    flexDirection: "row",
    alignItems: "center",
  },
  morphText: {
    fontSize: 17,
    fontWeight: "600",
    color: "#334155", // 深灰（词素）
  },
  morphMeaning: {
    fontSize: 14,
    color: "#64748b", // 中灰（释义）
    marginLeft: 4,
    marginRight: 4,
  },
  plusSign: {
    fontSize: 18,
    color: "#94a3b8", // 浅灰（加号）
    marginHorizontal: 6,
  },
  arrowWrap: {
    justifyContent: "center",
    alignItems: "center",
  },
  arrowSign: {
    fontSize: 20,
    color: "#64748b", // 中灰（箭头）
    marginHorizontal: 6,
  },
  finalWordWrap: {
    flexDirection: "row",
    alignItems: "center",
  },
  finalWord: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1e293b", // 近黑（完整单词）
  },
  finalMeaning: {
    fontSize: 15,
    color: "#475569", // 灰蓝（释义）
    marginLeft: 8,
  },
  noMorph: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    gap: 8,
  },
  noMorphText: {
    fontSize: 14,
    color: "#94a3b8",
  },
  formationTagBar: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: "#f8fafc",
  },
  formationTagText: {
    fontSize: 12,
    color: "#64748b",
  },
});

export default Learn;
