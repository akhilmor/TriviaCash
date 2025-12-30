import LeaderboardItem from '@/components/LeaderboardItem';
import NeonButton from '@/components/NeonButton';
import { colors } from '@/constants/colors';
import { QUESTION_TIMER } from '@/constants/gameSettings';
import { Question } from '@/constants/questions';
import { Room } from '@/types/multiplayer';
import { generateBotLeaderboard, generateFallbackLeaderboard } from '@/utils/botEngine';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, ScrollView, StyleSheet, Text, View } from 'react-native';
import { supabase, supabaseEnabled } from '../../lib/supabaseClient';

interface LeaderboardEntry {
  username: string;
  score: number;
  rank: number;
  coins: number;
  isCurrentUser: boolean;
}

// Generate leaderboard with real bot opponents
const generateLeaderboard = (
  userScore: number,
  userCorrectCount: number,
  questions: Question[] | null,
  totalQuestions: number
): LeaderboardEntry[] => {
  let botResults;
  
  if (questions && questions.length > 0) {
    // Use real bot simulation based on actual questions
    botResults = generateBotLeaderboard(userScore, userCorrectCount, questions, totalQuestions);
  } else {
    // Fallback if questions not available
    botResults = generateFallbackLeaderboard(userScore);
  }

  // Convert bot results to LeaderboardEntry format
  return botResults.map((result) => ({
    username: result.username,
    score: result.score,
    rank: result.rank,
    coins: Math.max(0, Math.floor(result.score / 20)),
    isCurrentUser: result.isCurrentUser,
  }));
};

export default function ResultsScreen() {
  const params = useLocalSearchParams();
  const isMultiplayer = params.isMultiplayer === 'true';
  const roomId = (params.roomId as string) || '';
  const playerId = (params.playerId as string) || '';
  const playerNumber = parseInt((params.playerNumber as string) || '1') as 1 | 2;
  
  // Single-player params
  const userScore = parseInt((params.score as string) || '0') || 0;
  const correctCount = parseInt((params.correctCount as string) || '0') || 0;
  const totalQuestions = parseInt((params.totalQuestions as string) || '10') || 10;
  
  // Parse questions from params (for bot simulation)
  let questions: Question[] | null = null;
  const questionsParam = params.questions as string | undefined;
  if (questionsParam) {
    try {
      questions = JSON.parse(questionsParam);
    } catch (e) {
      console.warn('[ResultsScreen] Failed to parse questions:', e);
      questions = null;
    }
  }
  
  // Multiplayer state
  const [room, setRoom] = useState<Room | null>(null);
  const [playerScore, setPlayerScore] = useState(0);
  const [opponentScore, setOpponentScore] = useState(0);
  const [playerCorrectCount, setPlayerCorrectCount] = useState(0);
  const [opponentCorrectCount, setOpponentCorrectCount] = useState(0);
  const [playerAverageTime, setPlayerAverageTime] = useState(0);
  const [opponentAverageTime, setOpponentAverageTime] = useState(0);
  const [winner, setWinner] = useState<'player' | 'opponent' | 'tie'>('tie');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [multiplayerTotalQuestions, setMultiplayerTotalQuestions] = useState(totalQuestions);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const hasLoadedRef = useRef(false); // Prevent multiple loads
  const totalQuestionsParam = useRef(parseInt((params.totalQuestions as string) || '0') || totalQuestions);

  // Extract stable values from params to avoid dependency on params object
  useEffect(() => {
    const newTotalQuestions = parseInt((params.totalQuestions as string) || '0') || totalQuestions;
    if (newTotalQuestions !== totalQuestionsParam.current) {
      totalQuestionsParam.current = newTotalQuestions;
    }
  }, [params.totalQuestions, totalQuestions]);

  useEffect(() => {
    console.log('[ResultsScreen] MOUNT - Component mounted');
    
    // Guard: Only load once
    if (hasLoadedRef.current) {
      console.log('[ResultsScreen] ⚠️ Already loaded, skipping');
      return;
    }

    if (isMultiplayer && roomId && supabaseEnabled && supabase) {
      hasLoadedRef.current = true;
      console.log('[ResultsScreen] Loading multiplayer results...');
      
      // Load multiplayer results
      const loadMultiplayerResults = async () => {
        if (!supabase) return;
        const { data: roomData, error } = await supabase
          .from('rooms')
          .select('*')
          .eq('id', roomId)
          .single();

        if (!error && roomData) {
          const roomObj = roomData as Room;
          setRoom(roomObj);
          
          const playerScr = playerNumber === 1 ? roomObj.player1_score : roomObj.player2_score;
          const opponentScr = playerNumber === 1 ? roomObj.player2_score : roomObj.player1_score;
          setPlayerScore(playerScr);
          setOpponentScore(opponentScr);

          // Load events to calculate correct counts and average times
          if (!supabase) return;
          const { data: events } = await supabase
            .from('room_events')
            .select('*')
            .eq('room_id', roomId);

          if (events) {
            const opponentId = playerNumber === 1 ? roomObj.player2_id : roomObj.player1_id;
            const playerEvents = events.filter((e) => e.player_id === playerId);
            const opponentEvents = opponentId ? events.filter((e) => e.player_id === opponentId) : [];

            const playerCorrect = playerEvents.filter((e) => e.is_correct).length;
            const opponentCorrect = opponentEvents.filter((e) => e.is_correct).length;
            setPlayerCorrectCount(playerCorrect);
            setOpponentCorrectCount(opponentCorrect);
            
            // Get totalQuestions from params or calculate from events
            const actualTotalQuestions = totalQuestionsParam.current || 
              Math.max(playerEvents.length, opponentEvents.length) || totalQuestions;
            setMultiplayerTotalQuestions(actualTotalQuestions);
            
            console.log('[ResultsScreen] RESULTS:', {
              totalQuestions: actualTotalQuestions,
              playerCorrectAnswers: playerCorrect,
              opponentCorrectAnswers: opponentCorrect,
              settings: { questionTimer: QUESTION_TIMER, totalQuestions: actualTotalQuestions },
            });

            const playerTotalTime = playerEvents.reduce((sum, e) => sum + e.answer_time_ms, 0);
            const opponentTotalTime = opponentEvents.reduce((sum, e) => sum + e.answer_time_ms, 0);
            setPlayerAverageTime(playerEvents.length > 0 ? playerTotalTime / playerEvents.length : 0);
            setOpponentAverageTime(opponentEvents.length > 0 ? opponentTotalTime / opponentEvents.length : 0);

            // Determine winner
            let win: 'player' | 'opponent' | 'tie' = 'tie';
            if (playerCorrect > opponentCorrect) {
              win = 'player';
            } else if (opponentCorrect > playerCorrect) {
              win = 'opponent';
            } else {
              const playerAvg = playerEvents.length > 0 ? playerTotalTime / playerEvents.length : 0;
              const opponentAvg = opponentEvents.length > 0 ? opponentTotalTime / opponentEvents.length : 0;
              if (playerAvg < opponentAvg) {
                win = 'player';
              } else if (opponentAvg < playerAvg) {
                win = 'opponent';
              }
            }
            setWinner(win);

            // Create leaderboard for multiplayer
            const playerUsername = playerNumber === 1 ? roomObj.player1_username : roomObj.player2_username;
            const opponentUsername = playerNumber === 1 ? roomObj.player2_username : roomObj.player1_username;
            
            const entries: LeaderboardEntry[] = [
              {
                username: playerUsername || 'You',
                score: playerScr,
                rank: win === 'player' ? 1 : win === 'opponent' ? 2 : 1,
                coins: 0,
                isCurrentUser: true,
              },
              {
                username: opponentUsername || 'Opponent',
                score: opponentScr,
                rank: win === 'opponent' ? 1 : win === 'player' ? 2 : 1,
                coins: 0,
                isCurrentUser: false,
              },
            ].sort((a, b) => {
              if (a.score !== b.score) return b.score - a.score;
              return a.rank - b.rank;
            });
            setLeaderboard(entries);
          }
        }
      };

      loadMultiplayerResults();
    } else {
      hasLoadedRef.current = true;
      console.log('[ResultsScreen] Loading single-player results...');
      // Single-player mode - use bot engine for realistic opponents
      console.log('[ResultsScreen] RESULTS:', {
        totalQuestions: totalQuestionsParam.current,
        correctAnswers: correctCount,
        score: userScore,
        questionsAvailable: questions ? questions.length : 0,
        settings: { questionTimer: QUESTION_TIMER, totalQuestions: totalQuestionsParam.current },
      });
      const lb = generateLeaderboard(userScore, correctCount, questions, totalQuestionsParam.current);
      setLeaderboard(lb);
    }

    // Fade in animation - only run once
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, [isMultiplayer, roomId, playerId, playerNumber]); // Removed params and totalQuestions from deps

  const userEntry = leaderboard.find((e) => e.isCurrentUser);

  return (
    <LinearGradient
      colors={[colors.background, '#0D1525', colors.neonPurple + '20']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        <View style={styles.header}>
          <Text style={styles.title}>Game Over!</Text>
          <Text style={styles.subtitle}>Final Results</Text>
        </View>

        {isMultiplayer ? (
          <View style={styles.multiplayerResult}>
            <View style={styles.resultRow}>
              <View style={styles.playerResult}>
                <Text style={styles.playerName}>{room?.player1_id === playerId ? room.player1_username : room?.player2_username || 'You'}</Text>
                <Text style={styles.scoreText}>{playerScore.toLocaleString()} pts</Text>
                <Text style={styles.correctText}>✓ {playerCorrectCount} / {multiplayerTotalQuestions} correct</Text>
                <Text style={styles.timeText}>⏱ {(playerAverageTime / 1000).toFixed(1)}s avg</Text>
              </View>
              <View style={styles.vsDivider}>
                <Text style={styles.vsText}>VS</Text>
              </View>
              <View style={styles.opponentResult}>
                <Text style={styles.opponentName}>
                  {room?.player1_id === playerId ? room.player2_username : room?.player1_username || 'Opponent'}
                </Text>
                <Text style={styles.scoreText}>{opponentScore.toLocaleString()} pts</Text>
                <Text style={styles.correctText}>✓ {opponentCorrectCount} / {multiplayerTotalQuestions} correct</Text>
                <Text style={styles.timeText}>⏱ {(opponentAverageTime / 1000).toFixed(1)}s avg</Text>
              </View>
            </View>
            <View style={[styles.winnerContainer, winner === 'player' ? styles.winnerHighlight : winner === 'opponent' ? styles.loserHighlight : styles.tieHighlight]}>
              <Text style={styles.winnerText}>
                {winner === 'player' ? '🏆 You Won!' : winner === 'opponent' ? '😔 You Lost' : '🤝 Tie Game!'}
              </Text>
            </View>
          </View>
        ) : userEntry && (
          <View style={styles.userResult}>
            <Text style={styles.rankText}>#{userEntry.rank}</Text>
            <Text style={styles.scoreText}>{userScore.toLocaleString()} points</Text>
            <Text style={styles.correctText}>✓ {correctCount} / {totalQuestions} correct</Text>
            {userEntry.rank <= 3 && (
              <View style={styles.rewardContainer}>
                <Text style={styles.rewardText}>💰 Winner!</Text>
                <Text style={styles.rewardLabel}>Rank #{userEntry.rank}</Text>
              </View>
            )}
          </View>
        )}

        <View style={styles.leaderboardContainer}>
          <Text style={styles.leaderboardTitle}>Leaderboard</Text>
          <ScrollView style={styles.leaderboardScroll}>
            {leaderboard.map((entry) => (
              <LeaderboardItem
                key={entry.rank}
                rank={entry.rank}
                username={entry.username}
                score={entry.score}
                isCurrentUser={entry.isCurrentUser}
                coins={entry.coins}
              />
            ))}
          </ScrollView>
        </View>

        <View style={styles.buttonsContainer}>
          <NeonButton
            title="Play Again"
            onPress={() => {
              if (isMultiplayer && room?.category) {
                router.replace({
                  pathname: '/screens/MatchmakingScreen',
                  params: { category: room.category },
                });
              } else {
                router.replace('/screens/MatchmakingScreen');
              }
            }}
            style={styles.button}
          />
          <NeonButton
            title="Return to Lobby"
            onPress={() => router.replace('/screens/LobbyScreen')}
            variant="secondary"
            style={styles.button}
          />
        </View>
      </Animated.View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 20,
    paddingTop: 60,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 36,
    fontWeight: '900',
    color: colors.primaryNeon,
    textTransform: 'uppercase',
    letterSpacing: 4,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: colors.text,
    opacity: 0.7,
  },
  userResult: {
    alignItems: 'center',
    marginBottom: 30,
    padding: 20,
    backgroundColor: colors.card + '80',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.primaryNeon + '40',
  },
  rankText: {
    fontSize: 48,
    fontWeight: '900',
    color: colors.primaryNeon,
    marginBottom: 8,
  },
  scoreText: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  correctText: {
    fontSize: 18,
    color: colors.success,
    marginBottom: 12,
  },
  rewardContainer: {
    backgroundColor: colors.warning + '30',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  rewardText: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.warning,
    marginBottom: 4,
  },
  rewardLabel: {
    fontSize: 12,
    color: colors.text,
    opacity: 0.7,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  leaderboardContainer: {
    flex: 1,
    marginBottom: 20,
  },
  leaderboardTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  leaderboardScroll: {
    flex: 1,
  },
  multiplayerResult: {
    alignItems: 'center',
    marginBottom: 30,
    padding: 20,
    backgroundColor: colors.card + '80',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.primaryNeon + '40',
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    width: '100%',
    marginBottom: 20,
  },
  playerResult: {
    alignItems: 'center',
    flex: 1,
  },
  opponentResult: {
    alignItems: 'center',
    flex: 1,
  },
  vsDivider: {
    paddingHorizontal: 16,
  },
  vsText: {
    color: colors.primaryNeon,
    fontSize: 18,
    fontWeight: '700',
  },
  playerName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primaryNeon,
    marginBottom: 8,
  },
  opponentName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  timeText: {
    fontSize: 14,
    color: colors.text,
    opacity: 0.7,
    marginTop: 4,
  },
  winnerContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  winnerHighlight: {
    backgroundColor: colors.success + '30',
    borderColor: colors.success,
    borderWidth: 2,
  },
  loserHighlight: {
    backgroundColor: colors.error + '30',
    borderColor: colors.error,
    borderWidth: 2,
  },
  tieHighlight: {
    backgroundColor: colors.warning + '30',
    borderColor: colors.warning,
    borderWidth: 2,
  },
  winnerText: {
    fontSize: 24,
    fontWeight: '900',
    color: colors.text,
  },
  buttonsContainer: {
    gap: 12,
  },
  button: {
    width: '100%',
  },
});

