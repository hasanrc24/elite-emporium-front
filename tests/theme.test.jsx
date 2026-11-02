import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ThemeToggle } from '@/components/theme-toggle';
import { setTheme, watchTheme } from '@/lib/theme';
import { themeBootstrapScript } from '@/lib/theme-script';

let systemDark = false;
let mediaListeners = [];

// Node's own experimental localStorage shadows jsdom's, so use a plain stub.
const store = new Map();
const storage = {
  getItem: (key) => (store.has(key) ? store.get(key) : null),
  setItem: (key, value) => store.set(key, String(value)),
  removeItem: (key) => store.delete(key),
  clear: () => store.clear()
};
Object.defineProperty(globalThis, 'localStorage', { value: storage, configurable: true });
Object.defineProperty(window, 'localStorage', { value: storage, configurable: true });

beforeEach(() => {
  systemDark = false;
  mediaListeners = [];
  window.localStorage.clear();
  delete document.documentElement.dataset.theme;
  window.matchMedia = () => ({
    get matches() { return systemDark; },
    addEventListener: (_event, listener) => mediaListeners.push(listener),
    removeEventListener: (_event, listener) => { mediaListeners = mediaListeners.filter((item) => item !== listener); }
  });
});
afterEach(() => window.localStorage.clear());

const runBootstrap = () => new Function(themeBootstrapScript)();

describe('theme', () => {
  it('pre-paint script follows the OS until the user chooses', () => {
    systemDark = true;
    runBootstrap();
    expect(document.documentElement.dataset.theme).toBe('dark');
    window.localStorage.setItem('ee-theme', 'light');
    runBootstrap();
    expect(document.documentElement.dataset.theme).toBe('light');
  });

  it('migrates the old admin-only preference', () => {
    window.localStorage.setItem('elite-emporium-admin-theme', 'dark');
    runBootstrap();
    expect(document.documentElement.dataset.theme).toBe('dark');
    setTheme('light');
    expect(window.localStorage.getItem('ee-theme')).toBe('light');
    expect(window.localStorage.getItem('elite-emporium-admin-theme')).toBeNull();
  });

  it('tracks OS changes only without an explicit choice', () => {
    const stop = watchTheme();
    expect(document.documentElement.dataset.theme).toBe('light');
    systemDark = true;
    mediaListeners.forEach((listener) => listener());
    expect(document.documentElement.dataset.theme).toBe('dark');
    setTheme('light');
    mediaListeners.forEach((listener) => listener());
    expect(document.documentElement.dataset.theme).toBe('light');
    stop();
    expect(mediaListeners).toHaveLength(0);
  });

  it('toggle switches and reports its pressed state', () => {
    document.documentElement.dataset.theme = 'light';
    render(<ThemeToggle label="Dark mode" />);
    const button = screen.getByRole('button', { name: 'Dark mode' });
    expect(button).toHaveAttribute('aria-pressed', 'false');
    act(() => { fireEvent.click(button); });
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(button).toHaveAttribute('aria-pressed', 'true');
    expect(window.localStorage.getItem('ee-theme')).toBe('dark');
  });
});
