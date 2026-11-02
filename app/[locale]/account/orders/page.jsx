import { getTranslations } from 'next-intl/server';
import { OrderList } from '@/components/account/order-list';
export async function generateMetadata({ params }) { const { locale } = await params; const t = await getTranslations({ locale, namespace: 'Account' }); return { title: t('meta.orders'), robots: { index: false } }; }
export default async function AccountOrders({ params }) { const { locale } = await params; return <OrderList locale={locale} />; }
