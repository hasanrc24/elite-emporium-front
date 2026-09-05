import { AdminShell } from '@/components/admin/admin-shell';
export const metadata = { title: { default: 'Admin', template: '%s | Elite Emporium Admin' }, robots: { index: false, follow: false } };
export default function AdminLayout({ children }) {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: "try{var t=localStorage.getItem('elite-emporium-admin-theme');if(t==='dark'||t==='light')document.documentElement.dataset.theme=t;else if(matchMedia('(prefers-color-scheme: dark)').matches)document.documentElement.dataset.theme='dark'}catch(e){}" }} />
      <AdminShell>{children}</AdminShell>
    </>
  );
}
