import { AdminShell } from '@/components/admin/admin-shell';
import { serverGet } from '@/lib/api/server-api';
import { NextIntlClientProvider } from 'next-intl';
import enMessages from '../../messages/en.json';
export const metadata = { title: { default: 'Admin', template: '%s | Elite Emporium Admin' }, robots: { index: false, follow: false } };
export default async function AdminLayout({ children }) {
  let settings = {};
  try { settings = await serverGet('/storefront/settings', { tags: ['settings'], revalidate: 60 }); } catch { /* Safe launch defaults remain available while the API starts. */ }
  return (
    <NextIntlClientProvider messages={enMessages}>
      <>
        <script dangerouslySetInnerHTML={{ __html: "try{var t=localStorage.getItem('elite-emporium-admin-theme');if(t==='dark'||t==='light')document.documentElement.dataset.theme=t;else if(matchMedia('(prefers-color-scheme: dark)').matches)document.documentElement.dataset.theme='dark'}catch(e){}" }} />
        <AdminShell store={settings.store}>{children}</AdminShell>
      </>
    </NextIntlClientProvider>
  );
}
