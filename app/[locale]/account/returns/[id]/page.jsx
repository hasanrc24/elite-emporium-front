import { getTranslations } from 'next-intl/server';
import { ReturnDetail } from '@/components/account/return-manager';
export async function generateMetadata({ params }) { const { locale } = await params; const t = await getTranslations({ locale, namespace: 'Account' }); return { title: t('meta.return'), robots: { index: false } }; }
export default async function ReturnDetailPage({ params }) { const { locale, id } = await params; return <ReturnDetail id={id} locale={locale} />; }
