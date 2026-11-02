import { notFound } from 'next/navigation';
import { SettingsSection } from '@/components/admin/settings/settings-manager';
import { sectionById } from '@/components/admin/settings/settings-schema';

export async function generateMetadata({ params }) { const { section } = await params; return { title: sectionById(section) ? `${sectionById(section).title} · Settings` : 'Settings' }; }
export default async function SettingsSectionPage({ params }) { const { section } = await params; if (!sectionById(section)) notFound(); return <SettingsSection sectionId={section} />; }
