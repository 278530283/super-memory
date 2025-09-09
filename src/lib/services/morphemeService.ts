// src/lib/services/morphemeService.ts
import { COLLECTION_MORPHEMES, COLLECTION_WORD_MORPHEME_ASSOCIATIONS, DATABASE_ID } from '@/src/constants/appwrite';
import { Databases, Query } from 'appwrite';

// Define types (these should ideally be in src/types/Morpheme.ts)
interface Morpheme {
  $id: string;
  morphemeText: string;
  meaningZh: string;
  // ... other fields
}

interface WordMorphemeAssociation {
  wordId: string;
  morphemeId: string;
  orderIndex: number;
}

class MorphemeService {
  async getMorphemesForWord(wordId: string): Promise<Morpheme[]> {
    try {
      // 1. Get associations
      const associationsResponse = await Databases.listDocuments(
        DATABASE_ID,
        COLLECTION_WORD_MORPHEME_ASSOCIATIONS,
        [Query.equal('wordId', wordId), Query.orderAsc('orderIndex')]
      );

      const morphemeIds = associationsResponse.documents.map((assoc: any) => assoc.morphemeId);

      if (morphemeIds.length === 0) {
        return [];
      }

      // 2. Get morpheme details
      const morphemesResponse = await databases.listDocuments(
        DATABASE_ID,
        COLLECTION_MORPHEMES,
        [Query.equal('$id', morphemeIds)]
      );

      // 3. Sort by orderIndex
      const morphemeMap = new Map(morphemesResponse.documents.map((m: any) => [m.$id, m]));
      const orderedMorphemes = associationsResponse.documents
        .map((assoc: any) => morphemeMap.get(assoc.morphemeId))
        .filter(Boolean); // Remove any undefined if ID mismatch

      return orderedMorphemes as Morpheme[];
    } catch (error) {
      console.error("MorphemeService.getMorphemesForWord error:", error);
      throw error; // Re-throw for caller to handle
    }
  }

  // Add method to update user morpheme progress if needed
  // async updateUserMorphemeProgress(...) { ... }
}

export default new MorphemeService();