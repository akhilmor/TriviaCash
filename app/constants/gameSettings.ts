/**
 * Shared game settings constants
 * These values are used across all game screens and logic
 */

export const GAME_SETTINGS = {
  // Timer settings
  QUESTION_TIMER_SECONDS: 65, // Time per question in seconds
  
  // Question settings
  DEFAULT_TOTAL_QUESTIONS: 10, // Default number of questions per game
  
  // Scoring settings
  MAX_SCORE_PER_QUESTION: 1000, // Maximum points per question
} as const;

// Export individual constants for convenience
export const QUESTION_TIMER = GAME_SETTINGS.QUESTION_TIMER_SECONDS;
export const DEFAULT_TOTAL_QUESTIONS = GAME_SETTINGS.DEFAULT_TOTAL_QUESTIONS;
export const MAX_SCORE_PER_QUESTION = GAME_SETTINGS.MAX_SCORE_PER_QUESTION;

