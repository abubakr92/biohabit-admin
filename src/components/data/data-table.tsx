import type { ReactNode } from 'react';
export interface Column<T> {
  key: string;
  header: string;
  className?: string;
  render: (row: T) => ReactNode;
}
export function DataTable<T extends { id: string }>({
  data,
  columns,
  rowClassName,
  onRowClick,
}: {
  data: T[];
  columns: Column<T>[];
  rowClassName?: (row: T) => string;
  /**
   * Makes the whole row a click target. Always pair it with a real link inside the row — the
   * handler is a convenience for the mouse, not a substitute for keyboard navigation.
   */
  onRowClick?: (row: T) => void;
}) {
  return (
    <div className="card overflow-x-auto">
      <table className="w-full min-w-[760px] text-left">
        <thead className="border-b border-slate-200 bg-slate-50/80">
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                className={`px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 ${column.className ?? ''}`}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {data.map((row) => (
            <tr
              key={row.id}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={`group transition hover:bg-slate-50/70 ${onRowClick ? 'cursor-pointer' : ''} ${rowClassName?.(row) ?? ''}`}
            >
              {columns.map((column) => (
                <td key={column.key} className={`px-5 py-4 text-sm ${column.className ?? ''}`}>
                  {column.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
