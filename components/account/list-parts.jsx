'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { DataTable, TableFooter } from '@/components/ui/data-table';
import { Card, CardBody, EmptyState, ErrorState, Skeleton } from '@/components/ui';

/**
 * Customer list shell: skeleton, error with retry, empty state, then a table on
 * larger screens that becomes stacked cards on mobile, with a server-pagination footer.
 */
export function AccountList({ query, columns, renderCard, caption, emptyTitle, emptyDescription, emptyAction, page, pageSize, onPageChange, minWidth = 560, mobileOnly = false }) {
  const t = useTranslations('ui');
  const rows = query.data?.data || [];
  const meta = query.data?.meta;

  // Deleting the last row of a later page would leave an empty page: step back.
  const stranded = !query.isFetching && !query.isLoading && !query.error && !rows.length && page > 1;
  useEffect(() => { if (stranded) onPageChange(page - 1); }, [stranded, page, onPageChange]);

  if (query.isLoading) {
    return (
      <div aria-busy="true" className="grid gap-3">
        {[0, 1, 2].map((i) => <Card key={i}><CardBody><Skeleton className="h-5 w-1/3" /><Skeleton className="mt-3 h-4 w-2/3" /></CardBody></Card>)}
      </div>
    );
  }
  if (query.error && !rows.length) {
    return (
      <ErrorState
        title={t('loadFailed')}
        action={<button type="button" onClick={() => query.refetch()} className="text-sm font-semibold text-[var(--color-primary)] hover:underline">{t('retry')}</button>}
      />
    );
  }
  if (!rows.length) return <EmptyState title={emptyTitle} description={emptyDescription} action={emptyAction} />;

  return (
    <div className="grid gap-3">
      {mobileOnly ? null : (
        <div className="hidden sm:block">
          <DataTable columns={columns} data={rows} fetching={query.isFetching} caption={caption} minWidth={minWidth} />
        </div>
      )}
      <ul className={`grid gap-3 ${mobileOnly ? '' : 'sm:hidden'} ${query.isFetching ? 'opacity-60' : ''}`} aria-label={caption}>
        {rows.map((row) => <li key={row.id}>{renderCard(row)}</li>)}
      </ul>
      {meta?.total ? <TableFooter page={meta.page || page} pageSize={meta.pageSize || pageSize} total={meta.total} pageCount={meta.pageCount} onPageChange={onPageChange} className="!px-1" /> : null}
    </div>
  );
}
