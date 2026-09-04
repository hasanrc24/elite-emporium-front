import { describe, expect, it } from 'vitest';
import { tokenManager } from '@/lib/auth/token-manager';

describe('access-token manager', () => {
  it('keeps and clears a token in memory', () => {
    tokenManager.set('access-token', 900);
    expect(tokenManager.get()).toBe('access-token');
    tokenManager.clear();
    expect(tokenManager.get()).toBeNull();
  });
});
