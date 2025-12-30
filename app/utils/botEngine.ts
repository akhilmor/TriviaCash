import { Question } from '@/constants/questions';
import { MAX_SCORE_PER_QUESTION } from '@/constants/gameSettings';

export interface BotProfile {
  username: string;
  accuracy: number; // 0.40 to 0.95 (40% to 95%)
  speedFactor: number; // 0.5 to 1.5 (affects reaction time)
  difficultyProfile: {
    easy: number; // Multiplier for easy questions (0.8 to 1.2)
    medium: number; // Multiplier for medium questions (0.8 to 1.2)
    hard: number; // Multiplier for hard questions (0.8 to 1.2)
  };
  consistency: number; // 0.7 to 1.0 (how consistent they are)
}

export interface BotResult {
  username: string;
  score: number;
  correctCount: number;
  isCurrentUser: boolean;
  rank?: number;
}

// Bot profiles with varied skill levels
const BOT_PROFILES: BotProfile[] = [
  {
    username: 'TriviaMaster',
    accuracy: 0.92, // Very skilled
    speedFactor: 1.1, // Fast
    difficultyProfile: {
      easy: 1.15,
      medium: 1.05,
      hard: 0.95,
    },
    consistency: 0.95,
  },
  {
    username: 'QuickThinker',
    accuracy: 0.75, // Good but not perfect
    speedFactor: 1.3, // Very fast
    difficultyProfile: {
      easy: 1.2,
      medium: 1.0,
      hard: 0.85,
    },
    consistency: 0.85,
  },
  {
    username: 'BrainBox',
    accuracy: 0.88, // Strong knowledge
    speedFactor: 0.9, // Slower but accurate
    difficultyProfile: {
      easy: 1.0,
      medium: 1.1,
      hard: 1.15,
    },
    consistency: 0.9,
  },
  {
    username: 'QuizWhiz',
    accuracy: 0.65, // Average player
    speedFactor: 1.0, // Average speed
    difficultyProfile: {
      easy: 1.05,
      medium: 0.95,
      hard: 0.9,
    },
    consistency: 0.75,
  },
  {
    username: 'SmartPlayer',
    accuracy: 0.55, // Below average
    speedFactor: 0.8, // Slower
    difficultyProfile: {
      easy: 0.95,
      medium: 0.85,
      hard: 0.75,
    },
    consistency: 0.7,
  },
];

/**
 * Simulates a bot answering questions and calculates their score
 */
export function simulateBotScore(
  bot: BotProfile,
  questions: Question[],
  basePointsPerQuestion: number = MAX_SCORE_PER_QUESTION
): BotResult {
  let totalScore = 0;
  let correctCount = 0;

  questions.forEach((question) => {
    // Calculate bot's accuracy for this specific question based on difficulty
    const difficultyMultiplier = bot.difficultyProfile[question.difficulty];
    let adjustedAccuracy = bot.accuracy * difficultyMultiplier;
    
    // Cap adjusted accuracy at 95% first (before consistency)
    adjustedAccuracy = Math.min(0.95, adjustedAccuracy);
    
    // Apply consistency factor (some randomness)
    const consistencyRoll = 0.7 + (bot.consistency * 0.3);
    let finalAccuracy = adjustedAccuracy * consistencyRoll;
    
    // Ensure bots NEVER get 100% accuracy - cap at 95% (double-check)
    finalAccuracy = Math.min(0.95, finalAccuracy);
    
    // Determine if bot answers correctly
    const isCorrect = Math.random() < finalAccuracy;
    
    if (isCorrect) {
      correctCount++;
      
      // Calculate points based on speed factor
      // Faster bots get more points, but with diminishing returns
      const speedBonus = Math.min(1.2, 0.8 + (bot.speedFactor * 0.2));
      const timeRatio = Math.random() * 0.6; // Simulate answering in 0-60% of max time
      const adjustedTimeRatio = timeRatio / bot.speedFactor; // Faster bots use less time
      
      // Calculate points (similar to player scoring)
      const timeRatioForScoring = Math.min(1, adjustedTimeRatio);
      const points = Math.max(0, Math.round(basePointsPerQuestion * (1 - timeRatioForScoring * 0.5) * speedBonus));
      
      // Add small randomness (±5%) to make it feel natural
      const randomness = 0.95 + (Math.random() * 0.1); // 0.95 to 1.05
      totalScore += Math.round(points * randomness);
    }
  });

  return {
    username: bot.username,
    score: Math.max(0, totalScore),
    correctCount,
    isCurrentUser: false,
  };
}

/**
 * Generates leaderboard with real bot opponents based on actual questions
 */
export function generateBotLeaderboard(
  userScore: number,
  userCorrectCount: number,
  questions: Question[],
  totalQuestions: number
): (BotResult & { rank: number })[] {
  // Select 4 random bots from the pool
  const selectedBots = [...BOT_PROFILES]
    .sort(() => Math.random() - 0.5)
    .slice(0, 4);

  // Simulate bot scores based on actual questions
  const botResults = selectedBots.map((bot) => 
    simulateBotScore(bot, questions, MAX_SCORE_PER_QUESTION)
  );

  // Add user's actual result
  const userResult: BotResult = {
    username: 'You',
    score: userScore,
    correctCount: userCorrectCount,
    isCurrentUser: true,
  };

  // Combine and sort by score (descending)
  const allResults = [...botResults, userResult].sort((a, b) => b.score - a.score);

  // Assign ranks
  return allResults.map((result, index) => ({
    ...result,
    rank: index + 1,
  }));
}

/**
 * Fallback: Generate leaderboard when questions are not available
 * Uses a simpler model based on user score
 */
export function generateFallbackLeaderboard(userScore: number): (BotResult & { rank: number })[] {
  const selectedBots = [...BOT_PROFILES]
    .sort(() => Math.random() - 0.5)
    .slice(0, 4);

  // Estimate bot scores based on their profiles and user score
  const botResults = selectedBots.map((bot) => {
    // Estimate score based on bot's accuracy relative to a perfect score
    const estimatedPerfectScore = MAX_SCORE_PER_QUESTION * 10; // Assuming 10 questions
    const estimatedBotScore = Math.round(
      estimatedPerfectScore * bot.accuracy * (0.8 + Math.random() * 0.4)
    );
    
    return {
      username: bot.username,
      score: estimatedBotScore,
      correctCount: Math.round(10 * bot.accuracy),
      isCurrentUser: false,
    };
  });

  const userResult: BotResult = {
    username: 'You',
    score: userScore,
    correctCount: 0, // Unknown in fallback
    isCurrentUser: true,
  };

  const allResults = [...botResults, userResult].sort((a, b) => b.score - a.score);

  return allResults.map((result, index) => ({
    ...result,
    rank: index + 1,
  }));
}

