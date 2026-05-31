'use client';

import type { ChangeEvent } from 'react';
import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import {
  Download,
  FileSpreadsheet,
  ImageUp,
  Plus,
  Shirt,
  Trash2,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/auth-context';

interface ShirtEntry {
  id: string;
  playerName: string;
  shirtNumber: string | null;
}

interface ShirtSample {
  imageName: string;
  imageDataUrl: string;
}

const STORAGE_KEY = 'chiateam-shirt-registration';

function createEntry(): ShirtEntry {
  return {
    id:
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    playerName: '',
    shirtNumber: null,
  };
}

function createInitialEntries(): ShirtEntry[] {
  return [1, 2, 3].map(index => ({
    id: `shirt-row-${index}`,
    playerName: '',
    shirtNumber: null,
  }));
}

function createEmptySample(): ShirtSample {
  return {
    imageName: '',
    imageDataUrl: '',
  };
}

function normalizeEntries(value: unknown): ShirtEntry[] {
  if (!Array.isArray(value)) return createInitialEntries();

  const entries = value.map(item => {
    const record =
      item && typeof item === 'object'
        ? (item as Record<string, unknown>)
        : {};

    return {
      id: typeof record.id === 'string' ? record.id : createEntry().id,
      playerName:
        typeof record.playerName === 'string' ? record.playerName : '',
      shirtNumber:
        typeof record.shirtNumber === 'string'
          ? record.shirtNumber || null
          : null,
    };
  });

  return entries.length > 0 ? entries : createInitialEntries();
}

function normalizeSample(value: unknown): ShirtSample {
  const record =
    value && typeof value === 'object' ? (value as Record<string, unknown>) : {};

  return {
    imageName: typeof record.imageName === 'string' ? record.imageName : '',
    imageDataUrl:
      typeof record.imageDataUrl === 'string' ? record.imageDataUrl : '',
  };
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function downloadExcel(entries: ShirtEntry[], sample: ShirtSample) {
  const rows = entries.filter(
    entry => entry.playerName.trim() || entry.shirtNumber?.trim()
  );

  if (rows.length === 0) {
    alert('Add at least one shirt row before exporting.');
    return;
  }

  const bodyRows = rows
    .map(
      (entry, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>${escapeHtml(entry.playerName)}</td>
          <td style="mso-number-format:'\\@';">${escapeHtml(entry.shirtNumber ?? '')}</td>
        </tr>`
    )
    .join('');

  const workbook = `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          body { font-family: Arial, sans-serif; }
          table { border-collapse: collapse; width: 100%; }
          th, td { border: 1px solid #d9d9d9; padding: 8px; vertical-align: middle; }
          th { background: #222222; color: #ffffff; text-align: left; }
          img { object-fit: contain; border-radius: 8px; }
          .meta th { background: #ff385c; }
          .gap { height: 16px; border: 0; }
        </style>
      </head>
      <body>
        <table class="meta">
          <thead>
            <tr>
              <th colspan="3">Sample shirt</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Image file</td>
              <td colspan="2">${escapeHtml(sample.imageName || 'No sample attached')}</td>
            </tr>
            <tr>
              <td>Sample image</td>
              <td colspan="2">${
                sample.imageDataUrl
                  ? `<img src="${escapeHtml(sample.imageDataUrl)}" width="160" height="160" />`
                  : ''
              }</td>
            </tr>
          </tbody>
        </table>
        <div class="gap"></div>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Player name</th>
              <th>Number (optional)</th>
            </tr>
          </thead>
          <tbody>${bodyRows}</tbody>
        </table>
      </body>
    </html>
  `;

  const blob = new Blob(['\ufeff', workbook], {
    type: 'application/vnd.ms-excel;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `chiateam-shirt-registration-${new Date()
    .toISOString()
    .slice(0, 10)}.xls`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export default function ShirtsPage() {
  const { canEdit } = useAuth();
  const [entries, setEntries] =
    useState<ShirtEntry[]>(createInitialEntries);
  const [sample, setSample] = useState<ShirtSample>(createEmptySample);
  const [loaded, setLoaded] = useState(false);
  const [saveState, setSaveState] = useState('Draft');

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as unknown;

        if (Array.isArray(parsed)) {
          setEntries(normalizeEntries(parsed));
        } else if (parsed && typeof parsed === 'object') {
          const draft = parsed as Record<string, unknown>;
          setEntries(normalizeEntries(draft.entries));
          setSample(normalizeSample(draft.sample));
        }
      }
    } catch (error) {
      console.error('Failed to load shirt registration draft:', error);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!loaded) return;

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ entries, sample }));
      setSaveState('Saved');
    } catch (error) {
      console.error('Failed to save shirt registration draft:', error);
      setSaveState('Image too large');
    }
  }, [entries, sample, loaded]);

  const filledRows = useMemo(
    () =>
      entries.filter(
        entry =>
          entry.playerName.trim() || entry.shirtNumber?.trim()
      ),
    [entries]
  );

  const updateEntry = (
    id: string,
    field: 'playerName' | 'shirtNumber',
    value: string
  ) => {
    setEntries(current =>
      current.map(entry =>
        entry.id === id
          ? {
              ...entry,
              [field]:
                field === 'shirtNumber'
                  ? value.replace(/[^\d]/g, '') || null
                  : value,
            }
          : entry
      )
    );
    setSaveState('Draft');
  };

  const attachSampleImage = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please attach an image file.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setSample({
        imageName: file.name,
        imageDataUrl: typeof reader.result === 'string' ? reader.result : '',
      });
      setSaveState('Draft');
    };
    reader.readAsDataURL(file);
  };

  const removeSampleImage = () => {
    setSample(createEmptySample());
    setSaveState('Draft');
  };

  const addRow = () => {
    setEntries(current => [...current, createEntry()]);
    setSaveState('Draft');
  };

  const removeRow = (id: string) => {
    if (!canEdit) return;

    setEntries(current => {
      if (current.length === 1) {
        return [createEntry()];
      }

      return current.filter(entry => entry.id !== id);
    });
    setSaveState('Draft');
  };

  const clearRows = () => {
    if (!canEdit) return;
    if (!confirm('Clear the shirt registration sheet?')) return;
    setEntries(createInitialEntries());
    setSaveState('Draft');
  };

  return (
    <div className="space-y-5">
      <section className="rounded-airbnb border border-[#e7e7e7] bg-white shadow-airbnb-card dark:border-[#2e2e2e] dark:bg-[#1c1c1e]">
        <div className="grid gap-0 overflow-hidden rounded-airbnb lg:grid-cols-[1fr_320px]">
          <div className="p-5 sm:p-6">
            <div className="mb-5 inline-flex items-center gap-2 rounded-airbnb border border-[#ffd1d8] bg-[#fff0f2] px-3 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-[#ff385c] dark:border-[#5a1a27] dark:bg-[#2b1118]">
              <Shirt className="h-3.5 w-3.5" />
              Shirt order
            </div>
            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <h1 className="max-w-2xl text-3xl font-black leading-tight tracking-tight text-[#222222] dark:text-[#f5f5f5] sm:text-5xl">
                  Registration sheet
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-[#6a6a6a] dark:text-[#a3a3a3]">
                  Player names, shirt numbers, and one shared sample shirt
                  reference.
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                {canEdit && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={clearRows}
                    className="rounded-airbnb dark:border-[#2e2e2e] dark:bg-[#111111] dark:text-[#f5f5f5]"
                  >
                    <X className="mr-2 h-4 w-4" />
                    Clear
                  </Button>
                )}
                <Button
                  type="button"
                  onClick={() => downloadExcel(entries, sample)}
                  className="rounded-airbnb bg-[#222222] text-white hover:bg-[#ff385c] dark:bg-[#ff385c] dark:hover:bg-[#e00b41]"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Export Excel
                </Button>
              </div>
            </div>
          </div>

          <div className="border-t border-[#f2f2f2] bg-[#fcfbf8] p-5 dark:border-[#2e2e2e] dark:bg-[#151515] lg:border-l lg:border-t-0">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#6a6a6a] dark:text-[#a3a3a3]">
                  Rows
                </p>
                <p className="mt-2 text-3xl font-black text-[#222222] dark:text-[#f5f5f5]">
                  {entries.length}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#6a6a6a] dark:text-[#a3a3a3]">
                  Filled
                </p>
                <p className="mt-2 text-3xl font-black text-[#222222] dark:text-[#f5f5f5]">
                  {filledRows.length}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#6a6a6a] dark:text-[#a3a3a3]">
                  Sample
                </p>
                <p className="mt-2 text-lg font-black text-[#222222] dark:text-[#f5f5f5]">
                  {sample.imageDataUrl ? 'Ready' : 'Missing'}
                </p>
              </div>
            </div>
            <div className="mt-5 flex items-center gap-2 rounded-airbnb border border-[#e7e7e7] bg-white px-3 py-2 text-sm font-medium text-[#6a6a6a] dark:border-[#2e2e2e] dark:bg-[#1c1c1e] dark:text-[#a3a3a3]">
              <FileSpreadsheet className="h-4 w-4 text-[#ff385c]" />
              {saveState}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-airbnb border border-[#e7e7e7] bg-white shadow-airbnb-card dark:border-[#2e2e2e] dark:bg-[#1c1c1e]">
        <div className="grid gap-0 overflow-hidden rounded-airbnb lg:grid-cols-[260px_1fr]">
          <div className="flex min-h-[220px] items-center justify-center bg-[#fcfbf8] p-5 dark:bg-[#151515]">
            <div className="relative flex h-44 w-44 items-center justify-center overflow-hidden rounded-airbnb border border-[#e7e7e7] bg-white dark:border-[#2e2e2e] dark:bg-[#111111]">
              {sample.imageDataUrl ? (
                <Image
                  src={sample.imageDataUrl}
                  alt="Sample shirt"
                  width={176}
                  height={176}
                  unoptimized
                  className="h-full w-full object-contain"
                />
              ) : (
                <Shirt className="h-14 w-14 text-[#c1c1c1]" />
              )}
            </div>
          </div>
          <div className="border-t border-[#f2f2f2] p-5 dark:border-[#2e2e2e] lg:border-l lg:border-t-0">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#6a6a6a] dark:text-[#a3a3a3]">
              Sample
            </p>
            <h2 className="mt-1 text-xl font-bold text-[#222222] dark:text-[#f5f5f5]">
              Shirt reference
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#6a6a6a] dark:text-[#a3a3a3]">
              Attach the shirt sample once. It will be included at the top of
              the exported Excel file.
            </p>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Label
                htmlFor="sample-shirt-image"
                className="inline-flex h-10 cursor-pointer items-center justify-center rounded-airbnb border border-[#c1c1c1] bg-white px-4 text-sm font-medium text-[#222222] transition-all hover:border-[#222222] hover:shadow-airbnb-hover dark:border-[#2e2e2e] dark:bg-[#111111] dark:text-[#f5f5f5]"
              >
                <ImageUp className="mr-2 h-4 w-4" />
                Attach sample
              </Label>
              <input
                id="sample-shirt-image"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={attachSampleImage}
              />
              {sample.imageDataUrl && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={removeSampleImage}
                  className="rounded-airbnb px-4 text-[#6a6a6a] hover:text-[#ff385c] dark:text-[#a3a3a3] dark:hover:bg-[#2a2a2a]"
                >
                  Remove sample
                </Button>
              )}
            </div>

            <p className="mt-3 truncate text-sm font-medium text-[#222222] dark:text-[#f5f5f5]">
              {sample.imageName || 'No sample attached'}
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-airbnb border border-[#e7e7e7] bg-white shadow-airbnb-card dark:border-[#2e2e2e] dark:bg-[#1c1c1e]">
        <div className="flex flex-col gap-3 border-b border-[#f2f2f2] px-5 py-4 dark:border-[#2e2e2e] sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#6a6a6a] dark:text-[#a3a3a3]">
              Sheet
            </p>
            <h2 className="mt-1 text-xl font-bold text-[#222222] dark:text-[#f5f5f5]">
              Shirt registrations
            </h2>
          </div>
          <Button
            type="button"
            onClick={addRow}
            className="rounded-airbnb bg-[#222222] text-white hover:bg-[#ff385c] dark:bg-[#ff385c] dark:hover:bg-[#e00b41]"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add row
          </Button>
        </div>

        <div className="hidden overflow-x-auto lg:block">
          <table className="w-full min-w-[680px] border-collapse">
            <thead>
              <tr className="border-b border-[#f2f2f2] bg-[#fcfbf8] text-left dark:border-[#2e2e2e] dark:bg-[#151515]">
                <th className="w-16 px-5 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-[#6a6a6a] dark:text-[#a3a3a3]">
                  #
                </th>
                <th className="px-3 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-[#6a6a6a] dark:text-[#a3a3a3]">
                  Player name
                </th>
                <th className="w-40 px-3 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-[#6a6a6a] dark:text-[#a3a3a3]">
                  Number (optional)
                </th>
                {canEdit && <th className="w-20 px-5 py-3" />}
              </tr>
            </thead>
            <tbody>
              {entries.map((entry, index) => (
                <tr
                  key={entry.id}
                  className="border-b border-[#f2f2f2] last:border-b-0 dark:border-[#2e2e2e]"
                >
                  <td className="px-5 py-4 align-middle text-sm font-bold text-[#6a6a6a] dark:text-[#a3a3a3]">
                    {index + 1}
                  </td>
                  <td className="px-3 py-4 align-middle">
                    <Label htmlFor={`player-${entry.id}`} className="sr-only">
                      Player name
                    </Label>
                    <Input
                      id={`player-${entry.id}`}
                      value={entry.playerName}
                      onChange={event =>
                        updateEntry(entry.id, 'playerName', event.target.value)
                      }
                      placeholder="Player name"
                      className="rounded-airbnb dark:border-[#2e2e2e] dark:bg-[#111111] dark:text-[#f5f5f5]"
                    />
                  </td>
                  <td className="px-3 py-4 align-middle">
                    <Label htmlFor={`number-${entry.id}`} className="sr-only">
                      Number optional
                    </Label>
                    <Input
                      id={`number-${entry.id}`}
                      inputMode="numeric"
                      value={entry.shirtNumber ?? ''}
                      onChange={event =>
                        updateEntry(
                          entry.id,
                          'shirtNumber',
                          event.target.value
                        )
                      }
                      placeholder="Optional"
                      className="rounded-airbnb dark:border-[#2e2e2e] dark:bg-[#111111] dark:text-[#f5f5f5]"
                    />
                  </td>
                  {canEdit && (
                    <td className="px-5 py-4 text-right align-middle">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeRow(entry.id)}
                        aria-label="Delete row"
                        className="text-[#6a6a6a] hover:text-[#c13515] dark:text-[#a3a3a3] dark:hover:bg-[#2a2a2a]"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="space-y-3 p-4 lg:hidden">
          {entries.map((entry, index) => (
            <div
              key={entry.id}
              className="rounded-airbnb border border-[#e7e7e7] bg-white p-4 dark:border-[#2e2e2e] dark:bg-[#151515]"
            >
              <div className="mb-4 flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[#6a6a6a] dark:text-[#a3a3a3]">
                  Row {index + 1}
                </span>
                {canEdit && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeRow(entry.id)}
                    aria-label="Delete row"
                    className="h-8 w-8 text-[#6a6a6a] hover:text-[#c13515] dark:text-[#a3a3a3] dark:hover:bg-[#2a2a2a]"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <div className="grid gap-3">
                <div className="space-y-2">
                  <Label
                    htmlFor={`mobile-player-${entry.id}`}
                    className="dark:text-[#f5f5f5]"
                  >
                    Player name
                  </Label>
                  <Input
                    id={`mobile-player-${entry.id}`}
                    value={entry.playerName}
                    onChange={event =>
                      updateEntry(entry.id, 'playerName', event.target.value)
                    }
                    placeholder="Player name"
                    className="rounded-airbnb dark:border-[#2e2e2e] dark:bg-[#111111] dark:text-[#f5f5f5]"
                  />
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor={`mobile-number-${entry.id}`}
                    className="dark:text-[#f5f5f5]"
                  >
                    Number (optional)
                  </Label>
                  <Input
                    id={`mobile-number-${entry.id}`}
                    inputMode="numeric"
                    value={entry.shirtNumber ?? ''}
                    onChange={event =>
                      updateEntry(entry.id, 'shirtNumber', event.target.value)
                    }
                    placeholder="Optional"
                    className="rounded-airbnb dark:border-[#2e2e2e] dark:bg-[#111111] dark:text-[#f5f5f5]"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
