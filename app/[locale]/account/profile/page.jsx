import { getTranslations } from 'next-intl/server';
import { ProfileManager } from '@/components/account/profile-manager';
export async function generateMetadata({ params }) { const { locale } = await params; const t = await getTranslations({ locale, namespace: 'Account' }); return { title: t('meta.profile'), robots: { index: false } }; }
export default function ProfilePage() { return <ProfileManager />; }
