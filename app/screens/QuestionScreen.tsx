import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { colors } from '@/constants/colors';
import { useGameMode } from '@/contexts/GameModeContext';
import NeonButton from '@/components/NeonButton';
import NeonCard from '@/components/NeonCard';
import QuestionTimer from '@/components/QuestionTimer';
import { useTriviaEngine } from '@/hooks/useTriviaEngine';
import { QUESTION_TIMER } from '@/constants/gameSettings';

const { width } = Dimensions.get('window');

export default function QuestionScreen() {
  const params = useLocalSearchParams();
  const category = params.category as string | undefined;
  const { gameMode } = useGameMode();
  const hasStartedRef = useRef(false); // Prevent duplicate starts (kept for game start logic only)
  
  const {
    currentQuestion,
    currentQuestionIndex,
    totalQuestions,
    hasAnswered,
    isLoading,
    startGame,
    submitAnswer,
    nextQuestion,
    onTimerExpired,
    isGameComplete,
    gameEnded,
    gameActive,
    getGameResult,
    endGame,
    timerExpired,
    finalScoreRef,
    correctCountRef,
  } = useTriviaEngine();

  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const feedbackAnim = useRef(new Animated.Value(0)).current;
  const hasNavigatedRef = useRef(false); // Prevent multiple navigations
  const autoAdvanceRef = useRef(false); // Prevent multiple auto-advances
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [revealCorrect, setRevealCorrect] = useState(false);

  // Reset navigation ref when game starts
  useEffect(() => {
    if (currentQuestion && totalQuestions > 0) {
      hasNavigatedRef.current = false;
      autoAdvanceRef.current = false;
    }
  }, [currentQuestion, totalQuestions]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      console.log('[QuestionScreen] Cleanup');
      hasNavigatedRef.current = false;
      autoAdvanceRef.current = false;
    };
  }, []);

  // Store totalQuestions ref for navigation
  const totalQuestionsRef = useRef(totalQuestions);
  
  useEffect(() => {
    totalQuestionsRef.current = totalQuestions;
  }, [totalQuestions]);

  // Guard: Only allow Single Player mode
  useEffect(() => {
    if (gameMode === 'multi') {
      console.log('[QuestionScreen] ❌ Multiplayer mode detected, redirecting to home');
      router.replace('/screens/HomeScreen');
      return;
    }
    
    if (gameMode === null) {
      console.log('[QuestionScreen] ❌ No game mode selected, redirecting to home');
      router.replace('/screens/HomeScreen');
      return;
    }
  }, [gameMode]);

  // Track the category we've already fetched for to prevent duplicate fetches
  const fetchedCategoryRef = useRef<string | null>(null);

  // Start game only once when component mounts and mode is single player
  // Fixed: Use refs and session tracking to prevent ALL duplicate fetches
  useEffect(() => {
    // Only proceed if we're in single player mode
    if (gameMode !== 'single') {
      console.log('[QuestionScreen] ⏸️ Not in single player mode, skipping fetch. gameMode:', gameMode);
      return;
    }

    // Guard: If we already have questions loaded for THIS category, we're done
    if (currentQuestion && totalQuestions > 0 && fetchedCategoryRef.current === category) {
      console.log('[QuestionScreen] ✅ Questions already loaded for category:', category, '-', totalQuestions, 'questions');
      hasStartedRef.current = true;
      return;
    }

    // Guard: If we already started the fetch for THIS category, don't start again
    if (hasStartedRef.current && fetchedCategoryRef.current === category) {
      console.log('[QuestionScreen] ✅ [GUARD] Fetch already started for category:', category, '- skipping');
      return;
    }

    // Guard: If we're already loading, don't start again
    if (isLoading) {
      console.log('[QuestionScreen] ⏳ [GUARD] Already loading, waiting...');
      return;
    }

    // Category changed or first load - start the game
    console.log('[QuestionScreen] ========================================');
    console.log('[QuestionScreen] 🎮 SINGLE PLAYER - Starting game fetch');
    console.log('[QuestionScreen] Category:', category || 'Any');
    console.log('[QuestionScreen] Screen: QuestionScreen.tsx');
    console.log('[QuestionScreen] Previous category:', fetchedCategoryRef.current);
    console.log('[QuestionScreen] ========================================');
    
    // Mark this category as being fetched
    fetchedCategoryRef.current = category || null;
    hasStartedRef.current = true;
    
    startGame(10, category).catch((error) => {
      console.error('[QuestionScreen] ❌ Failed to start game:', error);
      // Only reset on actual error, not on duplicate calls
      if (error && !error.message?.includes('skipping')) {
        hasStartedRef.current = false;
        fetchedCategoryRef.current = null;
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameMode, category]); // Only depend on gameMode and category

  // Reset refs when mode changes (not on category change - handled above)
  useEffect(() => {
    if (gameMode !== 'single') {
      hasStartedRef.current = false;
      fetchedCategoryRef.current = null;
      console.log('[QuestionScreen] 🔄 Game mode changed, resetting refs');
    }
  }, [gameMode]);

  // Monitor loading state changes (for debugging)
  useEffect(() => {
    if (gameMode === 'single') {
      console.log('[QuestionScreen] 📊 State update:', {
        isLoading,
        hasStarted: hasStartedRef.current,
        hasQuestions: !!currentQuestion,
        totalQuestions,
        currentQuestionIndex
      });
    }
  }, [isLoading, currentQuestion, totalQuestions, currentQuestionIndex, gameMode]);

  // Auto-advance to next question when timer expires on non-last questions
  useEffect(() => {
    if (timerExpired && hasAnswered && !gameEnded && currentQuestion && !autoAdvanceRef.current) {
      const isLastQuestion = currentQuestionIndex + 1 >= totalQuestions;
      if (!isLastQuestion) {
        autoAdvanceRef.current = true;
        console.log('[QuestionScreen] ⏰ Timer expired on question', currentQuestionIndex + 1, '- auto-advancing to next question');
        // Show feedback briefly, then advance
        setFeedback('wrong');
        setTimeout(() => {
          nextQuestion();
          setFeedback(null);
          autoAdvanceRef.current = false;
        }, 2000);
      }
    }
  }, [timerExpired, hasAnswered, gameEnded, currentQuestion, currentQuestionIndex, totalQuestions, nextQuestion]);

  // Reset auto-advance ref and answer states when question changes
  useEffect(() => {
    autoAdvanceRef.current = false;
    setSelectedAnswer(null);
    setRevealCorrect(false);
    setFeedback(null);
  }, [currentQuestionIndex]);

  // Navigate only when gameEnded flips
  useEffect(() => {
    if (!gameEnded) return;

    if (hasNavigatedRef.current) return;
    hasNavigatedRef.current = true;

    // Get final game result for questions JSON
    const gameResult = getGameResult();
    const questionsJson = JSON.stringify(gameResult.questions);

    try {
      router.replace({
        pathname: '/screens/ResultsScreen',
        params: { 
          score: finalScoreRef.current.toString(), 
          correctCount: correctCountRef.current.toString(),
          totalQuestions: totalQuestions.toString(),
          questions: questionsJson,
          category: category || '',
          gameMode: gameMode || 'single',
          isMultiplayer: 'false',
        },
      });
      console.log('[QuestionScreen] ✅ Navigation triggered successfully');
    } catch (error) {
      console.error('[QuestionScreen] ❌ Navigation error:', error);
    }
  }, [gameEnded, getGameResult, category, gameMode, totalQuestions]);

  // Remove the useEffect that auto-navigates on isGameComplete
  // Navigation now happens in handleAnswer after showing feedback

  const handleAnswer = (answerIndex: number) => {
    // Disable user interaction during reveal stage
    if (hasAnswered || gameEnded || timerExpired || !gameActive || selectedAnswer !== null || revealCorrect) {
      console.log('[QuestionScreen] ⚠️ Answer rejected - game ended, timer expired, game not active, or reveal in progress');
      return;
    }

    console.log('[QuestionScreen] Answer submitted for question', currentQuestionIndex + 1, 'of', totalQuestions);
    
    // Set selected answer immediately
    setSelectedAnswer(answerIndex);
    
    // Submit answer to engine
    const result = submitAnswer(answerIndex);
    if (result.success) {
      const isCorrect = result.isCorrect;
      
      // Set reveal state immediately
      setRevealCorrect(true);
      setFeedback(isCorrect ? 'correct' : 'wrong');
      
      // Flash animation
      Animated.sequence([
        Animated.timing(feedbackAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(feedbackAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto-advance after delay ONLY if game is still active
      setTimeout(() => {
        if (!gameActive) {
          console.log('[QuestionScreen] Game ended during reveal - calling endGame()');
          endGame();
          return;
        }

        const isLastQuestion = currentQuestionIndex + 1 >= totalQuestions;
        console.log('[QuestionScreen] Question', currentQuestionIndex + 1, 'answered. isLastQuestion:', isLastQuestion);
        
        if (!isLastQuestion) {
          // Move to next question normally
          console.log('[QuestionScreen] Moving to next question...');
          nextQuestion();
          setSelectedAnswer(null);
          setRevealCorrect(false);
          setFeedback(null);
        } else {
          // Last question - endGame already called from submitAnswer, just clear states
          setSelectedAnswer(null);
          setRevealCorrect(false);
          setFeedback(null);
        }
      }, 900);
    } else {
      // If submission failed, reset states
      setSelectedAnswer(null);
      setRevealCorrect(false);
    }
  };

  if (!currentQuestion || isLoading) {
    return (
      <LinearGradient
        colors={[colors.background, '#0D1525', colors.neonPurple + '20']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.container}
      >
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading questions...</Text>
          <Text style={styles.loadingSubtext}>Fetching from 4,000+ question bank</Text>
        </View>
      </LinearGradient>
    );
  }

  // Show loading state when game has ended and is navigating
  if (gameEnded) {
    return (
      <LinearGradient
        colors={[colors.background, '#0D1525', colors.neonPurple + '20']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.container}
      >
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>⏰ Time's Up!</Text>
          <Text style={styles.loadingSubtext}>Calculating results...</Text>
        </View>
      </LinearGradient>
    );
  }

  const feedbackColor = feedback === 'correct' ? colors.success : colors.error;
  const feedbackOpacity = feedbackAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.3],
  });

  return (
    <LinearGradient
      colors={[colors.background, '#0D1525', colors.neonPurple + '20']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <Animated.View
        style={[
          styles.feedbackOverlay,
          {
            backgroundColor: feedbackColor,
            opacity: feedbackOpacity,
          },
        ]}
      />

      <View style={styles.header}>
        <Text style={styles.questionNumber}>
          Question {currentQuestionIndex + 1} / {totalQuestions}
        </Text>
        <Text style={styles.category}>{currentQuestion.category}</Text>
      </View>

      <View style={styles.timerContainer}>
        <QuestionTimer 
          duration={QUESTION_TIMER} 
          onTimeUp={() => {
            console.log('[QuestionScreen] ⏰ Timer reached zero - calling onTimerExpired');
            onTimerExpired();
            // endGame() will be called from useTriviaEngine if it's the last question
          }} 
        />
      </View>

      <NeonCard style={styles.questionCard}>
        <Text style={styles.questionText}>{currentQuestion.question}</Text>
      </NeonCard>

      <View style={styles.answersContainer}>
        {currentQuestion.answers.map((answer, index) => {
          const isSelected = selectedAnswer === index;
          const isCorrect = index === currentQuestion.correctAnswer;
          const showCorrect = revealCorrect && isCorrect;
          const showWrong = isSelected && !isCorrect && revealCorrect;
          
          // Determine button variant based on state
          let variant: 'primary' | 'secondary' | 'success' | 'error' = index % 2 === 0 ? 'primary' : 'secondary';
          if (showCorrect) {
            variant = 'success';
          } else if (showWrong) {
            variant = 'error';
          } else if (isSelected && isCorrect) {
            variant = 'success';
          }
          
          // Disable when: selectedAnswer is set, revealCorrect is true, or game not active
          const isDisabled = selectedAnswer !== null || revealCorrect || hasAnswered || gameEnded || timerExpired || !gameActive;
          
          return (
            <NeonButton
              key={index}
              title={answer}
              onPress={() => handleAnswer(index)}
              disabled={isDisabled}
              variant={variant}
              style={styles.answerButton}
            />
          );
        })}
      </View>

      {(gameEnded || timerExpired) && (
        <View style={styles.timeUpContainer}>
          <Text style={styles.timeUpText}>⏰ Time's Up!</Text>
        </View>
      )}

      {feedback && (
        <View style={styles.feedbackContainer}>
          <Text
            style={[
              styles.feedbackText,
              { color: feedback === 'correct' ? colors.success : colors.error },
            ]}
          >
            {feedback === 'correct' ? '✓ Correct!' : '✗ Wrong'}
          </Text>
        </View>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    paddingTop: 60,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
  },
  loadingSubtext: {
    color: colors.text,
    fontSize: 14,
    opacity: 0.6,
    textAlign: 'center',
  },
  feedbackOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  questionNumber: {
    color: colors.text,
    fontSize: 18,
    opacity: 0.7,
    marginBottom: 8,
  },
  category: {
    color: colors.primaryNeon,
    fontSize: 24,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  timerContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  questionCard: {
    marginVertical: 20,
    minHeight: 120,
    justifyContent: 'center',
  },
  questionText: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 32,
  },
  answersContainer: {
    gap: 16,
    marginTop: 20,
  },
  answerButton: {
    width: '100%',
  },
  feedbackContainer: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    alignItems: 'center',
    transform: [{ translateY: -20 }],
  },
  feedbackText: {
    fontSize: 48,
    fontWeight: '900',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  timeUpContainer: {
    marginTop: 20,
    padding: 16,
    backgroundColor: colors.error + '40',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.error,
    alignItems: 'center',
  },
  timeUpText: {
    fontSize: 24,
    fontWeight: '900',
    color: colors.error,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
});

