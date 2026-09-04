import { ResourceConsole } from '@/components/admin/resource-console';

export default async function AdminResourcePage({ params }) {
  const { resource } = await params;
  return <ResourceConsole segments={resource} />;
}
