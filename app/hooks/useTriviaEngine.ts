import { useState, useCallback, useRef, useEffect } from 'react';
import { Question } from '@/constants/questions';
import { fetchRandomQuestions } from '@/services/questionsService';
import { questions as fallbackQuestions } from '@/constants/questions';
import { isFetchInProgress, setFetchLock, releaseFetchLock, shouldBlockFetch, getFetchLock } from '@/utils/fetchGuard';
import { QUESTION_TIMER, MAX_SCORE_PER_QUESTION } from '@/constants/gameSettings';

export interface AnswerSubmission {
  questionId: string;
  answer: number;
  timeElapsed: number;
  timestamp: number;
}

export interface GameResult {
  score: number;
  answers: AnswerSubmission[];
  correctCount: number;
  questions: Question[];
}

const MAX_QUESTION_TIME = QUESTION_TIMER; // seconds

// Helper function to add timeout to API calls
function withTimeout<T>(promise: Promise<T>, timeoutMs: number = 5000): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`API call timed out after ${timeoutMs}ms`)), timeoutMs)
    ),
  ]);
}

// Global fetch guard is now in @/utils/fetchGuard.ts

export function useTriviaEngine() {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [questionsList, setQuestionsList] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<AnswerSubmission[]>([]);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [questionStartTime, setQuestionStartTime] = useState<number | null>(null);
  const [timerExpired, setTimerExpired] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const gameActiveRef = useRef(true);
  const [gameActive, setGameActive] = useState(true);
  const [gameEnded, setGameEnded] = useState(false);
  const timerExpiredRef = useRef(false);
  const isFetchingRef = useRef(false); // Prevent concurrent fetches
  const fetchSessionRef = useRef<string | null>(null); // Track fetch session (category+timestamp)
  const lastLoggedStateRef = useRef<string>('');
  const gameEndedRef = useRef(false); // Guard to prevent multiple endGame calls
  const onGameEndCallbackRef = useRef<(() => void) | null>(null); // Callback for navigation
  const endGameCalledRef = useRef(false); // Additional guard to prevent multiple endGame calls
  const timerRef = useRef<NodeJS.Timeout | null>(null); // Timer reference for cleanup
  const finalScoreRef = useRef(0); // Final score ref for navigation
  const correctCountRef = useRef(0); // Correct count ref for navigation

  const startGame = useCallback(async (numQuestions: number = 10, category?: string) => {
    const fetchKey = `single-${category || 'any'}-${Date.now()}`;
    const categoryKey = category || 'any';
    
    console.log('========================================');
    console.log('[useTriviaEngine] GAME MODE = single');
    console.log('[useTriviaEngine] CATEGORY PASSED =', category || 'undefined');
    console.log('[useTriviaEngine] FETCH GUARD STATUS = checking...');
    
    // Guard 1: Check if THIS hook instance is already fetching
    if (isFetchingRef.current) {
      console.log('[useTriviaEngine] ⚠️ [GUARD] Fetch already in progress (local), skipping duplicate call');
      console.log('[useTriviaEngine] FETCH GUARD STATUS = blocked (local in progress)');
      return;
    }

    // Guard 2: Check global fetch lock to prevent ONLY SIMULTANEOUS concurrent fetches
    if (shouldBlockFetch(category, 'single')) {
      const lockInfo = getFetchLock();
      console.log('[useTriviaEngine] ⚠️ [GUARD] Global fetch in progress:', lockInfo);
      console.log('[useTriviaEngine] ⚠️ [GUARD] Skipping duplicate call for:', categoryKey);
      console.log('[useTriviaEngine] FETCH GUARD STATUS = blocked (simultaneous)');
      return;
    }

    // Guard 3: If we already have questions loaded for THIS exact category, don't fetch again
    // But only if we have enough questions (>= numQuestions)
    if (fetchSessionRef.current === categoryKey && questionsList.length >= numQuestions) {
      console.log('[useTriviaEngine] ⚠️ [GUARD] Already fetched for this category in this session:', categoryKey);
      console.log('[useTriviaEngine] ⚠️ [GUARD] Using existing', questionsList.length, 'questions');
      console.log('[useTriviaEngine] FETCH GUARD STATUS = skipped (already have questions)');
      return;
    }

    const timestamp = new Date().toISOString();
    console.log('========================================');
    console.log('FETCH QUESTIONS → Single Player /', categoryKey, '/', timestamp);
    console.log('[useTriviaEngine] 🎮 SINGLE PLAYER - Starting game');
    console.log('[useTriviaEngine] Category:', category || 'Any');
    console.log('[useTriviaEngine] Questions requested:', numQuestions);
    console.log('[useTriviaEngine] Fetch session key:', fetchKey);
    console.log('[useTriviaEngine] FETCH GUARD STATUS = allowed');
    console.log('========================================');

    // Set global and local fetch locks
    setFetchLock(category, 'single');
    fetchSessionRef.current = categoryKey;
    isFetchingRef.current = true;

    // Reset state for new game
    setCurrentQuestionIndex(0);
    setAnswers([]);
    setHasAnswered(false);
    setTimerExpired(false);
    setGameEnded(false);
    setGameActive(true);
    timerExpiredRef.current = false;
    gameEndedRef.current = false;
    gameActiveRef.current = true;
    endGameCalledRef.current = false;
    
    // Clear any existing timers
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    setQuestionsList([]); // Clear old questions
    setIsLoading(true);

    let retryCount = 0;
    const maxRetries = 1;

    const attemptFetch = async (): Promise<Question[]> => {
      try {
        console.log('[useTriviaEngine] 🚀 Calling API: fetchRandomQuestions(' + (numQuestions * 2) + ', "' + (category || 'any') + '")');
        console.log('[useTriviaEngine] Attempt:', retryCount + 1, '/', maxRetries + 1);
        console.log('[useTriviaEngine] API CATEGORY =', category || 'undefined');
        
        // Add timeout wrapper (5 seconds)
        // Fetch 2x amount to account for category filtering
        const fetchedQuestions = await withTimeout(
          fetchRandomQuestions(numQuestions * 2, category),
          5000
        );
        
        console.log('[useTriviaEngine] ✅ API call successful!');
        console.log('[useTriviaEngine] FETCH RESULT LENGTH =', fetchedQuestions?.length || 0);
        console.log('[useTriviaEngine] Received', fetchedQuestions.length, 'questions from API');
        
        if (!fetchedQuestions || fetchedQuestions.length === 0) {
          throw new Error('API returned empty question array');
        }
        
        // Validate we got enough questions
        if (fetchedQuestions.length < numQuestions) {
          console.warn('[useTriviaEngine] ⚠️ API returned', fetchedQuestions.length, 'questions but', numQuestions, 'were requested');
          
          // If we got very few, it might be a category issue
          if (fetchedQuestions.length < numQuestions / 2) {
            console.warn('[useTriviaEngine] ⚠️ Very few questions returned - may indicate category mapping issue');
          }
        }
        
        return fetchedQuestions;
      } catch (error: any) {
        console.error('[useTriviaEngine] ❌ API call failed:', error);
        console.error('[useTriviaEngine] Error details:', {
          message: error?.message,
          status: error?.status,
          stack: error?.stack?.substring(0, 200)
        });
        
        if (retryCount < maxRetries) {
          retryCount++;
          console.log('[useTriviaEngine] 🔄 Retrying API call...');
          await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retry
          return attemptFetch();
        }
        
        throw error;
      }
    };

    try {
      let fetchedQuestions = await attemptFetch();
      
      // Since we're using API category IDs directly, the API already filtered by category
      // Don't filter again by category name - that would cause issues when category names don't match exactly
      // (e.g., "Technology" maps to "Science: Computers" in the API)
      if (category) {
        console.log('[useTriviaEngine] Category validation for:', category);
        
        // Just validate that we got questions - API already filtered by category ID
        // Check category names for logging/debugging purposes only
        const categoryMatchCount = fetchedQuestions.filter((q) => {
          if (!q || !q.category) return false;
          const questionCategory = q.category.toLowerCase();
          const targetCategory = category.toLowerCase();
          
          // Technology should match "computers" or "technology"
          if (targetCategory === 'technology') {
            return questionCategory.includes('computer') || 
                   questionCategory.includes('technology') ||
                   questionCategory.includes('tech');
          }
          
          // Entertainment should match any entertainment subcategory
          if (targetCategory === 'entertainment') {
            return questionCategory.includes('entertainment');
          }
          
          // Other categories - loose match
          const categoryWithoutPrefix = questionCategory.replace(/^[^:]+: /, '');
          return categoryWithoutPrefix.includes(targetCategory) ||
                 targetCategory.includes(categoryWithoutPrefix) ||
                 questionCategory.includes(targetCategory);
        }).length;
        
        const matchPercentage = fetchedQuestions.length > 0 
          ? ((categoryMatchCount / fetchedQuestions.length) * 100).toFixed(1) 
          : 0;
        
        console.log('[useTriviaEngine] Category validation:', categoryMatchCount, 'of', fetchedQuestions.length, 'questions match category name (' + matchPercentage + '%)');
        
        // If very few match, it might indicate a category mapping issue, but still use the questions
        if (categoryMatchCount < fetchedQuestions.length / 2 && fetchedQuestions.length > 0) {
          console.warn('[useTriviaEngine] ⚠️ Low category name match rate - category ID may be correct but name differs');
          console.warn('[useTriviaEngine] ⚠️ This is normal for mapped categories (e.g., Technology → Science: Computers)');
        }
        
        // Use ALL fetched questions - API already filtered by category ID correctly
        console.log('[useTriviaEngine] Using all', fetchedQuestions.length, 'questions from API (filtered by category ID)');
      }
      
      // Shuffle and select the needed count
      const shuffled = fetchedQuestions.sort(() => Math.random() - 0.5);
      const selected = shuffled.slice(0, Math.min(numQuestions, fetchedQuestions.length));
      
      console.log('[useTriviaEngine] Selected', selected.length, 'questions from', fetchedQuestions.length, 'fetched');
      console.log('[useTriviaEngine] FINAL QUESTION ARRAY LENGTH =', selected.length);
      
      // Validate we have at least the requested number of questions
      if (selected.length === 0) {
        throw new Error('No questions available after selection');
      }
      
      // Ensure we have at least 10 questions
      if (selected.length < numQuestions) {
        console.warn('[useTriviaEngine] ⚠️ Only got', selected.length, 'questions but', numQuestions, 'were requested');
        console.warn('[useTriviaEngine] ⚠️ Category:', categoryKey, 'may have limited questions in API');
        
        // If we got very few questions (less than half requested), this might indicate a category issue
        if (selected.length < numQuestions / 2) {
          console.error('[useTriviaEngine] ❌ CRITICAL: Too few questions returned for category:', categoryKey);
          console.error('[useTriviaEngine] ❌ Category ID mapping may be incorrect');
          console.error('[useTriviaEngine] ❌ Check CATEGORY_NAME_TO_ID mapping in questionsService.ts');
          
          // Still continue with what we have - better than nothing
          if (selected.length === 0) {
            throw new Error(`Category "${categoryKey}" returned no questions. Check category mapping.`);
          }
        }
      }
      
      // Final validation: must have at least some questions
      if (selected.length === 0) {
        throw new Error(`No questions available for category "${categoryKey}". Check category mapping.`);
      }
      
      console.log('[useTriviaEngine] ✅ Selected', selected.length, 'questions for game');
      setQuestionsList(selected);
      setQuestionStartTime(Date.now());
      
      const finalCount = selected.length;
      console.log('[useTriviaEngine] ✅ Game initialized with', finalCount, 'questions!');
      console.log('[useTriviaEngine] questionIndex: 0, totalQuestions:', finalCount);
      console.log('[useTriviaEngine] FINAL QUESTION ARRAY LENGTH =', finalCount);
      console.log('[useTriviaEngine] ========================================');
      
    } catch (error: any) {
      console.error('[useTriviaEngine] ❌ All API attempts failed');
      console.error('[useTriviaEngine] FALLBACK TRIGGERED =', true);
      console.error('[useTriviaEngine] Final error:', error?.message || error);
      console.error('[useTriviaEngine] Error details:', {
        message: error?.message,
        status: error?.status,
        name: error?.name,
        category: categoryKey
      });
      
      // Only use fallback if API genuinely failed (429, network error, etc.)
      // Don't use fallback if it's a category mismatch - throw error instead
      if (error?.message?.includes('Invalid parameter') || error?.message?.includes('response_code 2')) {
        console.error('[useTriviaEngine] ❌ Category mapping issue detected for:', categoryKey);
        console.error('[useTriviaEngine] ❌ NOT using fallback - this is a category configuration error');
        throw new Error(`Invalid category "${categoryKey}". Please check category mapping.`);
      }
      
      // Fallback to local questions if API fails completely
      let filteredQuestions = [...fallbackQuestions];
      if (category) {
        filteredQuestions = fallbackQuestions.filter((q) => q && q.category === category);
        if (filteredQuestions.length === 0) {
          console.warn('[useTriviaEngine] ⚠️ No fallback questions found for category "' + category + '", using all fallback questions');
          filteredQuestions = [...fallbackQuestions];
        }
      }
      
      // Shuffle and select the needed count
      const shuffled = filteredQuestions.sort(() => Math.random() - 0.5);
      const selected = shuffled.slice(0, Math.min(numQuestions, filteredQuestions.length));
      
      if (selected.length === 0) {
        console.error('[useTriviaEngine] ❌ CRITICAL: No fallback questions available!');
        throw new Error('No questions available from API or fallback');
      } else {
        console.log('[useTriviaEngine] ✅ Using', selected.length, 'fallback questions');
      }
      
      // Ensure we have at least 10 questions
      if (selected.length < numQuestions) {
        console.warn('[useTriviaEngine] ⚠️ Fallback only has', selected.length, 'questions (requested:', numQuestions, ')');
      }
      
      setQuestionsList(selected);
      setQuestionStartTime(Date.now());
      
      const fallbackCount = selected.length;
      console.log('[useTriviaEngine] ✅ Game initialized with', fallbackCount, 'fallback questions!');
      console.log('[useTriviaEngine] questionIndex: 0, totalQuestions:', fallbackCount);
      console.log('[useTriviaEngine] FINAL QUESTION ARRAY LENGTH =', fallbackCount);
      console.log('[useTriviaEngine] ========================================');
    } finally {
      // ALWAYS reset loading state and fetching flag - this runs in ALL cases
      console.log('[useTriviaEngine] 🏁 Fetch complete, resetting loading state');
      setIsLoading(false);
      isFetchingRef.current = false;
      
      // Release global fetch lock
      releaseFetchLock();
      console.log('[useTriviaEngine] 🔓 Global fetch lock released');
      
      setCurrentQuestionIndex(0);
      setAnswers([]);
      setHasAnswered(false);
      setTimerExpired(false);
      setGameEnded(false);
      setGameActive(true);
      timerExpiredRef.current = false;
      gameEndedRef.current = false;
      gameActiveRef.current = true;
      endGameCalledRef.current = false;
      
      // Clear any existing timers
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }, []); // Empty dependency array - function should be stable

  // Set callback for game end (called from QuestionScreen)
  const setOnGameEnd = useCallback((callback: () => void) => {
    onGameEndCallbackRef.current = callback;
  }, []);

  // Explicit endGame function - DISABLES gameplay immediately
  const endGame = useCallback(() => {
    if (!gameActiveRef.current) return;

    console.log('[ENGINE] endGame() called');

    // Disable gameplay IMMEDIATELY
    gameActiveRef.current = false;
    setGameActive(false);

    gameEndedRef.current = true;
    setGameEnded(true);

    // Auto-submit wrong answer for current question if not answered
    if (!hasAnswered && questionStartTime !== null) {
      const currentQuestion = questionsList[currentQuestionIndex];
      if (currentQuestion) {
        const submission: AnswerSubmission = {
          questionId: currentQuestion.id,
          answer: -1, // No answer
          timeElapsed: MAX_QUESTION_TIME,
          timestamp: Date.now(),
        };
        setAnswers((prev) => [...prev, submission]);
        setHasAnswered(true);
      }
    }

    // Auto-submit wrong answers for any remaining unanswered questions
    if (questionsList.length > 0) {
      const currentAnswersCount = answers.length;
      const remainingCount = questionsList.length - currentAnswersCount;
      
      if (remainingCount > 0) {
        const unansweredQuestions = questionsList.slice(currentAnswersCount);
        unansweredQuestions.forEach((question) => {
          const submission: AnswerSubmission = {
            questionId: question.id,
            answer: -1, // No answer
            timeElapsed: MAX_QUESTION_TIME,
            timestamp: Date.now(),
          };
          setAnswers((prev) => [...prev, submission]);
        });
      }
    }

    // Calculate final score and lock in values
    const gameResult = getGameResult();
    finalScoreRef.current = gameResult.score;
    correctCountRef.current = gameResult.correctCount;
    
    console.log('[ENGINE] Game ended - score:', finalScoreRef.current, 'correct:', correctCountRef.current);
  }, [hasAnswered, questionStartTime, currentQuestionIndex, questionsList, answers.length, getGameResult]);

  const submitAnswer = useCallback(
    (answerIndex: number): { success: boolean; isCorrect: boolean; points: number } => {
      // Completely disable answering questions after game ends
      if (!gameActiveRef.current) {
        console.log('[ENGINE] Ignored answer because game is over');
        return { success: false, isCorrect: false, points: 0 };
      }

      console.log('[useTriviaEngine] FUNCTION CALLED: submitAnswer', { answerIndex });
      console.log('[useTriviaEngine] STATE:', { 
        hasAnswered, 
        timerExpired: timerExpiredRef.current, 
        questionStartTime,
        currentQuestionIndex 
      });
      
      // Guard: Don't allow multiple submissions
      if (hasAnswered || timerExpiredRef.current || questionStartTime === null) {
        console.log('[useTriviaEngine] ⚠️ Answer submission rejected - already answered or timer expired');
        return { success: false, isCorrect: false, points: 0 };
      }

      const currentQuestion = questionsList[currentQuestionIndex];
      if (!currentQuestion) {
        console.log('[useTriviaEngine] ⚠️ Answer submission rejected - no current question');
        return { success: false, isCorrect: false, points: 0 };
      }

      const timeElapsed = (Date.now() - questionStartTime) / 1000; // in seconds

      // Reject if time exceeded
      if (timeElapsed > MAX_QUESTION_TIME) {
        console.log('[useTriviaEngine] ⚠️ Answer submission rejected - time exceeded');
        timerExpiredRef.current = true;
        setTimerExpired(true);
        return { success: false, isCorrect: false, points: 0 };
      }

      const isCorrect = answerIndex === currentQuestion.correctAnswer;
      
      // Calculate points: max score decreases with time
      const timeRatio = timeElapsed / MAX_QUESTION_TIME;
      const points = Math.max(0, Math.round(MAX_SCORE_PER_QUESTION * (1 - timeRatio * 0.5)));
      const finalPoints = isCorrect ? points : 0;

      const submission: AnswerSubmission = {
        questionId: currentQuestion.id,
        answer: answerIndex,
        timeElapsed,
        timestamp: Date.now(),
      };

      setAnswers((prev) => [...prev, submission]);
      setHasAnswered(true);
      
      console.log('[useTriviaEngine] ✅ Answer submitted:', { isCorrect, points: finalPoints });

      // Check if this is the last question - if so, end game
      const isLastQuestion = currentQuestionIndex + 1 >= questionsList.length;
      if (isLastQuestion) {
        console.log('[ENGINE] Last question reached → ending game');
        // Use setTimeout to ensure answer is recorded first
        setTimeout(() => {
          endGame();
        }, 0);
      }

      return { success: true, isCorrect, points: finalPoints };
    },
    [currentQuestionIndex, questionsList, hasAnswered, questionStartTime, endGame]
  );

  const nextQuestion = useCallback(() => {
    // Prevent next-question advancement after time ends
    if (!gameActiveRef.current) return;

    console.log('[useTriviaEngine] FUNCTION CALLED: nextQuestion');
    console.log('[useTriviaEngine] STATE:', { 
      currentQuestionIndex, 
      totalQuestions: questionsList.length,
      hasAnswered,
      timerExpired: timerExpiredRef.current 
    });
    
    setCurrentQuestionIndex((prev) => {
      const nextIndex = prev + 1;
      console.log('[useTriviaEngine] Moving to next question:', prev, '→', nextIndex, 'of', questionsList.length);
      return nextIndex;
    });
    setHasAnswered(false);
    setTimerExpired(false);
    timerExpiredRef.current = false;
    setQuestionStartTime(Date.now());
  }, [questionsList.length, currentQuestionIndex]);

  const onTimerExpired = useCallback(() => {
    console.log('[ENGINE] onTimerExpired() called');
    
    // Guard: Don't process if game already ended
    if (gameEndedRef.current || !gameActiveRef.current) {
      console.log('[ENGINE] Game already ended, skipping timer expired');
      return;
    }
    
    // Timer effect MUST call endGame() when timeLeft hits 0
    // This is called when timer reaches 0, so end the game immediately
    console.log('[ENGINE] Timer done → ending game');
    endGame();
    return;
  }, [endGame]);

  const getGameResult = useCallback((): GameResult => {
    let score = 0;
    let correctCount = 0;

    answers.forEach((submission) => {
      const question = questionsList.find((q) => q.id === submission.questionId);
      if (question && submission.answer === question.correctAnswer) {
        correctCount++;
        const timeRatio = submission.timeElapsed / MAX_QUESTION_TIME;
        const points = Math.max(0, Math.round(MAX_SCORE_PER_QUESTION * (1 - timeRatio * 0.5)));
        score += points;
      }
    });

    // Update refs whenever score or correctCount changes
    finalScoreRef.current = score;
    correctCountRef.current = correctCount;

    return { score, answers, correctCount, questions: questionsList };
  }, [answers, questionsList]);

  // Game is complete only when we have questions AND all questions have been answered
  // Fixed: Only complete when we've answered ALL questions (all questions = all answers)
  const isGameComplete = questionsList.length > 0 && answers.length >= questionsList.length;
  
  // Log game state when approaching completion - using ref to prevent duplicate logs
  const currentStateKey = `${questionsList.length}-${answers.length}-${currentQuestionIndex}`;
  
  if (questionsList.length > 0 && 
      (answers.length >= questionsList.length - 1 || currentQuestionIndex >= questionsList.length - 1) &&
      lastLoggedStateRef.current !== currentStateKey) {
    lastLoggedStateRef.current = currentStateKey;
    console.log('[useTriviaEngine] 🎯 Game State:', {
      questionsListLength: questionsList.length,
      answersLength: answers.length,
      currentQuestionIndex,
      isGameComplete,
      status: answers.length >= questionsList.length ? 'COMPLETE' : 'IN PROGRESS'
    });
  }

  return {
    currentQuestion: questionsList[currentQuestionIndex] || null,
    currentQuestionIndex,
    totalQuestions: questionsList.length,
    hasAnswered,
    timerExpired,
    isGameComplete,
    gameEnded,
    gameActive,
    isLoading,
    startGame,
    submitAnswer,
    nextQuestion,
    onTimerExpired,
    getGameResult,
    endGame,
    setOnGameEnd,
    finalScoreRef,
    correctCountRef,
  };
}

// Prevent route warnings - this file is not a route
export default function Placeholder() {
  return null;
}

