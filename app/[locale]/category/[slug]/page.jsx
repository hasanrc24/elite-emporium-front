import { CatalogListing } from '@/components/storefront/catalog-listing';
export const dynamic = 'force-dynamic';
export default async function CategoryPage({ params }) { const { locale, slug } = await params; return <CatalogListing locale={locale} kind="category" slug={slug} />; }
