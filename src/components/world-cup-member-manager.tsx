'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronDown, Copy, KeyRound, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/contexts/auth-context';
import { useI18n } from '@/contexts/i18n-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { WorldCupMemberKey } from '@/types/world-cup';

function memberId(member: WorldCupMemberKey) {
  return String(
    member.member_id ??
      member.memberId ??
      member.member?.member_id ??
      member.member?.memberId ??
      member.member?.id ??
      member.id ??
      member.playerNumber ??
      ''
  );
}

function memberPassCode(member: WorldCupMemberKey) {
  return (
    member.displayKey ??
    member.publicKey ??
    member.numericKey ??
    member.key ??
    member.accessKey ??
    member.predictionKey ??
    member.memberKey?.displayKey ??
    member.memberKey?.publicKey ??
    member.memberKey?.numericKey ??
    member.memberKey?.key ??
    ''
  );
}

function normalizeKeyResponse(response: unknown): WorldCupMemberKey[] {
  if (Array.isArray(response)) return response as WorldCupMemberKey[];
  if (!response || typeof response !== 'object') return [];

  const data = response as {
    keys?: WorldCupMemberKey[];
    memberKeys?: WorldCupMemberKey[];
    members?: WorldCupMemberKey[];
  };

  return data.memberKeys ?? data.keys ?? data.members ?? [];
}

function normalizeMutationResponse(response: unknown): WorldCupMemberKey {
  const data = response as {
    member?: WorldCupMemberKey;
    memberKey?: WorldCupMemberKey;
  };
  return data.memberKey ?? data.member ?? (response as WorldCupMemberKey);
}

function sortMembers(members: WorldCupMemberKey[]) {
  return [...members]
    .filter(member => !member.revokedAt)
    .sort((left, right) =>
      (left.name ?? memberId(left)).localeCompare(
        right.name ?? memberId(right),
        'vi'
      )
    );
}

export function WorldCupMemberManager() {
  const { canEdit, isLoading } = useAuth();
  const { t } = useI18n();
  const [members, setMembers] = useState<WorldCupMemberKey[]>([]);
  const [memberIdValue, setMemberIdValue] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const visibleMembers = useMemo(() => sortMembers(members), [members]);

  const loadMembers = useCallback(async () => {
    if (!canEdit) return;

    try {
      setLoading(true);
      setError('');
      const response = await apiClient.getWorldCupMemberKeys();
      setMembers(normalizeKeyResponse(response));
    } catch (loadError) {
      console.error('Failed to load World Cup member pass codes:', loadError);
      setError(t('worldCup.loadPassCodesError'));
    } finally {
      setLoading(false);
    }
  }, [canEdit, t]);

  useEffect(() => {
    void loadMembers();
  }, [loadMembers]);

  if (isLoading || !canEdit) {
    return null;
  }

  const upsertMember = (member: WorldCupMemberKey) => {
    const id = memberId(member);
    setMembers(previous => [
      ...previous.filter(item => memberId(item) !== id),
      member,
    ]);
  };

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();

    const trimmedName = name.trim();
    const trimmedMemberId = memberIdValue.trim();
    if (!trimmedName || !trimmedMemberId) {
      setError(t('worldCup.nameMemberIdRequired'));
      return;
    }

    try {
      setSaving(true);
      setError('');
      const response = await apiClient.createWorldCupMemberKey({
        memberId: trimmedMemberId,
        name: trimmedName,
      });
      upsertMember(normalizeMutationResponse(response));
      setMemberIdValue('');
      setName('');
    } catch (createError) {
      console.error('Failed to create World Cup member pass code:', createError);
      setError(t('worldCup.createPassCodeError'));
    } finally {
      setSaving(false);
    }
  };

  const handleCopy = async (passCode: string) => {
    await navigator.clipboard.writeText(passCode);
  };

  const handleRegenerate = async (member: WorldCupMemberKey) => {
    const id = memberId(member);
    if (!id) return;

    try {
      setSaving(true);
      setError('');
      const response = await apiClient.regenerateWorldCupMemberKey(id);
      upsertMember(normalizeMutationResponse(response));
    } catch (regenerateError) {
      console.error('Failed to regenerate World Cup pass code:', regenerateError);
      setError(t('worldCup.regeneratePassCodeError'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (member: WorldCupMemberKey) => {
    const id = memberId(member);
    if (!id) return;

    try {
      setSaving(true);
      setError('');
      await apiClient.deleteWorldCupMemberKey(id);
      setMembers(previous => previous.filter(item => memberId(item) !== id));
    } catch (deleteError) {
      console.error('Failed to delete World Cup pass code:', deleteError);
      setError(t('worldCup.deletePassCodeError'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <details
      open
      className="group overflow-hidden rounded-airbnb border border-design-border-soft bg-design-card shadow-design-card [&_summary::-webkit-details-marker]:hidden"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 border-b border-design-border-soft px-5 py-4 outline-none transition-colors hover:bg-design-muted/60 focus-visible:ring-2 focus-visible:ring-design-primary focus-visible:ring-offset-2 focus-visible:ring-offset-design-card">
        <div className="flex min-w-0 items-center gap-2 text-sm font-black text-design-text">
          <KeyRound className="h-4 w-4 text-design-primary" />
          {t('worldCup.predictionMembers')}
        </div>
        <ChevronDown className="h-5 w-5 flex-shrink-0 text-design-secondary transition-transform duration-200 group-open:rotate-180" />
      </summary>

      <div className="grid gap-0 lg:grid-cols-[360px_minmax(0,1fr)]">
        <form
          onSubmit={handleCreate}
          className="space-y-4 border-b border-design-border-soft p-5 lg:border-b-0 lg:border-r"
        >
          <div className="space-y-2">
            <Label htmlFor="world-cup-member-name">{t('common.name')}</Label>
            <Input
              id="world-cup-member-name"
              value={name}
              onChange={event => setName(event.target.value)}
              placeholder="Nguyen Van A"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="world-cup-member-id">{t('worldCup.memberId')}</Label>
            <Input
              id="world-cup-member-id"
              value={memberIdValue}
              onChange={event => setMemberIdValue(event.target.value)}
              placeholder="nguyen-van-a"
            />
          </div>
          <Button type="submit" disabled={saving} className="w-full">
            <Plus className="mr-2 h-4 w-4" />
            {t('worldCup.addMember')}
          </Button>
          {error && <p className="text-sm text-design-error">{error}</p>}
        </form>

        <div className="p-5">
          {loading ? (
            <div className="rounded-airbnb border border-dashed border-design-border-soft px-4 py-8 text-center text-sm text-design-secondary">
              {t('worldCup.loadingPassCodes')}
            </div>
          ) : visibleMembers.length === 0 ? (
            <div className="rounded-airbnb border border-dashed border-design-border-soft px-4 py-8 text-center text-sm text-design-secondary">
              {t('worldCup.noPredictionMembers')}
            </div>
          ) : (
            <div className="overflow-hidden rounded-airbnb border border-design-border-soft">
              <table className="w-full min-w-[560px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-design-border-soft bg-design-muted">
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.14em] text-design-secondary">
                      {t('common.name')}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-[0.14em] text-design-secondary">
                      {t('worldCup.passCode')}
                    </th>
                    <th className="w-36 px-4 py-3 text-right text-xs font-bold uppercase tracking-[0.14em] text-design-secondary">
                      {t('worldCup.actions')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {visibleMembers.map(member => {
                    const id = memberId(member);
                    const passCode = memberPassCode(member);
                    return (
                      <tr
                        key={id}
                        className="border-b border-design-border-soft last:border-b-0"
                      >
                        <td className="px-4 py-3 font-bold text-design-text">
                          {member.name ?? id}
                        </td>
                        <td className="px-4 py-3">
                          <code className="rounded-airbnb bg-design-muted px-2 py-1 text-sm font-bold text-design-text">
                            {passCode || '-'}
                          </code>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-1.5">
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="h-8 w-8"
                              disabled={!passCode}
                              aria-label={t('worldCup.copyPassCode', {
                                name: member.name ?? id,
                              })}
                              onClick={() => handleCopy(passCode)}
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="h-8 w-8"
                              disabled={saving}
                              aria-label={t('worldCup.regeneratePassCode', {
                                name: member.name ?? id,
                              })}
                              onClick={() => handleRegenerate(member)}
                            >
                              <RefreshCw className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              type="button"
                              variant="destructive"
                              size="icon"
                              className="h-8 w-8"
                              disabled={saving}
                              aria-label={t('worldCup.deleteMember', {
                                name: member.name ?? id,
                              })}
                              onClick={() => handleDelete(member)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </details>
  );
}
