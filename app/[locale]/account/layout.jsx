import { AccountShell } from '@/components/account/account-shell';
export default async function AccountLayout({ children, params }) { const { locale } = await params; return <AccountShell locale={locale}>{children}</AccountShell>; }
