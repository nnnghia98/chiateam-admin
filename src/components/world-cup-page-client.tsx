'use client';

import { WorldCupKnockoutBracket } from '@/components/world-cup-knockout-bracket';
import {
  WorldCupSchedule,
  type WorldCupScheduleGroup,
  type WorldCupScheduleMatch,
} from '@/components/world-cup-schedule';
import { WorldCupMemberManager } from '@/components/world-cup-member-manager';
import { WorldCupPredictionOverview } from '@/components/world-cup-prediction-overview';

export function WorldCupPageClient({
  schedule,
  scheduleGroups,
}: {
  schedule: WorldCupScheduleMatch[];
  scheduleGroups: WorldCupScheduleGroup[];
}) {
  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <WorldCupSchedule
        groups={scheduleGroups}
        afterPassCode={predictionContext => (
          <WorldCupKnockoutBracket
            matches={schedule}
            predictionContext={predictionContext}
          />
        )}
      />

      <WorldCupPredictionOverview groups={scheduleGroups} />

      <WorldCupMemberManager />
    </div>
  );
}
