// src/components/features/today/TestTypes/Spelling.tsx
import { TestTypeProps } from "@/src/types/Word";
import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { ErrorBoundary } from "react-error-boundary";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

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
const SpellingFC: React.FC<TestTypeProps> = ({
  word,
  onAnswer,
  testType = "spelling",
}) => {
  const correctSpelling = word.spelling;
  const wordLength = correctSpelling.length;

  // 初始化每个字母的输入框状态
  const [letterInputs, setLetterInputs] = useState<string[]>(
    Array(wordLength).fill(""),
  );
  const [showFeedback, setShowFeedback] = useState<{
    correct: boolean;
    message: string;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [startTime] = useState<number>(Date.now());
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const inputRefs = useRef<TextInput[]>([]); // 存储所有输入框的引用

  // 动画效果
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  // 处理单个字母输入框变化
  const handleLetterChange = useCallback(
    (text: string, index: number) => {
      // 只取最后一个字符（限制为单个字母）
      const newLetter =
        text.length > 0 ? text[text.length - 1].toLowerCase() : "";

      setLetterInputs((prev) => {
        const newInputs = [...prev];
        newInputs[index] = newLetter;
        return newInputs;
      });

      // 如果输入了字符且不是最后一个输入框，自动聚焦到下一个
      if (newLetter !== "" && index < wordLength - 1) {
        inputRefs.current[index + 1]?.focus();
      }
    },
    [wordLength],
  );

  // 处理删除键
  const handleKeyPress = useCallback(
    (e: any, index: number) => {
      if (e.nativeEvent.key === "Backspace") {
        // 如果当前输入框为空且不是第一个，删除前一个并聚焦
        if (letterInputs[index] === "" && index > 0) {
          setLetterInputs((prev) => {
            const newInputs = [...prev];
            newInputs[index - 1] = "";
            return newInputs;
          });
          inputRefs.current[index - 1]?.focus();
        }
      }
    },
    [letterInputs],
  );

  const handleSubmit = useCallback(() => {
    // 组合所有字母
    const userInput = letterInputs.join("");

    if (userInput.length < wordLength) {
      Alert.alert("提示", `请输入完整的 ${wordLength} 个字母`);
      return;
    }

    if (isSubmitting) return;

    setIsSubmitting(true);

    // 不区分大小写比较
    const isCorrect = userInput.toLowerCase() === correctSpelling.toLowerCase();
    const responseTimeMs = Date.now() - startTime;
    const result = {
      type: testType,
      correct: isCorrect,
      userAnswer: userInput,
      wordId: word.$id,
      responseTimeMs,
    };

    setShowFeedback({
      correct: isCorrect,
      message: isCorrect ? "✅ 正确！" : `❌ 再试试`,
    });

    setTimeout(() => {
      onAnswer(result);
    }, 100);
  }, [
    letterInputs,
    wordLength,
    isSubmitting,
    startTime,
    word,
    onAnswer,
    testType,
    correctSpelling,
  ]);

  // 根据 showFeedback 状态确定输入框样式
  const getInputStyle = () => {
    if (!showFeedback) {
      return { borderColor: "#E0E0E0", backgroundColor: "#FFFFFF" };
    }

    if (showFeedback.correct) {
      return { borderColor: "#28A745", backgroundColor: "#F8FFF8" };
    } else {
      return { borderColor: "#DC3545", backgroundColor: "#FFF8F8" };
    }
  };

  // 渲染每个字母的输入框
  const renderLetterInputs = () => {
    return (
      <View style={styles.lettersContainer}>
        {letterInputs.map((letter, index) => (
          <TextInput
            key={index}
            ref={(ref) => {
              if (ref) {
                inputRefs.current[index] = ref;
              }
            }}
            style={[styles.letterInput, getInputStyle()]}
            value={letter}
            onChangeText={(text) => handleLetterChange(text, index)}
            onKeyPress={(e) => handleKeyPress(e, index)}
            placeholder="_"
            placeholderTextColor="#C5C5C7"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!isSubmitting}
            maxLength={1}
            keyboardType="default"
            textAlign="center"
          />
        ))}
      </View>
    );
  };

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      {/* 中文意思区域 */}
      <View style={styles.wordPhoneticContainer}>
        <Text style={styles.wordText}>{word.meaning || ""}</Text>
        {/* 条件渲染音标 */}
        {/* {(word.american_phonetic || word.british_phonetic) && (
          <Text style={styles.phoneticText}>
            {word.american_phonetic
              ? `美 /${word.american_phonetic}/`
              : `英 /${word.british_phonetic}/`}
          </Text>
        )} */}
      </View>

      {/* 拼写输入区域 - 显示每个字母的输入框 */}
      <View style={styles.inputContainer}>
        {renderLetterInputs()}
        <Text style={styles.hintText}>请输入 {wordLength} 个字母</Text>
      </View>

      {/* 提交按钮 */}
      <TouchableOpacity
        testID="submit-button"
        style={[
          styles.submitButton,
          (letterInputs.some((input) => input === "") || isSubmitting) &&
            styles.submitButtonDisabled,
        ]}
        onPress={handleSubmit}
        disabled={letterInputs.some((input) => input === "") || isSubmitting}
        accessibilityLabel={isSubmitting ? "提交中..." : "提交答案"}
        accessibilityRole="button"
        accessibilityState={{
          disabled: letterInputs.some((input) => input === "") || isSubmitting,
        }}
      >
        {isSubmitting ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Text style={styles.submitButtonText}>提交</Text>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

// 使用错误边界包装组件
const Spelling: React.FC<TestTypeProps> = (props) => {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <SpellingFC {...props} />
    </ErrorBoundary>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 20,
    position: "relative",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#FFFFFF",
  },
  errorText: {
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 16,
    color: "#1A1A1A",
  },
  errorSubText: {
    fontSize: 14,
    color: "#666666",
    marginTop: 8,
    textAlign: "center",
  },
  retryButton: {
    marginTop: 20,
    backgroundColor: "#4A90E2",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  wordPhoneticContainer: {
    alignItems: "center",
    marginVertical: 20,
  },
  wordText: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1A1A1A",
  },
  phoneticText: {
    fontSize: 16,
    color: "#666666",
    marginTop: 5,
  },
  inputContainer: {
    alignItems: "center",
    marginBottom: 30,
  },
  lettersContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    flexWrap: "wrap",
    marginBottom: 10,
  },
  letterInput: {
    width: 48,
    height: 56,
    borderWidth: 2,
    borderRadius: 8,
    marginHorizontal: 4,
    fontSize: 22,
    fontWeight: "600",
    ...Platform.select({
      ios: {
        shadowColor: "#d0bebeff",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  hintText: {
    fontSize: 14,
    color: "#666666",
    marginTop: 8,
  },
  submitButton: {
    position: "absolute",
    bottom: 20,
    left: 16,
    right: 16,
    backgroundColor: "#4A90E2",
    borderRadius: 24,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 50,
  },
  submitButtonDisabled: {
    backgroundColor: "#C5C5C7",
  },
  submitButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default Spelling;
