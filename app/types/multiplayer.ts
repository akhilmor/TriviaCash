import { Question } from '@/constants/questions';

export type RoomStatus = 'waiting' | 'active' | 'completed';

export interface Room {
  id: string;
  status: RoomStatus;
  category: string;
  questions: Question[];
  created_at: string;
  player1_id: string | null;
  player2_id: string | null;
  winner_id: string | null;
  player1_score: number;
  player2_score: number;
  player1_username: string | null;
  player2_username: string | null;
}

export interface RoomEvent {
  id: string;
  room_id: string;
  player_id: string;
  question_index: number;
  is_correct: boolean;
  answer_time_ms: number;
  timestamp: string;
}

export interface MultiplayerGameState {
  room: Room | null;
  playerId: string;
  playerNumber: 1 | 2;
  opponentEvents: RoomEvent[];
  currentQuestionIndex: number;
  isWaitingForOpponent: boolean;
  gameComplete: boolean;
}

// Prevent route warnings - this file is not a route
export default function Placeholder() {
  return null;
}

