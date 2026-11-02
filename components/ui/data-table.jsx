'use client';

import { flexRender, getCoreRowModel, getSortedRowModel, useReactTable } from '@tanstack/react-table';
import { AlertCircle, ChevronDown, ChevronUp, ChevronsUpDown } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { ActionMenu } from './auxiliary';
import { Pagination } from './layout';

const INTERACTIVE = 'a, button, input, select, textarea, label, [role="menuitem"], [role="checkbox"], [data-row-click-ignore]';
const alignClass = { right: 'text-right', center: 'text-center' };

/**
 * Admin/account table.
 * - Sorting is off unless the table holds the complete data set (`sortable`),
 *   or the server sorts (`sorting` + `onSortingChange`); sorting one page of a
 *   paginated list would show a misleading order.
 * - `selectedIds` + `onSelectedIdsChange` add a checkbox column for bulk actions.
 * - Column `meta`: { align: 'right' | 'center', className, headerClassName }.
 */
export function DataTable({
  columns = [],
  data = [],
  loading = false,
  fetching = false,
  error,
  onRetry,
  emptyTitle = 'No records',
  emptyDescription,
  emptyAction,
  onRowClick,
  rowLabel,
  rowKey = (row, i) => row?.id ?? i,
  className,
  minWidth = 640,
  skeletonRows = 6,
  sortable = false,
  initialSorting = [],
  sorting: controlledSorting,
  onSortingChange,
  selectedIds,
  onSelectedIdsChange,
  caption
}) {
  const t = useTranslations('ui');
  const [localSorting, setLocalSorting] = useState(initialSorting);
  const manualSorting = Boolean(onSortingChange);
  const sorting = manualSorting ? controlledSorting || [] : localSorting;
  const selectable = Boolean(onSelectedIdsChange);
  const selected = new Set(selectedIds || []);

  const allColumns = selectable ? [selectionColumn(t, selected, onSelectedIdsChange, rowKey), ...columns] : columns;

  // TanStack Table intentionally returns non-memoizable functions; React Compiler safely skips this component.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data,
    columns: allColumns,
    state: { sorting },
    onSortingChange: manualSorting ? (updater) => onSortingChange(typeof updater === 'function' ? updater(sorting) : updater) : setLocalSorting,
    manualSorting,
    enableSorting: sortable || manualSorting,
    enableSortingRemoval: true,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: manualSorting ? undefined : getSortedRowModel(),
    getRowId: (row, index) => String(rowKey(row, index))
  });

  const colSpan = table.getVisibleLeafColumns().length;
  const showSkeleton = loading && data.length === 0;

  const activate = (event, row) => {
    if (!onRowClick || event.target.closest(INTERACTIVE)) return;
    onRowClick(row.original, row.index);
  };

  return (
    <div className={cn('relative overflow-x-auto rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-raised)] shadow-[var(--shadow-sm)]', className)}>
      <table className="admin-table w-full text-sm" style={{ minWidth }} aria-busy={loading || fetching || undefined}>
        {caption ? <caption className="sr-only">{caption}</caption> : null}
        <thead className="bg-[var(--color-surface)]">
          {table.getHeaderGroups().map((hg) => (
            <tr key={hg.id}>
              {hg.headers.map((header) => {
                const meta = header.column.columnDef.meta || {};
                const canSort = header.column.getCanSort();
                const dir = header.column.getIsSorted();
                const label = header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext());
                return (
                  <th
                    key={header.id}
                    scope="col"
                    aria-sort={dir === 'asc' ? 'ascending' : dir === 'desc' ? 'descending' : canSort ? 'none' : undefined}
                    className={cn('whitespace-nowrap px-4 py-3 text-left', alignClass[meta.align], meta.headerClassName)}
                  >
                    {canSort ? (
                      <button type="button" onClick={header.column.getToggleSortingHandler()} className={cn('inline-flex items-center gap-1 uppercase transition hover:text-[var(--color-text)]', dir && 'text-[var(--color-text)]')}>
                        {label}
                        {dir === 'asc' ? <ChevronUp className="h-3 w-3" aria-hidden="true" /> : dir === 'desc' ? <ChevronDown className="h-3 w-3" aria-hidden="true" /> : <ChevronsUpDown className="h-3 w-3 opacity-50" aria-hidden="true" />}
                      </button>
                    ) : label}
                  </th>
                );
              })}
            </tr>
          ))}
        </thead>
        <tbody className={cn('transition-opacity', fetching && !showSkeleton && 'opacity-60')}>
          {error && data.length === 0 ? (
            <tr>
              <td colSpan={colSpan} className="px-4 py-12 text-center">
                <div className="mx-auto grid max-w-sm justify-items-center gap-2">
                  <AlertCircle className="h-6 w-6 text-[var(--color-danger)]" aria-hidden="true" />
                  <p role="alert" className="font-semibold text-[var(--color-text)]">{typeof error === 'string' ? error : t('loadFailed')}</p>
                  {onRetry ? <button type="button" onClick={onRetry} className="text-sm font-semibold text-[var(--color-primary)] hover:underline">{t('retry')}</button> : null}
                </div>
              </td>
            </tr>
          ) : showSkeleton ? (
            Array.from({ length: skeletonRows }, (_, i) => (
              <tr key={`skeleton-${i}`} aria-hidden="true">
                {Array.from({ length: colSpan }, (__, j) => (
                  <td key={j} className="border-t border-[var(--color-border)] px-4 py-3.5">
                    <span className="skeleton block h-4 rounded" style={{ width: j === 0 ? '70%' : `${45 + ((i + j) % 4) * 12}%` }} />
                  </td>
                ))}
              </tr>
            ))
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={colSpan} className="px-4 py-12 text-center">
                <div className="mx-auto grid max-w-sm justify-items-center gap-1.5">
                  <p className="font-semibold text-[var(--color-text)]">{emptyTitle}</p>
                  {emptyDescription ? <p className="text-sm text-[var(--color-muted)]">{emptyDescription}</p> : null}
                  {emptyAction ? <div className="mt-2">{emptyAction}</div> : null}
                </div>
              </td>
            </tr>
          ) : (
            table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                data-state={selected.has(row.id) ? 'selected' : undefined}
                tabIndex={onRowClick ? 0 : undefined}
                aria-label={onRowClick && rowLabel ? rowLabel(row.original) : undefined}
                onClick={onRowClick ? (event) => activate(event, row) : undefined}
                onKeyDown={onRowClick ? (event) => { if ((event.key === 'Enter' || event.key === ' ') && event.target === event.currentTarget) { event.preventDefault(); onRowClick(row.original, row.index); } } : undefined}
                className={cn(onRowClick && 'cursor-pointer focus-visible:bg-[var(--color-primary-soft)] focus-visible:outline-none', 'data-[state=selected]:bg-[var(--color-primary-soft)]')}
              >
                {row.getVisibleCells().map((cell) => {
                  const meta = cell.column.columnDef.meta || {};
                  return (
                    <td key={cell.id} className={cn('border-t border-[var(--color-border)] px-4 py-3 align-middle', alignClass[meta.align], meta.className)}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  );
                })}
              </tr>
            ))
          )}
        </tbody>
      </table>
      {error && data.length > 0 ? (
        <p role="alert" className="flex items-center gap-2 border-t border-[var(--color-border)] px-4 py-2 text-xs text-[var(--color-danger)]">
          <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />{typeof error === 'string' ? error : t('loadFailed')}
          {onRetry ? <button type="button" onClick={onRetry} className="font-semibold underline">{t('retry')}</button> : null}
        </p>
      ) : null}
    </div>
  );
}

function selectionColumn(t, selected, onChange, rowKey) {
  return {
    id: '__select',
    enableSorting: false,
    meta: { headerClassName: 'w-10 !pr-0', className: 'w-10 !pr-0' },
    header: ({ table }) => {
      const ids = table.getRowModel().rows.map((row) => row.id);
      const all = ids.length > 0 && ids.every((id) => selected.has(id));
      const some = !all && ids.some((id) => selected.has(id));
      return (
        <input
          type="checkbox"
          aria-label={t('selectAll')}
          checked={all}
          ref={(node) => { if (node) node.indeterminate = some; }}
          onChange={() => onChange(all ? [...selected].filter((id) => !ids.includes(id)) : [...new Set([...selected, ...ids])])}
        />
      );
    },
    cell: ({ row }) => (
      <input
        type="checkbox"
        aria-label={t('selectRow')}
        checked={selected.has(String(rowKey(row.original, row.index)))}
        onChange={(event) => onChange(event.target.checked ? [...selected, row.id] : [...selected].filter((id) => id !== row.id))}
      />
    )
  };
}

/**
 * Right-aligned three-dot action column. `getActions(row)` returns ActionMenu
 * items; rows without visible actions render nothing.
 */
export function actionsColumn(getActions, { label = (row) => `Actions for ${row?.name || row?.reference || row?.title || row?.sku || 'row'}` } = {}) {
  return {
    id: 'actions',
    enableSorting: false,
    header: () => <span className="sr-only">Actions</span>,
    meta: { align: 'right', className: 'cell-actions w-14 !py-1.5', headerClassName: 'cell-actions w-14' },
    cell: ({ row }) => <div className="flex justify-end" data-row-click-ignore><ActionMenu actions={getActions(row.original)} label={label(row.original)} /></div>
  };
}

/**
 * Pagination footer: "Showing 26–50 of 312", rows-per-page and page buttons.
 * Renders the summary even for a single page so totals stay visible.
 */
export function TableFooter({ page, pageSize, total, pageCount, onPageChange, onPageSizeChange, pageSizeOptions = [10, 25, 50, 100], className }) {
  const t = useTranslations('ui');
  const numberLocale = useLocale() === 'bn' ? 'bn-BD' : 'en-US';
  if (!total) return null;
  const pages = pageCount || Math.max(1, Math.ceil(total / pageSize));
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  return (
    <div className={cn('flex flex-col gap-3 px-4 py-3 text-sm text-[var(--color-muted)] sm:flex-row sm:items-center sm:justify-between', className)}>
      <div className="flex flex-wrap items-center gap-4">
        <p aria-live="polite" className="tabular-nums">{t('showing', { from: from.toLocaleString(numberLocale), to: to.toLocaleString(numberLocale), total: total.toLocaleString(numberLocale) })}</p>
        {onPageSizeChange ? (
          <label className="flex items-center gap-2">
            <span>{t('rowsPerPage')}</span>
            <select value={pageSize} onChange={(event) => onPageSizeChange(Number(event.target.value))} className="!min-h-9 !w-auto !py-1 !pl-2.5 !pr-8 !text-sm">
              {pageSizeOptions.map((size) => <option key={size} value={size}>{size}</option>)}
            </select>
          </label>
        ) : null}
      </div>
      <Pagination page={page} totalPages={pages} onChange={onPageChange} />
    </div>
  );
}
