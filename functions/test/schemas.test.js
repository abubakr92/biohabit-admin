const test = require('node:test');
const assert = require('node:assert/strict');
const {
  stackSchema,
  microActionSchema,
  contextRowSchema,
  labelSchema,
  userQuerySchema,
} = require('../lib/schemas');

const bilingual = (value) => ({ nl: value, en: value });
const draftStack = (overrides = {}) => ({
  title: bilingual('Morning reset'),
  description: bilingual(''),
  coherence: bilingual(''),
  suggestedTiming: bilingual(''),
  functionTag: 'regulate',
  primaryLabel: 'focus',
  supportingLabels: [],
  level: 'beginner',
  isPremium: false,
  isActive: false,
  ...overrides,
});
const row = (overrides = {}) => ({
  microActionId: 'action-1',
  microActionTitle: bilingual('Breathe'),
  stackSortOrder: 1,
  priorityOrder: 1,
  isOptional: false,
  isActiveByDefault: true,
  includedInMode: 'essential',
  daypart: 'morning',
  durationOverrideMin: null,
  timingType: 'none',
  startTime: null,
  endTime: null,
  relativeToContextId: null,
  dependencyText: bilingual(''),
  contextEffect: bilingual(''),
  contextWarning: bilingual(''),
  centreTime: null,
  elasticityMin: null,
  ...overrides,
});
const fields = (result) => {
  const out = {};
  for (const issue of result.error.issues) (out[issue.path.join('.')] ??= []).push(issue.message);
  return out;
};

test('a draft stack saves with only a title', () => {
  assert.equal(stackSchema.safeParse(draftStack()).success, true);
});

test('a stack cannot be saved without a title', () => {
  const result = stackSchema.safeParse(draftStack({ title: bilingual('  ') }));
  assert.equal(result.success, false);
  assert.deepEqual(Object.keys(fields(result)).sort(), ['title.en', 'title.nl']);
});

test('activating requires the full bilingual set and a daypart, reported per field', () => {
  const result = stackSchema.safeParse(draftStack({ isActive: true }));
  assert.equal(result.success, false);
  assert.deepEqual(Object.keys(fields(result)).sort(), [
    'coherence.en',
    'coherence.nl',
    'daypart',
    'description.en',
    'description.nl',
    'suggestedTiming.en',
    'suggestedTiming.nl',
  ]);
});

const publishable = (overrides = {}) =>
  draftStack({
    isActive: true,
    description: bilingual('text'),
    coherence: bilingual('text'),
    suggestedTiming: bilingual('text'),
    daypart: 'morning',
    ...overrides,
  });

test('an activated stack with complete copy and a daypart is accepted', () => {
  assert.equal(stackSchema.safeParse(publishable()).success, true);
});

// Daypart is the third classification axis, alongside label and function. A draft may leave it
// unset so half-written stacks stay saveable; publishing without one is refused.
test('daypart is optional on a draft and required to publish', () => {
  assert.equal(stackSchema.safeParse(draftStack()).success, true, 'draft without a daypart');
  assert.equal(stackSchema.parse(draftStack()).daypart, null, 'absent daypart defaults to null');

  const result = stackSchema.safeParse(publishable({ daypart: null }));
  assert.equal(result.success, false);
  assert.deepEqual(Object.keys(fields(result)), ['daypart']);

  for (const daypart of ['morning', 'midday', 'evening'])
    assert.equal(stackSchema.safeParse(publishable({ daypart })).success, true, daypart);
  assert.equal(stackSchema.safeParse(publishable({ daypart: 'night' })).success, false);
});

test('timing fields reject anything that is not HH:mm', () => {
  for (const bad of ['not-a-time!!', '24:00', '7:30', '07:60', '0730', ''])
    assert.equal(
      contextRowSchema.safeParse(row({ timingType: 'exact', startTime: bad })).success,
      false,
      `expected ${JSON.stringify(bad)} to be rejected`,
    );
  assert.equal(
    contextRowSchema.safeParse(row({ timingType: 'exact', startTime: '07:30' })).success,
    true,
  );
});

test('a window must end after it starts', () => {
  const invalid = row({ timingType: 'window', startTime: '09:00', endTime: '08:00' });
  assert.equal(contextRowSchema.safeParse(invalid).success, false);
  assert.equal(contextRowSchema.safeParse({ ...invalid, endTime: '10:00' }).success, true);
});

test('relative timing needs a target and bilingual dependency text', () => {
  const result = contextRowSchema.safeParse(row({ timingType: 'relative' }));
  assert.equal(result.success, false);
  assert.deepEqual(Object.keys(fields(result)).sort(), ['dependencyText', 'relativeToContextId']);
});

test('label keys are restricted to lowercase, digits and hyphens', () => {
  assert.equal(
    labelSchema.safeParse({ key: 'deep-focus', name: bilingual('Focus') }).success,
    true,
  );
  assert.equal(
    labelSchema.safeParse({ key: 'Deep Focus', name: bilingual('Focus') }).success,
    false,
  );
});

// Pins the placeholder level scale. When the client confirms the real values this test fails,
// which is the point: it is the prompt to change the panel's copy of the enum in the same pass.
// See the change list on Level in src/types/models.ts.
test('level accepts exactly the agreed scale, on stacks and micro-actions alike', () => {
  const accepted = ['beginner', 'intermediate', 'advanced', 'expert'];
  for (const level of accepted) {
    assert.equal(stackSchema.safeParse(draftStack({ level })).success, true, `stack: ${level}`);
    assert.equal(
      microActionSchema.safeParse({
        title: bilingual('t'),
        effect: bilingual('e'),
        howTo: bilingual('h'),
        warning: bilingual('w'),
        labels: ['focus'],
        durationMin: 5,
        level,
      }).success,
      true,
      `micro-action: ${level}`,
    );
  }
  assert.equal(stackSchema.safeParse(draftStack({ level: 'essential' })).success, false);
});

test('the users query caps page size and defaults to the first page', () => {
  assert.deepEqual(userQuerySchema.parse({}), { status: 'all', limit: 50 });
  assert.equal(userQuerySchema.parse({ limit: '200' }).limit, 200);
  assert.equal(userQuerySchema.safeParse({ limit: '201' }).success, false);
  assert.equal(userQuerySchema.safeParse({ status: 'everyone' }).success, false);
});

// Regression for the client's blocking report: nothing saved, no request left the browser, no
// message appeared. The stored level was `intermediate` while the enum had been changed to mode
// names, so zod rejected the payload, react-hook-form refused to call the submit handler, and the
// failure was invisible because the level error was rendered nowhere.
test('a record holding a stored difficulty still submits', () => {
  for (const level of ['beginner', 'intermediate', 'advanced', 'expert']) {
    assert.equal(
      stackSchema.safeParse(draftStack({ level })).success,
      true,
      `stack storing "${level}" must submit`,
    );
    assert.equal(
      microActionSchema.safeParse({
        title: bilingual('Hydration'),
        effect: bilingual('e'),
        howTo: bilingual('h'),
        warning: bilingual('w'),
        labels: ['energy'],
        durationMin: 2,
        level,
      }).success,
      true,
      `micro-action storing "${level}" must submit`,
    );
  }
  // Mode names are not levels, and must not be silently accepted as though they were.
  for (const mode of ['essential', 'balanced', 'full'])
    assert.equal(stackSchema.safeParse(draftStack({ level: mode })).success, false, mode);
});

// The function axis: a row inherits the library default unless it overrides, so the same action
// can regulate in one stack and activate in another.
test('function is optional on a context row and defaults to inheriting', () => {
  assert.equal(contextRowSchema.parse(row()).functionTag, null, 'absent means inherit');
  for (const tag of ['regulate', 'activate', 'build', 'recover'])
    assert.equal(contextRowSchema.safeParse(row({ functionTag: tag })).success, true, tag);
  assert.equal(contextRowSchema.safeParse(row({ functionTag: 'sprint' })).success, false);
  assert.equal(
    microActionSchema.parse({
      title: bilingual('t'),
      effect: bilingual('e'),
      howTo: bilingual('h'),
      warning: bilingual('w'),
      labels: ['focus'],
      durationMin: 5,
      level: 'beginner',
    }).defaultFunctionTag,
    null,
    'a library action may leave its default unset',
  );
});
