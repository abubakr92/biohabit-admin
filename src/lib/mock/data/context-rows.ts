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
      functionTag: null,
      stackSortOrder: rowIndex,
      priorityOrder: rowIndex + 1,
      isOptional: rowIndex === 3,
      isActiveByDefault: rowIndex !== 3,
      includedInMode: modeSequence[rowIndex],
      daypart: rowIndex === 3 ? dayparts[(stackIndex + 1) % 3] : null,
      durationOverrideMin: null,
      timingType: rowIndex === 0 ? 'anchor' : rowIndex === 2 ? 'window' : 'none',
      startTime:
        rowIndex === 0
          ? stackIndex % 3 === 2
            ? '21:30'
            : '07:30'
          : rowIndex === 2
            ? '12:00'
            : null,
      endTime: rowIndex === 2 ? '14:00' : null,
      relativeToContextId: null,
      dependencyText: { nl: '', en: '' },
      contextEffect: { nl: `Helpt binnen ${stackIndex + 1}.`, en: `Supports this stack context.` },
      contextWarning: { nl: 'Pas aan waar nodig.', en: 'Adapt where needed.' },
      centreTime: null,
      elasticityMin: null,
    } satisfies ContextRow;
  }),
).flat();
