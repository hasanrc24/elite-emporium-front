import { getTranslations } from 'next-intl/server';
import { OrderDetail } from '@/components/account/order-detail';
export async function generateMetadata({ params }) { const { locale } = await params; const t = await getTranslations({ locale, namespace: 'Account' }); return { title: t('meta.order'), robots: { index: false } }; }
export default async function OrderDetailPage({ params }) { const { locale, id } = await params; return <OrderDetail id={id} locale={locale} />; }
