'use server';

import { revalidateTag } from 'next/cache';

export async function invalidateStorefrontSettings() {
  revalidateTag('settings');
  revalidateTag('navigation');
  revalidateTag('homepage');
  revalidateTag('theme');
}