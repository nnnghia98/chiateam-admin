import assert from 'node:assert/strict';
import test from 'node:test';

import {
  botStorageOnlyRenamesPlayers,
  getBotStorageEditedFields,
  getVoteSelectionIndexes,
  getVoteVoterName,
  mergeBotStorageEdits,
  mergeBotStoragePlayerNames,
  rawToStorage,
  storageToRaw,
} from '../src/lib/bot-storage.ts';

function storageFixture(manifest) {
  return {
    bench: [
      [101, { name: 'An', userId: 'zalo-101', role: 'captain' }],
      ['manual-1', 'Binh'],
    ],
    teamA: [[202, { name: 'Chi', userId: 202, shirt: 'red' }]],
    teamB: [],
    team3A: [],
    team3B: [],
    team3C: [],
    san: 'Pitch 4',
    manifest,
    activeVote: {
      id: 'vote-1',
      question: 'Goal difference?',
      options: ['0', '+1', '+2', '+3', '+4'],
      chatId: 123,
      messageId: '456',
      platform: 'zalo',
      createdBy: 101,
      createdAt: '2026-08-31T00:00:00.000Z',
      totalVoters: 4,
      customVoteField: { keep: true },
      votes: {
        old: { name: 'Old format', options: [0, 2], reaction: 'keep' },
        choice: { displayName: 'Choice format', choice: '+1' },
        option: { name: 'Option format', option: 3 },
        optionIndex: { label: 'Index format', optionIndex: '4' },
      },
    },
    tiensan: null,
    tiennuoc: 120000,
    teamThua: { legacy: 'teamA' },
    lastUpdated: '2026-08-31T00:01:00.000Z',
    futureApiField: { mustStay: true },
  };
}

const singleManifest = {
  relation: 'different',
  players: [
    { identity: '101', name: 'An' },
    { identity: '202', name: 'Chi' },
  ],
};

test('storage serialization preserves Phase 4 fields and player metadata', () => {
  for (const manifest of [singleManifest, [singleManifest], null]) {
    const raw = storageFixture(manifest);
    const storage = rawToStorage(raw);
    const serialized = storageToRaw(storage);

    assert.equal(storage.san, raw.san);
    assert.deepEqual(storage.manifest, manifest);
    assert.deepEqual(storage.activeVote, raw.activeVote);
    assert.equal(storage.tiensan, null);
    assert.equal(storage.bench[0].userId, 'zalo-101');
    assert.deepEqual(serialized.bench, raw.bench);
    assert.deepEqual(serialized.manifest, manifest);
    assert.deepEqual(serialized.activeVote, raw.activeVote);
  }
});

test('save merge keeps complete latest storage while applying edits', () => {
  const original = storageFixture(singleManifest);
  const latest = structuredClone(original);
  latest.san = 'Pitch changed by bot';
  latest.manifest = [singleManifest];
  latest.activeVote = {
    ...latest.activeVote,
    totalVoters: 5,
    concurrentVoteField: 'keep',
  };
  latest.futureApiField = { changedByApi: true };

  const loaded = rawToStorage(original);
  const edited = rawToStorage(original);
  edited.teamA = edited.teamA.map(player => ({
    ...player,
    name: 'Chi renamed',
  }));

  const editedFields = getBotStorageEditedFields(loaded, edited);
  const next = mergeBotStorageEdits(latest, editedFields);

  assert.deepEqual(Object.keys(editedFields), ['teamA']);
  assert.equal(next.san, latest.san);
  assert.deepEqual(next.manifest, latest.manifest);
  assert.deepEqual(next.activeVote, latest.activeVote);
  assert.deepEqual(next.futureApiField, latest.futureApiField);
  assert.deepEqual(next.teamA, [
    [202, { name: 'Chi renamed', userId: 202, shirt: 'red' }],
  ]);
});

test('old and new vote choices are readable without changing records', () => {
  const activeVote = storageFixture(singleManifest).activeVote;
  const options = activeVote.options;

  assert.deepEqual(
    getVoteSelectionIndexes(activeVote.votes.old, options),
    [0, 2]
  );
  assert.deepEqual(
    getVoteSelectionIndexes(activeVote.votes.choice, options),
    [1]
  );
  assert.deepEqual(
    getVoteSelectionIndexes(activeVote.votes.option, options),
    [3]
  );
  assert.deepEqual(
    getVoteSelectionIndexes(activeVote.votes.optionIndex, options),
    [4]
  );
  assert.equal(
    getVoteVoterName('choice', activeVote.votes.choice),
    'Choice format'
  );
  assert.deepEqual(activeVote.votes.old, {
    name: 'Old format',
    options: [0, 2],
    reaction: 'keep',
  });
});

test('viewer rename validation and merge preserve all storage metadata', () => {
  const current = storageFixture(singleManifest);
  const requestedStorage = rawToStorage(current);
  requestedStorage.bench = requestedStorage.bench.map((player, index) =>
    index === 0 ? { ...player, name: 'An renamed' } : player
  );
  const editedFields = getBotStorageEditedFields(
    rawToStorage(current),
    requestedStorage
  );
  const requested = mergeBotStorageEdits(current, editedFields);

  assert.equal(botStorageOnlyRenamesPlayers(current, requested), true);

  const merged = mergeBotStoragePlayerNames(current, requested);
  assert.ok(merged);
  assert.equal(merged.san, current.san);
  assert.deepEqual(merged.manifest, current.manifest);
  assert.deepEqual(merged.activeVote, current.activeVote);
  assert.deepEqual(merged.futureApiField, current.futureApiField);
  assert.deepEqual(merged.bench[0], [
    101,
    {
      name: 'An renamed',
      userId: 'zalo-101',
      role: 'captain',
    },
  ]);

  assert.equal(
    botStorageOnlyRenamesPlayers(current, { ...requested, san: 'Other' }),
    false
  );
  assert.equal(
    botStorageOnlyRenamesPlayers(current, {
      ...requested,
      activeVote: { ...current.activeVote, customVoteField: 'changed' },
    }),
    false
  );
});

test('viewer rename accepts legacy storage without new nullable keys', () => {
  const current = storageFixture(singleManifest);
  delete current.san;
  delete current.manifest;

  const loaded = rawToStorage(current);
  const edited = rawToStorage(current);
  edited.bench = edited.bench.map((player, index) =>
    index === 1 ? { ...player, name: 'Binh renamed' } : player
  );
  const requested = mergeBotStorageEdits(
    current,
    getBotStorageEditedFields(loaded, edited)
  );

  assert.equal(botStorageOnlyRenamesPlayers(current, requested), true);
  assert.equal(Object.prototype.hasOwnProperty.call(requested, 'san'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(requested, 'manifest'), false);
});
