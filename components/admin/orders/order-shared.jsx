'use client';

import { ShieldAlert, ShieldCheck } from 'lucide-react';
import { useAuthStore } from '@/lib/auth/auth-store';
import { cn } from '@/lib/utils';

export const OPEN_CONFIRMATION = ['pending', 'no_answer', 'call_back', 'wrong_number'];

export const CHANNEL_LABELS = { web: 'Website', facebook: 'Facebook', instagram: 'Instagram', whatsapp: 'WhatsApp', phone: 'Phone', walk_in: 'Walk-in', other: 'Other' };

export const RISK_SIGNAL_LABELS = {
  blocklisted: 'Blocklisted phone/email',
  previous_return_to_origin: 'Earlier parcel returned (RTO)',
  previous_cancellations: 'Earlier cancellations',
  previous_wrong_number: 'Earlier wrong number',
  many_recent_orders: 'Several orders in 24 hours',
  first_order_high_value: 'High-value first order',
  possible_duplicate: 'Possible duplicate order'
};

const riskTone = { low: 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-300', medium: 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-300', high: 'border-red-200 bg-red-50 text-red-800 dark:border-red-400/30 dark:bg-red-400/10 dark:text-red-300', blocked: 'border-red-300 bg-red-100 text-red-900 dark:border-red-400/50 dark:bg-red-400/20 dark:text-red-200' };

/** Staff-only risk badge; colour is never the only signal (text label included). */
export function RiskBadge({ level, score, className }) {
  if (!level) return null;
  const Icon = level === 'low' ? ShieldCheck : ShieldAlert;
  return <span className={cn('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold capitalize', riskTone[level] || riskTone.low, className)}><Icon size={12} aria-hidden="true" />{level} risk{score ? ` · ${score}` : ''}</span>;
}

const pillTone = {
  success: 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-400/10 dark:text-emerald-300 dark:border-emerald-400/30',
  warning: 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-400/10 dark:text-amber-300 dark:border-amber-400/30',
  danger: 'bg-red-50 text-red-800 border-red-200 dark:bg-red-400/10 dark:text-red-300 dark:border-red-400/30',
  info: 'bg-sky-50 text-sky-800 border-sky-200 dark:bg-sky-400/10 dark:text-sky-300 dark:border-sky-400/30',
  neutral: 'bg-[var(--color-surface-muted)] text-[var(--color-text)] border-[var(--color-border)]'
};
const toneFor = {
  placed: 'info', confirmed: 'info', processing: 'info', completed: 'success', cancelled: 'danger', failed: 'danger', pending_payment: 'warning', draft: 'neutral',
  unpaid: 'warning', pending: 'warning', paid: 'success', partially_paid: 'warning', refunded: 'neutral', partially_refunded: 'warning',
  unfulfilled: 'neutral', packed: 'info', shipped: 'info', out_for_delivery: 'info', delivered: 'success', returned_to_origin: 'danger', returned: 'neutral', partially_returned: 'warning',
  not_required: 'neutral', no_answer: 'warning', call_back: 'warning', wrong_number: 'danger', customer_cancelled: 'danger'
};

export function StatusPill({ value, label, className }) {
  if (!value) return null;
  return <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold', pillTone[toneFor[value] || 'neutral'], className)}>{label || String(value).replaceAll('_', ' ').replace(/^./, (first) => first.toUpperCase())}</span>;
}

export function useCan() {
  const permissions = useAuthStore((state) => state.user?.permissions);
  return (permission) => Boolean(permissions?.includes(permission));
}

export function formatDateTime(value) {
  if (!value) return '';
  return new Date(value).toLocaleString('en-GB', { timeZone: 'Asia/Dhaka', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export function telHref(phone) {
  const digits = String(phone || '').replace(/[^\d+]/g, '');
  return digits ? `tel:${digits}` : undefined;
}

export function whatsappHref(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  return digits ? `https://wa.me/${digits.startsWith('880') ? digits : `88${digits}`}` : undefined;
}
