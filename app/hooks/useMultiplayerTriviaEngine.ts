import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase, supabaseEnabled } from '../../lib/supabaseClient';
import { Room, RoomEvent } from '@/types/multiplayer';
import { Question } from '@/constants/questions';
import { QUESTION_TIMER, MAX_SCORE_PER_QUESTION } from '@/constants/gameSettings';

const MAX_QUESTION_TIME = QUESTION_TIMER; // seconds

interface AnswerSubmission {
  questionIndex: number;
  answerIndex: number;
  isCorrect: boolean;
  timeElapsed: number;
  timestamp: number;
}

export interface MultiplayerGameResult {
  playerScore: number;
  opponentScore: number;
  playerCorrectCount: number;
  opponentCorrectCount: number;
  playerAverageTime: number;
  opponentAverageTime: number;
  winner: 'player' | 'opponent' | 'tie';
  playerAnswers: AnswerSubmission[];
  opponentAnswers: RoomEvent[];
}

export function useMultiplayerTriviaEngine(
  roomId: string,
  playerId: string,
  playerNumber: 1 | 2,
  questions: Question[]
) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [questionStartTime, setQuestionStartTime] = useState<number | null>(null);
  const [timerExpired, setTimerExpired] = useState(false);
  const [opponentEvents, setOpponentEvents] = useState<RoomEvent[]>([]);
  const [room, setRoom] = useState<Room | null>(null);
  const [isGameComplete, setIsGameComplete] = useState(false);
  const timerExpiredRef = useRef(false);
  const eventsSubscriptionRef = useRef<any>(null);
  const roomSubscriptionRef = useRef<any>(null);
  const roomRef = useRef<Room | null>(null); // Keep room in ref for event handlers

  // Cleanup subscriptions on unmount
  useEffect(() => {
    return () => {
      if (eventsSubscriptionRef.current) {
        eventsSubscriptionRef.current.unsubscribe();
      }
      if (roomSubscriptionRef.current) {
        roomSubscriptionRef.current.unsubscribe();
      }
    };
  }, []);

  // Subscribe to room updates
  useEffect(() => {
    if (!roomId || !supabaseEnabled || !supabase) return;

    const channel = supabase
      .channel(`room:${roomId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rooms',
          filter: `id=eq.${roomId}`,
        },
        (payload) => {
          if (payload.new) {
            const updatedRoom = payload.new as Room;
            roomRef.current = updatedRoom;
            setRoom(updatedRoom);
            
            // Check if game is complete
            if (updatedRoom.status === 'completed') {
              setIsGameComplete(true);
            }
          }
        }
      )
      .subscribe();

    roomSubscriptionRef.current = channel;

    return () => {
      channel.unsubscribe();
    };
  }, [roomId]);

  // Subscribe to room events (opponent answers)
  useEffect(() => {
    if (!roomId || !supabaseEnabled || !supabase) return;
    
    console.log('[useMultiplayerTriviaEngine] Setting up room events subscription');

    // Load existing events
    const loadEvents = async () => {
      if (!supabase) return;
      const { data, error } = await supabase
        .from('room_events')
        .select('*')
        .eq('room_id', roomId)
        .order('timestamp', { ascending: true });

      if (!error && data) {
        // Use room from ref to get latest value
        const currentRoom = roomRef.current;
        const opponentId = playerNumber === 1 ? currentRoom?.player2_id : currentRoom?.player1_id;
        if (opponentId) {
          const opponentAnswers = data.filter((e) => e.player_id === opponentId) as RoomEvent[];
          setOpponentEvents(opponentAnswers);
          console.log('[useMultiplayerTriviaEngine] Loaded', opponentAnswers.length, 'opponent events');
        }
      }
    };

    loadEvents();

    // Subscribe to new events
    if (!supabase) return;
    const channel = supabase
      .channel(`room_events:${roomId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'room_events',
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          if (payload.new) {
            const event = payload.new as RoomEvent;
            // Get current room state from ref to avoid stale closure
            const currentRoom = roomRef.current;
            const opponentId = playerNumber === 1 ? currentRoom?.player2_id : currentRoom?.player1_id;
            
            // Only track opponent events
            if (opponentId && event.player_id === opponentId) {
              setOpponentEvents((prev) => {
                // Avoid duplicates
                if (prev.some((e) => e.id === event.id)) return prev;
                const updated = [...prev, event].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
                console.log('[useMultiplayerTriviaEngine] New opponent event, total events:', updated.length);
                return updated;
              });
            }
          }
        }
      )
      .subscribe();

    eventsSubscriptionRef.current = channel;

    return () => {
      console.log('[useMultiplayerTriviaEngine] Cleaning up room events subscription');
      channel.unsubscribe();
    };
  }, [roomId, playerNumber]); // Removed room from deps to prevent loop

  // Load room data
  useEffect(() => {
    const loadRoom = async () => {
      if (!supabaseEnabled || !supabase) return;
      const { data, error } = await supabase
        .from('rooms')
        .select('*')
        .eq('id', roomId)
        .single();

      if (!error && data) {
        const roomData = data as Room;
        roomRef.current = roomData;
        setRoom(roomData);
        if (roomData.status === 'completed') {
          setIsGameComplete(true);
        }
      }
    };

    if (roomId) {
      loadRoom();
      setQuestionStartTime(Date.now());
    }
  }, [roomId]);

  const submitAnswer = useCallback(
    async (answerIndex: number): Promise<{ success: boolean; isCorrect: boolean }> => {
      if (hasAnswered || timerExpiredRef.current || questionStartTime === null) {
        return { success: false, isCorrect: false };
      }

      if (!Array.isArray(questions) || questions.length === 0 || currentQuestionIndex < 0 || currentQuestionIndex >= questions.length) {
        return { success: false, isCorrect: false };
      }

      const currentQuestion = questions[currentQuestionIndex];
      if (!currentQuestion || typeof currentQuestion.correctAnswer !== 'number') {
        return { success: false, isCorrect: false };
      }

      const timeElapsed = (Date.now() - questionStartTime) / 1000; // in seconds

      // Reject if time exceeded
      if (timeElapsed > MAX_QUESTION_TIME) {
        timerExpiredRef.current = true;
        setTimerExpired(true);
        return { success: false, isCorrect: false };
      }

      const isCorrect = answerIndex === currentQuestion.correctAnswer;
      const answerTimeMs = Math.round(timeElapsed * 1000);

      // Insert event into database
      if (!supabaseEnabled || !supabase) {
        console.warn('Supabase disabled, answer not saved');
        setHasAnswered(true);
        return { success: true, isCorrect };
      }

      if (!roomId || !playerId) {
        console.warn('Missing roomId or playerId');
        setHasAnswered(true);
        return { success: true, isCorrect };
      }

      try {
        const { error: insertError } = await supabase.from('room_events').insert({
          room_id: roomId,
          player_id: playerId,
          question_index: currentQuestionIndex,
          is_correct: isCorrect,
          answer_time_ms: answerTimeMs,
        });

        if (insertError) {
          console.error('Error inserting room event:', insertError);
          return { success: false, isCorrect: false };
        }
      } catch (err) {
        console.error('Error submitting answer:', err);
        return { success: false, isCorrect: false };
      }

      setHasAnswered(true);
      return { success: true, isCorrect };
    },
    [currentQuestionIndex, questions, hasAnswered, questionStartTime, roomId, playerId]
  );

  const nextQuestion = useCallback(() => {
    console.log('[useMultiplayerTriviaEngine] FUNCTION CALLED: nextQuestion');
    console.log('[useMultiplayerTriviaEngine] STATE:', { 
      currentQuestionIndex, 
      totalQuestions: questions.length,
      hasAnswered,
      timerExpired: timerExpiredRef.current 
    });
    
    setCurrentQuestionIndex((prev) => {
      const nextIndex = prev + 1;
      console.log('[useMultiplayerTriviaEngine] Moving to next question:', prev, '→', nextIndex, 'of', questions.length);
      return nextIndex;
    });
    setHasAnswered(false);
    setTimerExpired(false);
    timerExpiredRef.current = false;
    setQuestionStartTime(Date.now());
  }, [questions.length, currentQuestionIndex]);

  const onTimerExpired = useCallback(async () => {
    console.log('[useMultiplayerTriviaEngine] FUNCTION CALLED: onTimerExpired');
    console.log('[useMultiplayerTriviaEngine] STATE:', { 
      hasAnswered, 
      questionStartTime, 
      currentQuestionIndex,
      timerExpired: timerExpiredRef.current 
    });
    
    // Guard: Don't process if already answered or timer already expired
    if (hasAnswered || timerExpiredRef.current || questionStartTime === null) {
      console.log('[useMultiplayerTriviaEngine] ⚠️ Timer expired but already processed, skipping');
      return;
    }
    
    timerExpiredRef.current = true;
    setTimerExpired(true);

    // Auto-submit wrong answer if timer expires
    if (Array.isArray(questions) && questions.length > 0 && currentQuestionIndex >= 0 && currentQuestionIndex < questions.length) {
      const currentQuestion = questions[currentQuestionIndex];
      if (currentQuestion && supabaseEnabled && supabase && roomId && playerId) {
        try {
          await supabase.from('room_events').insert({
            room_id: roomId,
            player_id: playerId,
            question_index: currentQuestionIndex,
            is_correct: false,
            answer_time_ms: MAX_QUESTION_TIME * 1000,
          });
          console.log('[useMultiplayerTriviaEngine] ✅ Timer expired - auto-submitted wrong answer');
        } catch (err) {
          console.error('[useMultiplayerTriviaEngine] Error submitting expired timer answer:', err);
        }
        setHasAnswered(true);
      }
    }
  }, [hasAnswered, currentQuestionIndex, questions, questionStartTime, roomId, playerId, supabaseEnabled, supabase]);

  const calculateResults = useCallback(async (): Promise<MultiplayerGameResult | null> => {
    if (!room || !supabaseEnabled || !supabase) return null;

    // Get all player events
    const { data: allEvents, error } = await supabase
      .from('room_events')
      .select('*')
      .eq('room_id', roomId)
      .order('timestamp', { ascending: true });

    if (error || !allEvents) return null;

    const playerAnswers = allEvents.filter((e) => e.player_id === playerId) as RoomEvent[];
    const opponentId = playerNumber === 1 ? room.player2_id : room.player1_id;
    const opponentAnswers = opponentId ? (allEvents.filter((e) => e.player_id === opponentId) as RoomEvent[]) : [];

    // Calculate scores
    let playerScore = 0;
    let opponentScore = 0;
    let playerCorrectCount = 0;
    let opponentCorrectCount = 0;
    let playerTotalTime = 0;
    let opponentTotalTime = 0;

    playerAnswers.forEach((answer) => {
      const question = questions[answer.question_index];
      if (!question) return;

      if (answer.is_correct) {
        playerCorrectCount++;
        const timeRatio = answer.answer_time_ms / (MAX_QUESTION_TIME * 1000);
        const points = Math.max(0, Math.round(MAX_SCORE_PER_QUESTION * (1 - timeRatio * 0.5)));
        playerScore += points;
      }
      playerTotalTime += answer.answer_time_ms;
    });

    opponentAnswers.forEach((answer) => {
      const question = questions[answer.question_index];
      if (!question) return;

      if (answer.is_correct) {
        opponentCorrectCount++;
        const timeRatio = answer.answer_time_ms / (MAX_QUESTION_TIME * 1000);
        const points = Math.max(0, Math.round(MAX_SCORE_PER_QUESTION * (1 - timeRatio * 0.5)));
        opponentScore += points;
      }
      opponentTotalTime += answer.answer_time_ms;
    });

    const playerAverageTime = playerAnswers.length > 0 ? playerTotalTime / playerAnswers.length : 0;
    const opponentAverageTime = opponentAnswers.length > 0 ? opponentTotalTime / opponentAnswers.length : 0;

    // Determine winner
    let winner: 'player' | 'opponent' | 'tie' = 'tie';
    if (playerCorrectCount > opponentCorrectCount) {
      winner = 'player';
    } else if (opponentCorrectCount > playerCorrectCount) {
      winner = 'opponent';
    } else {
      // Tie on correct answers, check average time
      if (playerAverageTime < opponentAverageTime) {
        winner = 'player';
      } else if (opponentAverageTime < playerAverageTime) {
        winner = 'opponent';
      }
    }

    // Update room with final scores
    const updateData: any = {
      player1_score: playerNumber === 1 ? playerScore : opponentScore,
      player2_score: playerNumber === 2 ? playerScore : opponentScore,
      status: 'completed',
    };

    if (winner === 'player') {
      updateData.winner_id = playerId;
    } else if (winner === 'opponent' && opponentId) {
      updateData.winner_id = opponentId;
    }

    if (supabase) {
      await supabase.from('rooms').update(updateData).eq('id', roomId);
    }

    return {
      playerScore,
      opponentScore,
      playerCorrectCount,
      opponentCorrectCount,
      playerAverageTime,
      opponentAverageTime,
      winner,
      playerAnswers: playerAnswers.map((a) => ({
        questionIndex: a.question_index,
        answerIndex: -1, // Not stored in events
        isCorrect: a.is_correct,
        timeElapsed: a.answer_time_ms / 1000,
        timestamp: new Date(a.timestamp).getTime(),
      })),
      opponentAnswers,
    };
  }, [room, roomId, playerId, playerNumber, questions]);

  // Check if game is complete (all questions answered by both players or room status is completed)
  const isGameCompleteRef = useRef(false);
  useEffect(() => {
    // Guard: Don't check if already complete
    if (isGameCompleteRef.current) {
      return;
    }
    
    console.log('[useMultiplayerTriviaEngine] Checking game completion:', {
      roomStatus: room?.status,
      currentQuestionIndex,
      totalQuestions: questions.length,
      hasAnswered,
    });
    
    if (room?.status === 'completed') {
      console.log('[useMultiplayerTriviaEngine] ✅ Game complete - room status is completed');
      isGameCompleteRef.current = true;
      setIsGameComplete(true);
      return;
    }

    // Game is complete when all questions are answered by current player
    if (questions.length > 0 && currentQuestionIndex >= questions.length - 1 && hasAnswered) {
      console.log('[useMultiplayerTriviaEngine] ✅ Game complete - all questions answered');
      isGameCompleteRef.current = true;
      setIsGameComplete(true);
    }
  }, [currentQuestionIndex, hasAnswered, questions.length, room?.status]); // Removed room and opponentEvents from deps

  const currentQuestion = Array.isArray(questions) && questions.length > 0 && currentQuestionIndex >= 0 && currentQuestionIndex < questions.length
    ? questions[currentQuestionIndex] || null
    : null;
  const isOpponentAnswering = Array.isArray(opponentEvents) && opponentEvents.length > 0 && opponentEvents[opponentEvents.length - 1] && opponentEvents[opponentEvents.length - 1].question_index === currentQuestionIndex;

  return {
    currentQuestion,
    currentQuestionIndex,
    totalQuestions: Array.isArray(questions) ? questions.length : 0,
    hasAnswered,
    timerExpired,
    isGameComplete,
    opponentEvents: Array.isArray(opponentEvents) ? opponentEvents : [],
    room,
    isOpponentAnswering,
    submitAnswer,
    nextQuestion,
    onTimerExpired,
    calculateResults,
  };
}

// Prevent route warnings - this file is not a route
export default function Placeholder() {
  return null;
}

