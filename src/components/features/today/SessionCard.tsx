// src/components/features/today/SessionCard.tsx
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface SessionCardProps {
  title: string;
  subtitle: string;
  status: string; // e.g., '待开始', '进行中... 3/7', '已完成 ✅', '等待中... (🔒)'
  onStart: () => void;
  isLocked: boolean;
}

const SessionCard: React.FC<SessionCardProps> = ({ title, subtitle, status, onStart, isLocked }) => {
  const isCompleted = status.includes('已完成');
  const isInProgress = status.includes('进行中');
  const isWaitingLocked = status.includes('(🔒)');

  return (
    <View style={[styles.card, isCompleted && styles.completedCard]}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
      <Text style={styles.status}>{status}</Text>
      <TouchableOpacity
        style={[
          styles.button,
          (isLocked || isCompleted) && styles.disabledButton, // Combine disabled styles
        ]}
        onPress={onStart}
        disabled={isLocked || isCompleted} // Disable if locked or completed
        activeOpacity={isLocked || isCompleted ? 1 : 0.2} // Visual feedback on press
      >
        {isLocked ? (
          <>
            <Ionicons name="lock-closed" size={20} color="white" />
            {/* <Text style={styles.buttonText}>开始</Text> */}
          </>
        ) : (
          <Text style={styles.buttonText}>
            {isCompleted ? '已完成' : (isInProgress ? '继续' : '开始')}
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3, // Android shadow
  },
  completedCard: {
    opacity: 0.8,
    // Optional different background for completed cards
    // backgroundColor: '#e8f5e9',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#333', // Slightly darker text
  },
  subtitle: {
    fontSize: 14,
    color: 'gray',
    marginBottom: 15,
  },
  status: {
    fontSize: 14,
    marginBottom: 15,
    color: '#666', // Slightly darker than gray
  },
  button: {
    backgroundColor: '#4A90E2', // Main blue from design spec
    paddingVertical: 12, // More vertical padding
    paddingHorizontal: 20,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row', // To align icon and text
  },
  disabledButton: {
    backgroundColor: 'gray', // Gray for disabled state
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    marginLeft: 5, // Space between icon and text if icon is present
  },
});

export default SessionCard;