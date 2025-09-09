// src/app/(tabs)/special-training/index.tsx
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function SpecialTrainingScreen() {
  const trainings = [
    { name: '拼写大师', icon: 'pencil', screen: 'spelling' },
    { name: '听力达人', icon: 'ear', screen: 'listening' },
    { name: '逻辑拓展', icon: 'cube', screen: 'logic' },
    { name: '发音评测', icon: 'mic', screen: 'pronunciation' },
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>专项能力训练</Text>
      <View style={styles.grid}>
        {trainings.map((training, index) => (
          <TouchableOpacity key={index} style={styles.card}>
            <Ionicons name={training.icon as any} size={40} color="#4A90E2" />
            <Text style={styles.cardText}>{training.name}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  card: {
    width: '48%', // Two cards per row
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    marginBottom: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardText: {
    marginTop: 10,
    fontSize: 16,
    fontWeight: 'bold',
  },
});