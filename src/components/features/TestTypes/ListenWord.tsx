// src/components/features/today/TestTypes/ListenWord.tsx
import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
// You'll likely need a library for audio playback, e.g., expo-av
// import { Audio } from 'expo-av';

interface ListenWordProps {
  word: string; // Or a Word object with spelling, audio path, etc.
  onAnswer: (result: { type: 'listen'; correct: boolean; /* ...other data */ }) => void;
}

const ListenWord: React.FC<ListenWordProps> = ({ word, onAnswer }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  // Mock options - in reality, fetch based on word and history
  const options = ['Option A', 'Option B', 'Option C', 'Option D', 'Option E', 'Option F'];

  // const playAudio = async () => {
  //   // Implement audio playback logic using word's audio path
  //   // const soundObject = new Audio.Sound();
  //   // try {
  //   //   await soundObject.loadAsync(require('../../assets/audio/word.mp3')); // Placeholder
  //   //   await soundObject.playAsync();
  //   //   setIsPlaying(true);
  //   //   // Listen for finish event to setIsPlaying(false)
  //   // } catch (error) {
  //   //   console.error('Error playing audio:', error);
  //   // }
  // };

  const handleSelect = (option: string) => {
    setSelectedOption(option);
  };

  const handleSubmit = () => {
    if (!selectedOption) {
      Alert.alert('Please select an option.');
      return;
    }
    // Mock correctness check - replace with actual logic
    const isCorrect = selectedOption === options[0]; // Assume first is correct for mock
    onAnswer({ type: 'listen', correct: isCorrect /*, selectedOption, wordId, etc. */ });
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.playButton} /*onPress={playAudio}*/>
        <Text style={styles.playButtonText}>{isPlaying ? '🔊 Playing...' : '🔊 播放单词'}</Text>
      </TouchableOpacity>

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
  },
  playButton: {
    backgroundColor: '#e0e0e0',
    padding: 15,
    borderRadius: 30,
    marginBottom: 30,
  },
  playButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
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

export default ListenWord;