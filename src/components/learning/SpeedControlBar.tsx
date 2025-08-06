// src/components/learning/SpeedControlBar.tsx
import Slider from '@react-native-community/slider'; // 从社区库导入
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface SpeedControlBarProps {
  currentSpeed: number; // 50, 75, 100, 125, 150 etc (百分比)
  minSpeed: number; // 最小速度 (e.g., 30 or 50)
  maxSpeed: number; // 最大速度 (e.g., 150)
  step: number; // 步长 (e.g., 5 or 10)
  onSpeedChange: (newSpeed: number) => void;
  wordLevel: number; // 单词等级，用于显示提示
}

/**
 * 学习场景中的语速控制栏
 * 根据单词等级调整速度范围和步长，并提供语速提示
 */
export function SpeedControlBar({
  currentSpeed,
  minSpeed,
  maxSpeed,
  step,
  onSpeedChange,
  wordLevel,
}: SpeedControlBarProps) {
  const getSpeedLabel = (speed: number): string => {
    if (speed < 70) return '稍慢';
    if (speed > 130) return '较快';
    return '正常';
  };

  const speedLabel = getSpeedLabel(currentSpeed);

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>语速</Text>
        <Text style={styles.speedValue}>{currentSpeed}%</Text>
        <Text style={styles.speedLabel}>{speedLabel}</Text>
      </View>
      <Slider
        style={styles.slider}
        minimumValue={minSpeed}
        maximumValue={maxSpeed}
        step={step}
        value={currentSpeed}
        onValueChange={onSpeedChange}
        minimumTrackTintColor="#007AFF"
        maximumTrackTintColor="#ddd"
        thumbStyle={styles.thumb} // 自定义滑块样式 (如果需要)
      />
      <View style={styles.rangeLabels}>
        <Text style={styles.rangeLabel}>{minSpeed}%</Text>
        <Text style={styles.rangeLabel}>{maxSpeed}%</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 15,
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    marginVertical: 10,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  speedValue: {
    fontSize: 16,
    color: '#007AFF',
  },
  speedLabel: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  slider: {
    width: '100%',
    height: 40,
  },
  thumb: {
    // 如果需要自定义滑块，可以在这里添加样式
    // 例如: width: 20, height: 20, borderRadius: 10, backgroundColor: 'blue'
  },
  rangeLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 5,
  },
  rangeLabel: {
    fontSize: 12,
    color: '#888',
  },
});
