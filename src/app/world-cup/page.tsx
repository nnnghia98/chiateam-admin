import worldCupData from '@/data/world-cup-2026.json';
import { WorldCupMemberManager } from '@/components/world-cup-member-manager';
import { WorldCupSchedule } from '@/components/world-cup-schedule';
import { WorldCupSummary } from '@/components/world-cup-summary';

type RawWorldCupMatch = {
  round: string;
  num?: number;
  date: string;
  time: string;
  team1: string;
  team2: string;
  score?: {
    ft?: [number, number];
    ht?: [number, number];
  };
  group?: string;
  ground: string;
};

type ScheduleMatch = RawWorldCupMatch & {
  matchNumber: number;
  vietnamTimestamp: number;
  vietnamDateKey: string;
  vietnamDateLabel: string;
  vietnamTimeLabel: string;
};

const VIETNAM_OFFSET_HOURS = 7;
const DAY_FORMATTER = new Intl.DateTimeFormat('en-GB', {
  weekday: 'short',
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});
const TIME_FORMATTER = new Intl.DateTimeFormat('en-GB', {
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
  timeZone: 'UTC',
});

function parseKickoff(date: string, time: string) {
  const dateParts = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const timeParts = time.match(/^(\d{1,2}):(\d{2})\s+UTC([+-]\d{1,2})$/);

  if (!dateParts || !timeParts) {
    return {
      timestamp: Number.MAX_SAFE_INTEGER,
      dateKey: date,
      dateLabel: date,
      timeLabel: time,
    };
  }

  const [, year, month, day] = dateParts;
  const [, hour, minute, offset] = timeParts;
  const timestamp = Date.UTC(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour) - Number(offset) + VIETNAM_OFFSET_HOURS,
    Number(minute)
  );
  const vietnamDate = new Date(timestamp);
  const dateKey = [
    vietnamDate.getUTCFullYear(),
    String(vietnamDate.getUTCMonth() + 1).padStart(2, '0'),
    String(vietnamDate.getUTCDate()).padStart(2, '0'),
  ].join('-');

  return {
    timestamp,
    dateKey,
    dateLabel: DAY_FORMATTER.format(vietnamDate),
    timeLabel: TIME_FORMATTER.format(vietnamDate),
  };
}

function normalizeMatches(matches: RawWorldCupMatch[]): ScheduleMatch[] {
  return matches
    .map((match, index) => {
      const kickoff = parseKickoff(match.date, match.time);
      return {
        ...match,
        matchNumber: match.num ?? index + 1,
        vietnamTimestamp: kickoff.timestamp,
        vietnamDateKey: kickoff.dateKey,
        vietnamDateLabel: kickoff.dateLabel,
        vietnamTimeLabel: kickoff.timeLabel,
      };
    })
    .sort((left, right) => left.vietnamTimestamp - right.vietnamTimestamp);
}

function groupByVietnamDate(matches: ScheduleMatch[]) {
  const groups = new Map<string, ScheduleMatch[]>();
  matches.forEach(match => {
    groups.set(match.vietnamDateKey, [
      ...(groups.get(match.vietnamDateKey) ?? []),
      match,
    ]);
  });
  return Array.from(groups.entries()).map(([dateKey, dateMatches]) => ({
    dateKey,
    dateLabel: dateMatches[0]?.vietnamDateLabel ?? dateKey,
    matches: dateMatches,
  }));
}

const schedule = normalizeMatches(worldCupData.matches as RawWorldCupMatch[]);
const scheduleGroups = groupByVietnamDate(schedule);
const groupStageMatches = schedule.filter(match => match.group).length;
const knockoutMatches = schedule.length - groupStageMatches;

export default function WorldCupPage() {
  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <WorldCupSummary
        totalMatches={schedule.length}
        groupStageMatches={groupStageMatches}
        knockoutMatches={knockoutMatches}
      />

      <WorldCupMemberManager />

      <WorldCupSchedule groups={scheduleGroups} />
    </div>
  );
}
