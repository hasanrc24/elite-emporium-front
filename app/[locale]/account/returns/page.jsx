import { ReturnList } from '@/components/account/return-manager';
export const metadata = { title: 'Returns', robots: { index: false } };
export default async function ReturnsPage({ params }) { const { locale } = await params; return <ReturnList locale={locale} />; }
