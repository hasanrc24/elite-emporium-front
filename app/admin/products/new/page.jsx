import { QuickAddProduct } from '@/components/admin/quick-add-product';
import { UnifiedProductPage } from '@/components/admin/unified-product-page';

export const metadata = { title: 'Add product' };
export default async function NewProductPage({ searchParams }) {
  const query = await searchParams;
  return query?.quick === '1' ? <QuickAddProduct /> : <UnifiedProductPage id={null} />;
}
