import { ProductEditor } from '@/components/admin/product-editor';

export const metadata = { title: 'Edit product' };
export default async function ProductEditorPage({ params }) { const { id } = await params; return <ProductEditor id={id} />; }
