// src/app/(tabs)/quick-review/index.tsx
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function QuickReviewScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>快速复习</Text>
      <TouchableOpacity style={styles.button}>
        <Text style={styles.buttonText}>立即开始快速复习</Text>
      </TouchableOpacity>
      <Text style={styles.subtitle}>今日待复习：15个单词</Text>
      {/* Add logic to fetch and display review words */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#4A90E2',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 16,
    color: 'gray',
  },
});