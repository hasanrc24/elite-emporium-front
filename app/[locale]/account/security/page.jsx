import { SecurityManager } from '@/components/account/security-manager';
export const metadata = { title: 'Account security', robots: { index: false } };
export default async function SecurityPage({ params }) { const { locale } = await params; return <SecurityManager locale={locale} />; }
