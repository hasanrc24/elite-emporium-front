import { CatalogListing } from '@/components/storefront/catalog-listing';
export const dynamic = 'force-dynamic';
export default async function BrandPage({ params }) { const { locale, slug } = await params; return <CatalogListing locale={locale} kind="brand" slug={slug} />; }
