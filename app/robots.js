const apiOrigin = process.env.API_INTERNAL_ORIGIN || 'http://localhost:4000';
const siteOrigin = (process.env.NEXT_PUBLIC_SITE_ORIGIN || 'http://localhost:3000').replace(/\/$/, '');

export default async function robots() {
  let allowIndex = process.env.NODE_ENV === 'production';
  try { const response = await fetch(`${apiOrigin}/api/v1/storefront/settings`, { next: { revalidate: 300, tags: ['settings'] } }); if (response.ok) allowIndex = allowIndex && Boolean((await response.json()).data.seo.robotsIndex); } catch { allowIndex = false; }
  return { rules: allowIndex ? { userAgent: '*', allow: '/', disallow: ['/admin', '/api', '/en/account', '/bn/account', '/en/checkout', '/bn/checkout'] } : { userAgent: '*', disallow: '/' }, sitemap: `${siteOrigin}/sitemap.xml`, host: siteOrigin };
}
