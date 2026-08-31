import assert from 'node:assert/strict';
import test from 'node:test';

import { toMatchWritePayload } from '../src/lib/match.ts';

test('match writes omit response-only winner and player fields', () => {
  const payload = toMatchWritePayload({
    match_date: '2026-08-31',
    san: 'Pitch 4',
    tiensan: 500000,
    home_score: 3,
    away_score: 2,
    notes: 'Finished',
    winner_side: 'HOME',
    players: [
      {
        playerId: 'external-1',
        displayName: 'An',
        name: 'An',
        number: null,
        label: 'Home',
      },
    ],
    unknownResponseField: true,
  });

  assert.deepEqual(payload, {
    match_date: '2026-08-31',
    san: 'Pitch 4',
    tiensan: 500000,
    home_score: 3,
    away_score: 2,
    notes: 'Finished',
  });
  assert.equal('winner_side' in payload, false);
});
