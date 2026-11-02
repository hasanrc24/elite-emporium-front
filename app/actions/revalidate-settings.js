'use server';

import { revalidateTag } from 'next/cache';

const apiOrigin = process.env.API_INTERNAL_ORIGIN || 'http://localhost:4000';
const allowed = ['settings.manage', 'cms.manage', 'cms.publish'];

// Server actions are publicly callable, so verify the caller's in-memory access
// token with the backend before purging shared storefront caches.
export async function invalidateStorefrontSettings(accessToken) {
  if (typeof accessToken !== 'string' || !accessToken) return { revalidated: false };
  const response = await fetch(`${apiOrigin}/api/v1/auth/me`, {
    headers: { authorization: `Bearer ${accessToken}` },
    cache: 'no-store',
  }).catch(() => null);
  if (!response?.ok) return { revalidated: false };
  const permissions = (await response.json())?.data?.permissions || [];
  if (!permissions.some((permission) => allowed.includes(permission))) return { revalidated: false };
  for (const tag of ['settings', 'navigation', 'homepage', 'theme']) revalidateTag(tag, { expire: 0 });
  return { revalidated: true };
}
