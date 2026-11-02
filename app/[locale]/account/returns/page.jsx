import { getTranslations } from 'next-intl/server';
import { ReturnList } from '@/components/account/return-manager';
export async function generateMetadata({ params }) { const { locale } = await params; const t = await getTranslations({ locale, namespace: 'Account' }); return { title: t('meta.returns'), robots: { index: false } }; }
export default async function ReturnsPage({ params }) { const { locale } = await params; return <ReturnList locale={locale} />; }
