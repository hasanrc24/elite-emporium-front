import { CatalogListing } from '@/components/storefront/catalog-listing';
export const dynamic = 'force-dynamic';
export default async function CollectionPage({ params }) { const { locale, slug } = await params; return <CatalogListing locale={locale} kind="collection" slug={slug} />; }
