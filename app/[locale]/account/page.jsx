import { AccountDashboard } from '@/components/account/account-dashboard';
export const metadata = { title: 'My account', robots: { index: false } };
export default async function AccountPage({ params }) { const { locale } = await params; return <AccountDashboard locale={locale} />; }
