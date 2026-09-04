import { AdminShell } from '@/components/admin/admin-shell';
export const metadata = { title: { default: 'Admin', template: '%s | Elite Emporium Admin' }, robots: { index: false, follow: false } };
export default function AdminLayout({ children }) { return <AdminShell>{children}</AdminShell>; }
