export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  role: string;
  xp: number;
  level: number;
  coins: number;
  streak: number;
  lastActive: string; // ISO date-time string
  lastLoginAt: string; // ISO date-time string
  badges: string[];
  createdAt: string;
}

export interface Flashcard {
  front: string;
  back: string;
}

export interface Note {
  id: string;
  userId: string;
  title: string;
  content: string;
  summary: string;
  flashcards?: Flashcard[];
  createdAt: string;
  isRawResponseFallback?: boolean;
  rawText?: string;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctIdx: number;
  explanation: string;
}

export interface Quiz {
  id: string;
  userId: string;
  title: string;
  questions: QuizQuestion[];
  score?: number; // Score of last take, if taken
  createdAt: string;
  isRawResponseFallback?: boolean;
  rawText?: string;
}

export interface RoadmapStep {
  title: string;
  description: string;
  completed: boolean;
  day: number;
}

export interface Roadmap {
  id: string;
  userId: string;
  subject: string;
  durationDays: number;
  steps: RoadmapStep[];
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  userId: string;
  sender: "user" | "ai";
  text: string;
  timestamp: string; // ISO string
}

export interface LeaderboardUser {
  uid: string;
  displayName: string;
  xp: number;
  level: number;
}

export interface Toast {
  id: string;
  type: "levelup" | "badge" | "info" | "success";
  title: string;
  message: string;
  duration?: number;
}

