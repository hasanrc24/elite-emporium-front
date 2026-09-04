import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const cn = (...values) => twMerge(clsx(values));
export const formatMoney = (value, locale = 'en') => new Intl.NumberFormat(locale === 'bn' ? 'bn-BD' : 'en-BD', { style: 'currency', currency: 'BDT', maximumFractionDigits: 2 }).format(Number(value || 0));
