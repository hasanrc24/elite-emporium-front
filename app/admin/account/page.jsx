import { AdminPageHeader } from '@/components/admin/admin-page-header';
import { ProfileManager } from '@/components/account/profile-manager';
import { SecurityManager } from '@/components/account/security-manager';

export const metadata = { title: 'My account' };

export default function AdminAccountPage() {
  return (
    <div className="grid gap-6">
      <AdminPageHeader
        eyebrow="Personal settings"
        title="My account"
        description="Manage your profile, password, contact verification, multi-factor authentication, and active sessions."
      />
      <div className="grid gap-6 xl:grid-cols-2 xl:items-start">
        <ProfileManager />
        <SecurityManager locale="en" loginHref="/admin/login" />
      </div>
    </div>
  );
}
