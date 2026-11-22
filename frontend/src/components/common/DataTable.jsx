import Skeleton from './Skeleton';
import EmptyState from './EmptyState';

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
          {rows.map((row, index) => (
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
    </div>
  );
}
