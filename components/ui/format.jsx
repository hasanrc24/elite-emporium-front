'use client';

import { useTranslations } from 'next-intl';
import { formatMoney as baseFormatMoney } from '@/lib/utils';

const STATUS_LABELS = {
  draft: { en: 'Draft', bn: 'খসড়া', tone: 'neutral' },
  scheduled: { en: 'Scheduled', bn: 'নির্ধারিত', tone: 'info' },
  published: { en: 'Published', bn: 'প্রকাশিত', tone: 'success' },
  archived: { en: 'Archived', bn: 'সংরক্ষিত', tone: 'neutral' },
  pending_payment: { en: 'Pending payment', bn: 'পেমেন্ট বাকি', tone: 'warning' },
  placed: { en: 'Placed', bn: 'গৃহীত', tone: 'info' },
  confirmed: { en: 'Confirmed', bn: 'নিশ্চিত', tone: 'info' },
  processing: { en: 'Processing', bn: 'প্রক্রিয়াধীন', tone: 'info' },
  completed: { en: 'Completed', bn: 'সম্পন্ন', tone: 'success' },
  cancelled: { en: 'Cancelled', bn: 'বাতিল', tone: 'danger' },
  failed: { en: 'Failed', bn: 'ব্যর্থ', tone: 'danger' },
  unpaid: { en: 'Unpaid', bn: 'অপরিশোধিত', tone: 'warning' },
  pending: { en: 'Pending', bn: 'বিচারাধীন', tone: 'warning' },
  paid: { en: 'Paid', bn: 'পরিশোধিত', tone: 'success' },
  partially_refunded: { en: 'Partially refunded', bn: 'আংশিক ফেরত', tone: 'warning' },
  refunded: { en: 'Refunded', bn: 'ফেরত দেওয়া হয়েছে', tone: 'info' },
  unfulfilled: { en: 'Unfulfilled', bn: 'অপূর্ণ', tone: 'neutral' },
  packed: { en: 'Packed', bn: 'প্যাকেজড', tone: 'info' },
  shipped: { en: 'Shipped', bn: 'পাঠানো হয়েছে', tone: 'info' },
  out_for_delivery: { en: 'Out for delivery', bn: 'ডেলিভারিতে', tone: 'info' },
  delivered: { en: 'Delivered', bn: 'ডেলিভারড', tone: 'success' },
  partially_returned: { en: 'Partially returned', bn: 'আংশিক ফেরত', tone: 'warning' },
  returned: { en: 'Returned', bn: 'ফেরত হয়েছে', tone: 'neutral' },
  returned_to_origin: { en: 'Returned to origin', bn: 'ফেরত এসেছে (RTO)', tone: 'danger' },
  partially_paid: { en: 'Partially paid', bn: 'আংশিক পরিশোধিত', tone: 'warning' },
  not_required: { en: 'Not required', bn: 'প্রয়োজন নেই', tone: 'neutral' },
  no_answer: { en: 'No answer', bn: 'ফোন ধরেনি', tone: 'warning' },
  wrong_number: { en: 'Wrong number', bn: 'ভুল নম্বর', tone: 'danger' },
  customer_cancelled: { en: 'Customer cancelled', bn: 'গ্রাহক বাতিল করেছেন', tone: 'danger' },
  call_back: { en: 'Call back', bn: 'পরে কল', tone: 'warning' },
  approved: { en: 'Approved', bn: 'অনুমোদিত', tone: 'success' },
  rejected: { en: 'Rejected', bn: 'প্রত্যাখ্যাত', tone: 'danger' },
  spam: { en: 'Spam', bn: 'স্প্যাম', tone: 'danger' },
  under_review: { en: 'Under review', bn: 'পর্যালোচনায়', tone: 'warning' },
  in_transit: { en: 'In transit', bn: 'ট্রানজিটে', tone: 'info' },
  received: { en: 'Received', bn: 'গৃহীত', tone: 'info' }
};

export function Money({ value, locale = 'en', className, signed = false }) {
  const numeric = Number(value || 0);
  const formatted = baseFormatMoney(value, locale);
  return (
    <span className={className} data-numeric>
      {signed && numeric > 0 ? '+' : ''}
      {formatted}
    </span>
  );
}

export function StatusBadge({ status, locale = 'en', className }) {
  const toneMap = {
    success: 'success',
    warning: 'warning',
    danger: 'danger',
    info: 'primary',
    neutral: 'neutral'
  };
  const entry = STATUS_LABELS[status] || { en: status, bn: status, tone: 'neutral' };
  return (
    <span className={`status-pill ${className || ''}`} data-tone={entry.tone} style={{ color: entry.tone === 'success' ? 'var(--color-success)' : entry.tone === 'warning' ? 'var(--color-warning)' : entry.tone === 'danger' ? 'var(--color-danger)' : entry.tone === 'info' ? 'var(--color-primary)' : 'var(--color-muted)' }}>
      {entry[locale] || entry.en}
    </span>
  );
}

export function useFormatter(locale = 'en') {
  return {
    money: (value) => baseFormatMoney(value, locale),
    status: (status) => {
      const entry = STATUS_LABELS[status];
      if (!entry) return status;
      return entry[locale] || entry.en;
    },
    date: (value) => {
      if (!value) return '';
      const d = new Date(value);
      return d.toLocaleString(locale === 'bn' ? 'bn-BD' : 'en-BD', { timeZone: 'Asia/Dhaka', dateStyle: 'medium', timeStyle: 'short' });
    },
    dateOnly: (value) => {
      if (!value) return '';
      const d = new Date(value);
      return d.toLocaleDateString(locale === 'bn' ? 'bn-BD' : 'en-BD', { timeZone: 'Asia/Dhaka', dateStyle: 'medium' });
    }
  };
}

export function FormattedDate({ value, locale = 'en', withTime = false, className }) {
  if (!value) return null;
  const d = new Date(value);
  const formatted = d.toLocaleString(locale === 'bn' ? 'bn-BD' : 'en-BD', { timeZone: 'Asia/Dhaka', dateStyle: 'medium', timeStyle: withTime ? 'short' : undefined });
  return (
    <time dateTime={d.toISOString()} className={className}>
      {formatted}
    </time>
  );
}

export function FormattedMoney({ value, locale = 'en', className }) {
  return <span className={className} data-numeric>{baseFormatMoney(value, locale)}</span>;
}

export function Translate({ k, fallback }) {
  const t = useTranslations();
  return t.has(k) ? t(k) : fallback || k;
}