import { beforeEach, describe, expect, it, vi } from 'vitest';

const get = vi.fn();
const post = vi.fn();
const remove = vi.fn();

vi.mock('@/lib/api/browser-api', () => ({ browserApi: { get, post, delete: remove } }));

const { wishlistApi } = await import('@/lib/api/wishlist-api');

describe('wishlist API', () => {
  beforeEach(() => vi.clearAllMocks());

  it('loads the locale-aware guest or account wishlist', async () => {
    get.mockResolvedValue({ data: { data: { id: 'wishlist-id', items: [], itemCount: 0 } } });
    await expect(wishlistApi.current('bn')).resolves.toMatchObject({ id: 'wishlist-id' });
    expect(get).toHaveBeenCalledWith('/wishlist', { params: { locale: 'bn' } });
  });

  it('sends product and variant identity when saving an item', async () => {
    post.mockResolvedValue({ data: { data: { itemCount: 1 } } });
    await wishlistApi.add('product-id', 'variant-id', 'en');
    expect(post).toHaveBeenCalledWith('/wishlist/items', { productId: 'product-id', variantId: 'variant-id' }, { params: { locale: 'en' } });
  });

  it('merges the signed guest wishlist after authentication', async () => {
    post.mockResolvedValue({ data: { data: { itemCount: 2 } } });
    await wishlistApi.merge('en');
    expect(post).toHaveBeenCalledWith('/wishlist/merge', null, { params: { locale: 'en' } });
  });
});
