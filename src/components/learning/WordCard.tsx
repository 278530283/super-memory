// src/components/learning/WordCard.tsx
import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { Word } from '../../types/api'; // 导入单词类型

interface WordCardProps {
  word: Word;
  level: number; // 当前单词等级，用于决定显示内容
  onPronounce: () => void; // 点击发音按钮
  // 可以根据 L0-L4 添加更多 props，如 onImagePress, onDefinitionPress 等
}

/**
 * 学习场景中的单词卡片组件
 * 根据单词等级 (L0-L4) 动态调整显示内容和交互
 */
export function WordCard({ word, level, onPronounce }: WordCardProps) {
  // 根据等级决定显示哪些信息
  const renderCardContent = () => {
    switch (level) {
      case 0: // L0 启蒙级
        return (
          <>
            <Text style={styles.l0Word}>{word.spelling}</Text>
            {word.imageUrl && <Image source={{ uri: word.imageUrl }} style={styles.l0Image} resizeMode="contain" />}
            <Text style={styles.l0Definition}>{word.definition}</Text>
            {/* 可以添加拼音标注逻辑 */}
          </>
        );
      case 1: // L1 基础级
        return (
          <>
            <Text style={styles.l1Word}>{word.spelling}</Text>
            {word.imageUrl && <Image source={{ uri: word.imageUrl }} style={styles.l1Image} resizeMode="contain" />}
            <Text style={styles.l1Definition}>{word.definition}</Text>
            {/* 可以添加干扰选项 */}
          </>
        );
      case 2: // L2 进阶级
        return (
          <>
            {/* L2 默认不显示拼写，可能需要一个状态来控制是否显示 */}
            <Text style={styles.l2Definition}>{word.definition}</Text>
            {/* 可以添加声波图占位符 */}
          </>
        );
      case 3: // L3 熟练级
        return (
          <>
            {/* L3 顶部仅提示，拼写在输入框 */}
            <Text style={styles.l3Prompt}>点击播放发音</Text>
            {/* 输入框和计时条在父组件中 */}
          </>
        );
      case 4: // L4 精通级
        return (
          <>
            <Text style={styles.l4Word}>{word.spelling}</Text>
            {/* 短文填空在父组件中实现 */}
            <Text style={styles.l4Example}>{word.exampleSentence}</Text>
          </>
        );
      default:
        return <Text>未知等级</Text>;
    }
  };

  return (
    <View style={[styles.card, styles[`l${level}Card` as keyof typeof styles]]}>
      {/* 发音按钮 - 所有等级都可能有 */}
      <TouchableOpacity style={styles.pronounceButton} onPress={onPronounce}>
        <Text style={styles.pronounceButtonText}>🔊</Text>
      </TouchableOpacity>

      {renderCardContent()}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    padding: 20,
    margin: 10,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    // 阴影效果 (Android/iOS)
    elevation: 4, // Android
    shadowColor: '#000', // iOS
    shadowOffset: { width: 0, height: 2 }, // iOS
    shadowOpacity: 0.25, // iOS
    shadowRadius: 3.84, // iOS
  },
  // --- 各等级卡片样式 ---
  l0Card: {
    backgroundColor: '#FFF9C4', // 浅黄
  },
  l1Card: {
    backgroundColor: '#E0E0E0', // 浅灰白
  },
  l2Card: {
    backgroundColor: '#EEEEEE', // 浅灰
  },
  l3Card: {
    backgroundColor: '#FFFFFF', // 白色
  },
  l4Card: {
    backgroundColor: '#F3E5F5', // 浅紫
  },
  pronounceButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    padding: 10,
  },
  pronounceButtonText: {
    fontSize: 24,
  },
  // --- 各等级内容样式 ---
  l0Word: {
    fontSize: 48,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  l0Image: {
    width: '80%',
    height: 200,
    marginBottom: 20,
  },
  l0Definition: {
    fontSize: 20,
    color: '#555',
  },
  l1Word: {
    fontSize: 36,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  l1Image: {
    width: '70%',
    height: 150,
    marginBottom: 15,
  },
  l1Definition: {
    fontSize: 18,
    color: '#444',
  },
  l2Definition: {
    fontSize: 22,
    color: '#333',
    marginBottom: 20,
  },
  l3Prompt: {
    fontSize: 18,
    color: '#666',
    fontStyle: 'italic',
    marginBottom: 30,
  },
  l4Word: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#222',
  },
  l4Example: {
    fontSize: 16,
    color: '#444',
    textAlign: 'center',
  },
});
