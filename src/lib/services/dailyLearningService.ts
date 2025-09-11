// src/lib/services/dailyLearningService.ts
import {
  COLLECTION_LEARNING_MODES,
  COLLECTION_USER_WORD_PROGRESS,
  COLLECTION_WORDS,
  DATABASE_ID
} from '@/src/constants/appwrite';
import { LearningMode } from '@/src/types/LearningMode';
import { UserWordProgress } from '@/src/types/UserWordProgress';
import { Query } from 'appwrite';
import { tablesDB } from '../appwrite';

class DailyLearningService {

  // ... (existing methods: getTodaysSession, createSession, updateSession, recordWordAction, getLearningMode)

  /**
   * Generates the word lists for a new daily learning session.
   * This is a simplified version. A real implementation would be much more complex,
   * involving sophisticated algorithms based on spaced repetition, user history, etc.
   * @param userId The ID of the user.
   * @param modeId The ID of the selected learning mode.
   * @returns An object containing arrays of word IDs for pre-test, learning, and post-test.
   */
  async generateTodaysWordLists(userId: string, modeId: number): Promise<{ pre_test: string[]; learning: string[]; post_test: string[] }> {
    try {
      // 1. Fetch User Preferences and Learning Mode Details
      // This would typically be passed in or fetched by the caller
      // const userPrefs = await userService.getUserPreferences(userId);
      const modeResponse = await tablesDB.listRows({
        databaseId:DATABASE_ID,
        tableId:COLLECTION_LEARNING_MODES,
        queries:[Query.equal('id', modeId)]
    });
      const mode: LearningMode | null = modeResponse.rows.length > 0 ? modeResponse.rows[0] as unknown as LearningMode : null;

      if (!mode) {
        throw new Error(`Learning mode with ID ${modeId} not found.`);
      }

      // 2. Fetch User's Word Progress
      // This fetches ALL progress, which might be inefficient for large vocabularies.
      // In practice, you'd use more specific queries or pagination.
      const progressResponse = await tablesDB.listRows({
        databaseId:DATABASE_ID,
        tableId:COLLECTION_USER_WORD_PROGRESS,
        queries:[Query.equal('userId', userId)]
        // Add limit/pagination if needed
    });
      const userProgress: UserWordProgress[] = progressResponse.rows as unknown as UserWordProgress[];

      // 3. Logic to Select Words (Simplified Mock Logic)
      // --- Pre-test Words ---
      // Select words that need to be re-evaluated.
      // Example: Words at L1, L2, or L3 that haven't been tested recently.
      const preTestCandidates = userProgress.filter(p =>
        (p.current_level === 1 || p.current_level === 2 || p.current_level === 3) &&
        (!p.last_review_time || (new Date().getTime() - new Date(p.last_review_time).getTime()) > 24 * 60 * 60 * 1000) // e.g., not reviewed in last 24h
      );
      const preTestWordIds = preTestCandidates.map(p => p.wordId).slice(0, mode.word_count); // Limit by mode

      // --- Learning Words ---
      // Select a mix of new words and words for review/upgrade.
      // Example: New words (L0) + Words to upgrade (L1->L2, L2->L3)
      const newWordCandidatesResponse = await tablesDB.listRows({
        databaseId:DATABASE_ID,
        tableId:COLLECTION_WORDS,
        queries:[
          Query.notEqual('$id', userProgress.map(p => p.wordId)), // Words NOT in user's progress (simplified)
          Query.limit(mode.word_count) // Simplified limit
        ]
    });
      const newWordIds = newWordCandidatesResponse.rows.map((w: any) => w.$id);

      const upgradeCandidates = userProgress.filter(p =>
        (p.current_level === 1 || p.current_level === 2) &&
        p.last_learn_time && (new Date().getTime() - new Date(p.last_learn_time).getTime()) < 7 * 24 * 60 * 60 * 1000 // e.g., learned recently
      );
      const upgradeWordIds = upgradeCandidates.map(p => p.wordId).slice(0, mode.word_count / 2); // Limit upgrades

      const learningWordIds = [...newWordIds, ...upgradeWordIds].slice(0, mode.word_count); // Combine and limit

      // --- Post-test Words ---
      // Test words that were just learned or reviewed in this session.
      // For a new session, this would initially be empty or based on previous session.
      // For simplicity, we'll test the words selected for learning in this session.
      const postTestWordIds = [...learningWordIds]; // Simplified: test what we just learned

      console.log("Generated Word Lists:", { preTestWordIds, learningWordIds, postTestWordIds });
      return { pre_test: preTestWordIds, learning: learningWordIds, post_test: postTestWordIds };
    } catch (error) {
      console.error("DailyLearningService.generateTodaysWordLists error:", error);
      // Depending on requirements, you might return empty lists or re-throw
      // Returning empty lists allows session creation to proceed, maybe with a warning
      return { pre_test: [], learning: [], post_test: [] };
    }
  }


  // ... (rest of existing methods)
}

export default new DailyLearningService();