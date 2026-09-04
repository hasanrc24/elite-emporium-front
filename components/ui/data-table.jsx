'use client';

import { flexRender, getCoreRowModel, getSortedRowModel, useReactTable } from '@tanstack/react-table';
import { ChevronDown, ChevronUp, ChevronsUpDown } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

export function DataTable({
  columns = [],
  data = [],
  loading = false,
  emptyTitle = 'No records',
  emptyDescription,
  onRowClick,
  rowKey = (row, i) => row?.id ?? i,
  className,
  initialSorting = []
}) {
  const [sorting, setSorting] = useState(initialSorting);

  // TanStack Table intentionally returns non-memoizable functions; React Compiler safely skips this component.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getRowId: (row, index) => String(rowKey(row, index))
  });

  return (
    <div className={cn('overflow-x-auto rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-raised)] shadow-[var(--shadow-sm)]', className)}>
      <table className="admin-table w-full min-w-[640px] text-sm">
        <thead className="bg-[var(--color-surface)]">
          {table.getHeaderGroups().map((hg) => (
            <tr key={hg.id}>
              {hg.headers.map((header) => {
                const canSort = header.column.getCanSort();
                const dir = header.column.getIsSorted();
                return (
                  <th key={header.id} scope="col" className="px-4 py-3 text-left">
                    {header.isPlaceholder ? null : canSort ? (
                      <button
                        type="button"
                        onClick={header.column.getToggleSortingHandler()}
                        className="inline-flex items-center gap-1 transition hover:text-[var(--color-text)]"
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {dir === 'asc' ? <ChevronUp className="h-3 w-3" /> : dir === 'desc' ? <ChevronDown className="h-3 w-3" /> : <ChevronsUpDown className="h-3 w-3 opacity-60" />}
                      </button>
                    ) : (
                      flexRender(header.column.columnDef.header, header.getContext())
                    )}
                  </th>
                );
              })}
            </tr>
          ))}
        </thead>
        <tbody>
          {loading && data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-10 text-center text-sm text-[var(--color-muted)]">
                Loading…
              </td>
            </tr>
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-10 text-center">
                <div className="grid gap-1">
                  <p className="font-semibold text-[var(--color-text)]">{emptyTitle}</p>
                  {emptyDescription ? <p className="text-sm text-[var(--color-muted)]">{emptyDescription}</p> : null}
                </div>
              </td>
            </tr>
          ) : (
            table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                onClick={onRowClick ? () => onRowClick(row.original, row.index) : undefined}
                className={cn(onRowClick && 'cursor-pointer')}
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="border-t border-[var(--color-border)] px-4 py-3 align-middle">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export function tableHeader(label, options = {}) {
  return ({ column }) => {
    const canSort = column.getCanSort();
    return {
      header: () => (
        <span className="inline-flex items-center gap-1">
          {label}
          {canSort ? <ChevronsUpDown className="h-3 w-3 opacity-60" /> : null}
        </span>
      ),
      enableSorting: options.sortable !== false,
      ...options
    };
  };
}
