'use client';

import { Suspense, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Archive, Edit3, Plus, Ruler, Search } from 'lucide-react';
import { apiMessage, browserApi } from '@/lib/api/browser-api';
import { useAuthStore } from '@/lib/auth/auth-store';
import { useSearchInput, useTableParams } from '@/lib/hooks/use-table-params';
import { actionsColumn, Button, Card, DataTable, FormattedDate, Input, TableFooter, pushToast } from '@/components/ui';
import { AdminPageHeader } from '../admin-page-header';

const DEFAULTS = { page: 1, pageSize: 25, search: '' };

export function SizeChartManager() {
  // useTableParams reads the URL, which needs a Suspense boundary during prerender.
  return <Suspense><SizeChartTable /></Suspense>;
}

function SizeChartTable() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const permissions = useAuthStore((state) => state.user?.permissions);
  const canManage = Boolean(permissions?.includes('catalog.manage'));
  const [params, setParams] = useTableParams(DEFAULTS);
  const commitSearch = useCallback((value) => setParams({ search: value }), [setParams]);
  const [searchText, setSearchText] = useSearchInput(params.search, commitSearch);
  const apiParams = { page: params.page, pageSize: params.pageSize, ...(params.search ? { search: params.search } : {}) };
  const charts = useQuery({
    queryKey: ['admin', 'size-charts', apiParams],
    queryFn: () => browserApi.get('/admin/size-charts', { params: apiParams }).then((response) => response.data),
    placeholderData: keepPreviousData,
  });
  const archive = useMutation({
    mutationFn: (chart) => browserApi.post(`/admin/size-charts/${chart.id}/archive`),
    onSuccess: () => { pushToast({ tone: 'success', title: 'Size chart archived.' }); queryClient.invalidateQueries({ queryKey: ['admin', 'size-charts'] }); },
    onError: (error) => pushToast({ tone: 'error', title: error?.response?.data?.error?.code === 'SIZE_CHART_IN_USE' ? 'Published products still use this chart. Assign another chart to them first.' : apiMessage(error, 'Could not archive the size chart.') }),
  });
  const rows = charts.data?.data || [];
  const meta = charts.data?.meta;
  const hasFilters = Boolean(params.search);

  const columns = [
    {
      header: 'Name',
      accessorKey: 'name',
      cell: ({ row }) => (
        <div className="min-w-0">
          <p className="max-w-64 truncate font-semibold" title={row.original.name}>{row.original.name}</p>
          <p className="max-w-64 truncate text-xs text-[var(--color-muted)]" title={row.original.titleEn}>{row.original.titleEn}</p>
        </div>
      ),
    },
    { header: 'Units', accessorKey: 'units', cell: ({ row }) => <span className="uppercase text-[var(--color-muted)]">{row.original.units}</span> },
    { header: 'Sizes', id: 'rows', meta: { align: 'right' }, cell: ({ row }) => <span className="tabular-nums">{row.original.rows?.length || 0}</span> },
    {
      header: 'Measurements',
      id: 'columns',
      cell: ({ row }) => {
        const keys = [...new Set((row.original.rows || []).flatMap((item) => Object.keys(item.cells || {})))];
        return <span className="block max-w-56 truncate text-sm capitalize text-[var(--color-muted)]" title={keys.join(', ')}>{keys.join(', ').replaceAll('_', ' ') || '—'}</span>;
      },
    },
    { header: 'Updated', accessorKey: 'updatedAt', cell: ({ row }) => <span className="whitespace-nowrap text-[var(--color-muted)]"><FormattedDate value={row.original.updatedAt} /></span> },
    actionsColumn((chart) => [
      { label: 'Edit', icon: Edit3, href: `/admin/size-charts/${chart.id}`, hidden: !canManage },
      { label: 'View', icon: Ruler, href: `/admin/size-charts/${chart.id}`, hidden: canManage },
      ...(canManage ? [{ separator: true }] : []),
      {
        label: 'Archive',
        icon: Archive,
        destructive: true,
        hidden: !canManage,
        confirm: { title: 'Archive this size chart?', description: 'It can no longer be assigned to products. Archiving is blocked while published products use it.', confirmLabel: 'Archive' },
        onSelect: () => archive.mutate(chart),
      },
    ], { label: (chart) => `Actions for ${chart.name}` }),
  ];

  return (
    <div className="grid gap-5">
      <AdminPageHeader
        title="Size charts"
        description="Measurement tables shoppers see next to the size picker. Required to publish a product with a size option."
        actions={canManage ? <Button asChild size="lg"><Link href="/admin/size-charts/new"><Plus size={17} /> New size chart</Link></Button> : null}
      />
      <Card>
        <div className="border-b border-[var(--color-border)] p-4">
          <div className="relative max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted)]" size={15} />
            <Input aria-label="Search size charts" className="!min-h-10 !pl-9" value={searchText} onChange={(event) => setSearchText(event.target.value)} placeholder="Search by name…" />
          </div>
        </div>
        <DataTable
          className="!rounded-none !border-0 !shadow-none"
          columns={columns}
          data={rows}
          rowKey={(chart) => chart.id}
          loading={charts.isLoading}
          fetching={charts.isFetching}
          error={charts.error ? apiMessage(charts.error, 'Size charts could not be loaded.') : null}
          onRetry={charts.refetch}
          minWidth={720}
          caption="Size charts"
          onRowClick={(chart) => router.push(`/admin/size-charts/${chart.id}`)}
          rowLabel={(chart) => `Open ${chart.name}`}
          emptyTitle={hasFilters ? 'No size charts match your search' : 'No size charts yet'}
          emptyDescription={hasFilters ? 'Try a different search.' : 'Create a chart so you can publish products with sizes.'}
          emptyAction={hasFilters ? <Button size="sm" variant="secondary" onClick={() => { setSearchText(''); setParams({ search: '' }); }}>Clear search</Button> : canManage ? <Button asChild size="sm"><Link href="/admin/size-charts/new">New size chart</Link></Button> : null}
        />
        <TableFooter
          className="border-t border-[var(--color-border)]"
          page={params.page}
          pageSize={params.pageSize}
          total={meta?.total || 0}
          pageCount={meta?.pageCount}
          onPageChange={(page) => setParams({ page })}
          onPageSizeChange={(pageSize) => setParams({ pageSize })}
        />
      </Card>
    </div>
  );
}
