// src/types/Word.ts
// Based on `word` table from database.md and architecture.md

export interface Word {
  $id: string; // Appwrite Document ID
  spelling: string;
  chinese_meaning: string;
  syllable_count: number;
  is_abstract: boolean; // 1=true, 0=false -> boolean
  letter_count: number;
  // File IDs for audio/images in Appwrite Storage
  british_audio?: string | null; // File ID
  american_audio?: string | null; // File ID
  image_path?: string | null; // File ID or path
  speed_sensitivity: number; // 1=低, 2=中, 3=高
  difficulty_level: number; // 1=小学, 2=初中, 3=高中
  is_analyzed: boolean; // 1=true, 0=false -> boolean
  // Add other fields if present in Appwrite collection
}
