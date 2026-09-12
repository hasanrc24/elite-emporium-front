import { UnifiedProductPage } from '@/components/admin/unified-product-page';

export const metadata = { title: 'Product details' };
export default async function ProductEditorPage({ params, searchParams }) {
  const { id } = await params;
  const query = await searchParams;
  return <UnifiedProductPage id={id} initialMode={query?.mode === 'edit' ? 'edit' : 'view'} />;
}
