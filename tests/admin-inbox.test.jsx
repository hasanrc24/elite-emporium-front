import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { formatUnread, NotificationRow, timeAgo } from '@/components/admin/notifications/inbox-shared';

const item = { id: '1', event: 'order.placed', category: 'order', severity: 'info', title: 'New order EE-1', body: 'Rahim · ৳1850.00', link: '/admin/orders/1', occurrences: 1, occurredAt: new Date().toISOString(), readAt: null };

describe('admin inbox helpers', () => {
  it('describes how long ago an alert happened', () => {
    const now = Date.parse('2026-10-23T12:00:00Z');
    expect(timeAgo('2026-10-23T11:59:50Z', now)).toBe('just now');
    expect(timeAgo('2026-10-23T11:55:00Z', now)).toBe('5 minutes ago');
    expect(timeAgo('2026-10-22T12:00:00Z', now)).toBe('yesterday');
    expect(timeAgo('not a date', now)).toBe('');
  });

  it('caps the unread badge', () => {
    expect(formatUnread(7)).toBe('7');
    expect(formatUnread(240)).toBe('99+');
  });
});

describe('NotificationRow', () => {
  it('opens the linked page and toggles read state separately', () => {
    const onOpen = vi.fn();
    const onToggleRead = vi.fn();
    render(<NotificationRow item={item} onOpen={onOpen} onToggleRead={onToggleRead} />);
    fireEvent.click(screen.getByRole('button', { name: /^New order EE-1/ }));
    expect(onOpen).toHaveBeenCalledWith(item);
    fireEvent.click(screen.getByRole('button', { name: 'Mark "New order EE-1" as read' }));
    expect(onToggleRead).toHaveBeenCalledWith(item);
  });

  it('shows collapsed repeats and offers mark-as-unread once read', () => {
    render(<NotificationRow item={{ ...item, link: null, occurrences: 3, readAt: item.occurredAt }} onOpen={vi.fn()} onToggleRead={vi.fn()} />);
    expect(screen.getByText('×3')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mark "New order EE-1" as unread' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^New order EE-1/ })).toBeNull();
  });
});
