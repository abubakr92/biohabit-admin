// eslint-config-next 16 ships native flat configs. Routing them through the legacy FlatCompat
// bridge throws "Converting circular structure to JSON", so they are imported directly.
import coreWebVitals from 'eslint-config-next/core-web-vitals';
import typescript from 'eslint-config-next/typescript';

const config = [
  ...coreWebVitals,
  ...typescript,
  {
    // @dnd-kit's useSortable hands back ref-backed props — setNodeRef, attributes, listeners,
    // isDragging — that are designed to be read during render. The React Compiler's refs rule
    // cannot see through the hook and reports four false positives in this one component.
    files: ['src/app/(dashboard)/stacks/_components/composition-row.tsx'],
    rules: { 'react-hooks/refs': 'off' },
  },
  { ignores: ['.next/**', 'out/**', 'build/**', 'functions/**', '.tools/**', 'next-env.d.ts'] },
];
export default config;
