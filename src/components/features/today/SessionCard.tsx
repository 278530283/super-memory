// src/components/features/today/SessionCard.tsx
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface SessionCardProps {
  title: string;
  subtitle: string;
  status: string; // e.g., '待开始', '进行中...', '已完成 ✅', '等待中... (🔒)'
  progress?: string; // 新增：进度显示，如 "5/7"
  buttonText: string; // 新增：按钮文本，由父组件控制
  onStart: () => void;
  isLocked: boolean;
  disabled?: boolean;
}

const SessionCard: React.FC<SessionCardProps> = ({ 
  title, 
  subtitle, 
  status, 
  progress,
  buttonText,
  onStart, 
  isLocked,
  disabled = false 
}) => {
  const isCompleted = status.includes('已完成');
  const isInProgress = status.includes('进行中');
  const isWaitingLocked = status.includes('(🔒)');

  return (
    <View style={[
      styles.card, 
      isCompleted && styles.completedCard,
      isLocked && styles.lockedCard,
      disabled && styles.disabledCard
    ]}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        {progress && (
          <Text style={styles.progressText}>{progress}</Text>
        )}
      </View>
      <Text style={styles.subtitle}>{subtitle}</Text>
      <Text style={[
        styles.status,
        isCompleted && styles.completedStatus,
        isLocked && styles.lockedStatus,
        !isCompleted && disabled && styles.disabledStatus
      ]}>
        {status}
      </Text>
      <TouchableOpacity
        style={[
          styles.button,
          (isLocked || disabled) && styles.disabledButton,
          isCompleted && styles.completedButton,
          isInProgress && styles.inProgressButton,
        ]}
        onPress={onStart}
        disabled={isLocked || disabled}
        activeOpacity={isLocked || disabled ? 1 : 0.7}
      >
        {isLocked ? (
          <Ionicons name="lock-closed" size={20} color="#A0AEC0" />
        ) : disabled && !isCompleted ? (
          <Text style={styles.disabledButtonText}>{buttonText}</Text>
        ) : (
          <Text style={styles.buttonText}>{buttonText}</Text>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  completedCard: {
    backgroundColor: '#F8F9FA',
    borderLeftWidth: 4,
    borderLeftColor: '#27AE60',
  },
  lockedCard: {
    opacity: 0.7,
  },
  disabledCard: {
    opacity: 0.6,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D3748',
    flex: 1,
  },
  progressText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2D9CDB',
    marginLeft: 10,
  },
  subtitle: {
    fontSize: 14,
    color: '#718096',
    marginBottom: 12,
    lineHeight: 20,
  },
  status: {
    fontSize: 14,
    marginBottom: 16,
    color: '#4A5568',
  },
  completedStatus: {
    color: '#27AE60',
    fontWeight: '500',
  },
  lockedStatus: {
    color: '#A0AEC0',
  },
  disabledStatus: {
    color: '#CBD5E0',
  },
  button: {
    backgroundColor: '#2D9CDB',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  completedButton: {
    backgroundColor: '#27AE60',
  },
  inProgressButton: {
    backgroundColor: '#2D9CDB',
  },
  disabledButton: {
    backgroundColor: '#E2E8F0',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  disabledButtonText: {
    color: '#A0AEC0',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default SessionCard;