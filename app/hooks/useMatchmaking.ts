import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase, supabaseEnabled } from '../../lib/supabaseClient';
import { Room, RoomStatus } from '@/types/multiplayer';
import { Question } from '@/constants/questions';
import { fetchRandomQuestions } from '@/services/questionsService';
import { questions as fallbackQuestions } from '@/constants/questions';
import { setFetchLock, releaseFetchLock, shouldBlockFetch } from '@/utils/fetchGuard';

// Global flag to check if multiplayer is allowed (can be set from context/hook)
let allowMultiplayer = true;

export function setMultiplayerAllowed(allowed: boolean) {
  allowMultiplayer = allowed;
}

// Simple in-memory storage for player ID (persists for app session)
let cachedPlayerId: string | null = null;
let cachedPlayerUsername: string | null = null;

// Generate a unique player ID for this session
const getPlayerId = (): string => {
  if (cachedPlayerId) return cachedPlayerId;
  const newId = `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  cachedPlayerId = newId;
  return newId;
};

const getPlayerUsername = (): string => {
  if (cachedPlayerUsername) return cachedPlayerUsername;
  const usernames = [
    'TriviaMaster',
    'QuickThinker',
    'BrainBox',
    'QuizWhiz',
    'SmartPlayer',
    'TriviaKing',
    'AnswerPro',
  ];
  const randomUsername = usernames[Math.floor(Math.random() * usernames.length)] + Math.floor(Math.random() * 1000);
  cachedPlayerUsername = randomUsername;
  return randomUsername;
};

interface MatchmakingResult {
  roomId: string;
  playerId: string;
  playerNumber: 1 | 2;
  status: RoomStatus;
  room: Room | null;
  error: string | null;
}

export function useMatchmaking(onMatchFound?: (result: MatchmakingResult) => void) {
  const [isMatchmaking, setIsMatchmaking] = useState(false);
  const [room, setRoom] = useState<Room | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [playerId] = useState<string>(getPlayerId());
  const [playerUsername] = useState<string>(getPlayerUsername());
  const roomSubscriptionRef = useRef<any>(null);
  const matchmakingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup subscription on unmount
  useEffect(() => {
    return () => {
      if (roomSubscriptionRef.current) {
        roomSubscriptionRef.current.unsubscribe();
      }
      if (matchmakingTimeoutRef.current) {
        clearTimeout(matchmakingTimeoutRef.current);
      }
    };
  }, []);

  const findOrCreateRoom = useCallback(
    async (category: string): Promise<MatchmakingResult> => {
      if (!supabaseEnabled || !supabase) {
        return {
          roomId: '',
          playerId,
          playerNumber: 1,
          status: 'waiting',
          room: null,
          error: 'Supabase is disabled. Please configure Supabase credentials in app.json',
        };
      }

      try {
        // First, try to find a waiting room with no player2
        const { data: existingRoom, error: findError } = await supabase
          .from('rooms')
          .select('*')
          .eq('status', 'waiting')
          .is('player2_id', null)
          .eq('category', category)
          .order('created_at', { ascending: true })
          .limit(1)
          .single();

        if (existingRoom && !findError && existingRoom.id) {
          // Join as player 2
          if (!supabase || !supabaseEnabled) {
            throw new Error('Supabase is not enabled');
          }

          const { data: updatedRoom, error: updateError } = await supabase
            .from('rooms')
            .update({
              player2_id: playerId || '',
              player2_username: playerUsername || '',
              status: 'active' as RoomStatus,
            })
            .eq('id', existingRoom.id)
            .select()
            .single();

          if (updateError || !updatedRoom) {
            throw updateError || new Error('Failed to update room');
          }

          setRoom(updatedRoom);
          return {
            roomId: updatedRoom.id || '',
            playerId: playerId || '',
            playerNumber: 2,
            status: 'active',
            room: updatedRoom,
            error: null,
          };
        }

        // No room found, create a new one (Player 1 = Host)
        // Host fetches questions from API ONCE, then shares with opponent
        let questions: Question[] = [];
        const targetCategory = category || 'General';
        
        // Guard: Check global fetch lock to prevent duplicate calls
        if (shouldBlockFetch(targetCategory, 'multi')) {
          console.log('[useMatchmaking] ⚠️ [GUARD] Fetch already in progress for multiplayer category:', targetCategory);
          throw new Error('Fetch already in progress for this category');
        }
        
        const timestamp = new Date().toISOString();
        console.log('========================================');
        console.log('FETCH QUESTIONS → Multiplayer (Host) /', targetCategory, '/', timestamp);
        console.log('[useMatchmaking] 🎮 MULTIPLAYER MODE - Host fetching questions for category:', targetCategory);
        console.log('[useMatchmaking] ⚠️ HOST - This is the ONLY place host should call API');
        
        // Set global fetch lock
        setFetchLock(targetCategory, 'multi');
        
        try {
          console.log('[useMatchmaking] 🚀 Host calling API: fetchRandomQuestions(10,', targetCategory, ')');
          questions = await fetchRandomQuestions(10, targetCategory);
          console.log('[useMatchmaking] ✅ Host received', questions.length, 'questions from API');
          
          // Filter to ensure category match
          if (Array.isArray(questions)) {
            const filtered = questions.filter((q) => {
              if (!q || !q.category) return false;
              const qCategory = q.category.toLowerCase();
              const catLower = targetCategory.toLowerCase();
              return qCategory === catLower || qCategory.startsWith(catLower + ' ') || qCategory.includes(catLower);
            });
            
            if (filtered.length > 0) {
              questions = filtered;
              console.log('[useMatchmaking] Filtered to', questions.length, 'questions matching category');
            }
          }
        } catch (err) {
          console.warn('[useMatchmaking] ❌ Host API call failed, using fallback:', err);
          // Fallback to local questions
          if (Array.isArray(fallbackQuestions)) {
            questions = fallbackQuestions
              .filter((q) => q && q.category === targetCategory)
              .sort(() => Math.random() - 0.5)
              .slice(0, 10);
            console.log('[useMatchmaking] Using', questions.length, 'fallback questions');
          }
        } finally {
          // Release global fetch lock
          releaseFetchLock();
          console.log('[useMatchmaking] 🔓 Global fetch lock released for multiplayer');
        }

        if (!Array.isArray(questions) || questions.length === 0) {
          // If still no questions, use all fallback questions
          console.warn('[useMatchmaking] No questions found, using all fallback questions');
          if (Array.isArray(fallbackQuestions)) {
            questions = [...fallbackQuestions].sort(() => Math.random() - 0.5).slice(0, 10);
          }
        }
        
        console.log('[useMatchmaking] Host prepared', questions.length, 'questions for room');
        console.log('========================================');

        if (!supabase || !supabaseEnabled) {
          throw new Error('Supabase is not enabled');
        }

        const { data: newRoom, error: createError } = await supabase
          .from('rooms')
          .insert({
            status: 'waiting' as RoomStatus,
            category: targetCategory,
            questions: questions || [],
            player1_id: playerId || '',
            player1_username: playerUsername || '',
          })
          .select()
          .single();

        if (createError || !newRoom) {
          throw createError || new Error('Failed to create room');
        }

        setRoom(newRoom);
        return {
          roomId: newRoom.id || '',
          playerId: playerId || '',
          playerNumber: 1,
          status: 'waiting',
          room: newRoom,
          error: null,
        };
      } catch (err: any) {
        const errorMessage = err.message || 'Failed to find or create room';
        setError(errorMessage);
        return {
          roomId: '',
          playerId,
          playerNumber: 1,
          status: 'waiting',
          room: null,
          error: errorMessage,
        };
      }
    },
    [playerId, playerUsername]
  );

  const subscribeToRoom = useCallback((roomId: string, onRoomUpdate?: (room: Room) => void) => {
    if (!supabaseEnabled || !supabase) {
      return;
    }

    // Cleanup existing subscription
    if (roomSubscriptionRef.current) {
      roomSubscriptionRef.current.unsubscribe();
    }

    // Subscribe to room changes
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
            setRoom(updatedRoom);
            onRoomUpdate?.(updatedRoom);

            // If room becomes active and we're waiting, trigger match found
            if (updatedRoom.status === 'active' && room?.status === 'waiting') {
              const playerNumber: 1 | 2 = updatedRoom.player1_id === playerId ? 1 : 2;
              onMatchFound?.({
                roomId: updatedRoom.id,
                playerId,
                playerNumber,
                status: 'active',
                room: updatedRoom,
                error: null,
              });
            }
          }
        }
      )
      .subscribe();

    roomSubscriptionRef.current = channel;
  }, [playerId, room]);

  const startMatchmaking = useCallback(
    async (category: string) => {
      // Guard: Only allow matchmaking if multiplayer is enabled
      if (!allowMultiplayer) {
        setError('Multiplayer mode is not enabled. Please select multiplayer mode first.');
        setIsMatchmaking(false);
        return;
      }

      setIsMatchmaking(true);
      setError(null);

      // Set a timeout for matchmaking (60 seconds)
      matchmakingTimeoutRef.current = setTimeout(() => {
        setIsMatchmaking(false);
        setError('Matchmaking timeout. Please try again.');
      }, 60000);

      try {
        const result = await findOrCreateRoom(category);

        if (result.error) {
          setIsMatchmaking(false);
          if (matchmakingTimeoutRef.current) clearTimeout(matchmakingTimeoutRef.current);
          return;
        }

        // Subscribe to room updates
        subscribeToRoom(result.roomId, (updatedRoom) => {
          // If room becomes active, match found
          if (updatedRoom.status === 'active') {
            setIsMatchmaking(false);
            if (matchmakingTimeoutRef.current) clearTimeout(matchmakingTimeoutRef.current);

            const playerNumber: 1 | 2 = updatedRoom.player1_id === playerId ? 1 : 2;
            const matchResult: MatchmakingResult = {
              roomId: updatedRoom.id,
              playerId,
              playerNumber,
              status: 'active',
              room: updatedRoom,
              error: null,
            };
            onMatchFound?.(matchResult);
          }
        });

        // If we joined an active room immediately, trigger match found
        if (result.status === 'active') {
          setIsMatchmaking(false);
          if (matchmakingTimeoutRef.current) clearTimeout(matchmakingTimeoutRef.current);
          onMatchFound?.(result);
        }
      } catch (err: any) {
        setIsMatchmaking(false);
        setError(err.message || 'Matchmaking failed');
        if (matchmakingTimeoutRef.current) clearTimeout(matchmakingTimeoutRef.current);
      }
    },
    [findOrCreateRoom, subscribeToRoom, playerId, onMatchFound]
  );

  const cancelMatchmaking = useCallback(() => {
    setIsMatchmaking(false);
    if (roomSubscriptionRef.current) {
      roomSubscriptionRef.current.unsubscribe();
    }
    if (matchmakingTimeoutRef.current) {
      clearTimeout(matchmakingTimeoutRef.current);
    }
  }, []);

  return {
    isMatchmaking,
    room,
    error,
    playerId,
    playerUsername,
    startMatchmaking,
    cancelMatchmaking,
  };
}

// Prevent route warnings - this file is not a route
export default function Placeholder() {
  return null;
}
