export type WorldCupMatchStatus = 'OPEN' | 'LOCKED' | 'CLOSED' | 'SETTLED';
export type WorldCupOutcome = 0 | 1 | 2;
export type WorldCupPickValue = '0' | '1' | '2';

export interface WorldCupMatch {
  id: string;
  matchNumber: number;
  date: string;
  time: string;
  homeTeam: string;
  awayTeam: string;
  homeScore?: number | null;
  awayScore?: number | null;
  score?: string | null;
  status?: WorldCupMatchStatus;
  result?: WorldCupOutcome | null;
  createdBy?: number | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface WorldCupPredictionEntry {
  member_id?: string;
  memberId?: string;
  matchId?: string;
  name?: string;
  prediction?: WorldCupOutcome | '***' | null;
  value?: WorldCupOutcome | '***' | null;
  censored?: boolean;
  updatedAt?: string;
}

export interface WorldCupPredictionRow extends WorldCupPredictionEntry {
  points: number;
  exactScore: boolean;
  correctWinner: boolean;
}

export interface WorldCupLeaderboardRow {
  member_id: string;
  memberId?: string;
  name: string;
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
  homeScore?: number | null;
  awayScore?: number | null;
  score?: string | null;
  status?: WorldCupMatchStatus;
}

export interface WorldCupMatchResultPayload {
  homeScore: number;
  awayScore: number;
  score: string;
  result: WorldCupOutcome;
  status: 'SETTLED';
}

export interface WorldCupMember {
  id: string;
  member_id?: string;
  memberId?: string;
  playerNumber?: number;
  name: string;
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
  predictions?: Record<string, Record<string, WorldCupPredictionEntry | null>>;
  entries?: Record<string, Record<string, WorldCupPredictionEntry | null>>;
  totals?: Record<string, number>;
}

export interface WorldCupMemberPredictionResponse {
  member: WorldCupMember;
  matches: WorldCupMatch[];
  predictions?: Record<string, WorldCupPredictionEntry | null>;
  entries?: Record<string, WorldCupPredictionEntry | null>;
}
