// src/constants/appwrite.ts
// Align with Appwrite collection names from architecture.md mapping
export const APPWRITE_ENDPOINT = process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT || 'YOUR_APPWRITE_ENDPOINT';
export const APPWRITE_PROJECT_ID = process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID || 'YOUR_PROJECT_ID';

export const DATABASE_ID = 'main';

// Collection IDs (from architecture.md mapping)
export const COLLECTION_USERS_PREFERENCES = 'user_preferences'; // user (preferences part)
export const COLLECTION_LEARNING_MODES = 'learning_modes';
export const COLLECTION_WORDS = 'words';
export const COLLECTION_USER_WORD_PROGRESS = 'user_word_progress';
export const COLLECTION_USER_WORD_TEST_HISTORY = 'user_word_test_history';
export const COLLECTION_DAILY_LEARNING_SESSIONS = 'daily_learning_sessions'; // Updated from daily_words
export const COLLECTION_USER_WORD_ACTION_LOG = 'user_word_action_log';
export const COLLECTION_LEARNING_RECORDS = 'learning_records';
export const COLLECTION_LEARNING_WORDS = 'learning_words';
export const COLLECTION_REVIEW_STRATEGIES = 'review_strategies';
export const COLLECTION_REVIEW_RECORDS = 'review_records';
export const COLLECTION_MORPHEMES = 'morphemes';
export const COLLECTION_WORD_MORPHEME_ASSOCIATIONS = 'word_morpheme_associations';
export const COLLECTION_USER_MORPHEME_PROGRESS = 'user_morpheme_progress';
export const COLLECTION_PRONUNCIATION_EVALUATIONS = 'pronunciation_evaluations';
export const COLLECTION_CUSTOM_MATERIALS = 'custom_materials';
export const COLLECTION_ARTICLES = 'articles';
export const COLLECTION_LEVEL_ASSESSMENTS = 'level_assessments';

// Storage Bucket ID
export const STORAGE_BUCKET_WORD_ASSETS = 'word-assets';