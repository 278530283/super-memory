// src/components/features/today/TestTypes/TranslateEnToZh.tsx
import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface TranslateEnToZhProps {
  word: { spelling: string; chinese_meaning: string }; // Or a Word object type
  onAnswer: (result: { type: 'translate'; correct: boolean; selectedOption: string; wordId?: string }) => void;
}

const TranslateEnToZh: React.FC<TranslateEnToZhProps> = ({ word, onAnswer }) => {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  // Mock options - in reality, fetch based on word and history
  const options = [
    word.chinese_meaning, // Correct answer
    '错误选项 A',
    '错误选项 B',
    '错误选项 C',
    '错误选项 D',
    '错误选项 E',
  ].sort(() => Math.random() - 0.5); // Shuffle options

  const handleSelect = (option: string) => {
    setSelectedOption(option);
  };

  const handleSubmit = () => {
    if (!selectedOption) {
      Alert.alert('请选择一个选项。');
      return;
    }
    const isCorrect = selectedOption === word.chinese_meaning;
    onAnswer({ type: 'translate', correct: isCorrect, selectedOption, wordId: word.spelling }); // Pass word ID if available
  };

  return (
    <View style={styles.container}>
      <Text style={styles.word}>{word.spelling}</Text>
      <Text style={styles.prompt}>请选择正确的中文释义</Text>

      <View style={styles.optionsContainer}>
        {options.map((option, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.optionButton,
              selectedOption === option && styles.selectedOptionButton,
            ]}
            onPress={() => handleSelect(option)}
          >
            <Text style={[
              styles.optionText,
              selectedOption === option && styles.selectedOptionText,
            ]}>
              {option}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
        <Text style={styles.submitButtonText}>提交</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    padding: 20,
  },
  word: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  prompt: {
    fontSize: 18,
    marginBottom: 20,
    textAlign: 'center',
    color: 'gray',
  },
  optionsContainer: {
    width: '100%',
    marginBottom: 20,
  },
  optionButton: {
    backgroundColor: '#f0f0f0',
    padding: 15,
    marginVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  selectedOptionButton: {
    backgroundColor: '#4A90E2',
    borderColor: '#4A90E2',
  },
  optionText: {
    fontSize: 16,
    textAlign: 'center',
  },
  selectedOptionText: {
    color: 'white',
  },
  submitButton: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 5,
    width: '80%',
    alignItems: 'center',
  },
  submitButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default TranslateEnToZh;