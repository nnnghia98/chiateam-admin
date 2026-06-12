import type {
  WorldCupLeaderboardResponse,
  WorldCupMatchDetail,
  WorldCupMatchPayload,
  WorldCupMemberKey,
  WorldCupMemberPredictionResponse,
  WorldCupOutcome,
  WorldCupOverallResponse,
} from '@/types/world-cup';

// Browser requests always go through the Next.js proxy route.
const API_URL = '/api/proxy';

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async fetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API Error: ${response.status} - ${error}`);
    }

    return response.json();
  }

  // Players
  async getPlayers() {
    return this.fetch<any[]>('/api/players');
  }

  async getPlayer(number: number) {
    return this.fetch<any>(`/api/players/${number}`);
  }

  async createPlayer(data: any) {
    return this.fetch<any>('/api/players', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updatePlayer(number: number, data: any) {
    return this.fetch<any>(`/api/players/${number}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deletePlayer(number: number) {
    return this.fetch<void>(`/api/players/${number}`, {
      method: 'DELETE',
    });
  }

  // Matches
  async getMatches() {
    return this.fetch<any[]>('/api/matches');
  }

  async getMatch(date: string) {
    return this.fetch<any>(`/api/matches/${date}`);
  }

  async createMatch(data: any) {
    return this.fetch<any>('/api/matches', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateMatch(date: string, data: any) {
    return this.fetch<any>(`/api/matches/${date}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteMatch(date: string) {
    return this.fetch<void>(`/api/matches/${date}`, {
      method: 'DELETE',
    });
  }

  // Leaderboard
  async getLeaderboard() {
    return this.fetch<any[]>('/api/player-summaries');
  }

  async updateLeaderboardEntry(playerNumber: number, data: any) {
    return this.fetch<any>(`/api/leaderboard/${playerNumber}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Bot Storage
  async getBotStorage() {
    return this.fetch<any>('/api/bot-storage');
  }

  async saveBotStorage(data: any) {
    return this.fetch<any>('/api/bot-storage', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async resetBotStorage() {
    return this.fetch<any>('/api/bot-storage/reset', {
      method: 'POST',
    });
  }

  async syncBotStorageFromVote() {
    return this.fetch<any>('/api/bot-storage/sync', {
      method: 'POST',
    });
  }

  // World Cup Predictions
  async getWorldCupPredictions() {
    return this.fetch<WorldCupOverallResponse>('/api/world-cup-predictions');
  }

  async getWorldCupMatches() {
    return this.fetch<any>('/api/world-cup-predictions/matches');
  }

  async getWorldCupMatch(matchId: string) {
    return this.fetch<WorldCupMatchDetail>(
      `/api/world-cup-predictions/matches/${encodeURIComponent(matchId)}`
    );
  }

  async createWorldCupMatch(data: Required<WorldCupMatchPayload>) {
    return this.fetch<WorldCupMatchDetail>('/api/world-cup-predictions/matches', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateWorldCupMatch(matchId: string, data: WorldCupMatchPayload) {
    return this.fetch<WorldCupMatchDetail>(
      `/api/world-cup-predictions/matches/${encodeURIComponent(matchId)}`,
      {
        method: 'PUT',
        body: JSON.stringify(data),
      }
    );
  }

  async setWorldCupMatchResult(matchId: string, result: WorldCupOutcome) {
    return this.fetch<WorldCupMatchDetail>(
      `/api/world-cup-predictions/matches/${encodeURIComponent(matchId)}/result`,
      {
        method: 'POST',
        body: JSON.stringify({ result }),
      }
    );
  }

  async deleteWorldCupMatch(matchId: string) {
    return this.fetch<void>(
      `/api/world-cup-predictions/matches/${encodeURIComponent(matchId)}`,
      { method: 'DELETE' }
    );
  }

  async getWorldCupLeaderboard() {
    return this.fetch<WorldCupLeaderboardResponse>(
      '/api/world-cup-predictions/leaderboard'
    );
  }

  async getWorldCupMemberKeys() {
    return this.fetch<WorldCupMemberKey[] | { keys?: WorldCupMemberKey[]; memberKeys?: WorldCupMemberKey[]; members?: WorldCupMemberKey[] }>(
      '/api/world-cup-predictions/member-keys'
    );
  }

  async createWorldCupMemberKey(data: { memberId: string; name: string; key?: string }) {
    return this.fetch<WorldCupMemberKey | { member: WorldCupMemberKey; memberKey: WorldCupMemberKey }>('/api/world-cup-predictions/member-keys', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async regenerateWorldCupMemberKey(memberId: string) {
    return this.fetch<WorldCupMemberKey>(
      `/api/world-cup-predictions/member-keys/${encodeURIComponent(memberId)}/regenerate`,
      { method: 'POST' }
    );
  }

  async deleteWorldCupMemberKey(memberId: string) {
    return this.fetch<void>(
      `/api/world-cup-predictions/member-keys/${encodeURIComponent(memberId)}`,
      { method: 'DELETE' }
    );
  }

  async getWorldCupMemberPredictions(key: string) {
    return this.fetch<WorldCupMemberPredictionResponse>(
      `/api/world-cup-predictions/member/${encodeURIComponent(key)}`
    );
  }

  async updateWorldCupMemberPrediction(
    key: string,
    matchId: string,
    prediction: WorldCupOutcome
  ) {
    return this.fetch<WorldCupMemberPredictionResponse>(
      `/api/world-cup-predictions/member/${encodeURIComponent(key)}/predictions/${encodeURIComponent(matchId)}`,
      {
        method: 'PUT',
        body: JSON.stringify({ prediction }),
      }
    );
  }
}

export const apiClient = new ApiClient(API_URL);
