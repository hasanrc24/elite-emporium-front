import { getTranslations } from 'next-intl/server';
import { Lock } from 'lucide-react';
import { CheckoutForm } from '@/components/storefront/checkout-form';

export const metadata = { title: 'Checkout', robots: { index: false } };

export default async function CheckoutPage({ params }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Checkout' });
  return (
    <div className="container pb-6 pt-0 md:py-10">
      <div className="mb-6 hidden items-center justify-between md:flex"><h1 className="page-heading">{t('title')}</h1><p className="flex items-center gap-1.5 text-[13px] text-[var(--color-muted)]"><Lock size={14} />{t('secure')}</p></div>
      <h1 className="sr-only md:hidden">{t('title')}</h1>
      <CheckoutForm locale={locale} />
    </div>
  );
}
