// src/components/features/today/SummaryCard.tsx
import { Ionicons } from '@expo/vector-icons'; // For celebration icon
import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface SummaryCardProps {
  isVisible: boolean;
  onClose: () => void;
  // Data to display
  newData: number;
  reviewData: number;
  levelUpData: number;
  correctRate: number;
  // Add other summary data as needed
}

const SummaryCard: React.FC<SummaryCardProps> = ({
  isVisible,
  onClose,
  newData,
  reviewData,
  levelUpData,
  correctRate,
}) => {
  return (
    <Modal
      animationType="slide" // Or 'fade' or 'none'
      transparent={true}
      visible={isVisible}
      onRequestClose={onClose} // For Android back button
    >
      <View style={styles.centeredView}>
        <View style={styles.modalView}>
          {/* Celebration Icon */}
          <Ionicons name="trophy" size={50} color="#FFD700" style={styles.trophyIcon} />

          {/* Title */}
          <Text style={styles.title}>太棒了！</Text>

          {/* Summary Stats */}
          <View style={styles.statsContainer}>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>新学单词：</Text>
              <Text style={styles.statValue}>{newData}个</Text>
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>复习单词：</Text>
              <Text style={styles.statValue}>{reviewData}个</Text>
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>等级提升：</Text>
              <Text style={styles.statValue}>{levelUpData}个</Text>
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>整体正确率：</Text>
              <Text style={styles.statValue}>{correctRate}%</Text>
            </View>
          </View>

          {/* Close Button */}
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>我知道了</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)', // Semi-transparent background
  },
  modalView: {
    margin: 20,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 35,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    width: '80%', // Adjust width as needed
  },
  trophyIcon: {
    marginBottom: 15,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  statsContainer: {
    width: '100%',
    marginBottom: 20,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  statLabel: {
    fontSize: 16,
    color: '#666',
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    backgroundColor: '#4A90E2',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  closeButtonText: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default SummaryCard;