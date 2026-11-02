import { SizeChartEditor } from '@/components/admin/catalog/size-chart-editor';

export const metadata = { title: 'Size chart' };
export default async function SizeChartPage({ params }) {
  const { id } = await params;
  return <SizeChartEditor id={id} />;
}
