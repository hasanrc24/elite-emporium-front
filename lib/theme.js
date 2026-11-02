'use client';

import { useSyncExternalStore } from 'react';
import { DARK_QUERY, LEGACY_STORAGE_KEY, THEME_STORAGE_KEY } from './theme-script';

/*
 * Site-wide light/dark preference. An explicit choice is kept in localStorage;
 * without one the OS setting is followed live. The pre-paint script in
 * lib/theme-script.js applies the same rules so the first frame never flashes.
 */

function readStored() {
  try {
    const value = window.localStorage.getItem(THEME_STORAGE_KEY) || window.localStorage.getItem(LEGACY_STORAGE_KEY);
    return value === 'dark' || value === 'light' ? value : null;
  } catch {
    return null;
  }
}

function resolve() {
  return readStored() || (window.matchMedia(DARK_QUERY).matches ? 'dark' : 'light');
}

function apply(theme) {
  const root = document.documentElement;
  if (root.dataset.theme === theme) return;
  // Swap every token in one frame instead of animating each surface separately.
  root.classList.add('theme-switching');
  root.dataset.theme = theme;
  window.getComputedStyle(root).getPropertyValue('color');
  window.requestAnimationFrame(() => root.classList.remove('theme-switching'));
}

const listeners = new Set();
const notify = () => listeners.forEach((listener) => listener());

/** Keeps the page in sync with the OS setting and with other tabs. */
export function watchTheme() {
  const media = window.matchMedia(DARK_QUERY);
  const sync = () => { apply(resolve()); notify(); };
  const onStorage = (event) => { if (event.key === THEME_STORAGE_KEY || event.key === null) sync(); };
  sync();
  media.addEventListener('change', sync);
  window.addEventListener('storage', onStorage);
  return () => { media.removeEventListener('change', sync); window.removeEventListener('storage', onStorage); };
}

export function setTheme(theme) {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    window.localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch { /* Private mode: the choice still applies to this page. */ }
  apply(theme);
  notify();
}

function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Current theme, or null during server render and hydration. */
export function useTheme() {
  return useSyncExternalStore(subscribe, () => document.documentElement.dataset.theme || null, () => null);
}
