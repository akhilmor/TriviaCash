import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { colors } from '@/constants/colors';
import { useGameMode } from '@/contexts/GameModeContext';
import NeonButton from '@/components/NeonButton';
import NeonCard from '@/components/NeonCard';
import QuestionTimer from '@/components/QuestionTimer';
import { useMultiplayerTriviaEngine } from '@/hooks/useMultiplayerTriviaEngine';
import { Room } from '@/types/multiplayer';
import { QUESTION_TIMER } from '@/constants/gameSettings';

const { width } = Dimensions.get('window');

export default function GameScreen() {
  const params = useLocalSearchParams();
  const { gameMode } = useGameMode();
  const roomId = (params.roomId as string) || '';
  const playerId = (params.playerId as string) || '';
  const playerNumber = parseInt((params.playerNumber as string) || '1') as 1 | 2;
  const category = (params.category as string) || '';

  // Guard: Only allow Multiplayer mode
  React.useEffect(() => {
    if (gameMode !== 'multi') {
      console.log('[GameScreen] ❌ Not in multiplayer mode, redirecting');
      router.replace('/screens/HomeScreen');
    }
  }, [gameMode]);

  const timestamp = new Date().toISOString();
  console.log('========================================');
  console.log('FETCH QUESTIONS → Multiplayer (Opponent) /', category || 'N/A', '/', timestamp);
  console.log('[GameScreen] 🎮 MULTIPLAYER GameScreen loaded, Player', playerNumber, 'Room:', roomId);
  console.log('[GameScreen] ⚠️ OPPONENT - Must receive questions from host, NEVER call API');

  // Parse questions from params (they come as JSON string)
  // Opponent receives questions from host - NO API CALL by opponent
  const questionsString = params.questions as string;
  let questions: any[] = [];
  if (questionsString) {
    try {
      questions = JSON.parse(questionsString);
      console.log('[GameScreen] ✅ Received', questions.length, 'questions from host (NO API CALL - CORRECT)');
      console.log('========================================');
    } catch (e) {
      console.error('[GameScreen] ❌ Failed to parse questions:', e);
      questions = [];
    }
  } else {
    console.warn('[GameScreen] ⚠️ No questions received in params - opponent cannot fetch API!');
    console.log('[GameScreen] ⚠️ Opponent must wait for host to send questions via Supabase');
  }

  const {
    currentQuestion,
    currentQuestionIndex,
    totalQuestions,
    hasAnswered,
    isGameComplete,
    opponentEvents,
    room,
    isOpponentAnswering,
    submitAnswer,
    nextQuestion,
    onTimerExpired,
    calculateResults,
  } = useMultiplayerTriviaEngine(roomId, playerId, playerNumber, questions);

  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const feedbackAnim = useRef(new Animated.Value(0)).current;
  const [results, setResults] = useState<any>(null);

  const hasNavigatedRef = useRef(false); // Prevent multiple navigations
  
  // Navigate to results when game completes
  useEffect(() => {
    console.log('[GameScreen] Checking game completion:', { isGameComplete, hasResults: !!results, hasNavigated: hasNavigatedRef.current });
    
    // Guard: Only navigate once
    if (!isGameComplete || results || hasNavigatedRef.current) {
      return;
    }
    
    console.log('[GameScreen] Game complete, computing results...');
    hasNavigatedRef.current = true;
    
    const computeResults = async () => {
      const gameResults = await calculateResults();
      if (gameResults) {
        setResults(gameResults);
        console.log('[GameScreen] RESULTS:', {
          totalQuestions: totalQuestions,
          playerCorrectAnswers: gameResults.playerCorrectCount,
          opponentCorrectAnswers: gameResults.opponentCorrectCount,
          settings: { questionTimer: QUESTION_TIMER, totalQuestions },
        });
        // Small delay before navigating
        setTimeout(() => {
          console.log('[GameScreen] Navigating to ResultsScreen...');
          router.replace({
            pathname: '/screens/ResultsScreen',
            params: {
              roomId,
              playerId,
              playerNumber: playerNumber.toString(),
              totalQuestions: totalQuestions.toString(),
              isMultiplayer: 'true',
            },
          });
        }, 1500);
      }
    };
    computeResults();
  }, [isGameComplete, roomId, playerId, playerNumber, totalQuestions]); // Removed calculateResults and results from deps

  const handleAnswer = async (answerIndex: number) => {
    if (hasAnswered) return;

    const result = await submitAnswer(answerIndex);
    if (result.success) {
      setFeedback(result.isCorrect ? 'correct' : 'wrong');

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

      // Move to next question after delay
      setTimeout(() => {
        if (currentQuestionIndex + 1 < totalQuestions) {
          nextQuestion();
          setFeedback(null);
        }
      }, 2000);
    }
  };

  if (!currentQuestion || !Array.isArray(questions) || questions.length === 0 || !roomId || !playerId) {
    return (
      <LinearGradient
        colors={[colors.background, '#0D1525', colors.neonPurple + '20']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.container}
      >
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading game...</Text>
        </View>
      </LinearGradient>
    );
  }

  // Get opponent info
  const opponentId = playerNumber === 1 ? room?.player2_id : room?.player1_id;
  const opponentUsername = playerNumber === 1 ? room?.player2_username : room?.player1_username;
  const playerUsername = playerNumber === 1 ? room?.player1_username : room?.player2_username;

  // Calculate current scores (simplified - showing correct count)
  // Note: We need to track our own answers separately since we just submitted
  const [playerAnswers, setPlayerAnswers] = useState<{ questionIndex: number; isCorrect: boolean }[]>([]);
  
  useEffect(() => {
    if (feedback !== null) {
      setPlayerAnswers((prev) => [...prev, { questionIndex: currentQuestionIndex, isCorrect: feedback === 'correct' }]);
    }
  }, [feedback, currentQuestionIndex]);
  
  const playerCorrectCount = playerAnswers.filter((a) => a.isCorrect).length;
  const opponentCorrectCount = opponentEvents.filter((e) => e.player_id === opponentId && e.is_correct).length;

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
        <View style={styles.scoreRow}>
          <View style={styles.playerScore}>
            <Text style={styles.playerLabel}>{playerUsername || 'You'}</Text>
            <Text style={styles.scoreText}>{playerCorrectCount} / {totalQuestions}</Text>
          </View>
          <View style={styles.vsDivider}>
            <Text style={styles.vsText}>VS</Text>
          </View>
          <View style={styles.opponentScore}>
            <Text style={styles.opponentLabel}>{opponentUsername || 'Opponent'}</Text>
            <Text style={styles.scoreText}>{opponentCorrectCount} / {totalQuestions}</Text>
          </View>
        </View>
        <Text style={styles.questionNumber}>
          Question {currentQuestionIndex + 1} / {totalQuestions}
        </Text>
        <Text style={styles.category}>{category || currentQuestion.category}</Text>
      </View>

      {isOpponentAnswering && !hasAnswered && (
        <View style={styles.opponentIndicator}>
          <Text style={styles.opponentIndicatorText}>
            ⚡ {opponentUsername || 'Opponent'} is answering...
          </Text>
        </View>
      )}

      <View style={styles.timerContainer}>
        <QuestionTimer
          duration={QUESTION_TIMER}
          onTimeUp={() => {
            onTimerExpired();
            // If timer expires on last question, wait for answer to be recorded
            const isLastQuestion = currentQuestionIndex + 1 >= totalQuestions;
            if (isLastQuestion) {
              setTimeout(() => {
                if (calculateResults) {
                  calculateResults();
                }
              }, 2000);
            }
          }}
        />
      </View>

      <NeonCard style={styles.questionCard}>
        <Text style={styles.questionText}>{currentQuestion.question}</Text>
      </NeonCard>

      <View style={styles.answersContainer}>
        {currentQuestion.answers.map((answer: string, index: number) => (
          <NeonButton
            key={index}
            title={answer}
            onPress={() => handleAnswer(index)}
            disabled={hasAnswered}
            variant={index % 2 === 0 ? 'primary' : 'secondary'}
            style={styles.answerButton}
          />
        ))}
      </View>

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
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    width: '100%',
    marginBottom: 16,
    paddingVertical: 12,
    backgroundColor: colors.card + '60',
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  playerScore: {
    alignItems: 'center',
    flex: 1,
  },
  opponentScore: {
    alignItems: 'center',
    flex: 1,
  },
  vsDivider: {
    paddingHorizontal: 16,
  },
  vsText: {
    color: colors.primaryNeon,
    fontSize: 16,
    fontWeight: '700',
  },
  playerLabel: {
    color: colors.text,
    fontSize: 12,
    opacity: 0.8,
    marginBottom: 4,
  },
  opponentLabel: {
    color: colors.text,
    fontSize: 12,
    opacity: 0.8,
    marginBottom: 4,
  },
  scoreText: {
    color: colors.primaryNeon,
    fontSize: 24,
    fontWeight: '700',
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
  opponentIndicator: {
    backgroundColor: colors.neonPurple + '40',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    alignItems: 'center',
  },
  opponentIndicatorText: {
    color: colors.neonPurple,
    fontSize: 14,
    fontWeight: '600',
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
});

