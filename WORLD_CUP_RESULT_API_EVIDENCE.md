# World Cup Result API Evidence

## Expected API

The admin UI saves match results with:

```http
POST /api/world-cup-predictions/matches/:matchId/result
```

Expected request body:

```json
{
  "homeScore": 2,
  "awayScore": 1,
  "score": "2-1",
  "result": 1,
  "status": "SETTLED"
}
```

`result` values:

- `1`: home team wins
- `2`: away team wins
- `0`: draw

## Frontend Evidence

The API client sends the result payload directly:

```ts
async setWorldCupMatchResult(matchId: string, result: WorldCupMatchResultPayload) {
  return this.fetch<WorldCupMatchDetail>(
    `/api/world-cup-predictions/matches/${encodeURIComponent(matchId)}/result`,
    {
      method: 'POST',
      body: JSON.stringify(result),
    }
  );
}
```

Source:
`src/lib/api-client.ts`

The payload type includes exact score fields:

```ts
export interface WorldCupMatchResultPayload {
  homeScore: number;
  awayScore: number;
  score: string;
  result: WorldCupOutcome;
  status: 'SETTLED';
}
```

Source:
`src/types/world-cup.ts`

The admin schedule builds and sends the payload:

```ts
await apiClient.setWorldCupMatchResult(resultMatchId, {
  homeScore,
  awayScore,
  score,
  result,
  status: 'SETTLED',
});
```

Source:
`src/components/world-cup-schedule.tsx`

## Match ID Handling

The frontend now tries to save using the backend database match ID when available:

```ts
const backendMatch =
  backendMatchById.get(id) ?? backendMatchById.get(scheduleTeamPairKey(match));
const resultMatchId = backendMatchId(backendMatch) || id;
```

This avoids saving to the wrong match when the local fixture order ID differs from the backend database ID.

## Suspected Backend Issue

If the UI updates winner/loser color but the database score still does not persist, the frontend request is already sending:

- `homeScore`
- `awayScore`
- `score`
- `result`
- `status`

Backend should verify the `/result` handler persists `homeScore`, `awayScore`, and `score`, not only `result` and `status`.

## Backend Verification Checklist

- Confirm the endpoint accepts:
  `POST /api/world-cup-predictions/matches/:matchId/result`
- Confirm request body includes:
  `homeScore`, `awayScore`, `score`, `result`, `status`
- Confirm the database update writes:
  `homeScore`, `awayScore`, `score`, `result`, `status`
- Confirm the response returns the saved match with:
  `homeScore`, `awayScore`, and `score`
- Confirm `GET /api/world-cup-predictions/matches` returns those score fields after save
