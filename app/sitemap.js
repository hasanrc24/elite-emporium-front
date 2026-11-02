const apiOrigin = process.env.API_INTERNAL_ORIGIN || 'http://localhost:4000';
const siteOrigin = (process.env.NEXT_PUBLIC_SITE_ORIGIN || 'http://localhost:3000').replace(/\/$/, '');

export default async function sitemap() {
  let data = { pages: [], posts: [], products: [], categories: [], collections: [] };
  try { const response = await fetch(`${apiOrigin}/api/v1/sitemap-data`, { next: { revalidate: 3600, tags: ['sitemap'] } }); if (response.ok) data = { ...data, ...(await response.json()).data }; } catch { /* Core routes remain discoverable during a transient API outage. */ }
  const core = ['', '/shop', '/blog', '/contact'];
  const paths = [...core.map((path) => ({ path, updatedAt: new Date() })), ...data.pages.map((row) => ({ path: `/page/${row.slug}`, updatedAt: row.updatedAt })), ...data.posts.map((row) => ({ path: `/blog/${row.slug}`, updatedAt: row.updatedAt })), ...data.products.map((row) => ({ path: `/product/${row.slug}`, updatedAt: row.updatedAt })), ...data.categories.map((row) => ({ path: `/category/${row.slug}`, updatedAt: row.updatedAt })), ...data.collections.map((row) => ({ path: `/collection/${row.slug}`, updatedAt: row.updatedAt }))];
  return paths.flatMap(({ path, updatedAt }) => ['en', 'bn'].map((locale) => ({ url: `${siteOrigin}/${locale}${path}`, lastModified: new Date(updatedAt), alternates: { languages: { en: `${siteOrigin}/en${path}`, bn: `${siteOrigin}/bn${path}` } } })));
}
