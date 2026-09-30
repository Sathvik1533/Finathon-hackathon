import React from 'react';

export interface Column<T> {
  header: string;
  accessor: keyof T | ((row: T) => React.ReactNode);
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
  loading?: boolean;
}

export function DataTable<T extends Record<string, unknown>>({
  columns, rows, onRowClick, emptyMessage = 'No records were returned.', loading,
}: DataTableProps<T>) {
  const renderValue = (column: Column<T>, row: T) => typeof column.accessor === 'function'
    ? column.accessor(row)
    : String(row[column.accessor] ?? '—');

  if (loading) {
    return <div className="space-y-3" aria-live="polite" aria-label="Loading records">
      {[1, 2, 3].map(i => <div key={i} className="h-16 animate-pulse border border-line bg-white" />)}
    </div>;
  }

  if (rows.length === 0) return <div className="border border-line bg-white px-5 py-10 text-center text-sm text-muted">{emptyMessage}</div>;

  return (
    <>
      <div className="hidden overflow-x-auto border border-line bg-white md:block">
        <table className="w-full min-w-[680px] text-left text-sm">
          <thead className="border-b border-line bg-paper">
            <tr>{columns.map((column, index) => <th key={index} scope="col" className={`px-4 py-3 text-xs font-semibold text-muted ${column.className ?? ''}`}>{column.header}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((row, rowIndex) => <tr key={rowIndex} onClick={() => onRowClick?.(row)} onKeyDown={event => { if (onRowClick && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); onRowClick(row); } }} tabIndex={onRowClick ? 0 : undefined} className={`${onRowClick ? 'cursor-pointer transition-colors hover:bg-paper focus-visible:bg-paper' : ''}`}>
              {columns.map((column, columnIndex) => <td key={columnIndex} className={`px-4 py-3.5 align-middle text-ink ${column.className ?? ''}`}>{renderValue(column, row)}</td>)}
            </tr>)}
          </tbody>
        </table>
      </div>
      <div className="space-y-3 md:hidden">
        {rows.map((row, rowIndex) => <article key={rowIndex} role={onRowClick ? 'button' : undefined} tabIndex={onRowClick ? 0 : undefined} onClick={() => onRowClick?.(row)} onKeyDown={event => { if (onRowClick && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); onRowClick(row); } }} className={`border border-line bg-white p-4 ${onRowClick ? 'cursor-pointer focus-visible:outline-forest' : ''}`}>
          <dl className="space-y-3">{columns.map((column, columnIndex) => <div key={columnIndex} className="grid grid-cols-[minmax(6rem,0.75fr)_minmax(0,1.25fr)] gap-3 border-b border-line/70 pb-2 last:border-0 last:pb-0">
            <dt className="text-xs font-medium text-muted">{column.header}</dt><dd className={`min-w-0 break-words text-right text-sm text-ink ${column.className ?? ''}`}>{renderValue(column, row)}</dd>
          </div>)}</dl>
        </article>)}
      </div>
    </>
  );
}
