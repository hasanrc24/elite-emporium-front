import { Suspense } from 'react';
import { getTranslations } from 'next-intl/server';
import { GuestReturnManager } from '@/components/storefront/guest-return-manager';

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Account.returns' });
  return { title: t('title'), robots: { index: false } };
}
export default async function GuestReturnsPage({ params }) {
  const { locale } = await params;
  return <div className="container py-14"><Suspense><GuestReturnManager locale={locale} /></Suspense></div>;
}
