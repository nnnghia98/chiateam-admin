export type WorldCupMatchStatus = 'OPEN' | 'LOCKED' | 'CLOSED' | 'SETTLED';
export type WorldCupWinner = 'HOME' | 'AWAY' | 'DRAW';
export type WorldCupOutcome = 0 | 1 | 2;
export type WorldCupPickValue = '0' | '1' | '2';

export interface WorldCupScore {
  homeScore: number;
  awayScore: number;
  winner: WorldCupWinner;
}

export interface WorldCupMatch {
  id: string;
  matchNumber?: number;
  date?: string;
  time?: string;
  homeTeam: string;
  awayTeam: string;
  kickoff?: string;
  status?: WorldCupMatchStatus;
  result?: WorldCupOutcome | WorldCupScore | null;
  createdBy?: number | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface WorldCupPredictionEntry {
  userId?: string;
  memberId?: string;
  matchId?: string;
  name?: string;
  username?: string | null;
  value?: WorldCupOutcome | '***' | string | null;
  censored?: boolean;
  homeScore?: number;
  awayScore?: number;
  winner?: WorldCupWinner | null;
  updatedAt: string;
}

export interface WorldCupPredictionRow extends WorldCupPredictionEntry {
  points: number;
  exactScore: boolean;
  correctWinner: boolean;
}

export interface WorldCupLeaderboardRow {
  userId: string;
  name: string;
  username: string | null;
  points: number;
  predictions: number;
  exactScores: number;
  correctResults: number;
}

export interface WorldCupMatchDetail {
  match: WorldCupMatch;
  entries: WorldCupPredictionRow[];
}

export interface WorldCupPredictionsResponse {
  matches?: WorldCupMatch[] | Record<string, WorldCupMatch>;
  entries?: Record<string, Record<string, WorldCupPredictionEntry>>;
}

export interface WorldCupLeaderboardResponse {
  rows: WorldCupLeaderboardRow[];
}

export interface WorldCupMatchPayload {
  matchNumber?: number;
  date: string;
  time: string;
  homeTeam: string;
  awayTeam: string;
}

export interface WorldCupMember {
  id: string;
  userId?: string;
  memberId?: string;
  playerNumber?: number;
  name: string;
  username?: string | null;
}

export interface WorldCupMemberKey extends WorldCupMember {
  member?: WorldCupMember;
  memberKey?: WorldCupMemberKey;
  key?: string;
  displayKey?: string;
  publicKey?: string;
  numericKey?: string;
  accessKey?: string;
  predictionKey?: string;
  createdAt?: string;
  updatedAt?: string;
  revokedAt?: string | null;
}

export interface WorldCupOverallResponse {
  matches?: WorldCupMatch[] | Record<string, WorldCupMatch>;
  members?: WorldCupMember[] | Record<string, WorldCupMember>;
  predictions?: Record<string, Record<string, WorldCupPredictionEntry>>;
  entries?: Record<string, Record<string, WorldCupPredictionEntry>>;
  totals?: Record<string, number>;
}

export interface WorldCupMemberPredictionResponse {
  member: WorldCupMember;
  matches: WorldCupMatch[];
  predictions?: Record<string, WorldCupPredictionEntry>;
  entries?: Record<string, WorldCupPredictionEntry>;
}
