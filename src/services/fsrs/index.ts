import { createEmptyCard, fsrs, generatorParameters, Rating, Card, State, type CardInput } from 'ts-fsrs';

interface Question {
  uuid: string;
  question: string;
  options: {
    a: string;
    b: string;
    c: string;
    d: string;
  };
  audio_cid: string;
}

export interface IrysProgress {
  uuid: string;
  correct: boolean;
  fsrs?: Card;
}

export interface UserProgress {
  userId: string;
  songId: string;
  questions: IrysProgress[];
  completedAt: string;
}

export class FSRSService {
  private static instance: FSRSService;
  private f;

  private constructor() {
    this.f = fsrs(generatorParameters({ 
      enable_fuzz: true,
      maximum_interval: 36500, // 100 years
      request_retention: 0.9,  // 90% retention
    }));
  }

  static getInstance(): FSRSService {
    if (!FSRSService.instance) {
      FSRSService.instance = new FSRSService();
    }
    return FSRSService.instance;
  }

  public getParameters() {
    return {
      enable_fuzz: true,
      maximum_interval: 36500,
      request_retention: 0.9
    };
  }

  async selectQuestions(allQuestions: any[], previousProgress?: UserProgress | null): Promise<any[]> {
    console.log(`[FSRS Service] selectQuestions called with ${allQuestions.length} questions`);
    console.log(`[FSRS Service] previousProgress:`, previousProgress ? 'exists' : 'null');
    
    // If no previous progress, return first 20 questions
    if (!previousProgress) {
      console.log(`[FSRS Service] No previous progress, returning first 20 questions`);
      return allQuestions.slice(0, 20);
    }

    console.log(`[FSRS Service] Previous progress contains ${previousProgress.questions.length} questions`);
    
    // Log the structure of the first question to help debug
    if (previousProgress.questions.length > 0) {
      console.log(`[FSRS Service] First question structure:`, JSON.stringify(previousProgress.questions[0]));
    }
    
    // Get cards that are due for review
    const dueCards = previousProgress.questions
      .filter(q => {
        const hasFsrs = Boolean(q.fsrs);
        const isDue = q.fsrs ? new Date(q.fsrs.due) <= new Date() : false;
        
        console.log(`[FSRS Service] Question ${q.uuid}: hasFsrs=${hasFsrs}, isDue=${isDue}`);
        
        if (hasFsrs) {
          console.log(`[FSRS Service] FSRS data for ${q.uuid}:`, JSON.stringify(q.fsrs));
        }
        
        return hasFsrs && isDue;
      })
      .map(q => q.uuid);

    console.log(`[FSRS Service] Found ${dueCards.length} due cards`);

    // If we have enough due cards, return those
    if (dueCards.length >= 20) {
      console.log(`[FSRS Service] Returning ${Math.min(dueCards.length, 20)} due cards`);
      return allQuestions.filter(q => dueCards.includes(q.uuid)).slice(0, 20);
    }

    // Otherwise, fill remaining slots with new questions
    const seenQuestions = new Set(previousProgress.questions.map(q => q.uuid));
    const newQuestions = allQuestions.filter(q => !seenQuestions.has(q.uuid));
    const selectedDueQuestions = allQuestions.filter(q => dueCards.includes(q.uuid));
    
    console.log(`[FSRS Service] Combining ${selectedDueQuestions.length} due questions with ${Math.min(newQuestions.length, 20 - selectedDueQuestions.length)} new questions`);
    
    // If there are no due cards and no new questions, return the first 20 questions
    if (selectedDueQuestions.length === 0 && newQuestions.length === 0) {
      console.log(`[FSRS Service] No due cards and no new questions, returning first 20 questions`);
      return allQuestions.slice(0, 20);
    }
    
    return [...selectedDueQuestions, ...newQuestions.slice(0, 20 - selectedDueQuestions.length)];
  }

  rateAnswer(isCorrect: boolean): Rating {
    // Simple mapping for multiple choice:
    // Correct -> Good
    // Incorrect -> Again
    return isCorrect ? Rating.Good : Rating.Again;
  }

  updateCard(card: Card | undefined, rating: Rating): Card {
    console.log(`[FSRS Service] updateCard called with rating: ${rating}`);
    console.log(`[FSRS Service] existing card:`, card ? JSON.stringify(card) : 'undefined');
    
    const now = new Date();
    const initialCard: Card = card || createEmptyCard(now);
    const result = this.f.repeat(initialCard, now);
    
    // @ts-ignore - ts-fsrs types are not perfect yet
    const updatedCard = result[rating].card;
    console.log(`[FSRS Service] updated card:`, JSON.stringify(updatedCard));
    
    return updatedCard;
  }

  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
}

// Export the singleton instance
export const fsrsService = FSRSService.getInstance(); 