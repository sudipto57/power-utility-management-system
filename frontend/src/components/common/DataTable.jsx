import { useState } from 'react';
import Skeleton from './Skeleton';
import EmptyState from './EmptyState';
import Icon from './Icon';

const PAGE_SIZE = 50; // rows drawn at first; "Show more" adds 50 each time (long lists stay fast)

/**
 * Simple table.
 * columns: [{ key: 'full_name', header: 'Name', render: (row) => ..., className: 'text-right' }]
 * rows:    array of objects (each needs an `id`)
 */
export default function DataTable({
  columns,
  rows,
  loading = false,
  onRowClick,
  emptyTitle = 'No records found',
  emptyText = 'Try a different search or filter.',
  emptyIcon = 'search',
  emptyAction,
}) {
  const [limit, setLimit] = useState(PAGE_SIZE);

  if (loading && !rows) {
    return (
      <div className="space-y-3 p-5">
        {[0, 1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  if (!rows || rows.length === 0) {
    return <EmptyState icon={emptyIcon} title={emptyTitle} text={emptyText} action={emptyAction} />;
  }

  return (
    <div className={`overflow-x-auto transition-opacity ${loading ? 'opacity-60' : ''}`}>
      <table className="min-w-full text-left text-sm">
        <thead>
          <tr className="border-b border-sand-100 bg-sand-50/80">
            {columns.map((column) => (
              <th
                key={column.key}
                className={`whitespace-nowrap px-5 py-3 text-[11px] font-extrabold uppercase tracking-wider text-sand-600 ${column.className || ''}`}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-sand-100">
          {rows.slice(0, limit).map((row, index) => (
            <tr
              key={row.id ?? index}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={`transition-colors ${
                onRowClick ? 'cursor-pointer hover:bg-gradient-to-r hover:from-orange-50 hover:to-transparent' : 'hover:bg-sand-50/70'
              }`}
            >
              {columns.map((column) => (
                <td key={column.key} className={`whitespace-nowrap px-5 py-3.5 font-semibold text-sand-700 ${column.className || ''}`}>
                  {column.render ? column.render(row) : (row[column.key] ?? '-')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length > limit && (
        <div className="flex flex-col items-center gap-2 border-t border-sand-100 px-5 py-4 text-sm sm:flex-row sm:justify-center sm:gap-3">
          <span className="text-sand-500">
            Showing {limit.toLocaleString('en-US')} of {rows.length.toLocaleString('en-US')}
          </span>
          <button
            type="button"
            onClick={() => setLimit(limit + PAGE_SIZE)}
            className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-1.5 font-bold text-sand-800 shadow-sm ring-1 ring-sand-200 transition hover:-translate-y-0.5 hover:text-orange-600"
          >
            <Icon name="chevronDown" className="h-4 w-4" /> Show {Math.min(PAGE_SIZE, rows.length - limit)} more
          </button>
        </div>
      )}
    </div>
  );
}
