import { ReturnDetail } from '@/components/account/return-manager';
export const metadata = { title: 'Return details', robots: { index: false } };
export default async function ReturnDetailPage({ params }) { const { locale, id } = await params; return <ReturnDetail id={id} locale={locale} />; }
