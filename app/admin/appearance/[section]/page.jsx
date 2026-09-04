import { notFound } from 'next/navigation';
import { AppearanceManager } from '@/components/admin/appearance-manager';

export default async function AppearancePage({ params }) { const { section } = await params; if (!['home', 'menus', 'theme'].includes(section)) notFound(); return <AppearanceManager section={section} />; }
