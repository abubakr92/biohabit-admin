import type { ContextRow, Daypart, Mode } from '@/types/models';
import { seedMicroActions } from './micro-actions';

const modeSequence: Mode[] = ['essential', 'essential', 'balanced', 'full'];
const dayparts: Daypart[] = ['morning', 'midday', 'evening'];
export const seedContextRows: ContextRow[] = Array.from({ length: 8 }, (_, stackIndex) =>
  Array.from({ length: 4 }, (_, rowIndex) => {
    const action = seedMicroActions[(stackIndex * 3 + rowIndex) % seedMicroActions.length];
    return {
      id: `context-${stackIndex + 1}-${rowIndex + 1}`,
      stackId: `stack-${stackIndex + 1}`,
      microActionId: action.id,
      microActionTitle: action.title,
      stackSortOrder: rowIndex,
      priorityOrder: rowIndex + 1,
      isOptional: rowIndex === 3,
      isActiveByDefault: rowIndex !== 3,
      includedInMode: modeSequence[rowIndex],
      daypart: dayparts[stackIndex % 3],
      durationOverrideMin: null,
      timingType: rowIndex === 0 ? 'anchor' : rowIndex === 2 ? 'relative' : 'none',
      startTime: rowIndex === 0 ? (stackIndex % 3 === 2 ? '21:30' : '07:30') : null,
      endTime: null,
      relativeToContextId: rowIndex === 2 ? `context-${stackIndex + 1}-2` : null,
      dependencyText: {
        nl: rowIndex === 2 ? 'Na de vorige actie.' : '',
        en: rowIndex === 2 ? 'After the previous action.' : '',
      },
      contextEffect: { nl: `Helpt binnen ${stackIndex + 1}.`, en: `Supports this stack context.` },
      contextWarning: { nl: 'Pas aan waar nodig.', en: 'Adapt where needed.' },
      centreTime: null,
      elasticityMin: null,
    } satisfies ContextRow;
  }),
).flat();
