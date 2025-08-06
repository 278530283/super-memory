# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an Expo-based React Native application for enhanced memory learning, specifically designed to help users learn English vocabulary through interactive exercises. The app uses speech recognition and text-to-speech capabilities to create an immersive learning experience.

## Development Commands

### Starting the Development Server
```bash
npx expo start
```

### Running on Different Platforms
- Android: `npx expo run:android`
- iOS: `npx expo run:ios`
- Web: `npx expo start --web`

### Linting
```bash
npm run lint
```

## Project Structure

The app uses Expo Router with file-based routing:
- `app/` - Contains the main application screens
  - `index.tsx` - Main word learning screen
  - `_layout.tsx` - Root layout component

## Key Dependencies

- `expo-audio` - For audio recording and playback
- `expo-speech` - For text-to-speech functionality
- `expo-file-system` - For file system operations
- `@expo/vector-icons` - For icons
- `@react-navigation` - For navigation

## Architecture

The application implements a word learning system with:
1. Text-to-speech for word pronunciation
2. Audio recording for user input
3. Speech recognition using Baidu API
4. Text similarity comparison for answer validation
5. Progressive learning with word levels
6. Animated UI elements for better user experience

The main learning flow is in `app/index.tsx` which handles:
- Word presentation and pronunciation
- User audio recording
- Speech recognition via Baidu API
- Answer validation and feedback
- Progress tracking

## API Keys

The application uses Baidu API services for speech recognition:
- Speech recognition: `https://vop.baidu.com/server_api`
- Text similarity: `https://aip.baidubce.com/rpc/2.0/nlp/v2/simnet`

API keys are currently hardcoded in the index.tsx file.