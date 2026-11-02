import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it, vi } from 'vitest';
import { ActionMenu, DataTable, TableFooter, actionsColumn } from '@/components/ui';
import messages from '../messages/en.json';

const wrap = (ui) => render(<NextIntlClientProvider locale="en" messages={messages}>{ui}</NextIntlClientProvider>);
const rows = [{ id: 'a', name: 'Banana', qty: 2 }, { id: 'b', name: 'Apple', qty: 10 }];
const columns = [{ header: 'Name', accessorKey: 'name' }, { header: 'Qty', accessorKey: 'qty', meta: { align: 'right' } }];

describe('DataTable', () => {
  it('shows skeleton rows while loading, and an error with retry', () => {
    const onRetry = vi.fn();
    const { container, rerender } = wrap(<DataTable columns={columns} data={[]} loading />);
    expect(container.querySelectorAll('tbody .skeleton').length).toBeGreaterThan(0);
    rerender(<NextIntlClientProvider locale="en" messages={messages}><DataTable columns={columns} data={[]} error="Boom" onRetry={onRetry} /></NextIntlClientProvider>);
    expect(screen.getByRole('alert')).toHaveTextContent('Boom');
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalled();
  });

  it('does not offer sorting unless the full data set is loaded', () => {
    const { rerender } = wrap(<DataTable columns={columns} data={rows} />);
    expect(screen.queryByRole('button', { name: /Name/ })).toBeNull();
    rerender(<NextIntlClientProvider locale="en" messages={messages}><DataTable columns={columns} data={rows} sortable /></NextIntlClientProvider>);
    fireEvent.click(screen.getByRole('button', { name: /Name/ }));
    expect(screen.getAllByRole('row')[1]).toHaveTextContent('Apple');
  });

  it('row click ignores clicks on the action menu and supports keyboard', () => {
    const onRowClick = vi.fn();
    wrap(<DataTable columns={[...columns, actionsColumn(() => [{ label: 'Edit', onSelect: vi.fn() }])]} data={rows} onRowClick={onRowClick} rowLabel={(row) => `Open ${row.name}`} />);
    fireEvent.click(screen.getByRole('button', { name: 'Actions for Banana' }));
    expect(onRowClick).not.toHaveBeenCalled();
    const row = screen.getByRole('row', { name: 'Open Apple' });
    fireEvent.keyDown(row, { key: 'Enter' });
    expect(onRowClick).toHaveBeenCalledWith(rows[1], 1);
  });

  it('select-all toggles every row on the page', () => {
    const onChange = vi.fn();
    wrap(<DataTable columns={columns} data={rows} selectedIds={['a']} onSelectedIdsChange={onChange} />);
    const all = screen.getByRole('checkbox', { name: 'Select all rows on this page' });
    expect(all.indeterminate).toBe(true);
    fireEvent.click(all);
    expect(onChange).toHaveBeenCalledWith(['a', 'b']);
  });
});

describe('ActionMenu', () => {
  it('asks before running a destructive action', () => {
    const remove = vi.fn();
    wrap(<ActionMenu label="Row actions" actions={[{ label: 'Edit', onSelect: vi.fn() }, { separator: true }, { label: 'Delete', destructive: true, onSelect: remove, confirm: { description: 'This cannot be undone.' } }, { label: 'Secret', hidden: true }]} />);
    fireEvent.keyDown(screen.getByRole('button', { name: 'Row actions' }), { key: 'Enter' });
    expect(screen.queryByRole('menuitem', { name: 'Secret' })).toBeNull();
    fireEvent.click(screen.getByRole('menuitem', { name: 'Delete' }));
    expect(remove).not.toHaveBeenCalled();
    const dialog = screen.getByRole('alertdialog');
    expect(dialog).toHaveTextContent('This cannot be undone.');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));
    expect(remove).toHaveBeenCalledTimes(1);
  });

  it('renders nothing when every action is hidden', () => {
    const { container } = wrap(<ActionMenu actions={[{ label: 'Edit', hidden: true }]} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('TableFooter', () => {
  it('summarises the visible range and changes page size', () => {
    const onPageSizeChange = vi.fn();
    wrap(<TableFooter page={2} pageSize={25} total={60} pageCount={3} onPageChange={vi.fn()} onPageSizeChange={onPageSizeChange} />);
    expect(screen.getByText('Showing 26–50 of 60')).toBeInTheDocument();
    fireEvent.change(screen.getByRole('combobox', { name: 'Rows per page' }), { target: { value: '50' } });
    expect(onPageSizeChange).toHaveBeenCalledWith(50);
  });
});
