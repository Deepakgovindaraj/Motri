import React from 'react';

export interface TableColumn<T> {
  key: string;
  header: string;
  align?: 'left' | 'right';
  render: (row: T) => React.ReactNode;
}

export function DataTable<T>({
  columns,
  rows,
  keyExtractor,
  emptyState,
}: {
  columns: TableColumn<T>[];
  rows: T[];
  keyExtractor: (row: T) => string;
  emptyState?: React.ReactNode;
}) {
  if (rows.length === 0 && emptyState) {
    return <>{emptyState}</>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-[#E4E2D9] bg-[#FAF9F5] text-[11px] font-semibold uppercase tracking-[0.08em] text-[#7D827A]">
            {columns.map((col) => (
              <th
                key={col.key}
                className={`px-5 py-3.5 ${col.align === 'right' ? 'text-right' : 'text-left'}`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#ECEAE2]">
          {rows.map((row) => (
            <tr
              key={keyExtractor(row)}
              className="transition-colors hover:bg-[#FAF9F5]"
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={`px-5 py-3.5 text-[#171A18] ${col.align === 'right' ? 'text-right tabular-nums' : 'text-left'}`}
                >
                  {col.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
